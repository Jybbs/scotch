"""
Pins what each record in `scotch.pins.schemas` decides, meaning the text an
`Edit` rewrites in each spelling, whether a `Lift` is major under the caret
rule, the advisories it carries and the row it writes, the lift an `Exact`
pin builds, the table a `Report` prints, and the advisory each audit's own
record reads as.
"""

from datetime              import UTC, date, datetime
from hypothesis            import given
from hypothesis.strategies import DataObject, data, from_regex
from pathlib               import Path
from pytest                import TempPathFactory, mark, param, raises
from re               import finditer
from syrupy.assertion import SnapshotAssertion

from scotch.pins.schemas import (
    Advisory,
    Bulletin,
    Edit,
    Exact,
    Lift,
    Report,
    Spelling,
    UvAdvisory,
    release
)
from scotch.repo.schemas import Package


def lift(name: str, current: str = "1.0.0", newest: str = "1.1.0", **fields) -> Lift:
    """
    Builds the lift of the pin `name` declared in `pyproject.toml`, taking
    every other field from `fields`.
    """
    return Lift(
        **{"path": Path("pyproject.toml"), **fields},
        current = current,
        name    = name,
        newest  = newest
    )


@mark.parametrize("spelling", Spelling, ids=str)
def test_an_edit_rewrites_each_version_its_spelling_finds_beside_its_name(
    spelling : Spelling,
    tmp_path : Path
):
    """
    Asserts that an edit replaces the version each place the file spells it
    beside the edit's name, a TOML assignment inside PEP 723's comment block
    included, keeping the operator a specifier opens on and every other byte
    of the file, and leaves a version spelled beside a longer name that ends
    on the same one as it stood.
    """
    name, version, before, after = {
        Spelling.ASSIGNMENT: (
            "requires-python", "3.15",
            'name = "pins"\nrequires-python = ">=3.14"\n# requires-python = ">=3.14"\n',
            'name = "pins"\nrequires-python = ">=3.15"\n# requires-python = ">=3.15"\n'
        ),

        Spelling.INPUT: (
            "wranglerVersion", "4.152.0",
            "        with:\n          wranglerVersion: 4.149.0\n          name: x\n",
            "        with:\n          wranglerVersion: 4.152.0\n          name: x\n"
        ),

        Spelling.MEMBER: (
            "vitest", "5.1.0",
            '{"@vitest/coverage-v8": "5.0.5", "vitest" : "5.0.5"}',
            '{"@vitest/coverage-v8": "5.0.5", "vitest" : "5.1.0"}'
        ),

        Spelling.REF: (
            "actions/checkout",
            "b" * 40,
            f"uses: actions/checkout@{'a' * 40}\nuses: my/actions/checkout@{'a' * 40}",
            f"uses: actions/checkout@{'b' * 40}\nuses: my/actions/checkout@{'a' * 40}"
        ),

        Spelling.REQUIREMENT: (
            "pluggy", "1.7.0",
            'requires = ["pluggy==1.6.0", "not-pluggy==1.6.0"]\n',
            'requires = ["pluggy==1.7.0", "not-pluggy==1.6.0"]\n'
        )
    }[spelling]
    (tmp_path / "file").write_text(before)

    Edit(
        name     = name,
        path     = Path("file"),
        spelling = spelling,
        version  = version
    ).apply(
        tmp_path
    )

    assert (tmp_path / "file").read_text() == after


def test_a_bulletin_reads_as_the_advisory_its_address_names():
    """
    Asserts that an advisory `bun audit` reports takes the identifier its
    address closes on, the address itself, and the package it was listed
    under.
    """
    url = "https://github.com/advisories/GHSA-xvch-5gv4-984h"

    assert Bulletin(url=url).advisory("minimist") == Advisory(
        id      = "GHSA-xvch-5gv4-984h",
        link    = url,
        package = "minimist"
    )


