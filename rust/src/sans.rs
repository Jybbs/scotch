//! Reads one move token in Standard Algebraic Notation (SAN) against a board
//! as python-chess's `Board.parse_san` reads it, accepting what it accepts
//! and raising the message it raises for what it does not.

use shakmaty::{CastlingSide, File, Position, Rank, Role, Square, uci::UciMove};

use crate::boards::Board;

/// What a move token reads as on the board it is played on.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Reading {
    /// A legal move beside the name python-chess gives it in UCI notation.
    Move(shakmaty::Move, UciMove),
    /// A null move, which passes the turn.
    Null,
}

/// The parts of a move python-chess's `SAN_REGEX` matches, meaning
/// `^([NBKRQ])?([a-h])?([1-8])?[\-x]?([a-h][1-8])(=?[nbrqkNBRQK])?[\+#]?\Z`.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct San {
    /// The piece letter.
    pub role: Option<Role>,
    /// The file the move leaves.
    pub file: Option<File>,
    /// The rank the move leaves.
    pub rank: Option<Rank>,
    /// The square the move reaches.
    pub to: Square,
    /// The piece a pawn promotes to.
    pub promotion: Option<Role>,
}

impl San {
    /// Matches `token` from its first byte as python-chess's regular
    /// expression for a move does, taking each optional part where the rest
    /// still matches, in the order its backtracking tries them, and returns
    /// the parts beside the count of bytes they span. With `whole`, the
    /// match spans `token` to its end, as `SAN_REGEX` requires.
    pub fn matched(token: &[u8], whole: bool) -> Option<(San, usize)> {
        let at = |i: usize| char::from(token.get(i).copied().unwrap_or_default());
        let piece = |c: char| "nbrqkNBRQK".contains(c);

        for role in offer(
            Some(at(0))
                .filter(|&c| "NBKRQ".contains(c))
                .and_then(Role::from_char),
        ) {
            let i = usize::from(role.is_some());
            for file in offer(File::from_char(at(i))) {
                let i = i + usize::from(file.is_some());
                for rank in offer(Rank::from_char(at(i))) {
                    let i = i + usize::from(rank.is_some());
                    for sep in offer(Some(at(i)).filter(|&c| "-x".contains(c))) {
                        let i = i + usize::from(sep.is_some());
                        let (Some(to_file), Some(to_rank)) =
                            (File::from_char(at(i)), Rank::from_char(at(i + 1)))
                        else {
                            continue;
                        };
                        let i = i + 2;
                        let promotions = [
                            (at(i) == '=' && piece(at(i + 1)))
                                .then(|| (2, Role::from_char(at(i + 1)))),
                            piece(at(i)).then(|| (1, Role::from_char(at(i)))),
                            Some((0, None)),
                        ];

                        if let Some((span, promotion)) = promotions
                            .into_iter()
                            .flatten()
                            .find(|(span, _)| !whole || i + span == token.len())
                        {
                            let to = Square::from_coords(to_file, to_rank);
                            return Some((
                                San {
                                    role,
                                    file,
                                    rank,
                                    to,
                                    promotion,
                                },
                                i + span,
                            ));
                        }
                    }
                }
            }
        }

        None
    }
}

/// Offers `found` and then its absence, the order a regular expression's
/// greedy optional part tries them in, or its absence alone where nothing was
/// found.
fn offer<T: Copy>(found: Option<T>) -> impl Iterator<Item = Option<T>> {
    found.map(Some).into_iter().chain([None])
}

/// Reads `token` on `board` as python-chess's `Board.parse_san` reads a
/// token its reader matched, returning the message of the
/// `InvalidMoveError`, `IllegalMoveError`, or `AmbiguousMoveError` it raises
/// for one that names no legal move.
pub fn read(board: &Board, token: &str) -> Result<Reading, String> {
    let side = match token {
        "O-O" | "0-0" => Some(CastlingSide::KingSide),
        "O-O-O" | "0-0-0" => Some(CastlingSide::QueenSide),
        _ => None,
    };
    let illegal = |prefix: &str| format!("{prefix}: '{token}' in {}", board.fen());

    if let Some(side) = side {
        return board
            .legal()
            .find(|(m, _)| m.castling_side() == Some(side))
            .map(|(m, named)| Reading::Move(m, named))
            .ok_or_else(|| illegal("illegal san"));
    }

    let Some((san, _)) = San::matched(token.as_bytes(), true) else {
        return match token {
            "--" | "Z0" | "0000" | "@@@@" => Ok(Reading::Null),
            _ => Err(format!("invalid san: '{token}'")),
        };
    };

    if let (None, Some(file), Some(rank)) = (san.role, san.file, san.rank) {
        return find(board, token, Square::from_coords(file, rank), san);
    }

    let pos = &board.position;
    let mut matched = board.legal().filter(|(m, uci)| {
        let UciMove::Normal {
            from,
            to,
            promotion,
        } = *uci
        else {
            return false;
        };

        !m.is_castle()
            && to == san.to
            && promotion == san.promotion
            && san.file.is_none_or(|file| from.file() == file)
            && san.rank.is_none_or(|rank| from.rank() == rank)
            && match san.role {
                Some(role) => pos.our(role).contains(from),
                None => {
                    pos.our(Role::Pawn).contains(from)
                        && (san.file.is_some() || from.file() == san.to.file())
                }
            }
    });

    match (matched.next(), matched.next()) {
        (Some((m, named)), None) => Ok(Reading::Move(m, named)),
        (Some(_), Some(_)) => Err(illegal("ambiguous san")),
        (None, _) => Err(illegal("illegal san")),
    }
}

