//! Holds the WebAssembly module wasm-bindgen builds for the site, whose
//! `read` returns each game a PGN text carries as a `Game`.

use wasm_bindgen::prelude::*;

/// One game a PGN text carries, as the site reads it.
#[wasm_bindgen(getter_with_clone, js_name = Game)]
pub struct Exported {
    /// The names of the game's tag pairs, the Seven Tag Roster first.
    #[wasm_bindgen(readonly)]
    pub names: Vec<String>,
    /// The values of the game's tag pairs, in the order of their names.
    #[wasm_bindgen(readonly)]
    pub values: Vec<String>,
    /// The moves of the mainline in UCI notation.
    #[wasm_bindgen(readonly)]
    pub moves: Vec<String>,
    /// The Zobrist hash of each position the mainline reaches.
    #[wasm_bindgen(readonly)]
    pub keys: Vec<u64>,
    /// The message of each error the reader records.
    #[wasm_bindgen(readonly)]
    pub errors: Vec<String>,
}

impl From<crate::Game> for Exported {
    fn from(game: crate::Game) -> Self {
        let (names, values) = game.tags.into_iter().unzip();

        Exported {
            names,
            values,
            moves: game.moves,
            keys: game.keys,
            errors: game.errors,
        }
    }
}

/// Reads every game the PGN text `text` carries as python-chess's reader
/// reads it.
#[wasm_bindgen]
#[must_use]
pub fn read(text: &str) -> Vec<Exported> {
    crate::read(text).into_iter().map(Exported::from).collect()
}
