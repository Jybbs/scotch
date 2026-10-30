//! Holds `Game`, one game a PGN text carries, read by `read` as
//! python-chess 1.11.2's `chess.pgn.read_game` reads it under a visitor that
//! skips every variation, and keyed position by position as
//! `chess.polyglot.zobrist_hash` keys the boards that game yields.

use shakmaty::uci::UciMove;

use crate::{
    boards::Board,
    lines::{Lines, is_blank},
    sans::{self, Reading},
    tags::{Rules, Tags},
    tokens::{self, Kind},
};

/// One game a PGN text carries.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct Game {
    /// The value of each tag pair keyed by its name, the Seven Tag Roster
    /// first and filled with python-chess's placeholders where the text
    /// leaves a tag out.
    pub tags: Vec<(String, String)>,
    /// The moves of the mainline in Universal Chess Interface (UCI)
    /// notation as python-chess writes them, a null move as `0000` and a
    /// castle as the king's move onto its own square, or onto the rook's in
    /// Chess960.
    pub moves: Vec<String>,
    /// The Zobrist hash of each position of the mainline, from the one the
    /// `FEN` tag sets up or the standard starting position to the one after
    /// the last move, or none where the tags name no position to set up.
    pub keys: Vec<u64>,
    /// The message of each error python-chess's reader records, such as a
    /// move illegal in the position it was played from.
    pub errors: Vec<String>,
}

/// Reads every game `text` carries, in the order it holds them.
#[must_use]
pub fn read(text: &str) -> Vec<Game> {
    let mut lines = Lines::new(text);

    std::iter::from_fn(|| next(&mut lines)).collect()
}

/// Reads the game whose lines open at the byte `at` of `text`, beside the
/// byte the lines after it open at, or `None` where no line is left to open
/// one, so a caller holding the text reads its games one at a time.
#[must_use]
pub fn read_at(text: &str, at: usize) -> Option<(Game, usize)> {
    let mut lines = Lines::new(&text[at..]);
    let game = next(&mut lines)?;

    Some((game, text.len() - lines.remaining()))
}

/// Reads the next game of `lines`, or `None` where no line is left to open
/// one, as one call of python-chess's `read_game` does.
fn next(lines: &mut Lines<'_>) -> Option<Game> {
    let mut line = lines.next_line().trim_start_matches('\u{feff}');

    while is_blank(line) || line.starts_with(['%', ';']) {
        line = lines.next_line();
    }

    let mut tags = Tags::default();
    let mut found = false;
    let mut blank = false;

    while !line.is_empty() {
        if line.starts_with(['%', ';']) {
            line = lines.next_line();
            continue;
        }

        if !blank && is_blank(line) {
            blank = true;
            line = lines.next_line();
            continue;
        }

        found = true;

        if !line.starts_with('[') {
            break;
        }

        blank = false;

        if let Some((name, value)) = Tags::parse(line) {
            tags.set(name, value);
        }

        line = lines.next_line();
    }

    if !found {
        return None;
    }

    let mut game = Game::default();
    let (rules, keyed) = match tags.rules() {
        Ok(rules) => (rules, true),
        Err(error) => {
            game.errors.push(error);
            (Rules::Standard, false)
        }
    };
    let board = match rules {
        Rules::Variant => None,
        _ => match Board::set_up(tags.get("FEN"), rules) {
            Ok(board) => Some(board),
            Err(error) => {
                game.errors.push(error);
                skip(lines, line);
                game.tags = tags.pairs();
                return Some(game);
            }
        },
    };

    if keyed && let Some(board) = &board {
        game.keys.push(board.key());
    }

    let mut reader = Mainline {
        board,
        game,
        tags,
        keyed,
        depth: 0,
        moved: false,
    };
    reader.movetext(lines, line);
    reader.game.tags = reader.tags.pairs();
    Some(reader.game)
}

