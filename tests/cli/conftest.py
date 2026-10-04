"""
Holds the fixtures the command line's tests share, each described where it
is defined.
"""

from common.sample import Sample
from pytest        import MonkeyPatch, fixture


@fixture
def inside(answered: Sample, monkeypatch: MonkeyPatch) -> Sample:
    """
    Runs the test from the root of the sample checkout mise has answered
    for, the directory `scotch audit repo` reads.
    """
    monkeypatch.chdir(answered.root)

    return answered
