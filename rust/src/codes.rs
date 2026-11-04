//! Writes a mainline as the bits its moves take, each move numbered by its
//! place among the legal moves of its position in the byte order of their
//! Universal Chess Interface (UCI) notation, a castle written as the king's
//! move onto its own square and a null move numbered past them all. A position
//! holding `n` numbers takes a truncated binary code of about `log2(n)` bits,
//! the most significant bit first, so two mainlines sharing their first moves
//! share their first bits and sort beside each other.

use std::{io, iter};

use bitstream_io::{BigEndian, BitRead, BitReader, BitWrite, BitWriter};
use shakmaty::{CastlingMode, Move, MoveList, Position, Square, uci::UciMove};

use crate::boards::{Board, Turn};

/// Ranks `m` among the moves of its position by the bytes of its UCI
/// notation, the file and rank of the square it leaves, then those of the
/// square it reaches, then the letter of the piece it promotes to, and last
/// whether it castles, which tells a castle apart from a king's move onto
/// the same square in a Chess960 position.
fn order(m: Move) -> u32 {
    let UciMove::Normal {
        from,
        to,
        promotion,
    } = m.to_uci(CastlingMode::Standard)
    else {
        return u32::MAX;
    };
    let square = |s: Square| s.file().to_u32() * 8 + s.rank().to_u32();

    (square(from) << 15)
        | (square(to) << 9)
        | (promotion.map_or(0, |role| u32::from(role.char())) << 1)
        | u32::from(m.is_castle())
}

/// Numbers `turn` among the legal moves `moves` lists.
fn number(moves: &MoveList, turn: Turn) -> u32 {
    let at = match turn {
        Turn::Move(m) => {
            let rank = order(m);
            moves.iter().filter(|&&other| order(other) < rank).count()
        }
        Turn::Null => moves.len(),
    };

    u32::try_from(at).unwrap_or(u32::MAX)
}

/// Splits a code over `count` numbers into the width of its short form and
/// the count of numbers taking that form, the rest taking one bit more.
fn widths(count: u32) -> (u32, u32) {
    let short = count.ilog2();

    (short, (2 << short) - count)
}

/// The bits of a mainline as they are written.
pub struct Writer(BitWriter<Vec<u8>, BigEndian>);

impl Default for Writer {
    fn default() -> Self {
        Self(BitWriter::endian(Vec::new(), BigEndian))
    }
}

impl Writer {
    /// Appends `turn`, played from the position of `board`.
    ///
    /// # Errors
    ///
    /// Returns the error the bit writer raises.
    pub fn play(&mut self, board: &Board, turn: Turn) -> io::Result<()> {
        let moves = board.position.legal_moves();
        let code = number(&moves, turn);
        let (short, narrow) = widths(number(&moves, Turn::Null).saturating_add(1));

        if code < narrow {
            self.0.write_var(short, code)
        } else {
            self.0.write_var(short + 1, code + narrow)
        }
    }

    /// Returns the bytes, the last one's unused bits left at 0.
    ///
    /// # Errors
    ///
    /// Returns the error the bit writer raises.
    pub fn finish(mut self) -> io::Result<Vec<u8>> {
        self.0.byte_align()?;

        Ok(self.0.into_writer())
    }
}

/// The bits of a mainline as they are read.
pub struct Reader<'a>(BitReader<&'a [u8], BigEndian>);

impl<'a> Reader<'a> {
    /// Reads from the first bit of `bytes`.
    #[must_use]
    pub fn new(bytes: &'a [u8]) -> Self {
        Self(BitReader::endian(bytes, BigEndian))
    }

