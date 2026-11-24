"""
Holds `replaced`, which writes each download and manifest of `scotch fetch
games` and the store `scotch publish store` writes, so a reader of one
finds the earlier file or the new one whole, never one cut off partway, and
`swapped`, which moves the index `scotch index games` writes into place once
every file of it is written.
"""

from collections.abc import Iterable
from contextlib      import suppress
from pathlib         import Path
from shutil          import rmtree


def replaced(chunks: Iterable[bytes], path: Path) -> Path:
    """
    Writes `chunks` to a file beside `path`, creating its folder where it
    is missing, and moves it onto `path` once whole, through the one rename
    POSIX makes atomic, removing that file where the write raises, and
    returns `path`.
    """
    part = path.with_name(f"{path.name}.part")
    part.parent.mkdir(exist_ok=True, parents=True)

    try:
        with part.open("wb") as handle:
            handle.writelines(chunks)
    except BaseException:
        part.unlink(missing_ok=True)
        raise

    return part.replace(path)


def swapped(folder: Path, path: Path) -> Path:
    """
    Moves `folder`, every file of it written, onto `path`, first moving the
    folder `path` holds aside, since no rename replaces a folder holding
    files, then removing that one, and returns `path`.
    """
    earlier = path.with_name(f"{path.name}.old")
    rmtree(earlier, ignore_errors=True)

    with suppress(FileNotFoundError):
        path.replace(earlier)

    folder.replace(path)
    rmtree(earlier, ignore_errors=True)

    return path
