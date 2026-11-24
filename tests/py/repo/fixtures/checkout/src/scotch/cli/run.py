"""
Holds the messages a sample command exits nonzero on.
"""


def game(pgn: str, problems: list[str], words: list[str]):
    """
    Exits naming each word naming no move, each problem the file holds, or
    the file alone.
    """
    if words:
        raise ValueError("\n".join(f"names no move: {word!r}" for word in words))

    if problems:
        raise ValueError("\n".join((f"Found problems in {pgn}:", *problems)))

    raise SystemExit(f"Cannot read {pgn}")


def opened(error: OSError):
    """
    Exits on the message `error` carries, which the run alone sets.
    """
    raise SystemExit(str(error))
