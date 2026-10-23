"""
Pins what each record in `scotch.repo.registries` reads out of the registry
it describes, and the calls each one writes for GitHub's API.
"""

from common.sample import Sample
from http          import HTTPMethod
from pathlib       import Path
from pydantic      import ValidationError
from pytest        import approx, mark, param, raises

from scotch.repo.registries import (
    Changelog,
    Contributing,
    Dependabot,
    GithubSettings,
    Label,
    Labels,
    Request,
    Ruleset,
    Template
)


@mark.parametrize(
    ("color", "lab"),
    [
        param("000000", (0.0, 0.0, 0.0), id="black"),
        param("ffffff", (1.0, 0.0, 0.0), id="white"),
        param("ff0000", (0.62796, 0.22486, 0.12585), id="red"),
        param("0000ff", (0.45201, -0.03246, -0.31153), id="blue")
    ]
)
def test_a_label_reads_its_color_in_oklab(color: str, lab: tuple[float, ...]):
    """
    Asserts that a label's color converts to the OKLab coordinates of black,
    white, and the sRGB red and blue primaries that the conversion through
    CIE XYZ in CSS Color Module Level 4 gives.
    """
    label = Label(color=color, description="A label", name="🐞 bug")

    assert label.lab == approx(lab, abs=1e-5)


@mark.parametrize(
    ("field", "value"),
    [
        param("color", "C62D42", id="uppercase-color"),
        param("color", "c62d4", id="short-color"),
        param("description", "x" * 101, id="long-description"),
        param("name", "bug", id="name-without-glyph"),
        param("name", "🐞 Bug", id="capitalized-word"),
        param("name", "🐞 two words", id="two-words")
    ]
)
def test_a_label_rejects_a_field_outside_its_shape(field: str, value: str):
    """
    Asserts that a label refuses a color that is not six lowercase hex
    digits, a description past the 100 characters GitHub accepts, and a name
    that is not one glyph and one lowercase word.
    """
    fields = {"color": "c62d42", "description": "x" * 100, "name": "🐞 bug"}

    with raises(ValidationError):
        Label(**fields | {field: value})


def test_a_label_writes_the_call_creating_or_updating_it():
    """
    Asserts that a label's arguments create it through `gh label create`,
    updating the live label of its name through `--force`.
    """
    assert Label(color="c62d42", description="A defect", name="🐞 bug").arguments == (
        "label", "create", "--color", "c62d42",
        "--description", "A defect", "--force", "🐞 bug"
    )


def test_the_changelog_lists_each_label_its_categories_name(tmp_path: Path):
    """
    Asserts that the changelog names each label its categories name, in
    their order and once per category naming it, leaving out `*`.
    """
    path = tmp_path / "release.yml"
    path.write_text(
        "changelog:\n  categories:\n"
        "    - labels: [b, a]\n      title: B\n"
        "    - labels: [a]\n      title: A\n"
        "    - labels: ['*']\n      title: Other\n"
    )

    assert Changelog.read(path).names == ["b", "a", "a"]


@mark.parametrize(
    ("record", "file", "old", "new"),
    [
        param(
            Labels,
            "labels.toml",
            "[[labels]]\n",
            "title = 'x'\n\n[[labels]]\n",
            id = "key-beside-rows"
        ),
        param(
            Labels,
            "labels.toml",
            'description = "A defect"\n',
            "",
            id = "row-missing-description"
        ),
        param(
            Labels,
            "labels.toml",
            'name        = "🐞 bug"\n',
            'name = "🐞 bug"\nx = 1\n',
            id = "extra-key"
        ),
        param(
            GithubSettings,
            "settings.toml",
            "has_wiki ",
            "has_wikis",
            id = "misspelled-key"
        ),
        param(
            GithubSettings,
            "settings.toml",
            "[workflow]",
            "[workflows]",
            id = "misspelled-table"
        ),
        param(
            GithubSettings,
            "settings.toml",
            '"PR_BODY"',
            '"PR_TITLE"',
            id = "value-outside-its-set"
        )
    ]
)
def test_a_registry_out_of_shape_fails_naming_its_file(
    file   : str,
    new    : str,
    old    : str,
    record : type[GithubSettings | Labels],
    sample : Sample
):
    """
    Asserts that a registry carrying a key or a table it does not declare,
    leaving a field out, or holding a value outside the set GitHub takes
    fails, titled with the registry's path.
    """
    sample.edit(f".github/{file}", new=new, old=old)
    path = sample.root / ".github" / file

    with raises(ValidationError) as error:
        record.read(path)

    assert error.value.title == str(path)