/// Skips the movetext of a game whose position cannot be set up, as the
/// fast path of python-chess's reader does, reading `line` first.
fn skip<'a>(lines: &mut Lines<'a>, mut line: &'a str) {
    let mut in_comment = false;

    while !line.is_empty() {
        if !in_comment && is_blank(line) {
            break;
        }

        if in_comment || !line.starts_with('%') {
            for c in line.chars() {
                match c {
                    '{' => in_comment = true,
                    ';' if !in_comment => break,
                    '}' => in_comment = false,
                    _ => {}
                }
            }
        }

        line = lines.next_line();
    }
}

/// The game being read, the board its mainline reaches, and how deep the
/// reader stands inside variations it skips.
struct Mainline {
    /// The board the next move is read against, or `None` for a variant
    /// whose moves are left unread.
    board: Option<Board>,
    /// The game read so far.
    game: Game,
    /// The tag pairs read so far, which a result in the movetext completes.
    tags: Tags,
    /// Whether the game keys its positions, which it does unless its
    /// `Variant` tag names a variant python-chess cannot read.
    keyed: bool,
    /// How many variations deep the reader stands in movetext it skips, 1
    /// being the variation a move python-chess cannot read opens over the
    /// rest of the mainline.
    depth: u32,
    /// Whether a move has been played, which a variation needs to open.
    moved: bool,
}

impl Mainline {
    /// Reads the movetext from `line` to the blank line ending the game,
    /// as the movetext loop of python-chess's reader does.
    fn movetext<'a>(&mut self, lines: &mut Lines<'a>, mut line: &'a str) {
        let mut fresh = true;

        while !line.is_empty() {
            if fresh {
                if line.starts_with(['%', ';']) {
                    line = lines.next_line();
                    continue;
                }
                if is_blank(line) {
                    return;
                }
            }

            fresh = true;
            let mut from = 0;

            while let Some((kind, start, end)) = tokens::next(line, from) {
                from = end;

                match kind {
                    Kind::Comment => {
                        line = close(lines, &line[start + 1..]);
                        fresh = false;
                        break;
                    }
                    Kind::Open if self.depth > 0 => self.depth += 1,
                    Kind::Open if self.moved => self.depth = 1,
                    Kind::Close => self.depth = self.depth.saturating_sub(1),
                    Kind::Open => {}
                    _ if self.depth > 0 => {}
                    Kind::Rest => break,
                    Kind::Result if self.tags.get("Result") == Some("*") => {
                        self.tags.set("Result", &line[start..end]);
                    }
                    Kind::Glyph | Kind::Result => {}
                    Kind::Move => self.play(&line[start..end]),
                }
            }

            if fresh {
                line = lines.next_line();
            }
        }
    }

    /// Reads the move token `token` against the board and plays it, or
    /// records the error python-chess's reader records and skips the rest
    /// of the mainline as a variation.
    fn play(&mut self, token: &str) {
        let Some(board) = &mut self.board else {
            self.moved = true;
            return;
        };

        let played = match sans::read(board, token) {
            Ok(Reading::Move(m, uci)) => {
                board.play(m);
                Ok(uci.to_string())
            }
            Ok(Reading::Null) if board.pass() => Ok(UciMove::Null.to_string()),
            Ok(Reading::Null) => Err(format!("illegal san: '{token}' in {}", board.fen())),
            Err(error) => Err(error),
        };

        match played {
            Ok(uci) => {
                self.moved = true;
                self.game.moves.push(uci);
                if self.keyed {
                    self.game.keys.push(board.key());
                }
            }
            Err(error) => {
                self.game.errors.push(error);
                self.depth = 1;
            }
        }
    }
}

/// Reads past the comment whose text opens `rest` to the `}` closing it,
/// reading further lines where it runs past the end of this one, and
/// returns what follows the `}` on its line, or an empty line where the
/// text ends first.
fn close<'a>(lines: &mut Lines<'a>, mut rest: &'a str) -> &'a str {
    while !rest.is_empty() {
        if let Some(at) = rest.find('}') {
            return &rest[at + 1..];
        }
        rest = lines.next_line();
    }

    rest
}

#[cfg(test)]
mod tests {
    use super::*;

    fn moves(game: &Game) -> Vec<&str> {
        game.moves.iter().map(String::as_str).collect()
    }

