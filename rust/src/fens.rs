//! Reads the Forsyth–Edwards Notation (FEN) a `FEN` tag holds as
//! python-chess's `Board.set_fen` reads it, and writes castling rights back
//! as its `castling_xfen` writes them, each message worded as python-chess
//! words it.

use core::{fmt::Write, num::NonZeroU32};

use shakmaty::{
    Bitboard, Board as Placement, Chess, Color, File, Piece, Position, Rank, Role, Setup, Square,
};

use crate::lines::is_space;

/// Reads `fen` as python-chess's `Board.set_fen` reads it, each field after
/// the placement optional, raising the message it raises for each field it
/// cannot read.
pub fn read(fen: &str) -> Result<Setup, String> {
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
    let halfmoves = match parts.next() {
        None => 0,
        Some(part) => {
            let clock =
                integer(part).ok_or_else(|| format!("invalid half-move clock in fen: {quoted}"))?;
            u32::try_from(clock)
                .map_err(|_| format!("half-move clock cannot be negative: {quoted}"))?
        }
    };
    let fullmoves = match parts.next() {
        None => 1,
        Some(part) => {
            let number =
                integer(part).ok_or_else(|| format!("invalid fullmove number in fen: {quoted}"))?;
            u32::try_from(number)
                .map_err(|_| format!("fullmove number cannot be negative: {quoted}"))?
        }
    };

    if parts.next().is_some() {
        Err(format!("fen string has more parts than expected: {quoted}"))?;
    }

    let board = place(placement)?;
    let castling_rights = rights(&board, castling);

    Ok(Setup {
        board,
        castling_rights,
        ep_square,
        fullmoves: NonZeroU32::new(fullmoves).unwrap_or(NonZeroU32::MIN),
        halfmoves,
        turn,
        ..Setup::empty()
    })
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
/// ASCII digits that single underscores may separate.
fn integer(part: &str) -> Option<i64> {
    let digits = part.strip_prefix(['+', '-']).unwrap_or(part);
    let grouped = !digits.starts_with('_')
        && !digits.ends_with('_')
        && !digits.contains("__")
        && digits.bytes().any(|c| c.is_ascii_digit())
        && digits.bytes().all(|c| c.is_ascii_digit() || c == b'_');

    grouped
        .then(|| part.replace('_', "").parse::<i64>().ok())
        .flatten()
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
    fn python_chess_writes_its_repr() {
        assert_eq!(repr("it's"), "\"it's\"");
        assert_eq!(repr("a\tb\\\u{a0}\u{200b}é"), "'a\\tb\\\\\\xa0\\u200bé'");
    }
}