@mark.parametrize(
    ("text", "labels"),
    [
        param("---\nname: Bug\nlabels: [a, b c]\n---\n", ("a", "b c"), id="list"),
        param("---\nname: Bug\nlabels: a, b c\n---\n", ("a", "b c"), id="commas"),
        param("---\nname: Bug\nlabels: ''\n---\n", (), id="empty-string"),
        param("---\nname: Bug\n---\n", (), id="none-named"),
        param("No front matter\n", (), id="no-front-matter")
    ]
)
def test_a_template_reads_its_labels_from_its_front_matter(
    labels   : tuple[str, ...],
    text     : str,
    tmp_path : Path
):
    """
    Asserts that a template reads its labels from front matter giving them
    as a list or as names between commas, and none where its front matter
    names none, gives an empty string, or where it opens on no front matter.
    """
    path = tmp_path / "bug.md"
    path.write_text(text)

    assert Template.read(path).labels == labels


@mark.parametrize(
    ("text", "checks"),
    [
        param(
            "| **Label** | **Covers** |\n|---|---|\n| `a` | x |\n\n"
            "| **Check** | **Runs Locally** | **Fails When** |\n|---|---|---|\n"
            "| `🔐 Lockfiles` | `mise lockfile` | A lockfile drifts |\n"
            "| Prose | `mise check` | A rewrite |\n",
            {"Prose": "mise check", "🔐 Lockfiles": "mise lockfile"},
            id = "after-another-table"
        ),
        param(
            "| **Label** | **Covers** |\n|---|---|\n| `a` | x |\n",
            {},
            id = "no-checks"
        )
    ]
)
def test_the_contributing_guide_reads_its_checks_table(
    checks   : dict[str, str],
    text     : str,
    tmp_path : Path
):
    """
    Asserts that the contributing guide reads the first two cells of each
    row of the table whose first header is Check, a code span read without
    its backticks, and no check where it holds no such table.
    """
    path = tmp_path / "CONTRIBUTING.md"
    path.write_text(text)

    assert Contributing.read(path).checks == checks


@mark.parametrize(
    ("live", "method", "path"),
    [
        param(None, HTTPMethod.POST, "repos/{owner}/{repo}/rulesets", id="created"),
        param(7, HTTPMethod.PUT, "repos/{owner}/{repo}/rulesets/7", id="updated")
    ]
)
def test_a_ruleset_creates_or_updates_the_live_one_of_its_name(
    live   : int | None,
    method : HTTPMethod,
    path   : str,
    sample : Sample
):
    """
    Asserts that a ruleset creates itself where no live ruleset shares its
    name and updates the live one in place where one does, sending every
    field as the file writes it and never the path it was read from.
    """
    ruleset = Ruleset.read(sample.root / ".github" / "rulesets" / "main.json")
    request = ruleset.request(live)

    assert (request.method, request.path) == (method, path)
    assert request.body == {
        "enforcement"   : "active",
        "name"          : "main branch protection",
        "target"        : "branch",
        "bypass_actors" : [],
        "conditions"    : {"ref_name": {"exclude": [], "include": ["refs/heads/main"]}},
        "rules"         : [
            {"type": "deletion"},
            {
                "type"       : "required_status_checks",
                "parameters" : {
                    "strict_required_status_checks_policy" : True,
                    "required_status_checks"               : [
                        {"context": "⏱️ Brief", "integration_id": 15368}
                    ]
                }
            }
        ]
    }
    assert ruleset.contexts == ("⏱️ Brief",)


@mark.parametrize(
    ("call", "arguments", "payload"),
    [
        param(
            Request(body={"names": ["chess"]}, method=HTTPMethod.PUT, path="topics"),
            ("api", "--input", "-", "--method", "PUT", "--silent", "topics"),
            '{"names":["chess"]}',
            id = "with-a-body"
        ),
        param(
            Request(method=HTTPMethod.DELETE, path="vulnerability-alerts"),
            ("api", "--method", "DELETE", "--silent", "vulnerability-alerts"),
            None,
            id = "without-a-body"
        )
    ]
)
def test_a_request_reads_its_body_from_standard_input(
    arguments : tuple[str, ...],
    call      : Request,
    payload   : str | None
):
    """
    Asserts that a request sending a body has `gh api` read it as JSON from
    standard input, and that one sending none passes no input.
    """
    assert (call.arguments, call.payload) == (arguments, payload)


@mark.parametrize(
    ("alerts", "fixes", "methods"),
    [
        param(True, False, ("PUT", "DELETE"), id="alerts-without-fixes"),
        param(False, True, ("DELETE", "PUT"), id="fixes-without-alerts")
    ]
)
def test_dependabot_turns_each_feature_on_or_off_alerts_first(
    alerts  : bool,
    fixes   : bool,
    methods : tuple[str, str]
):
    """
    Asserts that each Dependabot feature turns on through `PUT` and off
    through `DELETE` on its own endpoint, the alerts before the fixes.
    """
    dependabot = Dependabot.model_validate(
        {"automated-security-fixes": fixes, "vulnerability-alerts": alerts}
    )

    assert [(request.method, request.path) for request in dependabot.requests] == [
        (methods[0], "repos/{owner}/{repo}/vulnerability-alerts"),
        (methods[1], "repos/{owner}/{repo}/automated-security-fixes")
    ]
