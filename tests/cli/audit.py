"""
Pins what `scotch audit repo` prints for the sample checkout and the status
it exits with, in each shape it prints a finding in.
"""

from common.app    import invoke
from common.sample import Sample
from pathlib       import Path
from pytest        import CaptureFixture, mark
from pytest_subprocess.fake_process import FakeProcess

from scotch.repo.schemas import Finding, Format


@mark.usefixtures("answered", "inside")
def test_a_checkout_keeping_every_rule_exits_zero_and_prints_nothing(
    capsys : CaptureFixture[str],
    fp     : FakeProcess
):
    """
    Asserts that the audit of a checkout drawing no finding prints nothing
    and exits zero, asking mise for its tasks once.
    """
    assert invoke("audit", "repo") == 0
    assert capsys.readouterr().out == ""
    assert fp.call_count(["mise", "tasks", "ls", "--json", "--local"]) == 1


def test_a_warning_alone_prints_and_exits_zero(
    capsys : CaptureFixture[str],
    fp     : FakeProcess,
    inside : Sample
):
    """
    Asserts that a warning `mise tasks validate` reports prints and fails
    nothing.
    """
    inside.answer(
        fp,
        issues = ({
            "message"  : "Description is empty",
            "severity" : "warning",
            "task"     : "repo:inline"
        },)
    )

    assert invoke("audit", "repo") == 0
    assert capsys.readouterr().out == (
        ".mise/config.toml: warning: `repo:inline`: Description is empty\n"
    )


@mark.parametrize("output", Format, ids=str)
@mark.usefixtures("answered")
def test_an_error_prints_in_the_format_asked_for_and_exits_one(
    capsys : CaptureFixture[str],
    inside : Sample,
    output : Format
):
    """
    Asserts that an error prints in each format the command takes, naming
    its file relative to the checkout's root, and exits one.
    """
    inside.edit("LICENSE.md", new="Identifier: Apache-2.0", old="Identifier: MIT")
    finding = Finding(
        message = (
            "The license file declares `Apache-2.0` "
            "while the manifest declares `MIT`"
        ),
        path = Path("LICENSE.md")
    )

    assert invoke("audit", "repo", "--output-format", output) == 1
    assert capsys.readouterr().out == finding.render(output) + "\n"
