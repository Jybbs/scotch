//! Holds `Game`, one game a PGN text carries, read by `read` as
//! python-chess 1.11.2's `chess.pgn.read_game` reads it under a visitor that
//! skips every variation, and keyed position by position through `Board::key`,
//! save that each set of tags opens one game whatever the spacing around it.
//! A game's movetext ends at its result, which the PGN standard, section
//! 8.2.6, sets last in each movetext, blank lines after the tags leave the
//! game whole, and text past the first game holding no tag pair yields no
//! game.

use shakmaty::uci::UciMove;

use crate::{
    boards::Board,
    lines::{Lines, is_blank, is_space},
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
    /// the last move, or none where the tags set up no position or name a
    /// variant python-chess reads under rules of its own.
    pub keys: Vec<u64>,
    /// The message of each error python-chess's reader records, such as a
    /// move illegal in the position it was played from.
    pub errors: Vec<String>,
    /// What python-chess's reader passes over with no error, meaning each
    /// word of the movetext holding no token and reading as no move number,
    /// each line opening on `[` that holds no tag pair, a `{` the text never
    /// closes, a `(` the text never closes or that opens before any move, and
    /// a `)` with no `(` open.
    pub skipped: Vec<String>,
}

/// Reads every game `text` carries, in the order it holds them.
#[must_use]
pub fn read(text: &str) -> Vec<Game> {
    let mut lines = Lines::new(text);
    let first = next(&mut lines, true);

    first
        .into_iter()
        .chain(std::iter::from_fn(|| next(&mut lines, false)))
        .collect()
}

/// Reads the game whose lines open at the byte `at` of `text`, beside the
/// byte the lines after it open at, or `None` where no line is left to open
/// one, so a caller holding the text reads its games one at a time.
#[must_use]
pub fn read_at(text: &str, at: usize) -> Option<(Game, usize)> {
    let mut lines = Lines::new(&text[at..]);
    let game = next(&mut lines, at == 0)?;

    Some((game, text.len() - lines.remaining()))
}

/// Reports whether `text` holds a line past the byte `at` that the reader
/// does not pass over, such as another game or text holding no tag pair.
#[must_use]
pub fn trails(text: &str, at: usize) -> bool {
    !past(&mut Lines::new(&text[at..])).is_empty()
}

/// Reads the next game of `lines`, or `None` where no line is left to open
/// one, as one call of python-chess's `read_game` does, save that a game
/// past the `first` of its text opens only on a line opening on `[`, every
/// line before it passed over, and that blank lines after the tags lead to
/// the game's movetext unless a line opening on `[` follows them, which opens
/// the next game and leaves this one with no movetext.
fn next(lines: &mut Lines<'_>, first: bool) -> Option<Game> {
    let mut line = lines.next_line().trim_start_matches('\u{feff}');

    while passed_over(line) || !(first || line.is_empty() || line.starts_with('[')) {
        line = lines.next_line().trim_start_matches('\u{feff}');
    }

    let mut tags = Tags::default();
    let mut skipped = Vec::new();
    let mut found = false;

    while !line.is_empty() {
        if line.starts_with(['%', ';']) {
            line = lines.next_line();
            continue;
        }

        if is_blank(line) {
            let mut ahead = lines.clone();
            let after = past(&mut ahead);

            if after.starts_with('[') {
                line = "";
                break;
            }

            *lines = ahead;
            line = after;
            continue;
        }

        found = true;

        if !line.starts_with('[') {
            break;
        }

        if let Some((name, value)) = Tags::parse(line) {
            tags.set(name, value);
        } else {
            skipped.push(line.trim_matches(is_space).to_owned());
        }

        line = lines.next_line();
    }

    if !found {
        return None;
    }

    let mut game = Game {
        skipped,
        ..Game::default()
    };
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
        failed: false,
    };
    reader.movetext(lines, line);

    if reader.depth > 0 && reader.game.errors.is_empty() {
        reader.game.skipped.push("(".to_owned());
    }

    reader.game.tags = reader.tags.pairs();
    Some(reader.game)
}

/// Reports whether the reader passes over `line` between the parts of a
/// game, as it does a blank line and a line opening on `%` or `;`.
fn passed_over(line: &str) -> bool {
    is_blank(line) || line.starts_with(['%', ';'])
}

