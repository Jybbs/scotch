//! Holds `Positions`, the file `scotch index games` writes beside the stored
//! games' tags, which finds every stored game reaching a position, matches a
//! game against them, and counts the moves they played.
//!
//! The file holds each game's mainline as `codes` writes it and enough of
//! each key to narrow a lookup to a few candidate lists of games, games from
//! those lists then being played through and their full keys compared to
//! confirm the list holding the key, so no result depends on part of a key.
//! A game is placed by its moves' bytes in a numbering of its own, its slot,
//! which lays the games sharing an opening side by side in a list of slots.
//!
//! Past a short head, the file splits into key pieces, each holding the keys
//! whose leading bits number it, and game pieces, each holding the slots
//! whose leading bits number it, so a lookup reads the one key piece holding
//! its key and the game pieces holding the games it plays through. Each
//! piece is read where it lies in the mapped file on the first lookup
//! reaching it. A file held in part, as the site holds it, starts from its
//! head alone, reads each piece once `add` gives it, and lists each piece a
//! lookup reached before then in `wanted`.

use std::{
    cmp::Reverse,
    collections::{BTreeSet, HashMap},
    fs::{self, File},
    io::{self, ErrorKind},
    iter, mem,
    path::Path,
    sync::{Mutex, OnceLock, PoisonError},
};

use integer_encoding::{VarIntReader, VarIntWriter};
use itertools::{Itertools, izip};
use memmap2::Mmap;
use sucds::{
    Serializable, SucdsError,
    bit_vectors::{Access, BitVector},
    int_vectors::CompactVector,
    mii_sequences::{EliasFano, EliasFanoBuilder},
    serial::Bytes,
};

use crate::{boards::Board, codes::Reader};

/// The number opening the file, which changes with its layout.
const MAGIC: u64 = u64::from_le_bytes(*b"scotch-2");

/// Each section of the file `image` writes, in the order it writes them, by
/// its name, beside how it is held and what it holds. A slot is a game's place
/// in the file, the games sorted by their moves, and the head's sections come
/// first, then each key piece's, then each game piece's, then `slots`.
pub const SECTIONS: [(&str, &str, &str); 22] = [
    (
        "magic",
        "8 bytes",
        "The bytes `scotch-2`, which change with the layout",
    ),
    (
        "count",
        "An integer",
        "The positions the stored games reach",
    ),
    (
        "distinct",
        "An integer",
        "The distinct keys the stored games reach",
    ),
    ("games", "An integer", "The stored games"),
    (
        "pieces",
        "An Elias-Fano sequence",
        "The byte past the head each key piece opens at, beside the byte past the last",
    ),
    (
        "shelves",
        "An Elias-Fano sequence",
        "The byte past the last key piece each game piece opens at, beside the byte past the last",
    ),
    (
        "once",
        "An Elias-Fano sequence",
        "The key piece's leading bits of each key one position of one game reaches",
    ),
    (
        "blocks",
        "A compact vector",
        "The block of slots holding the game reaching each key of `once`",
    ),
    (
        "shared",
        "An Elias-Fano sequence",
        "The key piece's leading bits of each key several positions reach",
    ),
    (
        "boundaries",
        "An Elias-Fano sequence",
        "The byte of `lists` each key of `shared` opens its list at, beside the byte past the last",
    ),
    (
        "lists",
        "Bytes",
        "The slots reaching each key of `shared`, by the ply each reaches it at",
    ),
    (
        "numbers",
        "A compact vector",
        "Each of the game piece's slots' game, its row in `games.parquet`",
    ),
    (
        "standings",
        "A compact vector",
        "Each of its slots' rank among games tied on a run",
    ),
    (
        "dates",
        "A compact vector",
        "Each of its slots' `Date` tag as a number",
    ),
    (
        "results",
        "A compact vector",
        "Each of its slots' result, as its place among a win for White, a draw, a win for Black, and any other",
    ),
    (
        "plies",
        "A compact vector",
        "The count of each of its slots' mainline plies, whose positions the index keys",
    ),
    (
        "offsets",
        "An Elias-Fano sequence",
        "The byte of `moves` each of its slots' moves open at, beside the byte past the last",
    ),
    (
        "started",
        "A vector",
        "Each of its slots whose tags name its start, by its place among them",
    ),
    (
        "fens",
        "A vector",
        "The `FEN` tag of each slot `started` lists",
    ),
    (
        "variants",
        "A vector",
        "The `Variant` tag of each slot `started` lists",
    ),
    ("moves", "Bytes", "Each of its slots' mainline, encoded"),
    ("slots", "A compact vector", "Each game's slot"),
];

/// The base 2 logarithm of the distinct keys a key piece holds on average,
/// rounded down, from which `image` sets the count of key pieces.
const PIECE_BITS: u32 = 11;

/// The bits of a slot past those numbering its game piece.
const SHELF_BITS: u32 = 7;

/// The bits a block of slots is numbered in.
const BLOCK_BITS: u32 = 16;

/// The bits a prefix holds past the base 2 logarithm of its list's length,
/// which leave at most one key in 32 sharing its prefix with another by chance.
const PREFIX_BITS: u32 = 6;

/// The `standing` of a game carrying both ratings, above every other.
const BOTH_RATED: u16 = 0x8000;

/// The highest rating `rating` reads a tag as, the next hundred above 2882,
/// the highest standard rating FIDE has published, which the Progress tab of
/// Magnus Carlsen's profile at <https://ratings.fide.com/profile/1503014>
/// records.
pub const CEILING: u16 = 2900;

/// A position a game reaches, which sorts by its key, then its ply, then its
/// slot.
#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
struct Row {
    key: u64,
    ply: u16,
    slot: u32,
}

/// The keys of each game played through for one query, by its slot.
type Cache = HashMap<u32, Vec<u64>>;

/// The `FEN` and `Variant` tags naming a game's start.
type Start = (Option<String>, Option<String>);

/// The bytes of one tag as the file holds them.
type Tag = Option<Vec<u8>>;

/// The stored games that end in each way: a win for White, a draw, a win for
/// Black, and any other result.
pub type Outcomes = [u32; 4];

/// Reads a `WhiteElo` or `BlackElo` tag as a rating where it holds ASCII
/// digits alone naming a whole number from 1 to `CEILING`, and as no rating
/// otherwise.
#[must_use]
pub fn rating(tag: Option<&str>) -> Option<u16> {
    tag.filter(|text| text.bytes().all(|byte| byte.is_ascii_digit()))
        .and_then(|text| text.parse().ok())
        .filter(|rating| (1..=CEILING).contains(rating))
}

/// Ranks a game among those tied on their longest run from its two tags
/// `WhiteElo` and `BlackElo` as `rating` reads them: the sum of both where it
/// carries both, above any game carrying one, then that one rating, then 0
/// for no rating at all.
#[must_use]
pub fn standing(white: Option<&str>, black: Option<&str>) -> u16 {
    match (rating(white), rating(black)) {
        (Some(white), Some(black)) => BOTH_RATED | (white + black),
        (Some(rating), None) | (None, Some(rating)) => rating,
        (None, None) => 0,
    }
}

/// One stored game as `Positions::build` reads it.
#[derive(Clone, Copy, Debug)]
pub struct Stored<'a> {
    /// The mainline as `encoded` writes it.
    pub moves: &'a [u8],
    /// The moves the mainline holds.
    pub plies: u16,
    /// The `FEN` tag.
    pub fen: Option<&'a str>,
    /// The `Variant` tag.
    pub variant: Option<&'a str>,
    /// The rank `standing` gives the game.
    pub standing: u16,
    /// The `Date` tag as the number `YYYYMMDD`, an unknown part as 0.
    pub dated: u32,
    /// The place of the game's result among `Outcomes`.
    pub result: u8,
}

/// An unbroken run of positions a stored game shares with a submitted game.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Run {
    /// The stored game.
    pub game: u32,
    /// The stored game's slot.
    pub slot: u32,
    /// The stored game's ply minus the submitted game's along the run.
    pub offset: i64,
    /// The submitted game's ply at the run's first position.
    pub start: u32,
    /// The positions the run holds.
    pub length: u32,
    /// The rank `standing` gives the stored game.
    pub standing: u16,
}

/// The answer for one position.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct Tally {
    /// Each move the stored games played from the position, the most played
    /// first, beside how the games playing it ended.
    pub moves: Vec<(String, Outcomes)>,
    /// How the games ending at the position ended.
    pub ended: Outcomes,
    /// The stored games reaching the position, the newest first.
    pub games: Vec<u32>,
}

/// What `Positions::sharing` counts over every stored game, a copy of a game
/// being a stored game that plays its whole mainline from the position it
/// starts in, the game itself among them.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct Sharing {
    /// Each game's first ply standing in a position no stored game reaches
    /// save its copies, or `None` where every position it reaches has another
    /// stored game standing in it, in the order the index holds the games.
    pub alone: Vec<Option<u16>>,
    /// For each group, the count of its games standing at each ply in a
    /// position some stored game other than its copies reaches.
    pub shared: Vec<Vec<u32>>,
    /// Each count of stored games beside the count of keys exactly that many
    /// reach, the fewest first.
    pub reach: Vec<(u32, u64)>,
}

/// A piece of the file past its head, which a lookup reads whole.
#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum Part {
    /// The key piece of this number, holding each key whose leading bits are
    /// the number.
    Keys(u32),
    /// The game piece of this number, holding each slot whose leading bits are
    /// the number.
    Games(u32),
}

/// The stretch of slots `lo..hi` whose games reach one position at `ply`.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct Posting {
    lo: u32,
    hi: u32,
    ply: u16,
}

