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
pub use positions::{Outcomes, Positions, Run, SECTIONS, Sharing, Stored, Tally, standing};

use std::io;

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
