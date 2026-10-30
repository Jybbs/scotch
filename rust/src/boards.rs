//! Holds `Board`, the position a game's moves are read against, set up from
//! a `FEN` tag as python-chess's `Board` sets one up and written back in
//! Forsyth–Edwards Notation (FEN) as its `fen` writes one into an error.

use shakmaty::{
    CastlingMode, Chess, Color, EnPassantMode, FromSetup, Position, PositionError, Setup,
    uci::UciMove, zobrist::Zobrist64,
};

use crate::{fens, tags::Rules};

/// A position and the castling rules it is read under.
#[derive(Clone, Debug)]
pub struct Board {
    /// The position.
    pub position: Chess,
}

impl Board {
    /// Sets up the position `fen` names under `rules`, as python-chess's
    /// `Board` constructor does, reading Chess960 castling wherever the
    /// castling rights reach a rook standard chess cannot castle with.
    ///
    /// Returns the message python-chess raises for a `fen` it cannot read,
    /// or a message naming a position python-chess sets up and no legal
    /// game reaches, such as one with no king.
    pub fn set_up(fen: Option<&str>, rules: Rules) -> Result<Board, String> {
        let setup = fen.map_or_else(|| Ok(Setup::initial()), fens::read)?;
        let mode = match rules {
            Rules::Chess960 => CastlingMode::Chess960,
            _ => CastlingMode::detect(&setup),
        };

        Ok(Board {
            position: lenient(setup, mode).ok_or_else(|| {
                format!(
                    "invalid position in fen: {}",
                    fens::repr(fen.unwrap_or_default())
                )
            })?,
        })
    }

    /// Writes the position in FEN as python-chess's `Board.fen` does, its
    /// castling rights in X-FEN and its en passant square only where a
    /// legal capture reaches it.
    pub fn fen(&self) -> String {
        let pos = &self.position;
        let castling = fens::castling(pos);
        let ep = pos
            .ep_square(EnPassantMode::Legal)
            .map_or_else(|| "-".to_owned(), |square| square.to_string());

        format!(
            "{} {} {castling} {ep} {} {}",
            pos.board(),
            pos.turn().char(),
            pos.halfmoves(),
            pos.fullmoves()
        )
    }

    /// Hashes the position through Polyglot's Zobrist keys, reading the en
    /// passant file wherever a pawn stands ready to capture, legal or not,
    /// as python-chess's `chess.polyglot.zobrist_hash` does.
    pub fn key(&self) -> u64 {
        self.position
            .zobrist_hash::<Zobrist64>(EnPassantMode::PseudoLegal)
            .0
    }

    /// Lists the legal moves beside the name python-chess gives each, the
    /// move in Universal Chess Interface (UCI) notation, which writes a castle
    /// as the king's move onto its own square in standard chess and onto the
    /// rook's in Chess960.
    pub fn legal(&self) -> impl Iterator<Item = (shakmaty::Move, UciMove)> {
        let mode = self.position.castles().mode();

        self.position
            .legal_moves()
            .into_iter()
            .map(move |m| (m, m.to_uci(mode)))
    }

    /// Plays the legal move `m`.
    pub fn play(&mut self, m: shakmaty::Move) {
        self.position.play_unchecked(m);
    }

    /// Plays a null move as python-chess pushes one, passing the turn,
    /// clearing the en passant square, and counting the ply, or returns
    /// `false` where the side passing the turn is in check, since no
    /// position reached that way can be set up.
    pub fn pass(&mut self) -> bool {
        let pos = &self.position;
        let mut setup = pos.to_setup(EnPassantMode::Always);
        setup.halfmoves = setup.halfmoves.saturating_add(1);
        setup.fullmoves = setup
            .fullmoves
            .saturating_add(u32::from(pos.turn() == Color::Black));
        setup.swap_turn();

        lenient(setup, pos.castles().mode())
            .map(|position| self.position = position)
            .is_some()
    }
}