impl Posting {
    /// Opens a run at the submitted game's ply `at` for the slots below `hi`.
    fn opened(self, hi: u32, at: u32) -> Open {
        Open {
            lo: self.lo,
            hi,
            ply: u32::from(self.ply) + 1,
            start: at,
        }
    }
}

/// The stretch of slots `lo..hi` whose games have shared each position with
/// the submitted game since its ply `start` and reach the next at `ply`.
#[derive(Clone, Copy, Debug)]
struct Open {
    lo: u32,
    hi: u32,
    ply: u32,
    start: u32,
}

impl Open {
    /// Ends the run of the slots below `hi` at the submitted game's ply `at`.
    fn ended(self, hi: u32, at: u32) -> Ended {
        Ended {
            lo: self.lo,
            hi,
            length: at - self.start,
            offset: i64::from(self.ply) - i64::from(at),
            start: self.start,
        }
    }
}

/// The stretch of slots `lo..hi` holding one finished run.
#[derive(Clone, Copy, Debug)]
struct Ended {
    lo: u32,
    hi: u32,
    length: u32,
    offset: i64,
    start: u32,
}

/// The leading bits of a list of keys in ascending order, as an Elias-Fano
/// sequence, which `None` stands in for over a list holding no key.
#[derive(Debug)]
struct Prefixes(Option<EliasFano>);

impl Prefixes {
    /// Holds the leading bits of `keys`, which number `count`.
    fn built(keys: impl Iterator<Item = u64>, count: usize) -> sucds::Result<Self> {
        if count == 0 {
            return Ok(Self(None));
        }

        let width = count.ilog2() + PREFIX_BITS;
        let mut builder = EliasFanoBuilder::new(1 << width, count)?;

        builder.extend(keys.map(|key| key >> (u64::BITS - width)))?;

        Ok(Self(Some(builder.build().enable_rank())))
    }

    /// Counts the keys whose leading bits the sequence holds.
    fn len(&self) -> usize {
        self.0.as_ref().map_or(0, EliasFano::len)
    }

    /// Lists the place of each key whose leading bits match those of `key`.
    fn holding(&self, key: u64) -> impl Iterator<Item = usize> {
        self.0.iter().flat_map(move |sequence| {
            let prefix = key >> (u64::BITS - sequence.universe().ilog2());

            (sequence.rank(prefix).unwrap_or_default()..)
                .take_while(move |&at| sequence.select(at) == Some(prefix))
        })
    }
}

/// The keys whose leading bits number one key piece, each held by the bits
/// past those.
#[derive(Debug)]
struct KeyPiece {
    /// The leading bits of each key one position of one game reaches.
    once: Prefixes,
    /// The block of slots holding the game reaching each of those keys.
    blocks: CompactVector,
    /// The leading bits of each key several positions reach.
    shared: Prefixes,
    /// The byte each of those keys' lists opens at, beside the byte past the
    /// last list.
    boundaries: EliasFano,
    /// The lists of slots.
    lists: Bytes,
}

impl KeyPiece {
    /// Reads the piece's sections out of `rest`, in the order `image` writes
    /// them.
    fn parsed(mut rest: Bytes) -> sucds::Result<Self> {
        let once = Prefixes(section(&mut rest)?);
        let blocks = section(&mut rest)?;
        let shared = Prefixes(section(&mut rest)?);
        let boundaries = section::<EliasFano>(&mut rest)?;

        if boundaries.universe() - 1 != rest.len() as u64 {
            return Err(SucdsError::invalid_data("the key piece holds another size"));
        }

        Ok(Self {
            once,
            blocks,
            shared,
            boundaries,
            lists: rest,
        })
    }

    /// Lays out the piece holding `rows`, which share their leading `bits`
    /// bits and sort by key, for an index whose slots fall into blocks past
    /// their leading `shift` bits.
    fn image(rows: &[Row], bits: u32, shift: u32, image: &mut Vec<u8>) -> sucds::Result<()> {
        let held = || rows.chunk_by(|a, b| a.key == b.key);
        let once = || held().filter_map(|group| group.first().filter(|_| group.len() == 1));
        let shared = || held().filter(|group| group.len() > 1);
        let past = |key: u64| key << bits;
        let mut lists = Vec::new();
        let mut boundaries = vec![0];

        for group in shared() {
            write_list(group, &mut lists)?;
            boundaries.push(lists.len() as u64);
        }

        let blocks = once().map(|row| row.slot >> shift).collect_vec();

        Prefixes::built(once().map(|row| past(row.key)), blocks.len())?
            .0
            .serialize_into(&mut *image)?;
        CompactVector::from_slice(&blocks).serialize_into(&mut *image)?;
        Prefixes::built(
            shared().map(|group| past(group[0].key)),
            boundaries.len() - 1,
        )?
        .0
        .serialize_into(&mut *image)?;
        ascending(&boundaries)?.serialize_into(&mut *image)?;
        image.extend(lists);

        Ok(())
    }

    /// Reads the shared key at `entry`'s list of slots, which holds a group for
    /// each ply reaching the key: the gap from the last group's ply and its
    /// count of stretches, then each stretch's gap from the last stretch's end
    /// and its length less one.
    fn list(&self, entry: usize) -> Vec<Posting> {
        let from = self.boundaries.select(entry).unwrap_or_default();
        let to = self.boundaries.select(entry + 1).unwrap_or(from);
        let mut rest = self
            .lists
            .get(narrow::<usize>(from)..narrow(to))
            .unwrap_or_default();
        let mut numbers = iter::from_fn(|| rest.read_varint::<u32>().ok());
        let mut postings = Vec::new();
        let mut ply = 0;

        while let Some((gap, stretches)) = numbers.next_tuple() {
            let mut end = 0;

            ply += gap;

            for (gap, extra) in numbers.by_ref().take(stretches as usize * 2).tuples() {
                let lo = end + gap;

                end = lo + extra + 1;
                postings.push(Posting {
                    lo,
                    hi: end,
                    ply: narrow(u64::from(ply)),
                });
            }
        }

        postings
    }
}

/// The slots whose leading bits number one game piece, each column holding
/// one number for each of its slots in order.
#[derive(Debug)]
struct GamePiece {
    /// Each slot's game.
    numbers: CompactVector,
    /// Each slot's rank among games tied on a run.
    standings: CompactVector,
    /// Each slot's date as `Stored::dated` holds it.
    dates: CompactVector,
    /// Each slot's place among `Outcomes`.
    results: CompactVector,
    /// The moves each slot's mainline holds.
    plies: CompactVector,
    /// The byte each slot's moves open at, beside the byte past the last.
    offsets: EliasFano,
    /// The tags naming each slot's start, by its place in the piece, for each
    /// slot whose tags name one.
    starts: HashMap<u32, Start>,
    /// The games' moves.
    moves: Bytes,
}

impl GamePiece {
    /// Reads the piece's sections out of `rest`, in the order `image` writes
    /// them.
    fn parsed(mut rest: Bytes) -> sucds::Result<Self> {
        let numbers = section(&mut rest)?;
        let standings = section(&mut rest)?;
        let dates = section(&mut rest)?;
        let results = section(&mut rest)?;
        let plies = section(&mut rest)?;
        let offsets = section::<EliasFano>(&mut rest)?;
        let started = section::<Vec<u32>>(&mut rest)?;
        let fens = section::<Vec<Tag>>(&mut rest)?;
        let variants = section::<Vec<Tag>>(&mut rest)?;
        let text = |tag: Tag| tag.map(|bytes| String::from_utf8_lossy(&bytes).into_owned());

        if offsets.universe() - 1 != rest.len() as u64 {
            return Err(SucdsError::invalid_data(
                "the game piece holds another size",
            ));
        }

        Ok(Self {
            numbers,
            standings,
            dates,
            results,
            plies,
            offsets,
            starts: izip!(started, fens, variants)
                .map(|(at, fen, variant)| (at, (text(fen), text(variant))))
                .collect(),
            moves: rest,
        })
    }

