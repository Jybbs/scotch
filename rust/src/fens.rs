//! Reads the Forsyth–Edwards Notation (FEN) a `FEN` tag holds as
//! python-chess's `Board.set_fen` reads it, and writes castling rights back
//! as its `castling_xfen` writes them, each message worded as python-chess
//! words it.

use core::fmt::Write;

use shakmaty::{
    Bitboard, Board as Placement, Chess, Color, File, Piece, Position, Rank, Role, Setup, Square,
};

use crate::lines::is_space;

/// The most digits Python's `int` reads from a string, the default of
/// `sys.get_int_max_str_digits`.
const DIGITS: usize = 4300;

/// The first code point of each run of ten characters with the `Nd`
/// property in Unicode 17, the version Python 3.15's `unicodedata` reads.
const ZEROS: [u32; 77] = [
    0x30, 0x660, 0x6f0, 0x7c0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66,
    0xde6, 0xe50, 0xed0, 0xf20, 0x1040, 0x1090, 0x17e0, 0x1810, 0x1946, 0x19d0, 0x1a80, 0x1a90,
    0x1b50, 0x1bb0, 0x1c40, 0x1c50, 0xa620, 0xa8d0, 0xa900, 0xa9d0, 0xa9f0, 0xaa50, 0xabf0, 0xff10,
    0x104a0, 0x10d30, 0x10d40, 0x11066, 0x110f0, 0x11136, 0x111d0, 0x112f0, 0x11450, 0x114d0,
    0x11650, 0x116c0, 0x116d0, 0x116da, 0x11730, 0x118e0, 0x11950, 0x11bf0, 0x11c50, 0x11d50,
    0x11da0, 0x11de0, 0x11f50, 0x16130, 0x16a60, 0x16ac0, 0x16b50, 0x16d70, 0x1ccf0, 0x1d7ce,
    0x1d7d8, 0x1d7e2, 0x1d7ec, 0x1d7f6, 0x1e140, 0x1e2f0, 0x1e4f0, 0x1e5f1, 0x1e950, 0x1fbf0,
];

/// The half-move clock and fullmove number of a position a board is set up
/// from, each in the ASCII digits python-chess's `Board.fen` writes, beside
/// the side to move.
#[derive(Clone, Debug)]
pub struct Clocks {
    /// The half-move clock.
    halfmoves: String,
    /// The fullmove number.
    fullmoves: String,
    /// The side to move.
    turn: Color,
}

impl Clocks {
    /// Returns the clocks of the standard starting position.
    pub fn initial() -> Clocks {
        Clocks {
            halfmoves: "0".to_owned(),
            fullmoves: "1".to_owned(),
            turn: Color::White,
        }
    }

    /// Writes the half-move clock and fullmove number of `pos` as
    /// python-chess's `Board.fen` writes them, where `pos` was reached from
    /// the position these clocks belong to and its own clocks started at
    /// zero and one, or returns the message Python's `str` raises for a clock
    /// past `DIGITS` digits.
    pub fn written(&self, pos: &Chess) -> Result<String, String> {
        let turns = pos.fullmoves().get() - 1;
        let plies = 2 * turns + u32::from(pos.turn().is_black()) - u32::from(self.turn.is_black());
        let halfmoves = if pos.halfmoves() == plies {
            plus(&self.halfmoves, plies)
        } else {
            pos.halfmoves().to_string()
        };
        let fullmoves = plus(&self.fullmoves, turns);

        if halfmoves.len().max(fullmoves.len()) > DIGITS {
            Err(format!(
                "Exceeds the limit ({DIGITS} digits) for integer string conversion; \
                 use sys.set_int_max_str_digits() to increase the limit"
            ))
        } else {
            Ok(format!("{halfmoves} {fullmoves}"))
        }
    }
}

