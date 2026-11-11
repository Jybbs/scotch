"""
Holds `games`, the `scotch index games` command, which builds the index
of stored games from the files `scotch fetch games` downloaded, run by the
`data:index` task. `index_group` registers it as the group the app imports
by its path.
"""

from concurrent.futures import ProcessPoolExecutor
from cyclopts           import App
from functools          import partial
from shutil             import rmtree

from scotch.cli.settings    import Settings
from scotch.index.tables    import Batch, PositionIndex
from scotch.sources.schemas import Manifest, Sources


def games():
    """
    Reads the games of every file `scotch fetch games` downloaded into the
    `downloads` folder of the data directory, handing the files one at a
    time to a pool of processes, and writes the index of them to its `index`
    folder, replacing what that folder holds, beside a copy of the manifest
    the files were read under. Files are read in the order `sources.toml`
    declares them, a game several files repeat is indexed under the first,
    and a game rated below the floor `sources.toml` sets for its file's
    section, a game the reader records an error for, or one whose `Variant`
    tag names a variant other than standard chess is left out.

    Prints the count of games read from each file beside the count left
    below its floor where its section sets one, one line for each problem
    of a game left out naming its file, its place there, and its players,
    and the count of games indexed. Exits nonzero where no file has been
    fetched, or naming each fetched file whose copy on disk no longer holds
    the bytes the manifest records.
    """
    settings = Settings()
    manifest = Manifest.read(settings.downloads)
    declared = Sources.read()
    sources  = [
        source
        for source in declared.sources
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
        batches = list(
            pool.map(
                partial(Batch.read, settings.downloads),
                sources,
                map(declared.floor, sources)
            )
        )

    for batch in batches:
        print(batch.summary)

    index = PositionIndex.merge(batches)
    rmtree(settings.index, ignore_errors=True)
    index.write(settings.index)
    manifest.write(settings.index)
    print(index.written(settings.index))


index_group = App(name="index")
index_group.command(games)