    /// Lays out the piece holding `stored`, its games in the order of their
    /// slots, each numbered by its place in `numbers`.
    fn image(numbers: &[u32], stored: &[Stored<'_>], image: &mut Vec<u8>) -> sucds::Result<()> {
        let offsets = iter::once(0)
            .chain(stored.iter().scan(0, |end, game| {
                *end += game.moves.len() as u64;

                Some(*end)
            }))
            .collect_vec();
        let (started, fens, variants): (Vec<u32>, Vec<Tag>, Vec<Tag>) = (0u32..)
            .zip(stored)
            .filter(|(_, game)| game.fen.is_some() || game.variant.is_some())
            .map(|(at, game)| (at, game.fen.map(Vec::from), game.variant.map(Vec::from)))
            .multiunzip();

        CompactVector::from_slice(numbers).serialize_into(&mut *image)?;
        column(stored.iter().map(|game| game.standing)).serialize_into(&mut *image)?;
        column(stored.iter().map(|game| game.dated)).serialize_into(&mut *image)?;
        column(stored.iter().map(|game| game.result)).serialize_into(&mut *image)?;
        column(stored.iter().map(|game| game.plies)).serialize_into(&mut *image)?;
        ascending(&offsets)?.serialize_into(&mut *image)?;
        started.serialize_into(&mut *image)?;
        fens.serialize_into(&mut *image)?;
        variants.serialize_into(&mut *image)?;
        for game in stored {
            image.extend_from_slice(game.moves);
        }

        Ok(())
    }

    /// Sets up the position the game at the piece's place `at` starts from,
    /// beside a reader of its moves and the count of them, or returns `None`
    /// where no position can be set up.
    fn replay(&self, at: u32) -> Option<(Board, Reader<'_>, u16)> {
        let board = match self.starts.get(&at) {
            Some((fen, variant)) => Board::started(fen.as_deref(), variant.as_deref()),
            None => Board::started(None, None),
        }?;
        let from = self.offsets.select(at as usize)?;
        let to = self.offsets.select(at as usize + 1)?;

        Some((
            board,
            Reader::new(self.moves.get(narrow::<usize>(from)..narrow(to))?),
            cell(&self.plies, at),
        ))
    }
}

/// The stored games, every position they reach, and their moves.
#[derive(Debug)]
pub struct Positions {
    /// The bytes of the file, whole where it was read from disk or built.
    image: Option<Bytes>,
    /// The bytes the head takes, which open the file.
    head: usize,
    /// The positions the stored games reach.
    count: u64,
    /// The distinct keys the stored games reach.
    distinct: u64,
    /// The stored games.
    games: u32,
    /// The byte past the head each key piece opens at, beside the byte past the
    /// last.
    pieces: EliasFano,
    /// The byte past the last key piece each game piece opens at, beside the
    /// byte past the last.
    shelves: EliasFano,
    /// Each game's slot, read from a whole file alone.
    slots: Option<CompactVector>,
    /// Each key piece once read.
    keyed: Vec<OnceLock<KeyPiece>>,
    /// Each game piece once read.
    shelved: Vec<OnceLock<GamePiece>>,
    /// Each piece a lookup reached before `add` gave it.
    wanted: Mutex<BTreeSet<Part>>,
}

impl Positions {
    /// Lays `stored` out as a file held in memory, numbering each game by its
    /// place in `stored`.
    ///
    /// # Errors
    ///
    /// Returns `InvalidData` where a section cannot hold what it is given.
    pub fn build(stored: &[Stored<'_>]) -> io::Result<Self> {
        image(stored)
            .and_then(|image| Self::parsed(Bytes::from(image)))
            .map_err(invalid)
    }

    /// Maps the file at `path` into memory.
    ///
    /// # Errors
    ///
    /// Returns `NotFound` where the file is missing and `InvalidData` where it
    /// holds another layout.
    pub fn read(path: &Path) -> io::Result<Self> {
        let file = File::open(path)?;
        // SAFETY: `write` renames a finished file into place rather than
        // writing into one, so no write changes the bytes this maps.
        let map = unsafe { Mmap::map(&file) }?;

        Self::parsed(Bytes::from_owner(map)).map_err(invalid)
    }

    /// Reads the head `head` returns, leaving each piece to `add`.
    ///
    /// # Errors
    ///
    /// Returns `InvalidData` where `bytes` hold another layout.
    pub fn started(bytes: Vec<u8>) -> io::Result<Self> {
        let mut rest = Bytes::from(bytes);
        let mut positions = Self::headed(&mut rest).map_err(invalid)?;

        if !rest.is_empty() {
            return Err(invalid(SucdsError::invalid_data("the head holds more")));
        }

        positions.image = None;

        Ok(positions)
    }

    /// Writes the file to `path`, a finished file replacing what `path` holds
    /// at once, so a mapping of the earlier file keeps its bytes.
    ///
    /// # Errors
    ///
    /// Returns `InvalidInput` where the index holds its head alone, and the
    /// error writing or renaming the file raises.
    pub fn write(&self, path: &Path) -> io::Result<()> {
        let temporary = path.with_extension("tmp");

        fs::write(&temporary, self.whole()?)?;
        fs::rename(temporary, path)
    }

    /// Reads the sections of the head out of the front of `rest`, in the
    /// order `image` writes them, holding the whole of `rest` as the image.
    fn headed(rest: &mut Bytes) -> sucds::Result<Self> {
        let image = rest.clone();

        if section::<u64>(rest)? != MAGIC {
            return Err(SucdsError::invalid_data("the file holds another layout"));
        }

        let count = section(rest)?;
        let distinct = section(rest)?;
        let games = section::<u32>(rest)?;
        let pieces = section::<EliasFano>(rest)?;
        let shelves = section::<EliasFano>(rest)?;
        let head = image.len() - rest.len();

        if !(pieces.len() - 1).is_power_of_two()
            || shelves.len() - 1 != (games as usize).div_ceil(1 << SHELF_BITS)
        {
            return Err(SucdsError::invalid_data("the head holds other pieces"));
        }

        Ok(Self {
            image: Some(image),
            head,
            count,
            distinct,
            games,
            keyed: iter::repeat_with(OnceLock::new)
                .take(pieces.len() - 1)
                .collect(),
            shelved: iter::repeat_with(OnceLock::new)
                .take(shelves.len() - 1)
                .collect(),
            pieces,
            shelves,
            slots: None,
            wanted: Mutex::default(),
        })
    }

    /// Reads the head and `slots` out of the whole file `image`, leaving each
    /// piece to the first lookup reaching it.
    fn parsed(image: Bytes) -> sucds::Result<Self> {
        let mut rest = image;
        let mut positions = Self::headed(&mut rest)?;
        let body = positions.pieces.universe() + positions.shelves.universe() - 2;

        if body > rest.len() as u64 {
            return Err(SucdsError::invalid_data("the file holds another size"));
        }

        let _ = rest.split_to(narrow(body));
        let slots = section::<CompactVector>(&mut rest)?;

        if !rest.is_empty() || slots.len() != positions.games as usize {
            return Err(SucdsError::invalid_data("the file holds another size"));
        }

        positions.slots = Some(slots);

        Ok(positions)
    }

    /// Returns the whole file.
    fn whole(&self) -> io::Result<&Bytes> {
        self.image.as_ref().ok_or_else(|| {
            io::Error::new(ErrorKind::InvalidInput, "the index holds its head alone")
        })
    }

    /// Returns the bytes of the head, which `started` reads.
    ///
    /// # Errors
    ///
    /// Returns `InvalidInput` where the index holds its head alone.
    pub fn head(&self) -> io::Result<Bytes> {
        Ok(self.whole()?.slice(..self.head))
    }

    /// Writes the head of a file whose key pieces are this file's and whose
    /// game pieces take the bytes `sizes` lists in order, which `started`
    /// reads.
    ///
    /// # Errors
    ///
    /// Returns `InvalidInput` where `sizes` lists another count of game
    /// pieces.
    pub fn rehead(&self, sizes: &[u64]) -> io::Result<Vec<u8>> {
        if sizes.len() != self.shelved.len() {
            return Err(io::Error::new(
                ErrorKind::InvalidInput,
                "the sizes list another count of game pieces",
            ));
        }

        let shelves = iter::once(0)
            .chain(sizes.iter().scan(0, |end, size| {
                *end += size;

                Some(*end)
            }))
            .collect_vec();
        let mut head = Vec::new();

        written(
            &mut head,
            [self.count, self.distinct, u64::from(self.games)],
            &self.pieces,
            &ascending(&shelves).map_err(invalid)?,
        )
        .map_err(invalid)?;

        Ok(head)
    }

    /// Counts the key pieces and the game pieces past the head.
    #[must_use]
    pub fn pieces(&self) -> (usize, usize) {
        (self.keyed.len(), self.shelved.len())
    }

    /// Reads the number of each stored game the game piece numbered `at`
    /// holds, in the order of their slots, or none where no piece holds it.
    #[must_use]
    pub fn numbers(&self, at: u32) -> Vec<u32> {
        self.shelved
            .get(at as usize)
            .and_then(|cell| self.piece(cell, Part::Games(at), GamePiece::parsed))
            .map_or_else(Vec::new, |piece| piece.numbers.iter().map(narrow).collect())
    }

    /// Returns the bytes of `part`, which `add` reads.
    ///
    /// # Errors
    ///
    /// Returns `InvalidInput` where the index holds its head alone or holds
    /// no such piece.
    pub fn part(&self, part: Part) -> io::Result<Bytes> {
        let whole = self.whole()?;

        self.span(part)
            .and_then(|(from, to)| whole.get(narrow::<usize>(from)..narrow(to)))
            .map(|bytes| whole.slice_ref(bytes))
            .ok_or_else(|| io::Error::new(ErrorKind::InvalidInput, "the index holds no such piece"))
    }

    /// Reads `bytes` as `part`, which every lookup after reads in place of
    /// listing it in `wanted`.
    ///
    /// # Errors
    ///
    /// Returns `InvalidData` where `bytes` hold another layout and
    /// `InvalidInput` where the index holds no such piece.
    pub fn add(&self, part: Part, bytes: Vec<u8>) -> io::Result<()> {
        let bytes = Bytes::from(bytes);
        let unknown = || io::Error::new(ErrorKind::InvalidInput, "the index holds no such piece");

        match part {
            Part::Keys(at) => {
                let cell = self.keyed.get(at as usize).ok_or_else(unknown)?;
                let _ = cell.set(KeyPiece::parsed(bytes).map_err(invalid)?);
            }
            Part::Games(at) => {
                let cell = self.shelved.get(at as usize).ok_or_else(unknown)?;
                let _ = cell.set(GamePiece::parsed(bytes).map_err(invalid)?);
            }
        }

        Ok(())
    }

    /// Takes the list of each piece a lookup reached before `add` gave it,
    /// leaving it empty, so an answer given while it held any piece is
    /// incomplete.
    pub fn wanted(&self) -> Vec<Part> {
        mem::take(&mut *self.wanted.lock().unwrap_or_else(PoisonError::into_inner))
            .into_iter()
            .collect()
    }

    /// Reads the bytes of the file `part` spans, from its first to the one
    /// past its last.
    #[must_use]
    pub fn span(&self, part: Part) -> Option<(u64, u64)> {
        let (offsets, base, at) = match part {
            Part::Keys(at) => (&self.pieces, self.head as u64, at),
            Part::Games(at) => (
                &self.shelves,
                self.head as u64 + self.pieces.universe() - 1,
                at,
            ),
        };

        Some((
            base + offsets.select(at as usize)?,
            base + offsets.select(at as usize + 1)?,
        ))
    }

    /// Reads `part` out of `cell` once read, out of the whole file where the
    /// index holds it, and otherwise lists it in `wanted`.
    fn piece<'a, T>(
        &self,
        cell: &'a OnceLock<T>,
        part: Part,
        parsed: fn(Bytes) -> sucds::Result<T>,
    ) -> Option<&'a T> {
        if let Some(piece) = cell.get() {
            return Some(piece);
        }