/// Reads `fen` as python-chess's `Board.set_fen` reads it, each field after
/// the placement optional, raising the message it raises for each field it
/// cannot read.
///
/// Returns the position with its clocks at zero and one, beside the clocks
/// `fen` names.
pub fn read(fen: &str) -> Result<(Setup, Clocks), String> {
    let mut parts = fen.split(is_space).filter(|part| !part.is_empty());
    let quoted = repr(fen);
    let placement = parts.next().ok_or("empty fen")?;
    let turn = match parts.next() {
        None | Some("w") => Color::White,
        Some("b") => Color::Black,
        Some(_) => Err(format!(
            "expected 'w' or 'b' for turn part of fen: {quoted}"
        ))?,
    };
    let castling = parts.next().unwrap_or("-");

    if !is_castling(castling) {
        Err(format!("invalid castling part in fen: {quoted}"))?;
    }

    let ep_square = match parts.next() {
        None | Some("-") => None,
        Some(name) => Some(
            name.parse::<Square>()
                .map_err(|_| format!("invalid en passant part in fen: {quoted}"))?,
        ),
    };
    let halfmoves = clock(parts.next(), "half-move clock", "0", &quoted)?;
    let fullmoves = Some(clock(parts.next(), "fullmove number", "1", &quoted)?)
        .filter(|number| number != "0")
        .unwrap_or_else(|| "1".to_owned());

    if parts.next().is_some() {
        Err(format!("fen string has more parts than expected: {quoted}"))?;
    }

    let board = place(placement)?;
    let castling_rights = rights(&board, castling);
    let setup = Setup {
        board,
        castling_rights,
        ep_square,
        turn,
        ..Setup::empty()
    };

    Ok((
        setup,
        Clocks {
            halfmoves,
            fullmoves,
            turn,
        },
    ))
}

/// Reads the `field` a FEN holds in `part` as `Board.set_fen` reads a clock,
/// or `missing` where the FEN ends before it, raising its message for a
/// field Python's `int` cannot read and for a negative one.
fn clock(part: Option<&str>, field: &str, missing: &str, quoted: &str) -> Result<String, String> {
    let Some(part) = part else {
        return Ok(missing.to_owned());
    };
    let number = integer(part).ok_or_else(|| format!("invalid {field} in fen: {quoted}"))?;

    if number.starts_with('-') {
        Err(format!("{field} cannot be negative: {quoted}"))
    } else {
        Ok(number)
    }
}

/// Reads the placement field of a FEN as python-chess's
/// `Board._set_board_fen` does, raising its message for each row it cannot
/// read.
fn place(placement: &str) -> Result<Placement, String> {
    let quoted = repr(placement);
    let rows: Vec<&str> = placement.split('/').collect();

    if rows.len() != 8 {
        Err(format!("expected 8 rows in position part of fen: {quoted}"))?;
    }

    let mut board = Placement::empty();

    for (row, rank) in rows.iter().zip(Rank::ALL.into_iter().rev()) {
        let mut files = 0;
        let mut after = None;

        for c in row.chars() {
            match (c, piece(c)) {
                ('1'..='8', _) if after == Some('1') => Err(format!(
                    "two subsequent digits in position part of fen: {quoted}"
                ))?,
                ('1'..='8', _) => {
                    files += c.to_digit(10).unwrap_or_default();
                    after = Some('1');
                }
                ('~', _) if after != Some('p') => Err(format!(
                    "'~' not after piece in position part of fen: {quoted}"
                ))?,
                ('~', _) => after = None,
                (_, Some(piece)) => {
                    if let Ok(file) = File::try_from(files) {
                        board.set_piece_at(Square::from_coords(file, rank), piece);
                    }
                    files += 1;
                    after = Some('p');
                }
                _ => Err(format!(
                    "invalid character in position part of fen: {quoted}"
                ))?,
            }
        }

        if files != 8 {
            Err(format!(
                "expected 8 columns per row in position part of fen: {quoted}"
            ))?;
        }
    }

    Ok(board)
}

/// Reads the piece a FEN character names, as python-chess's
/// `Piece.from_symbol` reads any character whose lowercase form is a piece
/// symbol, the Kelvin sign included.
fn piece(c: char) -> Option<Piece> {
    Piece::from_char(if c == '\u{212a}' { 'K' } else { c })
}

/// Reports whether `castling` matches python-chess's
/// `^(?:-|[KQABCDEFGH]{0,2}[kqabcdefgh]{0,2})\Z`.
fn is_castling(castling: &str) -> bool {
    let white = castling
        .bytes()
        .take_while(|c| b"KQABCDEFGH".contains(c))
        .count();
    let black = castling[white..]
        .bytes()
        .take_while(|c| b"kqabcdefgh".contains(c))
        .count();

    castling == "-" || (white <= 2 && black <= 2 && white + black == castling.len())
}

