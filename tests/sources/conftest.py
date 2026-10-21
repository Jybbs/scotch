"""
Defines the fixtures the tests of `scotch.sources` share, each described
where it is defined.
"""

from common.sources import declare, serve
from pathlib        import Path
from pytest         import fixture
from responses      import RequestsMock

from scotch.sources.fetchers import Fetcher
from scotch.sources.schemas  import Source


@fixture
def fetcher(tmp_path: Path) -> Fetcher:
    """
    Builds a fetcher downloading into `tmp_path`, retrying a request 3 times
    and waiting 7 seconds on each connection or read.
    """
    return Fetcher(directory=tmp_path, retries=3, timeout_s=7)


@fixture
def served(web: RequestsMock) -> Source:
    """
    Serves `b"games"` at the address of an archive on `example.com` and
    returns its source.
    """
    source = declare("players/Adams.zip")
    serve(str(source.address), b"games", web=web)

    return source