/// Builds the position `setup` describes under `mode`, discarding castling
/// rights and an en passant square no legal game reaches and keeping a
/// position with more material or checks than a legal game reaches, as
/// python-chess keeps each, or `None` where no position can be set up.
fn lenient(setup: Setup, mode: CastlingMode) -> Option<Chess> {
    Chess::from_setup(setup, mode)
        .or_else(PositionError::ignore_invalid_castling_rights)
        .or_else(PositionError::ignore_invalid_ep_square)
        .or_else(PositionError::ignore_too_much_material)
        .or_else(PositionError::ignore_impossible_check)
        .ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn set_up(fen: &str) -> Result<String, String> {
        Board::set_up(Some(fen), Rules::Standard).map(|board| board.fen())
    }

    #[test]
    fn a_fen_reads_back_as_python_chess_writes_it() {
        for (fen, written) in [
            (
                "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
                "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
            ),
            ("4k3/8/8/8/8/8/8/4K2R", "4k3/8/8/8/8/8/8/4K2R w - - 0 1"),
            (
                "4k3/8/8/8/8/8/8/4K2R w KQkq - 3 0",
                "4k3/8/8/8/8/8/8/4K2R w K - 3 1",
            ),
            (
                "rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3",
                "rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3",
            ),
        ] {
            assert_eq!(set_up(fen), Ok(written.to_owned()), "{fen}");
        }
    }

    #[test]
    fn a_fen_python_chess_cannot_read_raises_its_message() {
        for (fen, message) in [
            ("", "empty fen"),
            (
                "8/8/8/8/8/8/8 w - - 0 1",
                "expected 8 rows in position part of fen: '8/8/8/8/8/8/8'",
            ),
            (
                "44/8/8/8/8/8/8/8",
                "two subsequent digits in position part of fen: '44/8/8/8/8/8/8/8'",
            ),
            (
                "x7/8/8/8/8/8/8/8",
                "invalid character in position part of fen: 'x7/8/8/8/8/8/8/8'",
            ),
            (
                "7/8/8/8/8/8/8/8",
                "expected 8 columns per row in position part of fen: '7/8/8/8/8/8/8/8'",
            ),
            (
                "8/8/8/8/8/8/8/8 x",
                "expected 'w' or 'b' for turn part of fen: '8/8/8/8/8/8/8/8 x'",
            ),
            (
                "8/8/8/8/8/8/8/8 w KQkqK",
                "invalid castling part in fen: '8/8/8/8/8/8/8/8 w KQkqK'",
            ),
            (
                "8/8/8/8/8/8/8/8 w - e9",
                "invalid en passant part in fen: '8/8/8/8/8/8/8/8 w - e9'",
            ),
            (
                "8/8/8/8/8/8/8/8 w - - x",
                "invalid half-move clock in fen: '8/8/8/8/8/8/8/8 w - - x'",
            ),
            (
                "8/8/8/8/8/8/8/8 w - - -1",
                "half-move clock cannot be negative: '8/8/8/8/8/8/8/8 w - - -1'",
            ),
            (
                "8/8/8/8/8/8/8/8 w - - 0 1 x",
                "fen string has more parts than expected: '8/8/8/8/8/8/8/8 w - - 0 1 x'",
            ),
        ] {
            assert_eq!(set_up(fen), Err(message.to_owned()), "{fen}");
        }
    }

    #[test]
    fn a_null_move_passes_the_turn_and_counts_the_ply() {
        let mut board = Board::set_up(None, Rules::Standard).unwrap();

        assert!(board.pass());
        assert_eq!(
            board.fen(),
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 1 1"
        );
        assert!(board.pass());
        assert_eq!(
            board.fen(),
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 2 2"
        );
    }

    #[test]
    fn the_starting_position_takes_the_polyglot_key() {
        assert_eq!(
            Board::set_up(None, Rules::Standard).unwrap().key(),
            0x463b_9618_1691_fc9c
        );
    }
}