/// Reads the rooks the castling field grants rights to, as python-chess's
/// `Board._set_castling_fen` reads `K` and `Q` as the outermost rook beyond
/// the king and a file letter as the rook on that file.
fn rights(board: &Placement, castling: &str) -> Bitboard {
    castling
        .chars()
        .filter(|&flag| flag != '-')
        .fold(Bitboard::EMPTY, |rights, flag| {
            let color = Color::from_white(flag.is_ascii_uppercase());
            let backrank = Bitboard::from_rank(color.backrank());
            let rooks = board.by_piece(Role::Rook.of(color)) & backrank;
            let king = board.king_of(color);

            rights
                | match flag.to_ascii_lowercase() {
                    'q' => match (king, rooks.first()) {
                        (Some(king), Some(rook)) if rook < king => Bitboard::from(rook),
                        (Some(_), None) => Bitboard::EMPTY,
                        _ => Bitboard::from_file(File::A) & backrank,
                    },
                    'k' => match (king, rooks.last()) {
                        (Some(king), Some(rook)) if king < rook => Bitboard::from(rook),
                        _ => Bitboard::from_file(File::H) & backrank,
                    },
                    file => {
                        File::from_char(file).map_or(Bitboard::EMPTY, Bitboard::from_file)
                            & backrank
                    }
                }
        })
}

/// Writes the castling rights of `pos` as python-chess's `castling_xfen`
/// does, `K` or `Q` for the outermost rook on its side and the rook's file
/// where another rook stands between it and the king.
pub fn castling(pos: &Chess) -> String {
    let board = pos.board();
    let written: String = Color::ALL
        .into_iter()
        .filter_map(|color| Some((color, board.king_of(color)?)))
        .flat_map(|(color, king)| {
            let backrank = Bitboard::from_rank(color.backrank());
            let rooks = board.by_piece(Role::Rook.of(color)) & backrank;

            (pos.castles().castling_rights() & backrank)
                .into_iter()
                .rev()
                .map(move |rook| {
                    let a_side = rook.file() < king.file();
                    let inner = (rooks & !Bitboard::from(rook))
                        .into_iter()
                        .any(|other| (other.file() < king.file()) == a_side);
                    let flag = match (inner, a_side) {
                        (true, _) => rook.file().char(),
                        (false, true) => 'q',
                        (false, false) => 'k',
                    };
                    color.fold_wb(flag.to_ascii_uppercase(), flag)
                })
        })
        .collect();

    if written.is_empty() {
        "-".to_owned()
    } else {
        written
    }
}

/// Reads `part` as Python's `int` reads a FEN field, an optional sign before
/// at most `DIGITS` decimal digits that single underscores may separate,
/// and writes the integer in ASCII digits with no leading zero.
fn integer(part: &str) -> Option<String> {
    let unsigned = part.trim_prefix(['+', '-']);

    if unsigned.split('_').any(str::is_empty) {
        return None;
    }

    let digits: String = unsigned
        .chars()
        .filter(|&c| c != '_')
        .map(digit)
        .collect::<Option<_>>()?;
    let value = match digits.trim_start_matches('0') {
        "" => "0",
        value => value,
    };

    (digits.len() <= DIGITS).then(|| {
        if part.starts_with('-') && value != "0" {
            format!("-{value}")
        } else {
            value.to_owned()
        }
    })
}

/// Reads the ASCII digit `c` stands for, as Python's `int` reads each
/// character with the `Nd` property as its place in its run of ten.
fn digit(c: char) -> Option<char> {
    let code = u32::from(c);
    let zero = ZEROS[..ZEROS.partition_point(|&zero| zero <= code)].last()?;

    char::from_digit(code - zero, 10)
}

/// Writes the decimal `digits` plus `n`, adding `n` to the last 19 digits,
/// whose sum with any `u32` fits a `u64`, and carrying one into the digits
/// before them.
fn plus(digits: &str, n: u32) -> String {
    let (high, low) = digits.split_at(digits.len().saturating_sub(19));
    let sum = low.parse::<u64>().unwrap_or_default() + u64::from(n);

    match sum.checked_sub(10_u64.pow(19)) {
        Some(rest) => format!("{}{rest:019}", plus(high, 1)),
        None if high.is_empty() => sum.to_string(),
        None => format!("{high}{sum:019}"),
    }
}

