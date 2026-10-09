"""
Holds `games`, the `scotch fetch games` command, which downloads each file
the store's sources declare, run by the `data:fetch` task.
"""

from requests import RequestException

from scotch.cli.settings     import Settings
from scotch.sources.fetchers import Fetcher
from scotch.sources.schemas  import Manifest, Sources


def games():
    """
    Downloads each file `sources.toml` declares into the `downloads` folder
    of the data directory, in a folder named for the host of its address,
    and records each one's size, SHA-256 digest, entity tag, and fetch
    date in the `manifest.json` beside them. A file the manifest records is
    fetched again where the server reports it changed since, where the copy
    on disk no longer holds the bytes recorded, or where the server sent it
    with no entity tag to ask about.

    Prints one line per file, naming it as fetched or as unchanged, and
    exits nonzero naming the file and the error where a request fails once
    every retry has.
    """
    settings = Settings()
    fetcher  = Fetcher(
        directory = settings.downloads,
        retries   = settings.retries,
        timeout_s = settings.timeout_s
    )
    manifest = Manifest.read(settings.downloads)

    for source in Sources.read().sources:
        known = manifest.downloads.get(source.address)

        try:
            download = fetcher.fetch(source, known=known)
        except RequestException as error:
            raise SystemExit(f"Could not fetch {source.address}: {error}")

        manifest = manifest.recording(source.address, download)
        manifest.write(settings.downloads)
        print(f"{'Unchanged' if download is known else 'Fetched'} {source.address}")