/// Reads a token naming the square a move leaves and the square it reaches
/// with no piece letter, as python-chess's `Board.find_move` reads it, a
/// pawn reaching the last rank promoting to a queen unless the token names
/// another piece, and a king on `e1` or `e8` taking a corner rook castling.
fn find(board: &Board, token: &str, from: Square, san: San) -> Result<Reading, String> {
    let placement = board.position.board();
    let promotion = san.promotion.or_else(|| {
        (placement.pawns().contains(from) && matches!(san.to.rank(), Rank::First | Rank::Eighth))
            .then_some(Role::Queen)
    });
    let castles = board.position.castles().mode() == shakmaty::CastlingMode::Standard
        && promotion.is_none()
        && [Square::E1, Square::E8].contains(&from)
        && placement.kings().contains(from)
        && from.rank() == san.to.rank()
        && [File::A, File::H].contains(&san.to.file());
    let to = if castles {
        Square::from_coords(
            if san.to.file() == File::H {
                File::G
            } else {
                File::C
            },
            from.rank(),
        )
    } else {
        san.to
    };
    let named = UciMove::Normal {
        from,
        to,
        promotion,
    };

    let (m, _) = board
        .legal()
        .find(|(_, legal)| *legal == named)
        .ok_or_else(|| {
            format!(
                "no matching legal move for {named} ({from} -> {}) in {}",
                san.to,
                board.fen()
            )
        })?;

    if promotion != san.promotion {
        return Err(format!(
            "missing promotion piece type: '{token}' in {}",
            board.fen()
        ));
    }

    Ok(Reading::Move(m, named))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tags::Rules;

    fn start() -> Board {
        Board::set_up(None, Rules::Standard).unwrap()
    }

    fn named(board: &Board, token: &str) -> Result<String, String> {
        read(board, token).map(|reading| match reading {
            Reading::Move(_, uci) => uci.to_string(),
            Reading::Null => UciMove::Null.to_string(),
        })
    }

    #[test]
    fn a_token_splits_as_the_regular_expression_splits_it() {
        let (parts, length) = San::matched(b"Nbd7+", false).unwrap();

        assert_eq!(length, 4);
        assert_eq!(
            (parts.role, parts.file, parts.rank, parts.to),
            (Some(Role::Knight), Some(File::B), None, Square::D7)
        );
        assert_eq!(San::matched(b"exd5", true).unwrap().0.file, Some(File::E));
        assert_eq!(
            San::matched(b"e8q", true).unwrap().0.promotion,
            Some(Role::Queen)
        );
        assert_eq!(San::matched(b"Nf3", true).unwrap().0.file, None);
        assert!(San::matched(b"N@f3", true).is_none());
    }

    #[test]
    fn each_shape_python_chess_accepts_reads_as_its_move() {
        let board = start();

        for (token, uci) in [
            ("e4", "e2e4"),
            ("Nf3", "g1f3"),
            ("e2-e4", "e2e4"),
            ("Ng1f3", "g1f3"),
            ("e2e4", "e2e4"),
            ("--", "0000"),
        ] {
            assert_eq!(named(&board, token).as_deref(), Ok(uci), "{token}");
        }
    }

    #[test]
    fn a_token_naming_no_legal_move_raises_python_chess_s_message() {
        let board = start();
        let fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

        assert_eq!(
            named(&board, "e5"),
            Err(format!("illegal san: 'e5' in {fen}"))
        );
        assert_eq!(
            named(&board, "O-O"),
            Err(format!("illegal san: 'O-O' in {fen}"))
        );
        assert_eq!(named(&board, "P@e4"), Err("invalid san: 'P@e4'".to_owned()));
        assert_eq!(
            named(&board, "e2e5"),
            Err(format!(
                "no matching legal move for e2e5 (e2 -> e5) in {fen}"
            ))
        );
    }
}
