//! Holds the `scotch.games.readers` extension module `PyO3` builds, which
//! `Game.read` reads each PGN file through and `Game.keys` keys a game
//! through.

use pyo3::{prelude::*, types::PyString};

/// The tags, the moves, the keys, and the errors of one game, in the order
/// `Game` declares them.
type Read = (Vec<(String, String)>, Vec<String>, Vec<u64>, Vec<String>);

/// The games a PGN text carries, each read as the iteration reaches it.
#[pyclass]
struct Reader {
    /// The text.
    text: Py<PyString>,
    /// The byte of the text the next game's lines open at.
    at: usize,
}

#[pymethods]
impl Reader {
    /// Iterates the reader over its own games.
    fn __iter__(this: PyRef<'_, Self>) -> PyRef<'_, Self> {
        this
    }

    /// Reads the next game, or `None` once the text holds no more.
    fn __next__(&mut self, py: Python<'_>) -> PyResult<Option<Read>> {
        let found = crate::read_at(self.text.bind(py).to_str()?, self.at);

        Ok(found.map(|(game, at)| {
            self.at = at;
            (game.tags, game.moves, game.keys, game.errors)
        }))
    }
}

/// Reads the games the PGN text `text` carries as python-chess's reader
/// reads them, one at a time as the iteration reaches each, each as its tag
/// pairs, its mainline's moves in UCI notation, the Zobrist hash of each
/// position the mainline reaches, and the message of each error the reader
/// records.
#[pyfunction]
fn read(text: Py<PyString>) -> Reader {
    Reader { text, at: 0 }
}

/// Keys each position of the mainline `moves` names in UCI notation, from
/// the position `fen` sets up under the variant `variant` names, as
/// python-chess keys each board a game's tags and moves yield.
#[pyfunction]
#[pyo3(signature = (moves, fen=None, variant=None))]
fn keys(moves: Vec<String>, fen: Option<&str>, variant: Option<&str>) -> Vec<u64> {
    crate::keys(fen, variant, moves)
}

/// Reads and keys chess games as python-chess reads and keys them.
#[pymodule]
mod readers {
    #[pymodule_export]
    use super::{keys, read};
}
