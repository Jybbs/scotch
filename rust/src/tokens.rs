//! Finds the tokens of a line of movetext as python-chess's `MOVETEXT_REGEX`
//! finds them, trying each alternative of the expression in its order at
//! each position and moving on by one byte where none matches.

use crate::sans::San;

/// The kind of a token python-chess's reader acts on.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Kind {
    /// A move, a castle, a drop, or a null move, which the reader reads
    /// against the board.
    Move,
    /// A `{` opening a comment, the token running to the end of the line.
    Comment,
    /// A `;` opening a comment that runs to the end of the line.
    Rest,
    /// A numeric annotation glyph or a `!` or `?` mark, which the mainline
    /// leaves out.
    Glyph,
    /// A `(` opening a variation.
    Open,
    /// A `)` closing a variation.
    Close,
    /// A game termination marker.
    Result,
}

/// Finds the first token of `line` at or after the byte `from`, returning
/// its kind beside the bytes it spans.
pub fn next(line: &str, from: usize) -> Option<(Kind, usize, usize)> {
    let bytes = line.as_bytes();

    (from..bytes.len()).find_map(|at| {
        let rest = &bytes[at..];
        let starts = |prefix: &[u8]| rest.starts_with(prefix);
        let span = |kind: Kind, length: usize| Some((kind, at, at + length));

        if let Some((_, length)) = San::matched(rest, false) {
            return span(Kind::Move, length);
        }

        let piece = usize::from(b"PNBRQK".contains(&rest[0]));
        if rest.get(piece) == Some(&b'@')
            && rest
                .get(piece + 1)
                .is_some_and(|c| (b'a'..=b'h').contains(c))
            && rest
                .get(piece + 2)
                .is_some_and(|c| (b'1'..=b'8').contains(c))
        {
            return span(Kind::Move, piece + 3);
        }

        if let Some(token) = [
            &b"--"[..],
            b"Z0",
            b"0000",
            b"@@@@",
            b"O-O-O",
            b"O-O",
            b"0-0-0",
            b"0-0",
        ]
        .into_iter()
        .find(|token| starts(token))
        {
            return span(Kind::Move, token.len());
        }

        match rest[0] {
            b'{' => span(Kind::Comment, rest.len()),
            b';' => span(Kind::Rest, rest.len()),
            b'$' if rest.get(1).is_some_and(u8::is_ascii_digit) => span(
                Kind::Glyph,
                1 + rest[1..].iter().take_while(|c| c.is_ascii_digit()).count(),
            ),
            b'(' => span(Kind::Open, 1),
            b')' => span(Kind::Close, 1),
            b'*' => span(Kind::Result, 1),
            b'?' | b'!' => span(
                Kind::Glyph,
                if matches!(rest.get(1), Some(b'?' | b'!')) {
                    2
                } else {
                    1
                },
            ),
            _ => [&b"1-0"[..], b"0-1", b"1/2-1/2"]
                .into_iter()
                .find(|token| starts(token))
                .and_then(|token| span(Kind::Result, token.len())),
        }
    })
}

/// Lists the tokens of `line` from its first byte, for a test to read.
#[cfg(test)]
fn all(line: &str) -> Vec<(Kind, &str)> {
    let mut found = Vec::new();
    let mut from = 0;

    while let Some((kind, start, end)) = next(line, from) {
        found.push((kind, &line[start..end]));
        from = end;
    }

    found
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_line_splits_into_python_chess_s_tokens() {
        assert_eq!(
            all("1. e4 e5 2. Nf3!? (2. f4 exf4) {a comment}\n"),
            [
                (Kind::Move, "e4"),
                (Kind::Move, "e5"),
                (Kind::Move, "Nf3"),
                (Kind::Glyph, "!?"),
                (Kind::Open, "("),
                (Kind::Move, "f4"),
                (Kind::Move, "exf4"),
                (Kind::Close, ")"),
                (Kind::Comment, "{a comment}\n"),
            ]
        );
    }

    #[test]
    fn each_alternative_matches_in_the_order_python_chess_tries_it() {
        assert_eq!(
            all("O-O-O 0-0 0-1 1/2-1/2 * $14 -- Z0 N@f3 e8=Q+ ; rest\n"),
            [
                (Kind::Move, "O-O-O"),
                (Kind::Move, "0-0"),
                (Kind::Result, "0-1"),
                (Kind::Result, "1/2-1/2"),
                (Kind::Result, "*"),
                (Kind::Glyph, "$14"),
                (Kind::Move, "--"),
                (Kind::Move, "Z0"),
                (Kind::Move, "N@f3"),
                (Kind::Move, "e8=Q"),
                (Kind::Rest, "; rest\n"),
            ]
        );
        assert_eq!(
            all("----- 1e4 e4e5"),
            [
                (Kind::Move, "--"),
                (Kind::Move, "--"),
                (Kind::Move, "1e4"),
                (Kind::Move, "e4e5"),
            ]
        );
    }
}