    #[test]
    fn reading_from_where_a_game_ends_reads_the_next() {
        let text = "1. e4 *\n\n\n1. d4 *\n";
        let (first, at) = read_at(text, 0).unwrap();
        let (second, end) = read_at(text, at).unwrap();

        assert_eq!(
            (first.moves, second.moves),
            (vec!["e2e4".to_owned()], vec!["d2d4".to_owned()])
        );
        assert_eq!((end, read_at(text, end)), (text.len(), None));
    }

    #[test]
    fn a_blank_line_ends_a_game() {
        let games = read("[Event \"A\"]\n\n1. e4 e5\n\n[Event \"B\"]\n\n1. d4 *\n");

        assert_eq!(games.len(), 2);
        assert_eq!(moves(&games[0]), ["e2e4", "e7e5"]);
        assert_eq!(games[1].tags[0], ("Event".to_owned(), "B".to_owned()));
        assert_eq!(games[1].tags[6], ("Result".to_owned(), "*".to_owned()));
        assert_eq!(games[0].keys.len(), 3);
    }

    #[test]
    fn a_result_in_the_movetext_fills_an_open_result_tag() {
        let [game] = read("1. e4 1-0\n").try_into().unwrap();

        assert_eq!(game.tags[6], ("Result".to_owned(), "1-0".to_owned()));
    }

    #[test]
    fn a_variation_and_a_comment_leave_the_mainline_as_it_reads() {
        let [game] = read("1. e4 (1. d4 {a\n\nlong} d5) e5 {b} 2. Nf3 ; c\n*\n")
            .try_into()
            .unwrap();

        assert_eq!(moves(&game), ["e2e4", "e7e5", "g1f3"]);
        assert_eq!(game.errors, Vec::<String>::new());
    }

    #[test]
    fn an_illegal_move_ends_the_mainline_and_records_its_error() {
        let [game] = read("1. e4 e5 2. Qxh7 Nc6 *\n").try_into().unwrap();

        assert_eq!(moves(&game), ["e2e4", "e7e5"]);
        assert_eq!(
            game.errors,
            ["illegal san: 'Qxh7' in rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"]
        );
    }

    #[test]
    fn a_fen_tag_python_chess_cannot_read_leaves_no_move_and_no_key() {
        let [game] = read("[FEN \"garbage\"]\n\n1. e4 *\n").try_into().unwrap();

        assert_eq!(
            (game.moves, game.keys),
            (Vec::<String>::new(), Vec::<u64>::new())
        );
        assert_eq!(
            game.errors,
            ["expected 8 rows in position part of fen: 'garbage'"]
        );
    }

    #[test]
    fn a_position_no_legal_game_reaches_records_an_error_and_no_move() {
        let [game] = read("[FEN \"4k3/8/8/8/8/8/8/8 w - - 0 1\"]\n\n1. Kd7 *\n")
            .try_into()
            .unwrap();

        assert_eq!(
            game.errors,
            ["invalid position in fen: '4k3/8/8/8/8/8/8/8 w - - 0 1'"]
        );
        assert_eq!(
            (game.moves, game.keys),
            (Vec::<String>::new(), Vec::<u64>::new())
        );
    }

    #[test]
    fn a_null_move_out_of_check_records_an_error_and_ends_the_mainline() {
        let [game] = read("[FEN \"4k3/8/8/8/8/8/8/r3K3 w - - 0 1\"]\n\n1. -- Kd7 *\n")
            .try_into()
            .unwrap();

        assert_eq!(
            game.errors,
            ["illegal san: '--' in 4k3/8/8/8/8/8/8/r3K3 w - - 0 1"]
        );
        assert_eq!(game.moves, Vec::<String>::new());
        assert_eq!(game.keys.len(), 1);
    }

    #[test]
    fn an_unknown_variant_reads_its_moves_and_takes_no_key() {
        let [game] = read("[Variant \"Bughouse\"]\n\n1. e4 *\n")
            .try_into()
            .unwrap();

        assert_eq!(moves(&game), ["e2e4"]);
        assert_eq!(game.errors, ["unsupported variant: Bughouse"]);
        assert_eq!(game.keys, Vec::<u64>::new());
    }
}
