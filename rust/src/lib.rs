//! Reads chess games out of Portable Game Notation (PGN) text as
//! python-chess 1.11.2's reader reads them and keys each position they reach
//! by its Polyglot Zobrist hash, for Scotch's command line through `PyO3`
//! and for its site through `wasm-bindgen`.

mod boards;
mod fens;
mod games;
mod lines;
#[cfg(feature = "python")]
mod python;
mod sans;
mod tags;
mod tokens;
#[cfg(feature = "wasm")]
mod wasm;

pub use games::{Game, read, read_at};

use crate::{boards::Board, tags::Rules};

/// Keys each position of the mainline `moves` names in Universal Chess
/// Interface (UCI) notation, from the position `fen` sets up or the standard
/// starting position, as python-chess keys each board a game's tags and
/// moves yield.
///
/// Returns no key where `variant` names a variant other than standard chess
/// and Chess960 or `fen` names no position, and stops at the first move
/// illegal in the position it is played from.
#[must_use]
pub fn keys(
    fen: Option<&str>,
    variant: Option<&str>,
    moves: impl IntoIterator<Item = String>,
) -> Vec<u64> {
    let Some(mut board) = Rules::named(variant)
        .ok()
        .filter(|&rules| rules != Rules::Variant)
        .and_then(|rules| Board::set_up(fen, rules).ok())
    else {
        return Vec::new();
    };

    std::iter::once(board.key())
        .chain(moves.into_iter().map_while(|uci| {
            let played = match uci.as_str() {
                "0000" => board.pass(),
                _ => uci
                    .parse::<shakmaty::uci::UciMove>()
                    .ok()
                    .and_then(|m| m.to_move(&board.position).ok())
                    .map(|m| board.play(m))
                    .is_some(),
            };
            played.then(|| board.key())
        }))
        .collect()
}
