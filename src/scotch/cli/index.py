"""
Holds `games`, the `scotch index games` command, which builds the index
of stored games from the files `scotch fetch games` downloaded, run by the
`data:index` task.
"""

from concurrent.futures import ProcessPoolExecutor
from functools          import partial

from scotch.cli.settings    import Settings
from scotch.index.tables    import Batch, PositionIndex
from scotch.sources.schemas import Manifest, Sources


def games():
    """
    Reads the games of every file `scotch fetch games` downloaded into
    the `downloads` folder of the data directory, one file to a process,
    and writes the index of them to its `index` folder beside a copy of
    the manifest the files were read under. Files are read in the order
    `sources.toml` declares them, a game several files repeat is indexed
    under the first, and a game python-chess records an error for, or whose
    `Variant` tag names a variant other than standard chess, is left out.

    Prints the count of games read from each file, one line for each problem
    of a game left out naming its file, its place there, and its players,
    and the count of games indexed. Exits nonzero where no file has been
    fetched, or naming each fetched file whose copy on disk no longer holds
    the bytes the manifest records.
    """
    settings = Settings()
    manifest = Manifest.read(settings.downloads)
    sources  = [
        source
        for source in Sources.read().sources
        if source.address in manifest.downloads
    ]

    if not sources:
        raise SystemExit(f"No file has been fetched under {settings.downloads}")

    if stale := manifest.stale(settings.downloads, sources):
        raise SystemExit(
            "\n".join(
                (
                    "These files changed on disk since their fetch, which"
                    " `scotch fetch games` downloads again:",
                    *map(str, stale)
                )
            )
        )

    with ProcessPoolExecutor() as pool:
        batches = list(pool.map(partial(Batch.read, settings.downloads), sources))

    for batch in batches:
        print(batch.summary)

    index = PositionIndex.merge(batches)
    index.write(settings.index)
    manifest.write(settings.index)
    print(
        f"Indexed {index.games.select('game').collect().height:,} games into"
        f" {settings.index}"
    )
