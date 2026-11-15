//! Reads chess games out of Portable Game Notation (PGN) text as
//! python-chess 1.11.2's reader reads them and keys each position they reach
//! by its Polyglot Zobrist hash, for Scotch's command line through `PyO3`
//! and for its site through `wasm-bindgen`, and holds the positions of the
//! stored games a game is matched against.

mod boards;
mod codes;
mod fens;
mod games;
mod lines;
mod positions;
#[cfg(feature = "python")]
mod python;
mod sans;
mod tags;
mod tokens;
#[cfg(feature = "wasm")]
mod wasm;

pub use games::{Game, read, read_at, trails};
pub use positions::{
    CEILING, Outcomes, Part, Positions, Run, SECTIONS, Sharing, Stored, Tally, rating, standing,
};

use std::io;

use itertools::Itertools;

use crate::{boards::Board, codes::Writer};

/// Keys each position of the mainline `moves` names in Universal Chess
/// Interface (UCI) notation, from the position `fen` sets up or the standard
/// starting position.
///
/// Returns no key where `fen` names no position, or where `variant` names a
/// variant python-chess reads under rules of its own or names no rules it
/// reads, and stops at the first move illegal in the position it is played
/// from.
#[must_use]
pub fn keys(
    fen: Option<&str>,
    variant: Option<&str>,
    moves: impl IntoIterator<Item = String>,
) -> Vec<u64> {
    let Some(mut board) = Board::started(fen, variant) else {
        return Vec::new();
    };

    std::iter::once(board.key())
        .chain(moves.into_iter().map_while(|uci| {
            board
                .named(&uci)
                .is_some_and(|turn| board.take(turn))
                .then(|| board.key())
        }))
        .collect()
}

/// The names python-chess's `Board.aliases` gives standard chess, the one
/// variant a game is matched under.
pub const STANDARD: [&str; 6] = [
    "Standard",
    "Chess",
    "Classical",
    "Normal",
    "Illegal",
    "From Position",
];

/// Lists `errors` beside a message naming the variant `variant` names
/// wherever it names other than standard chess, once each in the order
/// first listed, as `Game.problems` lists them.
#[must_use]
pub fn problems(variant: Option<&str>, errors: Vec<String>) -> Vec<String> {
    let variant = variant.unwrap_or("Standard");

    if STANDARD
        .iter()
        .any(|name| name.eq_ignore_ascii_case(variant))
    {
        return errors;
    }

    errors
        .into_iter()
        .chain([format!("unsupported variant: {variant}")])
        .unique()
        .collect()
}

/// Writes each move of the mainline `moves` names in UCI notation in
/// Standard Algebraic Notation (SAN), beside the piece placement of each
/// position from the start, one more than the moves, from the position `fen`
/// sets up or the standard starting position.
///
/// Returns neither where `keys` returns no key, and stops where it stops.
#[must_use]
pub fn scored(
    fen: Option<&str>,
    variant: Option<&str>,
    moves: impl IntoIterator<Item = impl AsRef<str>>,
) -> (Vec<String>, Vec<String>) {
    Board::started(fen, variant).map_or_else(Default::default, |board| board.scored(moves))
}

/// Writes the mainline `moves` names in UCI notation as `Positions` stores
/// it, from the position `fen` sets up or the standard starting position.
///
/// Returns no byte where `keys` returns no key, and stops where it stops.
///
/// # Errors
///
/// Returns the error the bit writer raises.
pub fn encoded(
    fen: Option<&str>,
    variant: Option<&str>,
    moves: impl IntoIterator<Item = String>,
) -> io::Result<Vec<u8>> {
    let Some(mut board) = Board::started(fen, variant) else {
        return Ok(Vec::new());
    };
    let mut writer = Writer::default();

    for uci in moves {
        let Some(turn) = board.named(&uci) else {
            break;
        };
        let mut next = board.clone();

        if !next.take(turn) {
            break;
        }

        writer.play(&board, turn)?;
        board = next;
    }

    writer.finish()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_variant_adds_one_problem_unless_it_names_standard_chess() {
        let unsupported = |variant: &str| vec![format!("unsupported variant: {variant}")];

        for (variant, errors, expected) in [
            (None, vec![], vec![]),
            (Some("chess"), vec![], vec![]),
            (
                Some("From Position"),
                vec!["illegal san".to_owned()],
                vec!["illegal san".to_owned()],
            ),
            (Some("Atomic"), vec![], unsupported("Atomic")),
            (
                Some("Bughouse"),
                unsupported("Bughouse"),
                unsupported("Bughouse"),
            ),
            (Some(""), unsupported(""), unsupported("")),
        ] {
            assert_eq!(problems(variant, errors), expected, "{variant:?}");
        }
    }
}