def test_a_lift_carries_the_advisories_concerning_its_package_in_order():
    """
    Asserts that a lift keeps each advisory naming its package, ordered by
    identifier, and leaves out every advisory naming another.
    """
    advisories = [
        Advisory(id="GHSA-b", link="https://b", package="polars"),
        Advisory(id="GHSA-c", link="https://c", package="pydantic"),
        Advisory(id="GHSA-a", link="https://a", package="polars")
    ]

    assert [
        advisory.id for advisory in lift("polars").clearing(advisories).advisories
    ] == ["GHSA-a", "GHSA-b"]


@mark.parametrize(
    ("current", "newest", "major"),
    [
        param("0.33.1", "0.34.0", True, id="minor-under-a-zero-major"),
        param("0.33.1", "0.33.2", False, id="patch-under-a-zero-major"),
        param("0.0.3", "0.0.4", True, id="patch-under-zero-major-and-minor"),
        param("2026.7.0", "2026.9.0", False, id="calendar-minor"),
        param("1.44.2", "2.0.0", True, id="major"),
        param("3.14.6", "3.15.1", False, id="minor"),
        param("lychee-v0.24.2", "lychee-v0.25.0", True, id="tag-with-a-prefix"),
        param("v7.0.1", "v7.0.2", False, id="tag-patch"),
        param("3d3c42e5aac5ba805825da76410c181273ba90b1", "v8.0.0", False, id="commit"),
        param("latest", "8.0.0", False, id="no-number")
    ]
)
def test_a_lift_is_major_where_it_moves_the_leftmost_nonzero_part(
    current : str,
    major   : bool,
    newest  : str
):
    """
    Asserts that a lift is major exactly where the newest release leaves
    the range Cargo's caret requirement on the current version allows, from
    both sides of each threshold, and never where either version carries no
    release numbers.
    """
    assert lift("pin", current, newest).major is major


@mark.parametrize(
    ("version", "numbers"),
    [
        param("2026.9.21.13", (2026, 9, 21), id="four-parts"),
        param("v5.0.1", (5, 0, 1), id="v-prefix"),
        param("lychee-v0.24.2", (0, 24, 2), id="named-tag"),
        param("3.16.0a1", (3, 16, 0), id="prerelease"),
        param("v7", (7,), id="major-tag"),
        param("20261023", (20261023,), id="calendar-without-dots"),
        param("7a4e45a543138629540c9a1616d08632b893e492", (), id="commit"),
        param("main", (), id="branch")
    ]
)
def test_release_reads_the_first_run_of_dotted_numbers(
    numbers : tuple[int, ...],
    version : str
):
    """
    Asserts that a version reads as at most three numbers from its first run
    of dotted numbers, and that a commit or a name carrying no number reads
    as the empty tuple standing for no release.
    """
    assert release(version) == numbers


def test_a_lift_counts_its_age_in_days_up_to_today():
    """
    Asserts that a dated lift counts the whole days from the newest
    release's date to the day given, and that an undated one counts none.
    """
    dated = lift("pin", released=datetime(2026, 10, 1, 23, 30, tzinfo=UTC))

    assert dated.age(date(2026, 10, 23)) == 22
    assert lift("pin").age(date(2026, 10, 23)) is None


def test_a_report_names_its_pins_and_holds_every_lift_of_a_held_name():
    """
    Asserts that a report names each pin once, lists each major lift's name
    once in the table's order, and leaves out every lift of a name it is
    told to hold, whichever file declares it.
    """
    report = Report(
        lifts = (
            lift(
                current = "2.24.0",
                name    = "minijinja",
                newest  = "3.0.3",
                path    = Path("uv.lock")
            ),
            lift(
                current = "2.24.0",
                name    = "minijinja",
                newest  = "3.0.3",
                path    = Path(".mise/tasks/gha/brief.py")
            ),
            lift(
                current = "1.44.2",
                name    = "polars",
                newest  = "2.0.0",
                path    = Path("uv.lock")
            ),
            lift("pluggy", "1.6.0", "1.7.0")
        )
    )

    assert report.names == {"minijinja", "pluggy", "polars"}
    assert report.majors == ("minijinja", "polars")
    assert [
        (str(held.path), held.name) for held in report.without({"minijinja"}).rows
    ] == [("pyproject.toml", "pluggy"), ("uv.lock", "polars")]