/// Reads the next line of `lines` the reader does not pass over, or an empty
/// line once the text is spent.
fn past<'a>(lines: &mut Lines<'a>) -> &'a str {
    let mut line = lines.next_line();

    while passed_over(line) {
        line = lines.next_line();
    }

    line
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
    /// Whether a move python-chess cannot read has been met, past which a
    /// result ends the game wherever it stands.
    failed: bool,
}

impl Mainline {
    /// Reads the movetext from `line` to the blank line or the result ending
    /// the game, as the movetext loop of python-chess's reader does save for
    /// the result, which ends the game on the mainline or past an illegal
    /// move and leaves the rest of its line unread.
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
            let mut after = false;

            while let Some((kind, start, end)) = tokens::next(line, from) {
                self.pass_over(&line[from..start], after);
                from = end;
                after = kind == Kind::Move;

                match kind {
                    Kind::Comment => {
                        line = close(lines, &line[start + 1..]).unwrap_or_else(|| {
                            self.game.skipped.push("{".to_owned());
                            ""
                        });
                        fresh = false;
                        break;
                    }
                    Kind::Result if self.depth == 0 || self.failed => {
                        if self.depth == 0 && self.tags.get("Result") == Some("*") {
                            self.tags.set("Result", &line[start..end]);
                        }
                        return;
                    }
                    Kind::Open if self.depth > 0 => self.depth += 1,
                    Kind::Open if self.moved => self.depth = 1,
                    Kind::Close if self.depth > 0 => self.depth -= 1,
                    Kind::Open | Kind::Close => self.game.skipped.push(line[start..end].to_owned()),
                    _ if self.depth > 0 => {}
                    Kind::Rest => break,
                    Kind::Glyph | Kind::Result => {}
                    Kind::Move => self.play(&line[start..end]),
                }
            }

            if fresh {
                self.pass_over(&line[from..], after);
                line = lines.next_line();
            }
        }
    }

    /// Records each word of `gap`, the text a line holds between two tokens,
    /// unless it reads as a move number, meaning digits closed by any dots or
    /// any `…`. Where `after` is set, the first word runs into the move before
    /// it and is recorded only where it holds a letter or a digit other than
    /// `x`, which leaves out the `+` of `e4+` and the `x` of `Nf3x` and records
    /// the `1` of `e41`.
    fn pass_over(&mut self, gap: &str, after: bool) {
        let mut words = gap.split(is_space);

        if after
            && let Some(word) = words.next()
            && word.contains(|c: char| c.is_alphanumeric() && c != 'x')
        {
            self.game.skipped.push(word.to_owned());
        }

        self.game.skipped.extend(
            words
                .filter(|word| {
                    !word
                        .trim_end_matches(['.', '…'])
                        .bytes()
                        .all(|c| c.is_ascii_digit())
                })
                .map(str::to_owned),
        );
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
                self.failed = true;
            }
        }
    }
}

