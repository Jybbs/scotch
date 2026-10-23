"""
Pins the calls `scotch apply labels` and `scotch apply rulesets` send `gh`
for the sample checkout, what each prints of the live labels or rulesets the
registries omit, and where each stops.
"""

from collections.abc import Callable
from common.app      import invoke
from common.sample   import Sample
from json            import dumps
from pytest          import CaptureFixture, fixture, mark, param
from pytest_subprocess.fake_process import FakeProcess
from syrupy.assertion               import SnapshotAssertion

type Live = Callable[[str, str], None]
type Sent = Callable[[], str]


@fixture
def live(fp: FakeProcess) -> Live:
    """
    Answers the listing of live labels or rulesets `scotch apply <command>`
    reads with the text a case gives it, beside the repository's node ID
    `scotch apply rulesets` reads, through the function it returns.
    """
    listings = {
        "labels": [
            "gh", "api", "--jq", ".[].name", "--paginate", "repos/{owner}/{repo}/labels"
        ],

        "rulesets": [
            "gh", "api",
            "--jq", ".[] | [.name, .id]",
            "--paginate", "repos/{owner}/{repo}/rulesets?includes_parents=false"
        ]
    }

    def answer(command: str, listed: str):
        """
        Registers the listing `command` reads and the node ID.
        """
        fp.register(listings[command], stdout=listed)
        fp.register(
            ["gh", "api", "--jq", ".node_id", "repos/{owner}/{repo}"],
            stdout = "R_node\n"
        )

    return answer


@fixture
def sent(fp: FakeProcess) -> Sent:
    """
    Answers every `gh` call that writes, meaning a `gh label create` and
    a `gh api` naming its method, reading the body each one passes on its
    standard input, and returns a function writing out every `gh` call made,
    one line apiece, with the body beneath the call that sent it.
    """
    bodies = []
    fp.keep_last_process(True)

    for command in (
        ["gh", "api", "--input", "-", fp.any()],
        ["gh", "api", "--method", fp.any()],
        ["gh", "label", "create", fp.any()]
    ):
        fp.register(command, stdin_callable=bodies.append)

    def transcript() -> str:
        """
        Writes out the calls in the order they were made.
        """
        lines, read = [], iter(bodies)

        for call in fp.calls:
            lines.append(" ".join(map(str, call)))

            if "--input" in call:
                lines.append(f"  {next(read)}")

        return "\n".join(lines)

    return transcript


@mark.usefixtures("inside")
def test_labels_writes_each_label_and_lists_the_live_ones_it_omits(
    capsys   : CaptureFixture[str],
    live     : Live,
    sent     : Sent,
    snapshot : SnapshotAssertion
):
    """
    Asserts that `scotch apply labels` writes each registry label through
    `gh label create --force`, as the snapshot holds the calls, then prints
    each live label the registry omits in the order GitHub lists them.
    """
    live("labels", "enhancement\n🐞 bug\ndependencies\n")

    assert invoke("apply", "labels") == 0
    assert sent() == snapshot
    assert capsys.readouterr().out == (
        "The registry omits these live labels, left for a rename or a deletion "
        "by hand:\nenhancement\ndependencies\n"
    )


@mark.usefixtures("inside")
def test_rulesets_updates_each_live_ruleset_and_sends_every_setting(
    capsys   : CaptureFixture[str],
    live     : Live,
    sent     : Sent,
    snapshot : SnapshotAssertion
):
    """
    Asserts that `scotch apply rulesets` updates in place the live ruleset
    sharing each file's name, then sends every setting, as the snapshot
    holds the calls and their bodies, and prints each live ruleset no file
    names, sorted by name.
    """
    live(
        "rulesets",
        "\n".join(
            map(
                dumps,
                (["main branch protection", 7], ["old protection", 8], ["a draft", 9])
            )
        )
    )

    assert invoke("apply", "rulesets") == 0
    assert sent() == snapshot
    assert capsys.readouterr().out == (
        "No file under `.github/rulesets/` names these live rulesets, left for "
        "a deletion by hand:\na draft\nold protection\n"
    )


@mark.parametrize(
    ("command", "path", "old", "new"),
    [
        param("labels", ".github/labels.toml", '"c62d42"', '"C62D42"', id="labels"),
        param(
            "rulesets",
            ".github/settings.toml",
            "has_wiki ",
            "has_wikis",
            id = "rulesets"
        )
    ]
)
def test_a_registry_out_of_shape_stops_before_any_call(
    command : str,
    fp      : FakeProcess,
    inside  : Sample,
    new     : str,
    old     : str,
    path    : str
):
    """
    Asserts that a registry failing its record stops the command with the
    validation error naming the file, before `gh` is called at all.
    """
    inside.edit(path, new=new, old=old)

    assert str(inside.root / path) in invoke("apply", command)
    assert not fp.calls


@mark.parametrize(
    ("command", "listed"),
    [
        param("labels", "🐞 bug\n🗜️ build\n", id="labels"),
        param("rulesets", dumps(["main branch protection", 7]), id="rulesets")
    ]
)
@mark.usefixtures("inside", "sent")
def test_a_command_prints_nothing_where_its_files_name_every_live_one(
    capsys  : CaptureFixture[str],
    command : str,
    listed  : str,
    live    : Live
):
    """
    Asserts that `scotch apply labels` and `scotch apply rulesets` print
    nothing where the registries name every live label or ruleset.
    """
    live(command, listed)

    assert invoke("apply", command) == 0
    assert capsys.readouterr().out == ""


@mark.usefixtures("inside")
def test_a_failed_call_stops_the_labels_after_it(fp: FakeProcess):
    """
    Asserts that a label `gh` fails to write stops the command naming the
    call, leaving every later label unwritten.
    """
    fp.register(["gh", "label", "create", fp.any()], returncode=1)

    assert invoke("apply", "labels") == (
        "`gh label create --color c62d42 --description 'A defect' --force '🐞 bug'` "
        "failed, so nothing after it was sent"
    )
    assert len(fp.calls) == 1