/// Writes `text` as Python's `repr` writes a string, in single quotes unless
/// only double quotes leave it unescaped, each control or separator
/// character escaped by its code point.
pub fn repr(text: &str) -> String {
    let quote = if text.contains('\'') && !text.contains('"') {
        '"'
    } else {
        '\''
    };
    let mut written = String::from(quote);

    for c in text.chars() {
        match c {
            '\\' => written.push_str("\\\\"),
            '\t' => written.push_str("\\t"),
            '\n' => written.push_str("\\n"),
            '\r' => written.push_str("\\r"),
            c if c == quote => {
                written.push('\\');
                written.push(c);
            }
            c if c.is_control() || (is_space(c) && c != ' ') || is_format(c) => {
                let code = u32::from(c);
                let _ = match code {
                    0..=0xff => write!(written, "\\x{code:02x}"),
                    0x100..=0xffff => write!(written, "\\u{code:04x}"),
                    _ => write!(written, "\\U{code:08x}"),
                };
            }
            c => written.push(c),
        }
    }

    written.push(quote);
    written
}

/// Reports whether `c` is a format character or a private-use character,
/// both of which Python's `repr` escapes.
fn is_format(c: char) -> bool {
    matches!(
        c,
        '\u{ad}'
            | '\u{600}'..='\u{605}'
            | '\u{61c}'
            | '\u{6dd}'
            | '\u{70f}'
            | '\u{180e}'
            | '\u{200b}'..='\u{200f}'
            | '\u{202a}'..='\u{202e}'
            | '\u{2060}'..='\u{2064}'
            | '\u{2066}'..='\u{206f}'
            | '\u{e000}'..='\u{f8ff}'
            | '\u{feff}'
            | '\u{fff9}'..='\u{fffb}'
            | '\u{e0001}'
            | '\u{e0020}'..='\u{e007f}'
            | '\u{f0000}'..='\u{10ffff}'
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_fen_number_reads_as_python_int_reads_it() {
        let nines = "9".repeat(DIGITS);
        let zeros = "0".repeat(DIGITS + 1);

        for (part, number) in [
            ("12", Some("12")),
            ("+12", Some("12")),
            ("-3", Some("-3")),
            ("-0", Some("0")),
            ("007", Some("7")),
            ("1_000", Some("1000")),
            ("+1_0", Some("10")),
            ("٣", Some("3")),
            ("-١_٢", Some("-12")),
            ("１２", Some("12")),
            ("𝟗", Some("9")),
            ("18446744073709551616", Some("18446744073709551616")),
            (&nines, Some(nines.as_str())),
            (&zeros, None),
            ("½", None),
            ("²", None),
            (":", None),
            ("\u{19da}", None),
            ("", None),
            ("+", None),
            ("-", None),
            ("++1", None),
            ("+-1", None),
            ("-+1", None),
            ("_1", None),
            ("1_", None),
            ("-_1", None),
            ("1__0", None),
        ] {
            assert_eq!(integer(part).as_deref(), number, "{part:?}");
        }
    }

    #[test]
    fn a_decimal_carries_past_every_digit_it_fills() {
        for (digits, n, sum) in [
            ("0", 0, "0"),
            ("4294967295", 2, "4294967297"),
            ("9999999999999999999", 1, "10000000000000000000"),
            ("10000000000000000000", 1, "10000000000000000001"),
            ("9223372036854775808", 2, "9223372036854775810"),
            (
                "99999999999999999999999999999999999999",
                u32::MAX,
                "100000000000000000000000000004294967294",
            ),
            (
                "12345678901234567890123456789",
                7,
                "12345678901234567890123456796",
            ),
        ] {
            assert_eq!(plus(digits, n), sum, "{digits} + {n}");
        }
    }

    #[test]
    fn python_chess_writes_its_repr() {
        assert_eq!(repr("it's"), "\"it's\"");
        assert_eq!(repr("a\tb\\\u{a0}\u{200b}é"), "'a\\tb\\\\\\xa0\\u200bé'");
    }
}
