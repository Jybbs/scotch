"""
Holds `written`, which writes each file the store keeps so a reader of it
finds the earlier file or the new one whole, never one cut off partway.
"""

from collections.abc import Iterable
from pathlib         import Path


def written(chunks: Iterable[bytes], path: Path) -> Path:
    """
    Writes `chunks` to a file beside `path` and moves it onto `path` once
    whole, through the one rename POSIX makes atomic, removing that file
    where the write raises, and returns `path`.
    """
    part = path.with_name(f"{path.name}.part")

    try:
        with part.open("wb") as handle:
            handle.writelines(chunks)
    except BaseException:
        part.unlink(missing_ok=True)
        raise

    return part.replace(path)
