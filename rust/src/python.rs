//! Holds the `scotch.games.readers` extension module `PyO3` builds, which
//! `Game.read` reads each PGN file through, `Game.keys` keys a game through,
//! and `PositionIndex` holds its positions through.

use std::{
    io::{self, ErrorKind},
    path::PathBuf,
};

use itertools::{Itertools, izip};
use pyo3::{
    exceptions::PyValueError,
    prelude::*,
    pybacked::PyBackedBytes,
    types::{PyBytes, PyString},
};

use crate::{Outcomes, Part, Sharing, Stored, Tally};

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

/// Lists what the reader passes over with no error in the first game the PGN
/// text `text` carries, meaning each word of the movetext holding no token and
/// reading as no move number, each line opening on `[` that holds no tag pair,
/// a `{` the text never closes, a `(` the text never closes or that opens
/// before any move, and a `)` with no `(` open.
#[pyfunction]
fn skipped(text: &str) -> Vec<String> {
    crate::read_at(text, 0).map_or_else(Vec::new, |(game, _)| game.skipped)
}

/// Reads whether the PGN text `text` holds more past the end of the first
/// game it carries than blank lines and lines opening on `%` or `;`, which the
/// reader passes over, whether another game or text holding no tag pair.
#[pyfunction]
fn trails(text: &str) -> bool {
    crate::read_at(text, 0).is_some_and(|(_, at)| crate::trails(text, at))
}

/// Keys each position of the mainline `moves` names in UCI notation, from
/// the position `fen` sets up under the variant `variant` names.
#[pyfunction]
#[pyo3(signature = (moves, fen=None, variant=None))]
fn keys(moves: Vec<String>, fen: Option<&str>, variant: Option<&str>) -> Vec<u64> {
    crate::keys(fen, variant, moves)
}

/// Writes the mainline `moves` names in UCI notation as `Positions` stores
/// it, from the position `fen` sets up under the variant `variant` names.
#[pyfunction]
#[pyo3(signature = (moves, fen=None, variant=None))]
fn encoded(moves: Vec<String>, fen: Option<&str>, variant: Option<&str>) -> PyResult<Vec<u8>> {
    crate::encoded(fen, variant, moves).map_err(raised)
}

/// Writes each move of the mainline `moves` names in UCI notation in SAN,
/// beside the piece placement of each position from the start, from the
/// position `fen` sets up under the variant `variant` names.
#[pyfunction]
#[pyo3(signature = (moves, fen=None, variant=None))]
fn scored(
    moves: Vec<String>,
    fen: Option<&str>,
    variant: Option<&str>,
) -> (Vec<String>, Vec<String>) {
    crate::scored(fen, variant, moves)
}

/// Ranks a game among those tied on their longest run from its `WhiteElo` and
/// `BlackElo` tags.
#[pyfunction]
#[pyo3(signature = (white=None, black=None))]
fn standing(white: Option<&str>, black: Option<&str>) -> u16 {
    crate::standing(white, black)
}

/// Raises `error`, a file under another layout and an input naming nothing as
/// `ValueError` and any other as the `OSError` `PyO3` maps it to.
fn raised(error: io::Error) -> PyErr {
    match error.kind() {
        ErrorKind::InvalidData | ErrorKind::InvalidInput => {
            PyValueError::new_err(error.to_string())
        }
        _ => error.into(),
    }
}

/// The columns of a list of runs: the games, offsets, starts, and lengths.
type Columns = (Vec<u32>, Vec<i64>, Vec<u32>, Vec<u32>);

/// Lays `runs` out as columns.
fn columns(runs: &[crate::Run]) -> Columns {
    runs.iter()
        .map(|run| (run.game, run.offset, run.start, run.length))
        .multiunzip()
}

/// What a tally returns: each move beside its outcomes, the outcomes of the
/// games ending at the position, and the games listed.
type Tallied = (Vec<(String, Outcomes)>, Outcomes, Vec<u32>);

/// What a count of sharing returns: each game's first ply alone, each group's
/// games sharing at each ply, and each count of games beside the keys it reaches.
type Shared = (Vec<Option<u16>>, Vec<Vec<u32>>, Vec<(u32, u64)>);

/// The stored games, every position they reach, and their moves.
#[pyclass(frozen, name = "Positions")]
struct Held(crate::Positions);

#[pymethods]
impl Held {
    /// Lays the stored games out from their columns, numbering each game by
    /// its place in them.
    #[staticmethod]
    #[expect(clippy::needless_pass_by_value, reason = "PyO3 extracts owned values")]
    fn build(
        moves: Vec<PyBackedBytes>,
        plies: Vec<u16>,
        fens: Vec<Option<String>>,
        variants: Vec<Option<String>>,
        standings: Vec<u16>,
        dates: Vec<u32>,
        results: Vec<u8>,
    ) -> PyResult<Self> {
        let stored = izip!(
            &moves, &plies, &fens, &variants, &standings, &dates, &results
        )
        .map(
            |(moves, &plies, fen, variant, &standing, &dated, &result)| Stored {
                moves,
                plies,
                fen: fen.as_deref(),
                variant: variant.as_deref(),
                standing,
                dated,
                result,
            },
        )
        .collect_vec();

        Ok(Self(crate::Positions::build(&stored).map_err(raised)?))
    }