@mark.parametrize(
    ("hold", "left"),
    [
        param("@types/node", ("@vitest/coverage-v8", "vitest", "pluggy"), id="types"),
        param("node", ("@vitest/coverage-v8", "vitest", "pluggy"), id="node"),
        param("vitest", ("node", "@types/node", "pluggy"), id="vitest"),
        param("@vitest/coverage-v8", ("node", "@types/node", "pluggy"), id="coverage")
    ]
)
def test_a_hold_naming_one_pin_of_a_coupled_pair_holds_both(
    hold : str,
    left : tuple[str, ...]
):
    """
    Asserts that holding either pin of a pair `NodeTypesCheck` or
    `VitestCheck` holds together leaves out the lifts of both, and that the
    report lists one major lift for each such pair, so a failing trial holds
    the pair back once.
    """
    report = Report(
        lifts = (
            lift(
                current = "26.11.1",
                name    = "node",
                newest  = "27.0.0",
                path    = Path(".mise/config.toml")
            ),
            lift(
                current = "26.6.5",
                name    = "@types/node",
                newest  = "27.0.1",
                path    = Path("docs/package.json")
            ),
            lift(
                current = "5.0.5",
                name    = "@vitest/coverage-v8",
                newest  = "6.0.0",
                path    = Path("docs/package.json")
            ),
            lift(
                current = "5.0.5",
                name    = "vitest",
                newest  = "6.0.0",
                path    = Path("docs/package.json")
            ),
            lift("pluggy", "1.6.0", "1.7.0")
        )
    )

    assert report.majors == ("node", "@vitest/coverage-v8")
    assert tuple(held.name for held in report.without({hold}).rows) == left


def test_an_edit_raises_where_the_file_spells_no_version_beside_its_name(
    tmp_path: Path
):
    """
    Asserts that an edit finding no version beside its name raises
    `ValueError` naming the file and the name, rather than writing nothing
    unseen.
    """
    (tmp_path / "package.json").write_text('{"vite": "8.3.4"}')

    with raises(ValueError, match="package.json spells no version beside vitest"):
        Edit(
            name     = "vitest",
            path     = Path("package.json"),
            spelling = Spelling.MEMBER,
            version  = "5.1.0"
        ).apply(tmp_path)


def test_an_edit_writing_the_version_a_file_holds_leaves_it_as_it_stood(tmp_path: Path):
    """
    Asserts that an edit writing the version the file already pins, as the
    restatement of a minor a patch lift leaves in place does, raises nothing
    and leaves the file's bytes as they stood.
    """
    (tmp_path / "pyproject.toml").write_text('target-version = "3.14"\n')
    edit = Edit(
        name     = "target-version",
        path     = Path("pyproject.toml"),
        spelling = Spelling.ASSIGNMENT,
        version  = "3.14"
    )

    edit.apply(tmp_path)

    assert (tmp_path / "pyproject.toml").read_text() == 'target-version = "3.14"\n'


def test_an_empty_report_says_every_pin_stands_at_its_newest_release():
    """
    Asserts that a report listing no lift prints one line saying so in place
    of an empty table.
    """
    assert Report(lifts=()).table(date(2026, 10, 23)) == (
        "Every pin stands at its newest release"
    )


def test_an_exact_pin_lifts_to_the_release_a_package_resolves():
    """
    Asserts that an exact pin lifts under the name PEP 503 normalizes it
    to, dated by the resolved package's earliest upload, and rewrites the
    version beside the name as the file spells it.
    """
    path = Path(".mise/tasks/gha/brief.py")
    pin  = Exact(
        follows = True,
        path    = path,
        spelled = "MiniJinja",
        version = "2.24.0"
    )

    assert pin.lift(
        Package.model_validate(
            {
                "name"    : "minijinja",
                "version" : "3.0.3",
                "sdist"   : {"upload-time": "2026-10-23T08:00:00Z"}
            }
        )
    ) == Lift(
        current = "2.24.0",
        edits   = (
            Edit(
                name     = "MiniJinja",
                path     = path,
                spelling = Spelling.REQUIREMENT,
                version  = "3.0.3"
            ),
        ),
        name     = "minijinja",
        newest   = "3.0.3",
        path     = path,
        released = datetime(2026, 10, 23, 8, tzinfo=UTC)
    )