        if self.image.is_none() {
            self.wanted
                .lock()
                .unwrap_or_else(PoisonError::into_inner)
                .insert(part);

            return None;
        }

        let piece = parsed(self.part(part).ok()?).ok()?;

        Some(cell.get_or_init(|| piece))
    }

    /// Reads the key piece holding `key`.
    fn keys_holding(&self, key: u64) -> Option<&KeyPiece> {
        let at = key
            .checked_shr(u64::BITS - self.keyed.len().ilog2())
            .unwrap_or_default();

        self.piece(
            self.keyed.get(narrow::<usize>(at))?,
            Part::Keys(narrow(at)),
            KeyPiece::parsed,
        )
    }

    /// Reads every key piece in order, skipping each the index does not hold.
    fn key_pieces(&self) -> impl Iterator<Item = &KeyPiece> {
        self.keyed
            .iter()
            .zip(0u32..)
            .filter_map(|(cell, at)| self.piece(cell, Part::Keys(at), KeyPiece::parsed))
    }

    /// Reads the list of slots of every key several positions reach, piece by
    /// piece.
    fn lists(&self) -> impl Iterator<Item = Vec<Posting>> + '_ {
        self.key_pieces()
            .flat_map(|piece| (0..piece.shared.len()).map(move |entry| piece.list(entry)))
    }

    /// Reads the game piece holding `slot`, beside the slot's place in it.
    fn games_holding(&self, slot: u32) -> Option<(&GamePiece, u32)> {
        let (at, place) = Self::shelf(slot);
        let piece = self.piece(
            self.shelved.get(at as usize)?,
            Part::Games(at),
            GamePiece::parsed,
        )?;

        Some((piece, place))
    }

    /// Names the game piece holding `slot` beside the slot's place in it.
    #[must_use]
    pub fn shelf(slot: u32) -> (u32, u32) {
        (slot >> SHELF_BITS, slot & ((1 << SHELF_BITS) - 1))
    }

    /// Reads the number the column `pick` of the game piece holding `slot`
    /// holds for it, or the default where no piece holds it.
    fn about<T: TryFrom<u64> + Default>(
        &self,
        slot: u32,
        pick: fn(&GamePiece) -> &CompactVector,
    ) -> T {
        self.games_holding(slot)
            .map_or_else(T::default, |(piece, at)| cell(pick(piece), at))
    }

    /// Counts the stored games.
    #[must_use]
    pub fn games(&self) -> usize {
        self.games as usize
    }

    /// Counts the positions the stored games reach.
    #[must_use]
    pub fn positions(&self) -> u64 {
        self.count
    }

    /// Counts the distinct keys the stored games reach.
    #[must_use]
    pub fn keys(&self) -> u64 {
        self.distinct
    }

    /// Reads the moves of `game` in Universal Chess Interface (UCI) notation,
    /// a null move as `0000`, or none where the index holds no such game or
    /// holds its head alone.
    #[must_use]
    pub fn moves(&self, game: u32) -> Vec<String> {
        self.slots
            .as_ref()
            .and_then(|slots| slots.get_int(game as usize))
            .and_then(|slot| self.replayed(narrow(slot), u16::MAX))
            .map_or_else(Vec::new, |(_, moves)| moves)
    }

    /// Reads the moves of the game at `slot` in Standard Algebraic Notation
    /// (SAN), beside the piece placement of each position from its start, as
    /// `scored` writes them.
    #[must_use]
    pub fn scored(&self, slot: u32) -> (Vec<String>, Vec<String>) {
        self.replayed(slot, u16::MAX)
            .map_or_else(Default::default, |(board, moves)| board.scored(moves))
    }

    /// Sets up the position the game at `slot` starts from, beside at most
    /// `most` of its moves as `moves` reads them, or returns `None` where no
    /// piece holds it.
    fn replayed(&self, slot: u32, most: u16) -> Option<(Board, Vec<String>)> {
        let (board, mut reader, plies) = self
            .games_holding(slot)
            .and_then(|(piece, at)| piece.replay(at))?;
        let mut playing = board.clone();
        let moves = (0..plies.min(most))
            .map_while(|_| reader.play(&mut playing).map(|turn| turn.to_string()))
            .collect();

        Some((board, moves))
    }

    /// Finds the runs a match reports for a game reaching `keys`: at most `top`
    /// stored games, each at its longest run, the earliest of those in the
    /// submitted game and then in the stored game, the longest first, then by
    /// `standing` from the highest, then in the order the index holds them.
    ///
    /// # Returns
    ///
    /// The runs beside the count of stored games other than the first holding
    /// a run as long as its.
    #[must_use]
    pub fn best(&self, keys: &[u64], top: usize) -> (Vec<Run>, usize) {
        let mut ended = self.ended(keys);
        let mut seen = vec![false; self.games()];
        let mut chosen = Vec::new();
        let mut ties = 0;

        ended.sort_unstable_by_key(|run| (Reverse(run.length), run.start, run.offset));

        for (at, group) in ended.chunk_by(|a, b| a.length == b.length).enumerate() {
            let found = group
                .iter()
                .flat_map(|run| (run.lo..run.hi).map(move |slot| (slot, run)))
                .filter(|&(slot, _)| !mem::replace(&mut seen[slot as usize], true))
                .map(|(slot, run)| self.run(slot, run))
                .collect_vec();
            let room = top - chosen.len();

            if at == 0 {
                ties = found.len().saturating_sub(1);
            }

            chosen.extend(
                found
                    .into_iter()
                    .k_smallest_relaxed_by_key(room, |run| (Reverse(run.standing), run.game)),
            );

            if chosen.len() == top {
                break;
            }
        }

        (chosen, ties)
    }

    /// Finds every unbroken run a stored game shares with a game reaching
    /// `keys`, the longest first, then by `standing` from the highest, then in
    /// the order the index holds the games, then the earliest in the submitted
    /// game, then the earliest in the stored game.
    #[must_use]
    pub fn runs(&self, keys: &[u64]) -> Vec<Run> {
        self.ended(keys)
            .iter()
            .flat_map(|run| (run.lo..run.hi).map(|slot| self.run(slot, run)))
            .sorted_unstable_by_key(|run| {
                (
                    Reverse(run.length),
                    Reverse(run.standing),
                    run.game,
                    run.start,
                    run.offset,
                )
            })
            .collect()
    }

    /// Counts the stored games reaching each of `keys`.
    #[must_use]
    pub fn reach(&self, keys: &[u64]) -> Vec<u32> {
        let mut cache = Cache::new();

        keys.iter()
            .map(|&key| {
                self.postings(key, &mut cache)
                    .iter()
                    .map(|posting| (posting.lo, posting.hi))
                    .sorted_unstable()
                    .coalesce(|(lo, hi), (next, end)| {
                        if next <= hi {
                            Ok((lo, hi.max(end)))
                        } else {
                            Err(((lo, hi), (next, end)))
                        }
                    })
                    .map(|(lo, hi)| hi - lo)
                    .sum()
            })
            .collect()
    }

    /// Counts, in two reads of every list of slots, how far each stored game
    /// shares its positions with the rest. The first read narrows each game's
    /// copies to the slots every stretch holding the game at one of its plies
    /// also holds, since games sorted by their moves lay a game's copies beside
    /// it, and a game standing at any ply in a position no other game reaches
    /// keeps itself alone as its copy. The second counts the games reaching each
    /// key and tells, for each game standing in it, whether any of them is
    /// other than its copies. `groups` names each game's group, in the order
    /// the index holds the games, and a group past the last `groups` names
    /// counts nothing.
    #[must_use]
    pub fn sharing(&self, groups: &[u16]) -> Sharing {
        let games = self.games();
        let plies = (0..self.games)
            .map(|slot| usize::from(self.about::<u16>(slot, |piece| &piece.plies)) + 1)
            .collect_vec();
        let firsts = iter::once(0).chain(plies.iter().scan(0, |end, &count| {
            *end += count;

            Some(*end)
        }));
        let firsts = firsts.collect_vec();
        let mut listed = BitVector::from_bit(false, firsts[games]);
        let mut lo = vec![0; games];
        let mut hi = vec![narrow::<u32>(games as u64); games];

        for postings in self.lists() {
            for posting in postings {
                for slot in posting.lo..posting.hi {
                    let at = slot as usize;

                    lo[at] = lo[at].max(posting.lo);
                    hi[at] = hi[at].min(posting.hi);
                    listed
                        .set_bit(firsts[at] + usize::from(posting.ply), true)
                        .unwrap_or_default();
                }
            }
        }

        let copies = (0..games)
            .map(|at| {
                let whole =
                    (firsts[at]..firsts[at + 1]).all(|bit| listed.access(bit).unwrap_or_default());

                if whole { hi[at] - lo[at] } else { 1 }
            })
            .collect_vec();
        let group = |slot: u32| {
            groups
                .get(self.about::<u32>(slot, |piece| &piece.numbers) as usize)
                .map_or(usize::MAX, |&group| usize::from(group))
        };
        let width = plies.iter().copied().max().unwrap_or_default();
        let mut shared = vec![
            vec![0; width];
            groups
                .iter()
                .map(|&g| usize::from(g) + 1)
                .max()
                .unwrap_or_default()
        ];
        let mut alone = (0..games)
            .map(|at| {
                (firsts[at]..firsts[at + 1]).position(|bit| !listed.access(bit).unwrap_or_default())
            })
            .collect_vec();
        let once = self.key_pieces().map(|piece| piece.once.len() as u64).sum();
        let mut reach = HashMap::from([(1, once)]);

        for postings in self.lists() {
            let reaching = postings
                .iter()
                .map(|posting| (posting.lo, posting.hi))
                .sorted_unstable()
                .coalesce(|(lo, hi), (next, end)| {
                    if next <= hi {
                        Ok((lo, hi.max(end)))
                    } else {
                        Err(((lo, hi), (next, end)))
                    }
                })
                .map(|(lo, hi)| hi - lo)
                .sum::<u32>();

            *reach.entry(reaching).or_default() += 1;

            for posting in &postings {
                let ply = usize::from(posting.ply);

                for slot in posting.lo..posting.hi {
                    let at = slot as usize;

                    if reaching > copies[at] {
                        if let Some(row) = shared.get_mut(group(slot)) {
                            row[ply] += 1;
                        }
                    } else if alone[at].is_none_or(|first| ply < first) {
                        alone[at] = Some(ply);
                    }
                }
            }
        }

        let mut by_game = vec![None; games];

        for (slot, first) in (0u32..).zip(alone) {
            by_game[self.about::<u32>(slot, |piece| &piece.numbers) as usize] =
                first.map(|ply| narrow(ply as u64));
        }

        Sharing {
            alone: by_game,
            shared,
            reach: reach
                .into_iter()
                .filter(|&(_, keys)| keys > 0)
                .sorted_unstable()
                .collect(),
        }
    }

    /// Counts the stored games playing each line of at most `depth` moves
    /// from the standard starting position that at least `least` of them
    /// play, each line as its moves in UCI notation, in the order the games
    /// sort by their moves. Games playing one line sit side by side in that
    /// order, so each line is counted in one read of the games from the first
    /// slot to the last.
    #[must_use]
    pub fn lines(&self, depth: u16, least: u32) -> Vec<(Vec<String>, u32)> {
        let mut open: Vec<(String, u32)> = Vec::new();
        let mut counted = Vec::new();
        let mut close = |open: &mut Vec<(String, u32)>, keep: usize| {
            while open.len() > keep {
                if let Some((_, games)) = open.last().filter(|(_, games)| *games >= least) {
                    counted.push((open.iter().map(|(name, _)| name.clone()).collect(), *games));
                }

                open.pop();
            }
        };

        for slot in 0..self.games {
            let standard = self
                .games_holding(slot)
                .is_some_and(|(piece, at)| !piece.starts.contains_key(&at));
            let Some((_, moves)) = self.replayed(slot, depth).filter(|_| standard) else {
                continue;
            };
            let kept = open
                .iter()
                .zip(&moves)
                .take_while(|((name, _), played)| name == *played)
                .count();

            close(&mut open, kept);
            for (_, games) in &mut open {
                *games += 1;
            }

            open.extend(moves.into_iter().skip(kept).map(|name| (name, 1)));
        }

        close(&mut open, 0);
        counted
    }

    /// Counts what the stored games played from the position `moves` reach in
    /// Universal Chess Interface (UCI) notation from the position `fen` names
    /// or the standard starting position, a game reaching it twice counted
    /// once, under the move it played from its first reach, and at most `top`
    /// games listed.
    ///
    /// # Errors
    ///
    /// Returns `InvalidInput` where `fen` names no position or a move is not
    /// legal.
    pub fn tally(&self, fen: Option<&str>, moves: &[String], top: usize) -> io::Result<Tally> {
        let board = Board::reached(fen, moves)?;
        let mut cache = Cache::new();
        let mut first = vec![u16::MAX; self.games()];
        let mut reaching = Vec::new();
        let mut ended = Outcomes::default();

        for posting in self.postings(board.key(), &mut cache) {
            for slot in posting.lo..posting.hi {
                if first[slot as usize] == u16::MAX {
                    first[slot as usize] = posting.ply;
                    reaching.push(slot);
                    ended[self.outcome(slot)] += 1;
                }
            }
        }

        let mut played = Vec::new();

        for (name, child) in board.children() {
            let mut outcomes = Outcomes::default();

            for posting in self.postings(child.key(), &mut cache) {
                for slot in posting.lo..posting.hi {
                    if first[slot as usize].checked_add(1) == Some(posting.ply) {
                        outcomes[self.outcome(slot)] += 1;
                    }
                }
            }

            if outcomes != Outcomes::default() {
                ended
                    .iter_mut()
                    .zip(outcomes)
                    .for_each(|(left, gone)| *left -= gone);
                played.push((name, outcomes));
            }
        }

        played.sort_by_cached_key(|(name, outcomes)| {
            (Reverse(outcomes.iter().sum::<u32>()), name.clone())
        });

        Ok(Tally {
            moves: played,
            ended,
            games: reaching
                .into_iter()
                .k_smallest_relaxed_by_key(top, |&slot| {
                    (
                        Reverse(self.about::<u32>(slot, |piece| &piece.dates)),
                        self.about::<u32>(slot, |piece| &piece.numbers),
                    )
                })
                .map(|slot| self.about(slot, |piece| &piece.numbers))
                .collect(),
        })
    }

    /// Reads the place of the result of the game at `slot` among `Outcomes`.
    fn outcome(&self, slot: u32) -> usize {
        usize::from(self.about::<u8>(slot, |piece| &piece.results))
            .min(Outcomes::default().len() - 1)
    }

    /// Lays the finished run `ended` out for the game at `slot`.
    fn run(&self, slot: u32, ended: &Ended) -> Run {
        Run {
            game: self.about(slot, |piece| &piece.numbers),
            slot,
            offset: ended.offset,
            start: ended.start,
            length: ended.length,
            standing: self.about(slot, |piece| &piece.standings),
        }
    }

    /// Finds every unbroken run the stored games share with a game reaching
    /// `keys`, reading its positions in order and keeping the stretches of
    /// slots still sharing one from each position to the next, a last step
    /// past its last position ending every run still open.
    fn ended(&self, keys: &[u64]) -> Vec<Ended> {
        let mut cache = Cache::new();
        let mut open = Vec::new();
        let mut ended = Vec::new();

        for (at, key) in (0u32..).zip(keys.iter().map(Some).chain([None])) {
            let postings = key.map_or_else(Vec::new, |&key| self.postings(key, &mut cache));

            open = advance(&open, &postings, at, &mut ended);
        }

        ended
    }

    /// Lists the stretches of slots reaching `key`, ordered by ply and then by
    /// slot, each candidate confirmed against a game's full keys.
    fn postings(&self, key: u64, cache: &mut Cache) -> Vec<Posting> {
        let Some(piece) = self.keys_holding(key) else {
            return Vec::new();
        };
        let past = key << self.keyed.len().ilog2();

        piece
            .shared
            .holding(past)
            .map(|entry| piece.list(entry))
            .find(|postings| {
                postings.first().is_some_and(|posting| {
                    self.keys_of(posting.lo, cache)
                        .get(usize::from(posting.ply))
                        == Some(&key)
                })
            })
            .unwrap_or_else(|| self.once_held(piece, key, cache).into_iter().collect())
    }

    /// Finds the one game reaching `key` once, if any, among the blocks of
    /// slots whose entries in `piece` share the key's leading bits.
    fn once_held(&self, piece: &KeyPiece, key: u64, cache: &mut Cache) -> Option<Posting> {
        let shift = block_shift(self.games());
        let past = key << self.keyed.len().ilog2();

        piece.once.holding(past).find_map(|entry| {
            let lo = narrow::<u32>(piece.blocks.get_int(entry)?) << shift;
            let hi = (lo + (1 << shift)).min(self.games);

            (lo..hi).find_map(|slot| {
                let ply = self
                    .keys_of(slot, cache)
                    .iter()
                    .position(|&found| found == key)?;

                Some(Posting {
                    lo: slot,
                    hi: slot + 1,
                    ply: narrow(ply as u64),
                })
            })
        })
    }

    /// Returns the keys of the game at `slot`, playing it through on the
    /// first read of each query.
    fn keys_of<'a>(&self, slot: u32, cache: &'a mut Cache) -> &'a [u64] {
        cache.entry(slot).or_insert_with(|| self.played(slot))
    }

    /// Keys each position of the game at `slot`.
    fn played(&self, slot: u32) -> Vec<u64> {
        self.games_holding(slot)
            .and_then(|(piece, at)| piece.replay(at))
            .map_or_else(Vec::new, |(board, reader, plies)| {
                reader.keys(board, plies).collect()
            })
    }
}