    /// Reads the next turn, takes it on `board`, and returns its name in UCI
    /// notation, a null move as `0000`, or `None` where the bytes run out or
    /// it passes and `board` refuses the pass.
    pub fn play(&mut self, board: &mut Board) -> Option<UciMove> {
        let mut moves = board.position.legal_moves();
        let (short, narrow) = widths(number(&moves, Turn::Null).saturating_add(1));
        let read: u32 = self.0.read_var(short).ok()?;
        let code = if read < narrow {
            read
        } else {
            (read << 1 | u32::from(self.0.read_bit().ok()?)) - narrow
        };
        let at = usize::try_from(code).ok()?;

        if at == moves.len() {
            return board.pass().then_some(UciMove::Null);
        }

        let (_, &mut m, _) = moves.select_nth_unstable_by_key(at, |&m| order(m));
        let name = m.to_uci(board.position.castles().mode());
        board.play(m);

        Some(name)
    }

    /// Keys the position of `board`, then each position the next `plies` turns
    /// reach from it, stopping where `play` returns `None`.
    pub fn keys(mut self, mut board: Board, plies: u16) -> impl Iterator<Item = u64> {
        iter::once(board.key())
            .chain((0..plies).map_while(move |_| self.play(&mut board).map(|_| board.key())))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tags::Rules;

    fn start() -> Board {
        Board::set_up(None, Rules::Standard).unwrap()
    }

    fn written(moves: &[&str]) -> Vec<u8> {
        let mut board = start();
        let mut writer = Writer::default();

        for name in moves {
            let turn = board.named(name).unwrap();
            writer.play(&board, turn).unwrap();
            assert!(board.take(turn));
        }

        writer.finish().unwrap()
    }

    fn read(bytes: &[u8], plies: usize) -> Vec<String> {
        let mut board = start();
        let mut reader = Reader::new(bytes);

        (0..plies)
            .map(|_| reader.play(&mut board).unwrap().to_string())
            .collect()
    }

    #[test]
    fn the_first_starting_move_in_byte_order_takes_the_first_number() {
        let moves = start().position.legal_moves();

        assert_eq!(number(&moves, start().named("a2a3").unwrap()), 0);
        assert_eq!(number(&moves, start().named("a2a4").unwrap()), 1);
        assert_eq!(number(&moves, start().named("h2h4").unwrap()), 19);
        assert_eq!(number(&moves, Turn::Null), 20);
    }

    #[test]
    fn a_line_reads_back_as_it_was_written() {
        let line = ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "0000", "e1g1"];

        assert_eq!(read(&written(&line), line.len()), line);
    }

    #[test]
    fn two_lines_sharing_their_first_moves_share_their_first_bytes() {
        let shared = ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4"];
        let first = written(&[&shared[..], &["f3d4"]].concat());
        let second = written(&[&shared[..], &["d1d4"]].concat());

        assert_eq!(first[..3], second[..3]);
    }

    #[test]
    fn a_forced_reply_takes_a_single_bit_beside_the_null_move() {
        assert_eq!(widths(1), (0, 1));
        assert_eq!(widths(2), (1, 2));
        assert_eq!(widths(21), (4, 11));
    }

    #[test]
    fn every_bit_pattern_names_a_move_or_the_null_move() {
        let mut board = start();

        assert_eq!(
            Reader::new(&[0xff]).play(&mut board).map(|m| m.to_string()),
            Some("0000".to_owned())
        );
    }

    #[test]
    fn a_null_move_out_of_check_reads_as_none() {
        let mut board =
            Board::set_up(Some("4k3/8/8/8/8/8/4R3/4K3 b - - 0 1"), Rules::Standard).unwrap();

        assert!(Reader::new(&[0xe0]).play(&mut board).is_none());
    }

    #[test]
    fn a_line_past_its_last_byte_reads_as_none() {
        assert!(Reader::new(&[]).play(&mut start()).is_none());
    }

    #[test]
    fn a_position_with_no_legal_move_takes_no_bit_for_its_null_move() {
        let mut board =
            Board::set_up(Some("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"), Rules::Standard).unwrap();

        assert_eq!(Reader::new(&[]).play(&mut board), Some(UciMove::Null));
    }
}
