"""
Pins the freeze every interpreter of the project's environment registers at
startup, meaning the call `freeze_at_exit` registers and the cyclic garbage
an interpreter then leaves unfinalized at exit.
"""

from gc         import freeze
from pathlib    import Path
from pytest     import MonkeyPatch, mark
from subprocess import run
from sys        import executable

from scotch.memory import collection


def test_freeze_at_exit_registers_the_freeze(monkeypatch: MonkeyPatch):
    """
    Asserts that `freeze_at_exit` registers `gc.freeze` as an exit handler
    and nothing else.
    """
    registered = []
    monkeypatch.setattr(collection, "register", registered.append)
    collection.freeze_at_exit()

    assert registered == [freeze]


@mark.parametrize(
    ("preamble", "printed"),
    [("", ""), ("import atexit, gc; atexit.unregister(gc.freeze)", "finalized\n")],
    ids = ["frozen", "unregistered"]
)
def test_the_environment_leaves_cyclic_garbage_unfinalized_at_exit(
    preamble : str,
    printed  : str,
    tmp_path : Path
):
    """
    Asserts that an interpreter of the environment exits without finalizing
    an object only a reference cycle holds, which it finalizes once the
    handler the startup entry point registered is removed.
    """
    source = (
        f"{preamble}\n"
        "class Cycle:\n"
        "    def __del__(self):\n"
        "        print('finalized')\n"
        "cycle = Cycle()\n"
        "cycle.self = cycle\n"
        "del cycle\n"
    )

    assert run(
        [executable, "-c", source],
        capture_output = True,
        cwd            = tmp_path,
        text           = True
    ).stdout == printed