    /// Maps the file at `path` into memory.
    #[staticmethod]
    #[expect(clippy::needless_pass_by_value, reason = "PyO3 extracts owned values")]
    fn read(path: PathBuf) -> PyResult<Self> {
        Ok(Self(crate::Positions::read(&path).map_err(raised)?))
    }

    /// Writes the file to `path`.
    #[expect(clippy::needless_pass_by_value, reason = "PyO3 extracts owned values")]
    fn write(&self, path: PathBuf) -> PyResult<()> {
        self.0.write(&path).map_err(raised)
    }

    /// Counts the stored games.
    #[getter]
    fn games(&self) -> usize {
        self.0.games()
    }

    /// Counts the positions the stored games reach.
    #[getter]
    fn positions(&self) -> u64 {
        self.0.positions()
    }

    /// Counts the distinct keys the stored games reach.
    #[getter]
    fn keys(&self) -> u64 {
        self.0.keys()
    }

    /// Counts the key pieces and the game pieces past the head.
    #[getter]
    fn pieces(&self) -> (usize, usize) {
        self.0.pieces()
    }

    /// Returns the bytes of the key piece numbered `at` where `keys` is set,
    /// and otherwise of the game piece numbered `at`.
    fn part<'py>(&self, py: Python<'py>, keys: bool, at: u32) -> PyResult<Bound<'py, PyBytes>> {
        let part = if keys {
            Part::Keys(at)
        } else {
            Part::Games(at)
        };

        Ok(PyBytes::new(py, &self.0.part(part).map_err(raised)?))
    }

    /// Reads the number of each stored game the game piece numbered `at`
    /// holds, in the order of their slots.
    fn numbers(&self, at: u32) -> Vec<u32> {
        self.0.numbers(at)
    }

    /// Writes the head of a file holding these key pieces and game pieces
    /// of the bytes `sizes` lists in order.
    #[expect(clippy::needless_pass_by_value, reason = "PyO3 extracts owned values")]
    fn rehead<'py>(&self, py: Python<'py>, sizes: Vec<u64>) -> PyResult<Bound<'py, PyBytes>> {
        Ok(PyBytes::new(py, &self.0.rehead(&sizes).map_err(raised)?))
    }

    /// Reads the moves of `game` in UCI notation.
    fn moves(&self, game: u32) -> Vec<String> {
        self.0.moves(game)
    }

    /// Finds at most `top` stored games at their longest runs with a game
    /// reaching `keys`, as columns beside the count of other stored games
    /// sharing a run as long as the first's.
    #[expect(clippy::needless_pass_by_value, reason = "PyO3 extracts owned values")]
    fn best(&self, keys: Vec<u64>, top: usize) -> (Columns, usize) {
        let (runs, ties) = self.0.best(&keys, top);

        (columns(&runs), ties)
    }

    /// Finds every run a stored game shares with a game reaching `keys`, as
    /// columns.
    #[expect(clippy::needless_pass_by_value, reason = "PyO3 extracts owned values")]
    fn runs(&self, keys: Vec<u64>) -> Columns {
        columns(&self.0.runs(&keys))
    }

    /// Counts the stored games reaching each of `keys`.
    #[expect(clippy::needless_pass_by_value, reason = "PyO3 extracts owned values")]
    fn reach(&self, keys: Vec<u64>) -> Vec<u32> {
        self.0.reach(&keys)
    }

    /// Counts how far each stored game shares its positions with the rest,
    /// as each game's first ply standing alone, the games of each group
    /// `groups` names standing at each ply in a position another stored game
    /// reaches, and each count of games reaching a key beside its keys, per
    /// `Positions::sharing`.
    #[expect(clippy::needless_pass_by_value, reason = "PyO3 extracts owned values")]
    fn sharing(&self, groups: Vec<u16>) -> Shared {
        let Sharing {
            alone,
            shared,
            reach,
        } = self.0.sharing(&groups);

        (alone, shared, reach)
    }

    /// Counts the stored games playing each line of at most `depth` moves
    /// from the standard starting position that at least `least` of them
    /// play, per `Positions::lines`.
    fn lines(&self, depth: u16, least: u32) -> Vec<(Vec<String>, u32)> {
        self.0.lines(depth, least)
    }

    /// Counts what the stored games played from the position `moves` reach in
    /// UCI notation from the position `fen` names or the standard starting
    /// position, as each move beside its outcomes, the outcomes of the games
    /// ending there, and at most `top` games.
    #[expect(clippy::needless_pass_by_value, reason = "PyO3 extracts owned values")]
    fn tally(&self, moves: Vec<String>, fen: Option<&str>, top: usize) -> PyResult<Tallied> {
        let Tally {
            moves,
            ended,
            games,
        } = self.0.tally(fen, &moves, top).map_err(raised)?;

        Ok((moves, ended, games))
    }
}

/// Reads and keys chess games, and holds the positions of the stored games.
#[pymodule]
mod readers {
    #[pymodule_export]
    use super::{Held, encoded, keys, read, scored, skipped, standing, trails};

    /// Each section of `positions.bin`, by its name, beside how it is held and
    /// what it holds, in the order the file holds them.
    #[pymodule_export]
    const STANDARD: [&str; 6] = crate::STANDARD;

    #[pymodule_export]
    const SECTIONS: [(&str, &str, &str); 22] = crate::SECTIONS;
}