/// Reads past the comment whose text opens `rest` to the `}` closing it,
/// reading further lines where it runs past the end of this one, and
/// returns what follows the `}` on its line, or `None` where the text ends
/// first.
fn close<'a>(lines: &mut Lines<'a>, mut rest: &'a str) -> Option<&'a str> {
    while !rest.is_empty() {
        if let Some(at) = rest.find('}') {
            return Some(&rest[at + 1..]);
        }
        rest = lines.next_line();
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn moves(game: &Game) -> Vec<&str> {
        game.moves.iter().map(String::as_str).collect()
    }

    #[test]
    fn reading_from_where_a_game_ends_reads_the_next() {
        let text = "1. e4 *\n\n\n[Event \"B\"]\n1. d4 *\n";
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
    fn a_result_ends_a_game_whose_next_tags_follow_directly() {
        let games = read("[Event \"A\"]\n1. e4 e5 1-0 Nf3\n[Event \"B\"]\n1. d4 *\n");

        assert_eq!(games.len(), 2);
        assert_eq!(moves(&games[0]), ["e2e4", "e7e5"]);
        assert_eq!(games[0].tags[6], ("Result".to_owned(), "1-0".to_owned()));
        assert_eq!(moves(&games[1]), ["d2d4"]);
        assert_eq!(games[1].errors, Vec::<String>::new());
    }

    #[test]
    fn a_result_inside_a_variation_leaves_the_mainline_whole() {
        let games = read("1. e4 e5 (1... c5 2. Nf3 1-0) 2. Nf3 *\n");

        assert_eq!(games.len(), 1);
        assert_eq!(moves(&games[0]), ["e2e4", "e7e5", "g1f3"]);
    }

    #[test]
    fn a_result_past_an_illegal_move_ends_the_game() {
        let games = read("[Event \"A\"]\n1. e4 e4 1-0\n[Event \"B\"]\n1. d4 *\n");

        assert_eq!(games.len(), 2);
        assert_eq!(games[0].errors.len(), 1);
        assert_eq!(moves(&games[1]), ["d2d4"]);
    }

    #[test]
    fn a_result_inside_a_variation_past_an_unknown_variant_leaves_the_game_open() {
        let [game] = read("[Variant \"Foo\"]\n\n1. e4 e5 (1... c5 2. Nf3 1-0) 2. Nf3 *\n")
            .try_into()
            .unwrap();

        assert_eq!(moves(&game), ["e2e4", "e7e5", "g1f3"]);
    }

    #[test]
    fn text_between_games_holding_no_tag_pair_yields_no_game() {
        let games =
            read("[Event \"A\"]\n1. e4 *\n\n-----\n1. d4\n\n[Event \"B\"]\n1. c4 *\n-----\n");

        assert_eq!(games.len(), 2);
        assert_eq!(moves(&games[0]), ["e2e4"]);
        assert_eq!(moves(&games[1]), ["c2c4"]);
    }

    #[test]
    fn a_first_game_holding_no_tag_pair_is_read() {
        let [game] = read("-- e5\n").try_into().unwrap();

        assert_eq!(moves(&game), ["0000", "e7e5"]);
    }

    #[test]
    fn blank_lines_after_the_tags_leave_the_game_whole() {
        let [game] = read("[Event \"A\"]\n\n% an escape\n\n1. e4 *\n")
            .try_into()
            .unwrap();

        assert_eq!(game.tags[0], ("Event".to_owned(), "A".to_owned()));
        assert_eq!(moves(&game), ["e2e4"]);
    }

    #[test]
    fn a_blank_line_before_more_tags_opens_another_game() {
        let games = read("[Event \"A\"]\n\n\n[Event \"B\"]\n\n1. d4 *\n");

        assert_eq!(games.len(), 2);
        assert_eq!(
            (games[0].tags[0].1.as_str(), games[0].moves.len()),
            ("A", 0)
        );
        assert_eq!(moves(&games[1]), ["d2d4"]);
    }

    #[test]
    fn a_byte_order_mark_opening_a_later_game_is_passed_over() {
        let games = read("[Event \"A\"]\n1. e4 *\n\n\u{feff}[Event \"B\"]\n1. d4 *\n");

        assert_eq!(games[1].tags[0], ("Event".to_owned(), "B".to_owned()));
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
    fn a_word_holding_no_token_is_reported_apart_from_the_errors() {
        let [game] = read("1. e4 hello e5 Qh9 2. Nf3 *\n").try_into().unwrap();

        assert_eq!(moves(&game), ["e2e4", "e7e5", "g1f3"]);
        assert_eq!(game.errors, Vec::<String>::new());
        assert_eq!(game.skipped, ["hello", "Qh9"]);
    }

    #[test]
    fn a_word_running_into_a_token_other_than_a_move_is_reported() {
        let [game] = read("1. e4 Qh9! (hello) e9$1 e5 world* {a}\n")
            .try_into()
            .unwrap();

        assert_eq!(moves(&game), ["e2e4", "e7e5"]);
        assert_eq!(game.skipped, ["Qh9", "hello", "e9", "world"]);
    }

    #[test]
    fn a_word_is_reported_wherever_the_reader_passes_over_it() {
        let [game] = read("hello 1. e4 (1. d4 inside) {a}after e5 last\nend\n")
            .try_into()
            .unwrap();

        assert_eq!(game.skipped, ["hello", "inside", "after", "last", "end"]);
    }

    #[test]
    fn a_word_running_into_a_move_is_reported_on_either_side() {
        let [game] = read("1. e4hello helloe5 2. Sf3 Pc6\n").try_into().unwrap();

        assert_eq!(moves(&game), ["e2e4", "e7e5", "f2f3", "c7c6"]);
        assert_eq!(game.skipped, ["hello", "hello", "S", "P"]);
    }

    #[test]
    fn marks_running_off_a_move_and_an_ellipsis_in_a_number_are_not_reported() {
        let [game] = read("1. e4+ 1…e5# 2.…Nf3x\n").try_into().unwrap();

        assert_eq!(moves(&game), ["e2e4", "e7e5", "g1f3"]);
        assert_eq!(game.skipped, Vec::<String>::new());
    }

    #[test]
    fn a_variation_the_text_never_closes_is_reported() {
        let [game] = read("1. e4 ( e5\n").try_into().unwrap();

        assert_eq!(moves(&game), ["e2e4"]);
        assert_eq!(game.skipped, ["("]);
    }

    #[test]
    fn a_digit_running_into_the_move_before_it_is_reported() {
        let [game] = read("1. e41 e5\n").try_into().unwrap();

        assert_eq!(moves(&game), ["e2e4", "e7e5"]);
        assert_eq!(game.skipped, ["1"]);
    }

    #[test]
    fn a_variation_opening_before_any_move_is_reported() {
        let [game] = read("( e4\n").try_into().unwrap();

        assert_eq!(moves(&game), ["e2e4"]);
        assert_eq!(game.skipped, ["("]);
    }

    #[test]
    fn a_variation_closing_with_none_open_is_reported() {
        let [game] = read("1. e4 ) e5\n").try_into().unwrap();

        assert_eq!(moves(&game), ["e2e4", "e7e5"]);
        assert_eq!(game.skipped, [")"]);
    }

    #[test]
    fn a_variation_closed_twice_is_reported_once() {
        let [game] = read("1. e4 ( c5 ) ) e5\n").try_into().unwrap();

        assert_eq!(moves(&game), ["e2e4", "e7e5"]);
        assert_eq!(game.skipped, [")"]);
    }

    #[test]
    fn a_variation_closing_where_one_is_open_is_not_reported() {
        let [game] = read("1. e4 ( c5 ) e5\n").try_into().unwrap();

        assert_eq!(moves(&game), ["e2e4", "e7e5"]);
        assert_eq!(game.skipped, Vec::<String>::new());
    }

    #[test]
    fn a_comment_the_text_never_closes_is_reported() {
        let [game] = read("1. e4 {a note\ne5\n").try_into().unwrap();

        assert_eq!(moves(&game), ["e2e4"]);
        assert_eq!(game.skipped, ["{"]);
    }

    #[test]
    fn a_variation_an_illegal_move_opens_is_not_reported_as_left_open() {
        let [game] = read("1. e4 e4 e5\n").try_into().unwrap();

        assert_eq!(game.errors.len(), 1);
        assert_eq!(game.skipped, Vec::<String>::new());
    }

    #[test]
    fn a_word_past_an_illegal_move_is_reported_beside_its_error() {
        let [game] = read("1. e4 e4 hello *\n").try_into().unwrap();

        assert_eq!(game.errors.len(), 1);
        assert_eq!(game.skipped, ["hello"]);
    }

    #[test]
    fn a_line_opening_on_a_bracket_with_no_tag_pair_is_reported_whole() {
        let [game] = read("[Event \"A\"] 1. e4\n[hello\n1. d4 *\n")
            .try_into()
            .unwrap();

        assert_eq!(moves(&game), ["d2d4"]);
        assert_eq!(game.tags[0], ("Event".to_owned(), "?".to_owned()));
        assert_eq!(game.skipped, ["[Event \"A\"] 1. e4", "[hello"]);
    }

    #[test]
    fn what_a_line_of_moves_holds_beside_its_moves_is_not_reported() {
        let [game] = read(concat!(
            "[Event \"A\"]\n% an escape\n\n",
            "1. e4 1...e5 2.Nf3! Nc6?! $1 {a note} 3 Bb5 ... a6 ",
            "(3...Nf6 {inside} 4. O-O) ; a rest\n",
            "% another escape\n4. Ba4+ Nf6x 5. O-O# 1-0\n",
        ))
        .try_into()
        .unwrap();

        assert_eq!(game.errors, Vec::<String>::new());
        assert_eq!(game.moves.len(), 9);
        assert_eq!(game.skipped, Vec::<String>::new());
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