@mark.parametrize(
    ("link", "expected"),
    [
        param(
            "https://nvd.nist.gov/vuln/detail/CVE-2026-45409",
            "https://nvd.nist.gov/vuln/detail/CVE-2026-45409",
            id = "given"
        ),
        param(None, "https://osv.dev/vulnerability/PYSEC-2026-215", id="missing")
    ]
)
def test_an_advisory_from_uv_links_to_its_address_or_to_osv(
    expected : str,
    link     : str | None
):
    """
    Asserts that an advisory `uv audit` reports links to the address the
    audit gives and to OSV's page for its identifier where it gives none.
    """
    advisory = UvAdvisory.model_validate(
        {"id": "PYSEC-2026-215", "link": link, "dependency": {"name": "idna"}}
    ).advisory

    assert advisory == Advisory(id="PYSEC-2026-215", link=expected, package="idna")
    assert advisory.cell == f"[PYSEC-2026-215]({expected})"


def test_the_table_lists_each_lift_by_file_then_name(snapshot: SnapshotAssertion):
    """
    Asserts that the table holds a row per lift ordered by the file
    declaring it and then by name, naming its age up to today, marking a
    major lift, and linking each advisory it clears.
    """
    report = Report(
        lifts = (
            lift(
                current  = "0.12.13",
                name     = "uv",
                newest   = "0.13.5",
                path     = Path(".mise/config.toml"),
                released = datetime(2026, 10, 20, tzinfo=UTC)
            ),
            lift(
                current    = "2026.10.19",
                name       = "certifi",
                newest     = "2026.10.23",
                advisories = (Advisory(
                    id      = "GHSA-x",
                    link    = "https://x",
                    package = "certifi"
                ),),
                path = Path("uv.lock")
            ),
            lift(
                current = "1.4.3",
                name    = "bun",
                newest  = "1.4.4",
                path    = Path(".mise/config.toml")
            )
        )
    )

    assert report.table(date(2026, 10, 23)) == snapshot


@given(drawn=data())
@mark.parametrize("spelling", Spelling, ids=str)
def test_an_edit_reads_back_as_the_version_it_writes(
    drawn            : DataObject,
    spelling         : Spelling,
    tmp_path_factory : TempPathFactory
):
    """
    Asserts that, for any version a spelling's pattern holds, the pattern
    finds in the rewritten file the version the edit wrote and nothing else,
    so writing a lift and reading it back round-trips.
    """
    name, text, versions = {
        Spelling.ASSIGNMENT: (
            "python", 'python = "3.14.6"\n', r"[0-9]{1,4}(\.[0-9]{1,4}){0,3}"
        ),

        Spelling.INPUT: (
            "wranglerVersion", "  wranglerVersion: 4.149.0\n",
            r"[0-9]{1,4}(\.[0-9]{1,4}){0,3}"
        ),

        Spelling.MEMBER: (
            "vitest", '{"vitest": "5.0.5"}', r"[0-9]{1,4}(\.[0-9]{1,4}){0,3}"
        ),

        Spelling.REF: (
            "actions/checkout",
            f"uses: actions/checkout@{'a' * 40}\n",
            r"[0-9a-f]{40}"
        ),

        Spelling.REQUIREMENT: (
            "pluggy", '["pluggy==1.6.0"]', r"[0-9]{1,4}(\.[0-9]{1,4}){0,3}"
        )
    }[spelling]
    version = drawn.draw(from_regex(versions, fullmatch=True))
    root    = tmp_path_factory.mktemp("edit")
    (root / "file").write_text(text)
    Edit(
        name     = name,
        path     = Path("file"),
        spelling = spelling,
        version  = version
    ).apply(root)

    assert [
        found["version"]
        for found in finditer(spelling.pattern(name), (root / "file").read_text())
    ] == [version]
