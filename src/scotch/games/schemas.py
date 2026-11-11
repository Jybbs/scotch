"""
Holds the `Game` record each game in a Portable Game Notation (PGN) file is
read into, beside the `Origin` naming the file of the store's sources it was
read from and the `Frame` each position of its mainline is drawn as.
"""

from chess           import Board, Move, square, square_file, square_rank
from chess.pgn       import Game as Pgn, Headers, TAG_ROSTER
from collections.abc import Iterable, Iterator, Mapping
from functools       import cached_property
from importlib.resources.abc import Traversable
from itertools               import islice
from operator                import itemgetter
from pydantic                import BaseModel, Field, PositiveInt
from typing       import Self
from urllib.parse import unquote, urlsplit

from scotch.games import readers


class Frame(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One position of a mainline as the site draws it, each piece named by
    a number it keeps from the position the mainline starts at until it
    is captured.
    """

    pieces: tuple[tuple[int, int, str], ...]
    """
    Each piece on the board as its number, the square it stands on counted
    from 0 at a1 to 63 at h8, and its symbol in Forsyth–Edwards Notation
    (FEN), in the order of their numbers.
    """

    move: tuple[int, int] | None = None
    """
    The square the move reaching the position left and the square it
    reached, or `None` at the position the mainline starts at and after a
    null move.
    """

    san: str | None = None
    """
    The move reaching the position in Standard Algebraic Notation (SAN), or
    `None` at the position the mainline starts at.
    """

    @property
    def landed(self) -> str | None:
        """
        Reads the symbol of the piece the move reaching the position set
        down, the king's where it castles and the new piece's where a pawn
        promotes.

        Returns:
            The symbol in FEN, or `None` at the position the mainline starts
            at and after a null move.
        """
        if self.move is None:
            return None

        return next(symbol for _, spot, symbol in self.pieces if spot == self.move[1])

    @classmethod
    def drawn(
        cls,
        board   : Board,
        numbers : Mapping[int, int],
        move    : Move | None = None,
        san     : str | None  = None
    ) -> Self:
        """
        Reads each piece of `board` beside the number `numbers` holds for
        its square, after `move` written as `san` reached it.
        """
        return cls(
            move   = (move.from_square, move.to_square) if move else None,
            pieces = sorted(
                (numbers[spot], spot, piece.symbol())
                for spot, piece in board.piece_map().items()
            ),
            san = san
        )


class Origin(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The file of the store's sources a game was read from and the game's
    place in it.
    """

    address: str
    """
    The address the file is fetched from.
    """

    place: PositiveInt
    """
    The game's place in the file, 1 being the first game it holds, counted
    across the members of an archive in the order the archive lists them.
    """

    @property
    def file(self) -> str:
        """
        Reads the path the file's address names under its host without its
        percent-encoding, such as `players/Carlsen.zip`, which tells apart
        two files of one name the provider lists in two sections.
        """
        return unquote(urlsplit(self.address).path.removeprefix("/"))

    @property
    def reference(self) -> str:
        """
        Names the game as `<file>:<n>`, such as `players/Carlsen.zip:12`,
        which `scotch show game` reads back.
        """
        return f"{self.file}:{self.place}"


class Game(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One game a PGN file carries, meaning its tags, its mainline's moves, its
    keys, and each error its reader recorded.
    """

    errors: tuple[str, ...]
    """
    The message of each error the reader recorded, such as a move illegal in
    the position it was played from, worded as python-chess's reader words it
    save for a `FEN` tag setting up a position no legal game reaches.
    """

    moves: tuple[Move, ...]
    """
    The moves of the mainline in the order they were played, leaving out
    every variation.
    """

    tags: frozendict[str, str]
    """
    The value of each tag pair keyed by its name, where the reader fills a
    tag of the Seven Tag Roster the file leaves out with python-chess's
    placeholder.
    """

    keys: tuple[int, ...] = Field(
        default_factory = lambda data: tuple(
            readers.keys(
                [move.uci() for move in data["moves"]],
                fen     = data["tags"].get("FEN"),
                variant = data["tags"].get("Variant")
            )
        )
    )
    """
    The Zobrist hash of each position of the mainline, reading the en
    passant file only where a legal capture reaches its square, so two
    positions share a key where FIDE's Laws of Chess, Article 9.2.3, count
    them as the same position. A game whose tags set up no position, or name
    a variant python-chess reads under rules of its own, holds none.
    """

    origin: Origin | None = None
    """
    The file of the store's sources the game was read from and its place
    there, or `None` for a game read or built anywhere else.
    """

    @property
    def dated(self) -> int:
        """
        Reads the `Date` tag as the number `YYYYMMDD`, a part it leaves
        unknown as 0, so a later date reads as a larger number.
        """
        year, month, day = (
            int(part) if part.isdecimal() else 0
            for part in f"{self.tags['Date']}..".split(".")[:3]
        )

        return min(year, 9999) * 10000 + min(month, 99) * 100 + min(day, 99)

    @property
    def encoded(self) -> bytes:
        """
        Writes the mainline as the file the index holds its moves in stores
        it, each move as its place among the legal moves of its position.
        """
        return readers.encoded(
            [move.uci() for move in self.moves],
            fen     = self.tags.get("FEN"),
            variant = self.tags.get("Variant")
        )

    @cached_property
    def frames(self) -> tuple[Frame, ...]:
        """
        Draws each position of the mainline `boards` yields, numbering
        each piece by the square it stands on at the first position and
        moving its number with it, the rook's along with the king's where
        a move castles, so a drawing can follow one piece from position to
        position. A pawn promoting keeps its number under its new symbol.
        """
        if (board := next(self.boards(), None)) is None:
            return ()

        numbers = {spot: spot for spot in board.piece_map()}
        frames  = [Frame.drawn(board, numbers)]

        for move in self.moves:
            numbers = self.follow(board, move, numbers)
            frames.append(Frame.drawn(board, numbers, move, board.san_and_push(move)))

        return tuple(frames)

    @property
    def pgn(self) -> str:
        """
        Writes the game as PGN, its tags then its mainline, for any chess
        program to open.
        """
        game = Pgn(headers=self.tags)
        game.add_line(self.moves)

        return str(game)

    @cached_property
    def placements(self) -> tuple[str, ...]:
        """
        Reads the piece placement of each position `boards` yields, the
        first field of its Forsyth–Edwards Notation (FEN).
        """
        return tuple(map(Board.board_fen, self.boards()))

    @property
    def players(self) -> str:
        """
        Names the player of the white pieces and the player of the black
        pieces, as the `White` and `Black` tags hold them.
        """
        return f"{self.tags['White']} vs. {self.tags['Black']}"

    @property
    def problems(self) -> tuple[str, ...]:
        """
        Adds python-chess's message for a variant it cannot read to the
        errors the reader recorded, wherever the `Variant` tag names
        anything but standard chess and the message is not among them, since
        the reader records no message naming Chess960 or another variant
        python-chess reads under rules of its own.
        """
        variant = self.tags.get("Variant", "Standard")

        if variant.casefold() in map(str.casefold, Board.aliases):
            return self.errors

        return tuple(dict.fromkeys((*self.errors, f"unsupported variant: {variant}")))

    @property
    def rating(self) -> int:
        """
        Reads the higher of the `WhiteElo` and `BlackElo` tags, the PGN
        standard's tags for each player's rating, section 9.1.2, each read
        where it holds digits alone, or 0 where neither does.
        """
        return max(
            (
                int(rating)
                for tag in ("WhiteElo", "BlackElo")
                if (rating := self.tags.get(tag, "")).isascii() and rating.isdecimal()
            ),
            default = 0
        )

    @property
    def roster(self) -> tuple[str, ...]:
        """
        Reads the values of the Seven Tag Roster in the order the PGN
        standard, section 8.1.1, lists its tags, the tags every program is
        to carry for public data interchange.
        """
        return itemgetter(*TAG_ROSTER)(self.tags)

    @cached_property
    def sans(self) -> tuple[str, ...]:
        """
        Writes each move of the mainline in Standard Algebraic Notation
        (SAN), read against the position it was played from.
        """
        return tuple(map(Board.san, self.boards(), self.moves))

    @property
    def standing(self) -> int:
        """
        Ranks the game among those tied on their longest run from its
        `WhiteElo` and `BlackElo` tags, the mean of both highest first, then
        one rating, then none.
        """
        return readers.standing(self.tags.get("WhiteElo"), self.tags.get("BlackElo"))

    @property
    def title(self) -> str:
        """
        Names the game on one line, as `<file>:<n>` where the index records
        the file it was read from, then its players, its event, and its
        date.
        """
        named = f"{self.players}, {self.tags['Event']}, {self.tags['Date']}"

        return f"{self.origin.reference}  {named}" if self.origin else named

    def at(self, ply: int) -> Board:
        """
        Plays the mainline up to the position at `ply`.
        """
        return next(islice(self.boards(), ply, None))

    def boards(self) -> Iterator[Board]:
        """
        Yields the board at each position of the mainline, from the one the
        `FEN` tag sets up or the standard starting position to the one after
        the last move, pushing each move onto the one board it yields, or no
        board where python-chess raises `ValueError` setting up the `FEN` or
        `Variant` tag.
        """
        try:
            board = Headers(self.tags).board()
        except ValueError:
            return

        yield board

        for move in self.moves:
            board.push(move)
            yield board

    @staticmethod
    def chosen(games: Iterable[Game], name: object, number: int | None) -> Game:
        """
        Chooses the game at `number` from the `games` of the file `name`
        names, counting from 1, or the one game the file holds where
        `number` is `None`.

        Raises:
            ValueError: Where the file holds no game, holds several and
                        `number` is `None`, holds fewer than `number`, or
                        where the game chosen carries a problem, naming the
                        file and each problem.
        """
        read = list(islice(games, number or 2))

        if not read:
            raise ValueError(f"Found no game in {name}")

        if number is None and len(read) > 1:
            raise ValueError(
                f"Found several games in {name}, which --game chooses among"
            )

        if number is not None and len(read) < number:
            raise ValueError(f"Found no game {number} in {name}")

        if (game := read[-1]).problems:
            raise ValueError(
                "\n".join((f"Found problems in the game in {name}:", *game.problems))
            )

        return game

    @classmethod
    def first(cls, path: Traversable) -> Self:
        """
        Reads the first game the PGN file at `path` carries, as `read` reads
        each.

        Raises:
            ValueError: Where the file holds no game, or where its first
                        game carries a problem, naming the file and each
                        problem.
        """
        return cls.chosen(cls.read(path), path, 1)

    @staticmethod
    def follow(board: Board, move: Move, numbers: Mapping[int, int]) -> dict[int, int]:
        """
        Moves the number of the piece `move` plays on `board` to the square
        it reaches, dropping the number of a piece it captures, en passant
        included, and moving the rook's number where it castles. A null move
        leaves every number where it stands.
        """
        if not move:
            return dict(numbers)

        rank     = square_rank(move.from_square)
        captured = (
            square(square_file(move.to_square), rank)
            if board.is_en_passant(move)
            else move.to_square
        )
        moved = {spot: number for spot, number in numbers.items() if spot != captured}
        moved[move.to_square] = moved.pop(move.from_square)

        if board.is_castling(move):
            start, end = (7, 5) if board.is_kingside_castling(move) else (0, 3)
            moved[square(end, rank)] = moved.pop(square(start, rank))

        return moved

    def numbered(self, ply: int, plies: int | None = 1) -> str:
        """
        Writes at most `plies` of the moves played from the position at
        `ply` in SAN, or every one where `plies` is `None`, and nothing
        where the game ends there. Each of White's moves and a first move
        of Black's follow their move number as `Board.variation_san` writes
        them (`22. Bc2`, `13...Bxa1`), and a null move reads `--`, which
        that call refuses as illegal.
        """
        return " ".join(
            f"{board.fullmove_number}. {board.san(move)}"
            if board.turn
            else f"{board.fullmove_number}...{board.san(move)}"
            if at == ply
            else board.san(move)
            for at, (board, move) in enumerate(
                zip(islice(self.boards(), ply, None), self.moves[ply:][:plies]),
                ply
            )
        )

    @classmethod
    def parse(cls, text: str) -> Iterator[Self]:
        """
        Reads every game the PGN text `text` carries, in the order it holds
        them, each read and keyed by the `readers` extension module as
        python-chess's `read_game` reads it under a visitor skipping every
        variation, each move a variation holds left unread, save that each
        set of tags opens one game. A game's moves end at its result, blank
        lines after its tags leave it whole, and text past the first game
        holding no tag pair yields no game.
        """
        for tags, moves, keys, errors in readers.read(text):
            yield cls(
                errors = errors,
                keys   = keys,
                moves  = map(Move.from_uci, moves),
                tags   = frozendict(tags)
            )

    @classmethod
    def read(cls, path: Traversable) -> Iterator[Self]:
        """
        Reads every game the PGN file at `path` carries through `parse`,
        where `path` names a file on disk or the member of a zip archive
        `zipfile.Path` opens. The file is decoded as UTF-8, each sequence
        UTF-8 cannot decode replaced with U+FFFD, so a file another code
        page wrote still yields every move, every move being ASCII.
        """
        return cls.parse(path.read_text(encoding="utf-8", errors="replace"))