/// Plays each game `by_slot` lists, its place there being its slot, and lists
/// every position each one reaches.
fn reached<'a>(by_slot: impl Iterator<Item = Stored<'a>> + Clone) -> Vec<Row> {
    let mut rows = Vec::with_capacity(
        by_slot
            .clone()
            .map(|game| usize::from(game.plies) + 1)
            .sum(),
    );

    for (slot, game) in (0u32..).zip(by_slot) {
        if let Some(board) = Board::started(game.fen, game.variant) {
            rows.extend(
                (0u16..)
                    .zip(Reader::new(game.moves).keys(board, game.plies))
                    .map(|(ply, key)| Row { key, ply, slot }),
            );
        }
    }

    rows
}

/// Writes the list of slots of one shared key, per `KeyPiece::list`, from its
/// rows.
fn write_list(rows: &[Row], lists: &mut Vec<u8>) -> io::Result<()> {
    let mut last = 0;

    for group in rows.chunk_by(|a, b| a.ply == b.ply) {
        let ply = group[0].ply;
        let stretches = group.chunk_by(|a, b| a.slot + 1 == b.slot).collect_vec();
        let mut end = 0;

        lists.write_varint(ply - last)?;
        lists.write_varint(stretches.len())?;
        last = ply;

        for stretch in stretches {
            let lo = stretch[0].slot;

            lists.write_varint(lo - end)?;
            lists.write_varint(stretch.len() - 1)?;
            end = stretch[stretch.len() - 1].slot + 1;
        }
    }

    Ok(())
}

