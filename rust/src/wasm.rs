//! Holds the WebAssembly module wasm-bindgen builds for the site, whose
//! `read` returns each game a PGN text carries as a `Game` and whose `Store`
//! matches one against the published store, read a piece at a time.

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
    /// The moves of the mainline in Standard Algebraic Notation (SAN).
    #[wasm_bindgen(readonly)]
    pub sans: Vec<String>,
    /// The piece placement of each position from the start, one more than
    /// the moves.
    #[wasm_bindgen(readonly)]
    pub placements: Vec<String>,
    /// The Zobrist hash of each position the mainline reaches.
    #[wasm_bindgen(readonly)]
    pub keys: Vec<u64>,
    /// The message of each error the reader records, beside one naming a
    /// variant other than standard chess, as `scotch match game` reports
    /// them.
    #[wasm_bindgen(readonly)]
    pub errors: Vec<String>,
}

impl From<crate::Game> for Exported {
    fn from(game: crate::Game) -> Self {
        let tag = |name: &str| {
            game.tags
                .iter()
                .find_map(|(key, value)| (key == name).then_some(value.as_str()))
        };
        let (sans, placements) = crate::scored(tag("FEN"), tag("Variant"), &game.moves);
        let errors = crate::problems(tag("Variant"), game.errors);
        let (names, values) = game.tags.into_iter().unzip();

        Exported {
            names,
            values,
            sans,
            placements,
            moves: game.moves,
            keys: game.keys,
            errors,
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

/// A piece of the published store a lookup reached before the store held it,
/// with the bytes of the published object it spans.
#[wasm_bindgen(js_name = Piece)]
pub struct Wanted {
    /// Whether the piece holds keys rather than games.
    #[wasm_bindgen(readonly)]
    pub keys: bool,
    /// The number of the piece among its kind.
    #[wasm_bindgen(readonly)]
    pub at: u32,
    /// The first byte of the object the piece takes.
    #[wasm_bindgen(readonly)]
    pub from: u64,
    /// The byte past the last the piece takes.
    #[wasm_bindgen(readonly)]
    pub to: u64,
}

/// One stored game a match reports, at its longest run shared with the
/// submitted game.
#[derive(Clone, Copy)]
#[wasm_bindgen(js_name = Run)]
pub struct Found {
    /// The number of the stored game.
    #[wasm_bindgen(readonly)]
    pub game: u32,
    /// The slot the stored game takes, which `side` reads.
    #[wasm_bindgen(readonly)]
    pub slot: u32,
    /// The game piece holding the game.
    #[wasm_bindgen(readonly)]
    pub piece: u32,
    /// The game's place among the games its piece holds, which is its place
    /// among the tags the piece's block carries.
    #[wasm_bindgen(readonly)]
    pub place: u32,
    /// The ply of the stored game the run opens at, less the ply of the
    /// submitted game it opens at.
    #[wasm_bindgen(readonly)]
    pub offset: i32,
    /// The ply of the submitted game the run opens at.
    #[wasm_bindgen(readonly)]
    pub start: u32,
    /// The positions the run holds.
    #[wasm_bindgen(readonly)]
    pub length: u32,
    /// The rating of the stored game's players, which ranks a tie.
    #[wasm_bindgen(readonly)]
    pub standing: u16,
}

impl From<crate::Run> for Found {
    fn from(run: crate::Run) -> Self {
        let (piece, place) = crate::Positions::shelf(run.slot);

        Found {
            game: run.game,
            slot: run.slot,
            piece,
            place,
            offset: i32::try_from(run.offset).unwrap_or_default(),
            start: run.start,
            length: run.length,
            standing: run.standing,
        }
    }
}

/// The runs `best` finds, beside the count of stored games other than the
/// first holding a run as long as its.
#[wasm_bindgen(getter_with_clone, js_name = Best)]
pub struct Best {
    /// The runs, the longest first.
    #[wasm_bindgen(readonly)]
    pub runs: Vec<Found>,
    /// The stored games other than the first holding a run as long as its.
    #[wasm_bindgen(readonly)]
    pub ties: usize,
}

/// The moves of a stored game and the positions they reach, as a match file
/// holds them.
#[wasm_bindgen(getter_with_clone)]
pub struct Side {
    /// The moves in Standard Algebraic Notation (SAN).
    #[wasm_bindgen(readonly)]
    pub moves: Vec<String>,
    /// The piece placement of each position from the start, one more than
    /// the moves.
    #[wasm_bindgen(readonly)]
    pub placements: Vec<String>,
}

/// The published store as the site reads it, from its head and each piece a
/// lookup reaches.
#[wasm_bindgen]
pub struct Store(crate::Positions);

#[wasm_bindgen]
impl Store {
    /// Reads the head of the published store out of `head`.
    ///
    /// # Errors
    ///
    /// Returns an error where `head` holds another layout.
    #[wasm_bindgen(constructor)]
    pub fn new(head: Vec<u8>) -> Result<Store, JsError> {
        Ok(Store(crate::Positions::started(head)?))
    }

    /// Reads `bytes` as the key piece numbered `at` where `keys` is set, and
    /// otherwise as the game piece numbered `at`.
    ///
    /// # Errors
    ///
    /// Returns an error where the store holds no such piece or `bytes` hold
    /// another layout.
    pub fn add(&self, keys: bool, at: u32, bytes: Vec<u8>) -> Result<(), JsError> {
        let part = if keys {
            crate::Part::Keys(at)
        } else {
            crate::Part::Games(at)
        };

        Ok(self.0.add(part, bytes)?)
    }

    /// Takes each piece a lookup reached since the last call before `add`
    /// gave it, so an answer given while any was listed is incomplete.
    #[must_use]
    pub fn wanted(&self) -> Vec<Wanted> {
        self.0
            .wanted()
            .into_iter()
            .filter_map(|part| {
                let (from, to) = self.0.span(part)?;
                let (keys, at) = match part {
                    crate::Part::Keys(at) => (true, at),
                    crate::Part::Games(at) => (false, at),
                };

                Some(Wanted { keys, at, from, to })
            })
            .collect()
    }

    /// Finds at most `top` stored games sharing the longest runs with a game
    /// reaching `keys`, as `scotch match game` finds them.
    #[must_use]
    pub fn best(&self, keys: &[u64], top: usize) -> Best {
        let (runs, ties) = self.0.best(keys, top);

        Best {
            runs: runs.into_iter().map(Found::from).collect(),
            ties,
        }
    }

    /// Reads the moves of the stored game at `slot` in Standard Algebraic
    /// Notation (SAN), beside the piece placement of each position from its
    /// start.
    #[must_use]
    pub fn side(&self, slot: u32) -> Side {
        let (moves, placements) = self.0.scored(slot);

        Side { moves, placements }
    }
}