/// Lays out the whole file for `stored`: the head, each key piece, each game
/// piece, then `slots`, in the order `Positions::parsed` and the pieces' own
/// `parsed` read them.
fn image(stored: &[Stored<'_>]) -> sucds::Result<Vec<u8>> {
    let games = (0u32..)
        .take(stored.len())
        .sorted_by_key(|&game| stored[game as usize].moves)
        .collect_vec();
    let by_slot = games
        .iter()
        .map(|&game| stored[game as usize])
        .collect_vec();
    let mut rows = reached(by_slot.iter().copied());

    rows.sort_unstable();

    let distinct = rows.chunk_by(|a, b| a.key == b.key).count() as u64;
    let bits = (distinct.bit_width().saturating_sub(PIECE_BITS)).max(1);
    let shift = block_shift(games.len());
    let mut body = Vec::new();
    let mut pieces = vec![0];
    let mut rest = rows.as_slice();

    for at in 0..1u64 << bits {
        let held = rest.partition_point(|row| row.key >> (u64::BITS - bits) == at);

        KeyPiece::image(&rest[..held], bits, shift, &mut body)?;
        pieces.push(body.len() as u64);
        rest = &rest[held..];
    }

    let keyed = body.len() as u64;
    let mut shelves = vec![0];

    for (numbers, shelf) in games
        .chunks(1 << SHELF_BITS)
        .zip(by_slot.chunks(1 << SHELF_BITS))
    {
        GamePiece::image(numbers, shelf, &mut body)?;
        shelves.push(body.len() as u64 - keyed);
    }

    let mut slots = vec![0; games.len()];

    for (slot, &game) in (0u32..).zip(&games) {
        slots[game as usize] = slot;
    }

    let mut image = Vec::new();

    written(
        &mut image,
        [rows.len() as u64, distinct, games.len() as u64],
        &ascending(&pieces)?,
        &ascending(&shelves)?,
    )?;
    image.extend(body);
    CompactVector::from_slice(&slots).serialize_into(&mut image)?;

    Ok(image)
}

/// Writes the head into `image`: the magic number, the count of positions,
/// of distinct keys, and of games `counts` holds, then the bytes each key
/// piece and each game piece open at.
fn written(
    image: &mut Vec<u8>,
    [count, distinct, games]: [u64; 3],
    pieces: &EliasFano,
    shelves: &EliasFano,
) -> sucds::Result<()> {
    MAGIC.serialize_into(&mut *image)?;
    count.serialize_into(&mut *image)?;
    distinct.serialize_into(&mut *image)?;
    narrow::<u32>(games).serialize_into(&mut *image)?;
    pieces.serialize_into(&mut *image)?;
    shelves.serialize_into(&mut *image)?;

    Ok(())
}

/// Holds `values`, each in as few bits as the largest of them takes.
fn column<T: Into<u64> + Copy>(values: impl Iterator<Item = T>) -> CompactVector {
    CompactVector::from_slice(&values.collect_vec())
}

/// Holds `values`, which never decrease and open on 0.
fn ascending(values: &[u64]) -> sucds::Result<EliasFano> {
    let last = values.last().copied().unwrap_or_default();
    let mut builder = EliasFanoBuilder::new(last + 1, values.len())?;

    builder.extend(values.iter().copied())?;

    Ok(builder.build())
}

/// Reads the next section out of `rest`, sharing its bytes.
fn section<S: Serializable>(rest: &mut Bytes) -> sucds::Result<S> {
    S::deserialize_from_bytes_unchecked(rest)
}

/// Reads the number at `at` out of `column`, which holds one for each slot.
fn cell<T: TryFrom<u64> + Default>(column: &CompactVector, at: u32) -> T {
    narrow(column.get_int(at as usize).unwrap_or_default())
}

/// Reads the bits a slot loses to name the block of slots holding it, which
/// fit `BLOCK_BITS` bits over `games` games.
fn block_shift(games: usize) -> u32 {
    games.bit_width().saturating_sub(BLOCK_BITS)
}

/// Advances the open runs from the submitted game's ply `at` less one to `at`,
/// where `postings` lists the slots reaching its position, both ordered by ply
/// and then by slot. A slot in both continues its run, a slot in `open` alone
/// ends its run in `ended`, and a slot in `postings` alone opens a run.
fn advance(open: &[Open], postings: &[Posting], at: u32, ended: &mut Vec<Ended>) -> Vec<Open> {
    let mut runs = open.iter().copied();
    let mut reaching = postings.iter().copied();
    let mut run = runs.next();
    let mut posting = reaching.next();
    let mut next = Vec::with_capacity(postings.len());

    loop {
        match (run, posting) {
            (Some(r), Some(p)) if r.ply == u32::from(p.ply) && r.lo < p.hi && p.lo < r.hi => {
                let lo = r.lo.max(p.lo);
                let hi = r.hi.min(p.hi);

                if r.lo < lo {
                    ended.push(r.ended(lo, at));
                }

                if p.lo < lo {
                    next.push(p.opened(lo, at));
                }

                next.push(Open {
                    lo,
                    hi,
                    ply: r.ply + 1,
                    start: r.start,
                });
                run = if hi < r.hi {
                    Some(Open { lo: hi, ..r })
                } else {
                    runs.next()
                };
                posting = if hi < p.hi {
                    Some(Posting { lo: hi, ..p })
                } else {
                    reaching.next()
                };
            }
            (Some(r), p) if p.is_none_or(|p| (r.ply, r.lo) < (u32::from(p.ply), p.lo)) => {
                ended.push(r.ended(r.hi, at));
                run = runs.next();
            }
            (_, Some(p)) => {
                next.push(p.opened(p.hi, at));
                posting = reaching.next();
            }
            _ => return next,
        }
    }
}

/// Writes `error` as the error of a file under another layout.
fn invalid(error: SucdsError) -> io::Error {
    io::Error::new(ErrorKind::InvalidData, error)
}

/// Narrows `value`, which the file's layout holds in range of `T`.
fn narrow<T: TryFrom<u64> + Default>(value: u64) -> T {
    T::try_from(value).unwrap_or_default()
}
#[cfg(test)]
mod tests {
    use std::{env, path::PathBuf, process};

    use super::*;
    use crate::codes::Writer;

    /// Pins `SECTIONS` to the order `Positions::headed`, the pieces' `parsed`,
    /// and `Positions::parsed` read the file in, which opens on the magic
    /// number and leaves `lists` and `moves` as the bytes past the last
    /// section a piece reads.
    #[test]
    fn sections_follow_the_order_the_file_is_read_in() {
        let source = include_str!("positions.rs");
        let read = |function: &str| {
            let body = &source[source.find(function).unwrap()..];

            body[..body.find("Ok(").unwrap()]
                .lines()
                .filter_map(|line| {
                    let (name, value) = line.trim().strip_prefix("let ")?.split_once(" = ")?;

                    value.contains("section").then_some(name)
                })
                .collect_vec()
        };
        let expected = ["magic"]
            .into_iter()
            .chain(read("fn headed("))
            .chain(read(
                "fn parsed(mut rest: Bytes) -> sucds::Result<Self> {\n        let once",
            ))
            .chain(["lists"])
            .chain(read(
                "fn parsed(mut rest: Bytes) -> sucds::Result<Self> {\n        let numbers",
            ))
            .chain(["moves"])
            .chain(read("fn parsed(image"));

        assert_eq!(
            SECTIONS.map(|(name, ..)| name).to_vec(),
            expected.collect_vec()
        );
    }

    /// Writes the mainline `moves` names from the standard starting position.
    fn encoded(moves: &str) -> Vec<u8> {
        crate::encoded(None, None, moves.split_whitespace().map(str::to_owned)).unwrap()
    }

    /// Keys the mainline `moves` names from the standard starting position.
    fn keyed(moves: &str) -> Vec<u64> {
        crate::keys(None, None, moves.split_whitespace().map(str::to_owned))
    }

    /// Builds an index of `games`, each its moves, standing, date, and result.
    fn built(games: &[(&str, u16, u32, u8)]) -> Positions {
        let bytes = games.iter().map(|game| encoded(game.0)).collect_vec();
        let stored = games
            .iter()
            .zip(&bytes)
            .map(|(game, moves)| Stored {
                moves,
                plies: u16::try_from(game.0.split_whitespace().count()).unwrap(),
                fen: None,
                variant: None,
                standing: game.1,
                dated: game.2,
                result: game.3,
            })
            .collect_vec();

        Positions::build(&stored).unwrap()
    }

    /// Makes a folder of `name` for one test, which removes it on its last line.
    fn scratch(name: &str) -> PathBuf {
        let folder = env::temp_dir().join(format!("scotch-{}-{name}", process::id()));

        fs::create_dir_all(&folder).unwrap();

        folder
    }

    #[test]
    fn a_standing_ranks_both_ratings_over_one_over_none() {
        assert!(standing(Some("1000"), Some("1000")) > standing(Some("2800"), None));
        assert!(standing(None, Some("2000")) > standing(None, None));
        assert_eq!(standing(Some("0"), Some("?")), 0);
        assert_eq!(standing(Some("-"), Some("2000")), 2000);
        assert_eq!(standing(Some("2900"), Some("2900")), BOTH_RATED + 5800);
    }

    #[test]
    fn a_rating_is_a_whole_number_from_1_to_the_ceiling() {
        assert_eq!(rating(Some("2900")), Some(2900));
        assert_eq!(rating(Some("02500")), Some(2500));
        assert_eq!(rating(Some("1")), Some(1));
        for tag in [
            "2901",
            "204269",
            "65536",
            "0",
            "",
            "+2500",
            " 2500",
            "2500.0",
            "２５００",
        ] {
            assert_eq!(rating(Some(tag)), None, "{tag:?}");
        }
        assert_eq!(rating(None), None);
    }

    #[test]
    fn a_standing_reads_a_rating_past_the_ceiling_as_none() {
        assert_eq!(standing(Some("204269"), Some("2400")), 2400);
        assert_eq!(standing(Some("3000"), Some("3000")), 0);
    }

    #[test]
    fn a_prefix_lists_every_key_sharing_its_bits() {
        let keys = [1, 2, 1 << 60, u64::MAX];
        let prefixes = Prefixes::built(keys.into_iter(), keys.len()).unwrap();

        assert_eq!(prefixes.0.as_ref().map(EliasFano::len), Some(4));
        assert_eq!(prefixes.holding(3).collect_vec(), [0, 1]);
        assert_eq!(prefixes.holding(1 << 60).collect_vec(), [2]);
        assert_eq!(prefixes.holding(u64::MAX).collect_vec(), [3]);
        assert!(prefixes.holding(1 << 62).next().is_none());
    }

    #[test]
    fn a_list_of_no_keys_holds_no_prefix() {
        let prefixes = Prefixes::built(iter::empty(), 0).unwrap();

        assert!(prefixes.0.is_none());
        assert!(prefixes.holding(0).next().is_none());
    }

    #[test]
    fn a_block_numbers_every_slot_within_its_bits() {
        assert_eq!(block_shift(0), 0);
        assert_eq!(block_shift(0xffff), 0);
        assert_eq!(block_shift(0x1_0000), 1);
        assert_eq!(block_shift(435_321), 3);
    }

    #[test]
    fn a_game_shares_a_position_only_with_a_game_other_than_its_copies() {
        let positions = built(&[
            ("e2e4 e7e5", 0, 0, 0),
            ("e2e4 e7e5 g1f3", 0, 0, 0),
            ("d2d4", 0, 0, 0),
        ]);
        let sharing = positions.sharing(&[0, 0, 1]);

        assert_eq!(sharing.alone, [Some(1), Some(3), Some(1)]);
        assert_eq!(sharing.shared, [vec![2, 1, 1, 0], vec![1, 0, 0, 0]]);
        assert_eq!(sharing.reach, [(1, 2), (2, 2), (3, 1)]);
    }

    #[test]
    fn a_game_every_position_of_which_another_game_reaches_stands_alone_nowhere() {
        let positions = built(&[
            ("g1f3 g8f6 b1c3", 0, 0, 0),
            ("b1c3 g8f6 g1f3", 0, 0, 0),
            ("g1f3 g8f6 d2d4", 0, 0, 0),
            ("b1c3 g8f6 e2e4", 0, 0, 0),
        ]);

        assert_eq!(
            positions.sharing(&[0; 4]).alone,
            [None, None, Some(3), Some(3)]
        );
    }

    #[test]
    fn a_game_past_the_groups_named_is_counted_in_none_and_a_copy_holds_the_whole_game() {
        let positions = built(&[("e2e4", 0, 0, 0), ("e2e4 e7e5", 0, 0, 0)]);
        let sharing = positions.sharing(&[0]);

        assert_eq!(sharing.shared, [vec![0, 0, 0]]);
        assert_eq!(sharing.alone, [Some(0), Some(2)]);
    }

    #[test]
    fn a_line_counts_every_game_playing_it_from_the_start() {
        let positions = built(&[
            ("e2e4 e7e5 g1f3", 0, 0, 0),
            ("d2d4", 0, 0, 0),
            ("e2e4 c7c5", 0, 0, 0),
            ("e2e4 e7e5 f1c4", 0, 0, 0),
        ]);
        let mut lines = positions.lines(2, 2);

        lines.sort();
        assert_eq!(
            lines,
            [
                (vec!["e2e4".to_owned()], 3),
                (vec!["e2e4".to_owned(), "e7e5".to_owned()], 2),
            ]
        );
    }

    #[test]
    fn a_game_reads_back_its_moves() {
        let positions = built(&[
            ("e2e4 e7e5 g1f3", 0, 0, 0),
            ("d2d4 d7d5 0000 g8f6", 0, 0, 1),
            ("", 0, 0, 3),
        ]);

        assert_eq!(positions.moves(0), ["e2e4", "e7e5", "g1f3"]);
        assert_eq!(positions.moves(1), ["d2d4", "d7d5", "0000", "g8f6"]);
        assert_eq!(positions.moves(2), Vec::<String>::new());
        assert_eq!(positions.moves(3), Vec::<String>::new());
        assert_eq!(positions.positions(), 4 + 5 + 1);
    }

    #[test]
    fn each_game_past_the_first_game_piece_reads_back_its_moves() {
        let advances = |from: char, to: [char; 2]| {
            ('a'..='h').flat_map(move |file| to.map(|rank| format!("{file}{from}{file}{rank}")))
        };
        let lines = advances('2', ['3', '4'])
            .cartesian_product(advances('7', ['6', '5']).collect_vec())
            .map(|(white, black)| format!("{white} {black}"))
            .take((1 << SHELF_BITS) + 1)
            .collect_vec();
        let positions = built(
            &lines
                .iter()
                .map(|line| (line.as_str(), 0, 0, 0))
                .collect_vec(),
        );
        let last = 1 << SHELF_BITS;

        assert_eq!(positions.pieces().1, 2);
        assert_eq!(
            positions.best(&keyed(&lines[last as usize]), 1).0[0].game,
            last
        );

        for (game, line) in (0..).zip(&lines) {
            assert_eq!(positions.moves(game), line.split_whitespace().collect_vec());
        }
    }

    #[test]
    fn a_file_reads_back_from_disk_as_it_was_built() {
        let positions = built(&[("e2e4 e7e5", 0, 0, 0), ("e2e4 c7c5", 0, 0, 2)]);
        let folder = scratch("disk");
        let path = folder.join("positions.bin");

        positions.write(&path).unwrap();

        let read = Positions::read(&path).unwrap();
        let keys = keyed("e2e4 c7c5");

        assert_eq!(read.best(&keys, 1), positions.best(&keys, 1));
        assert_eq!(read.moves(1), ["e2e4", "c7c5"]);
        assert_eq!(read.keys(), positions.keys());
        assert!(!path.with_extension("tmp").exists());

        fs::remove_dir_all(folder).unwrap();
    }

    #[test]
    fn a_file_under_another_layout_reads_as_invalid_data() {
        let folder = scratch("layout");
        let path = folder.join("positions.bin");
        let whole = built(&[("e2e4 e7e5", 0, 0, 0)]).image.unwrap();

        for image in [
            Vec::new(),
            vec![0; 64],
            whole[..8].to_vec(),
            whole[..whole.len() - 1].to_vec(),
        ] {
            fs::write(&path, image).unwrap();

            assert_eq!(
                Positions::read(&path).unwrap_err().kind(),
                ErrorKind::InvalidData
            );
        }

        fs::remove_dir_all(folder).unwrap();
    }

    /// Answers `best` from the head of `whole` alone, adding each piece the
    /// last answer listed in `wanted` until it lists none, and returns the
    /// answer beside the rounds it took.
    fn answered(whole: &Positions, keys: &[u64]) -> ((Vec<Run>, usize), usize) {
        let held = Positions::started(whole.head().unwrap().to_vec()).unwrap();

        for round in 1.. {
            let answer = held.best(keys, whole.games());
            let wanted = held.wanted();

            if wanted.is_empty() {
                return (answer, round);
            }

            for part in wanted {
                held.add(part, whole.part(part).unwrap().to_vec()).unwrap();
            }
        }

        unreachable!()
    }

    #[test]
    fn a_head_alone_answers_as_the_whole_file_once_each_piece_is_added() {
        let positions = built(&[
            ("e2e4 e7e5 g1f3 b8c6", 100, 0, 0),
            ("e2e4 c7c5 g1f3 d7d6", 300, 0, 2),
            ("d2d4 d7d5 c2c4", 0, 0, 1),
        ]);
        let keys = keyed("e2e4 e7e5 g1f3 b8c6 f1b5");
        let (answer, rounds) = answered(&positions, &keys);

        assert_eq!(answer, positions.best(&keys, positions.games()));
        assert!(rounds > 1);
    }

    #[test]
    fn a_head_alone_reads_no_moves_and_writes_no_file() {
        let positions = built(&[("e2e4 e7e5", 0, 0, 0)]);
        let held = Positions::started(positions.head().unwrap().to_vec()).unwrap();

        assert_eq!(held.moves(0), Vec::<String>::new());
        assert_eq!(held.games(), 1);
        assert_eq!(held.head().unwrap_err().kind(), ErrorKind::InvalidInput);
        assert_eq!(
            held.part(Part::Keys(0)).unwrap_err().kind(),
            ErrorKind::InvalidInput
        );
        assert_eq!(
            held.write(Path::new("/nonexistent/positions.bin"))
                .unwrap_err()
                .kind(),
            ErrorKind::InvalidInput
        );
    }

    #[test]
    fn a_piece_the_head_names_nothing_for_or_cannot_read_is_refused() {
        let positions = built(&[("e2e4 e7e5", 0, 0, 0)]);
        let held = Positions::started(positions.head().unwrap().to_vec()).unwrap();
        let mut longer = positions.head().unwrap().to_vec();

        longer.push(0);

        for (part, bytes, kind) in [
            (Part::Keys(1 << 20), Vec::new(), ErrorKind::InvalidInput),
            (Part::Games(1), Vec::new(), ErrorKind::InvalidInput),
            (Part::Keys(0), vec![1; 3], ErrorKind::InvalidData),
            (Part::Games(0), vec![1; 3], ErrorKind::InvalidData),
        ] {
            assert_eq!(held.add(part, bytes).unwrap_err().kind(), kind);
        }

        assert_eq!(
            Positions::started(longer).unwrap_err().kind(),
            ErrorKind::InvalidData
        );
    }

    #[test]
    fn a_rehead_places_each_game_piece_at_the_size_given() {
        let positions = built(&[("e2e4 e7e5", 0, 0, 0), ("d2d4", 0, 0, 1)]);
        let sizes = (0..positions.pieces().1)
            .map(|at| {
                positions
                    .part(Part::Games(narrow(at as u64)))
                    .unwrap()
                    .len() as u64
            })
            .collect_vec();
        let wider = sizes.iter().map(|size| size + 7).collect_vec();
        let held = Positions::started(positions.rehead(&wider).unwrap()).unwrap();
        let (from, to) = held.span(Part::Games(0)).unwrap();

        assert_eq!(positions.rehead(&sizes).unwrap(), positions.head().unwrap());
        assert_eq!(to - from, wider[0]);
        assert_eq!(
            positions.rehead(&[]).unwrap_err().kind(),
            ErrorKind::InvalidInput
        );
    }

    #[test]
    fn a_missing_file_reads_as_not_found() {
        assert_eq!(
            Positions::read(Path::new("/nonexistent/positions.bin"))
                .unwrap_err()
                .kind(),
            ErrorKind::NotFound
        );
    }

    #[test]
    fn a_match_takes_the_longest_run_then_the_highest_standing() {
        let positions = built(&[
            ("e2e4 e7e5 g1f3 b8c6", 100, 0, 0),
            ("e2e4 e7e5 g1f3 b8c6", 300, 0, 0),
            ("e2e4 e7e5 g1f3 b8c6", 200, 0, 0),
            ("e2e4 e7e5", 999, 0, 0),
        ]);
        let (runs, ties) = positions.best(&keyed("e2e4 e7e5 g1f3 b8c6 f1b5"), 2);

        assert_eq!(ties, 2);
        assert_eq!(
            runs.iter().map(|run| (run.game, run.length)).collect_vec(),
            [(1, 5), (2, 5)]
        );
    }

    #[test]
    fn a_top_list_names_each_game_once_at_its_longest_run() {
        let positions = built(&[
            ("e2e4 e7e5 g1f3 b8c6", 0, 0, 0),
            ("g1f3 e7e5 e2e4 b8c6", 0, 0, 0),
        ]);
        let (runs, _) = positions.best(&keyed("e2e4 e7e5 g1f3 b8c6"), 5);

        assert_eq!(
            runs.iter().map(|run| (run.game, run.length)).collect_vec(),
            [(0, 5), (1, 2)]
        );
    }

    #[test]
    fn a_run_past_the_first_position_reports_its_offset() {
        let positions = built(&[("g1f3 g8f6 f3g1 f6g8 e2e4", 0, 0, 0)]);
        let runs = positions.runs(&keyed("e2e4"));

        assert_eq!(
            runs.iter()
                .map(|run| (run.game, run.start, run.offset, run.length))
                .max(),
            Some((0, 0, 4, 2))
        );
    }

    #[test]
    fn a_game_reaching_a_position_twice_counts_once_under_its_first_move() {
        let positions = built(&[
            ("g1f3 g8f6 f3g1 f6g8 e2e4", 0, 20_000_101, 0),
            ("e2e4 e7e5", 0, 20_000_102, 2),
        ]);
        let tally = positions.tally(None, &[], 5).unwrap();

        assert_eq!(tally.games, [1, 0]);
        assert_eq!(tally.ended, [0, 0, 0, 0]);
        assert_eq!(
            tally.moves,
            [
                ("Nf3".to_owned(), [1, 0, 0, 0]),
                ("e4".to_owned(), [0, 0, 1, 0])
            ]
        );
    }

    #[test]
    fn a_game_ending_at_a_position_counts_as_ended() {
        let positions = built(&[("e2e4", 0, 0, 1), ("e2e4 e7e5", 0, 0, 0)]);
        let tally = positions.tally(None, &["e2e4".to_owned()], 5).unwrap();

        assert_eq!(tally.ended, [0, 1, 0, 0]);
        assert_eq!(tally.moves, [("e5".to_owned(), [1, 0, 0, 0])]);
    }

    #[test]
    fn a_position_no_game_reaches_answers_nothing() {
        let positions = built(&[("e2e4", 0, 0, 0)]);

        assert_eq!(
            positions.tally(None, &["d2d4".to_owned()], 5).unwrap(),
            Tally::default()
        );
        assert_eq!(positions.best(&keyed("d2d4")[1..], 1), (Vec::new(), 0));
        assert_eq!(positions.reach(&keyed("d2d4")), [1, 0]);
    }

    #[test]
    fn a_tally_refuses_a_move_or_a_fen_it_cannot_read() {
        let positions = built(&[("e2e4", 0, 0, 0)]);

        for (fen, moves) in [(Some("x"), Vec::new()), (None, vec!["e2e5".to_owned()])] {
            assert_eq!(
                positions.tally(fen, &moves, 5).unwrap_err().kind(),
                ErrorKind::InvalidInput
            );
        }
    }

    #[test]
    fn a_game_starting_from_a_fen_is_played_from_it() {
        let fen = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";
        let mut board = Board::started(Some(fen), None).unwrap();
        let mut writer = Writer::default();
        let turn = board.named("e2e4").unwrap();

        writer.play(&board, turn).unwrap();
        assert!(board.take(turn));

        let moves = writer.finish().unwrap();
        let positions = Positions::build(&[Stored {
            moves: &moves,
            plies: 1,
            fen: Some(fen),
            variant: None,
            standing: 0,
            dated: 0,
            result: 0,
        }])
        .unwrap();

        assert_eq!(positions.moves(0), ["e2e4"]);
        assert_eq!(positions.reach(&[board.key()]), [1]);
        assert_eq!(positions.tally(Some(fen), &[], 5).unwrap().games, [0]);
    }

    #[test]
    fn each_start_reads_back_beside_its_slot() {
        let fen = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";
        let plain = encoded("g2g3");
        let variant = encoded("e2e4");
        let from_fen = {
            let mut board = Board::started(Some(fen), None).unwrap();
            let mut writer = Writer::default();
            let turn = board.named("e2e4").unwrap();

            writer.play(&board, turn).unwrap();
            assert!(board.take(turn));

            writer.finish().unwrap()
        };
        let stored = |moves, fen, variant| Stored {
            moves,
            plies: 1,
            fen,
            variant,
            standing: 0,
            dated: 0,
            result: 0,
        };
        let positions = Positions::build(&[
            stored(&plain, None, None),
            stored(&variant, None, Some("Chess960")),
            stored(&from_fen, Some(fen), None),
        ])
        .unwrap();

        assert_eq!(positions.moves(0), ["g2g3"]);
        assert_eq!(positions.moves(1), ["e2e4"]);
        assert_eq!(positions.moves(2), ["e2e4"]);
        assert_eq!(
            positions
                .games_holding(0)
                .unwrap()
                .0
                .starts
                .values()
                .cloned()
                .sorted_unstable()
                .collect_vec(),
            [
                (None, Some("Chess960".to_owned())),
                (Some(fen.to_owned()), None)
            ]
        );
    }

    #[test]
    fn a_game_no_position_can_be_set_up_for_is_stored_without_positions() {
        let positions = Positions::build(&[Stored {
            moves: &[],
            plies: 0,
            fen: Some("x"),
            variant: None,
            standing: 0,
            dated: 0,
            result: 3,
        }])
        .unwrap();

        assert_eq!(positions.positions(), 0);
        assert_eq!(positions.keys(), 0);
        assert_eq!(positions.moves(0), Vec::<String>::new());
    }

    #[test]
    fn an_index_of_no_game_answers_nothing() {
        let positions = Positions::build(&[]).unwrap();

        assert_eq!(positions.best(&keyed(""), 1), (Vec::new(), 0));
        assert_eq!(positions.runs(&keyed("")), []);
    }

    #[test]
    fn every_run_equals_a_comparison_of_full_keys() {
        let lines = [
            "e2e4 e7e5 g1f3 b8c6 f1b5",
            "e2e4 e7e5 g1f3 g8f6",
            "g1f3 b8c6 e2e4 e7e5 f1b5",
            "d2d4 d7d5",
            "g1f3 g8f6 f3g1 f6g8 g1f3 g8f6",
            "",
        ];
        let games = lines.iter().map(|&line| (line, 0, 0, 0)).collect_vec();
        let positions = built(&games);

        for submitted in lines {
            let keys = keyed(submitted);
            let found = positions
                .runs(&keys)
                .iter()
                .map(|run| (run.game, run.offset, run.start, run.length))
                .sorted_unstable()
                .collect_vec();
            let expected = (0u32..)
                .zip(lines)
                .flat_map(|(game, line)| {
                    let stored = keyed(line);

                    (0..keys.len())
                        .cartesian_product(0..stored.len())
                        .filter(|&(at, ply)| {
                            keys[at] == stored[ply]
                                && (at == 0 || ply == 0 || keys[at - 1] != stored[ply - 1])
                        })
                        .map(|(at, ply)| {
                            let length = keys[at..]
                                .iter()
                                .zip(&stored[ply..])
                                .take_while(|(a, b)| a == b)
                                .count();

                            (
                                game,
                                i64::try_from(ply).unwrap() - i64::try_from(at).unwrap(),
                                u32::try_from(at).unwrap(),
                                u32::try_from(length).unwrap(),
                            )
                        })
                        .collect_vec()
                })
                .sorted_unstable()
                .collect_vec();

            assert_eq!(found, expected, "{submitted}");
        }
    }
}
