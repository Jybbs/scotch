"""
Holds the records `scotch lift pins` reports and writes, meaning each `Lift`
of a pin to its newest release beside the `Edit` writing that release into
the file declaring it and the `Advisory` the release clears, the `Failure`
an attempt at a lift stops on, the `Report` printing every lift as one
Markdown table, and the records it reads each manager's answer into.
"""

from collections.abc import Collection, Iterable
from datetime        import UTC, date, timedelta
from enum            import StrEnum, auto
from json            import dumps
from more_itertools  import unique_everseen
from operator        import attrgetter
from pathlib         import Path
from pydantic        import AliasPath, AwareDatetime, BaseModel, Field
from re              import Match, escape, fullmatch, search, sub, subn
from tomllib         import loads
from typing          import Self, assert_never

from scotch.docs.tallies import markdown
from scotch.repo.checks  import Check
from scotch.repo.schemas import Package, normalized


class Advisory(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One advisory an audit reports against the version of a package a
    lockfile resolves.
    """

    id: str
    """
    The identifier the audit names the advisory by, such as `GHSA-` and the
    rest of a GitHub advisory's.
    """

    link: str
    """
    The address the advisory is published at.
    """

    package: str
    """
    The package the advisory concerns, named as the lockfile names it.
    """

    @property
    def cell(self) -> str:
        """
        Writes the advisory as a Markdown link from its identifier to its
        address.
        """
        return f"[{self.id}]({self.link})"


class Exemption(StrEnum):
    """
    The resolvers that admit one release inside the window, each through the
    exemption its own documentation gives.
    """

    BUN   = auto()
    CARGO = auto()
    UV    = auto()


class Failure(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The command an attempt at a lift stopped on, beside the log of the
    attempt.
    """

    command: str
    """
    The command that exited nonzero, as a reader runs it from the root, such
    as `mise run repo:ci`.
    """

    log: Path
    """
    The file holding each command the attempt ran and what it printed.
    """


class Listing(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    One release `mise ls-remote --json` lists for a tool.
    """

    version: str
    """
    The release's version.
    """

    created: AwareDatetime | None = Field(None, alias="created_at")
    """
    The instant the release was published, or `None` where mise's source
    dates it nowhere.
    """

    prerelease: bool = False
    """
    Whether the source marks the release as a prerelease.
    """


class Outdated(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    One tool `mise outdated --bump --json` reports, beside the version the
    config requests and the newest release overall.
    """

    latest: str
    """
    The newest release of the tool.
    """

    requested: str
    """
    The version the config pins.
    """

    source: Path = Field(validation_alias=AliasPath("source", "path"))
    """
    The config file requesting the tool.
    """


class Published(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    The latest release of a repository, as GitHub's REST endpoint for it
    reports it.
    """

    published: AwareDatetime = Field(alias="published_at")
    """
    The instant the release was published.
    """

    tag: str = Field(alias="tag_name")
    """
    The tag the release is cut from.
    """


class Spelling(StrEnum):
    """
    The ways a file spells the version it pins, each found by a pattern
    whose `version` group spans the version alone.
    """

    ASSIGNMENT  = auto()
    INPUT       = auto()
    MEMBER      = auto()
    REF         = auto()
    REQUIREMENT = auto()

    def pattern(self, name: str) -> str:
        """
        Writes the expression finding each version a file pins beside `name`
        where the file spells it this way, one of:

        - A TOML assignment, or one inside the comment block PEP 723
          describes, whose string may open on the operator a specifier
          carries and whose key may be quoted, such as `python = "3.14.6"`,
          `requires-python = ">=3.14"`, or `"github:owner/tool" = "1.0.0"`,
          or the `version` of an inline table, such as `rust = { version =
          "1.99.1" }`
        - An input a workflow step passes, such as `wranglerVersion:
          4.149.0`
        - A member of a JSON object, such as `"vitest": "5.0.5"`
        - The commit an action's `uses` names, such as
          `actions/checkout@` and forty hexadecimal digits
        - A requirement pinned with `==`, such as `hatchling==1.32.4`
        """
        key = escape(name)

        match self:
            case Spelling.ASSIGNMENT:
                return (
                    rf'(?m)^(?:# )?"?{key}"?\s*=\s*(?:\{{[^}}\n]*\bversion\s*=\s*)?'
                    r'"[<>=!~]*(?P<version>[^"]+)"'
                )
            case Spelling.INPUT:
                return rf"(?m)^\s*{key}:\s*['\"]?(?P<version>[\w.+-]+)"
            case Spelling.MEMBER: return rf'"{key}"\s*:\s*"(?P<version>[^"]+)"'
            case Spelling.REF:
                return rf"(?<![\w./-]){key}@(?P<version>[0-9a-f]{{40}})"
            case Spelling.REQUIREMENT:
                return rf"(?<![\w.-]){key}==(?P<version>[\w.+!]+)"
            case _: assert_never(self)


class Bulletin(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    One advisory `bun audit --json` reports against a package the site's
    lockfile resolves.
    """

    url: str
    """
    The address of the advisory on GitHub's advisory database.
    """

    def advisory(self, package: str) -> Advisory:
        """
        Reads the advisory against `package`, named by the identifier
        closing its address.
        """
        return Advisory(id=self.url.rpartition("/")[2], link=self.url, package=package)


class CargoAdvisory(
    BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True
):
    """
    One diagnostic `cargo-deny --format json check advisories` prints for an
    advisory against a crate a lockfile resolves.
    """

    id: str = Field(validation_alias=AliasPath("fields", "advisory", "id"))
    """
    The identifier the advisory database names the advisory by.
    """

    link: str = Field(validation_alias=AliasPath("fields", "advisory", "url"))
    """
    The address the advisory is published at.
    """

    package: str = Field(
        validation_alias = AliasPath("fields", "graphs", 0, "Krate", "name")
    )
    """
    The first crate of the dependency graph the diagnostic names, the one the
    advisory concerns.
    """

    @property
    def advisory(self) -> Advisory:
        """
        Reads the advisory.
        """
        return Advisory(id=self.id, link=self.link, package=self.package)


class Edit(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One rewrite of a version a file pins, which replaces each version the
    pattern finds and leaves every other byte of the file as it stood.
    """

    name: str
    """
    The name the file spells the version beside, such as a tool, a package,
    an action, or a key restating a version.
    """

    path: Path
    """
    The file, relative to the root of the tree it is written into.
    """

    spelling: Spelling
    """
    The way the file spells the version.
    """

    version: str
    """
    The text written in place of each version the pattern finds.
    """

    def apply(self, root: Path):
        """
        Rewrites the file at `path` under `root`.

        Raises:
            ValueError: Where the file spells no version beside `name` the
                        way `spelling` reads one.
        """
        file = root / self.path
        text = file.read_text(encoding="utf-8")

        def replace(found: Match[str]) -> str:
            """
            Puts `version` in place of the `version` group, keeping the text
            the pattern matched around it.
            """
            return (
                text[found.start():found.start("version")]
                + self.version
                + text[found.end("version"):found.end()]
            )

        written, count = subn(self.spelling.pattern(self.name), replace, text)

        if not count:
            raise ValueError(f"{self.path} spells no version beside {self.name}")

        file.write_text(written, encoding="utf-8")


class Pardon(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The exemption admitting the one release of a package a resolver holds
    back, which lets a lift that clears an advisory land before the window
    passes.
    """

    kind: Exemption
    """
    The resolver admitting the release.
    """

    name: str
    """
    The package the exemption admits.
    """

    path: Path
    """
    The file the exemption is written into, relative to the root of the tree
    it is written into, which for Cargo, whose exemption no file holds, is
    the crate's manifest.
    """

    value: str
    """
    For `uv`, the instant after the release's last upload, which
    `exclude-newer-package` reads as admitting the release and none
    uploaded later, and for `bun` and `cargo`, the release's version.
    """

    def apply(self, root: Path):
        """
        Writes the exemption into the file at `path` under `root`, merging
        it with the exemptions the file holds, or does nothing for Cargo,
        whose relock takes the exemption as an argument.

        The key goes on the line after its anchor, the key it sorts behind,
        and the table's keys realign on `=`, in the comment block of a task
        script as in a TOML file.

        Raises:
            ValueError: Where the file's existing exemptions span more than
                        one line.
        """
        if self.kind is Exemption.CARGO:
            return

        file   = root / self.path
        lines  = file.read_text(encoding="utf-8").splitlines(keepends=True)
        prefix = "# " if "# /// script\n" in lines else ""

        if self.kind is Exemption.BUN:
            key, anchor = "minimumReleaseAgeExcludes", "minimumReleaseAge"
        else:
            key, anchor = "exclude-newer-package", "exclude-newer"

        def literal(held: str | None) -> str:
            """
            Writes the key's value with this exemption merged into the value
            `held` spells, `None` where the file holds none.
            """
            existing = loads(f"value = {held}")["value"] if held else None

            if self.kind is Exemption.BUN:
                names = sorted({*(existing or ()), f"{self.name}@{self.value}"})
                return "[" + ", ".join(map(dumps, names)) + "]"

            members = sorted(((existing or {}) | {self.name: self.value}).items())
            return "{ " + ", ".join(
                f"{name if fullmatch(r'[\w-]+', name) else dumps(name)} "
                f"= {dumps(value)}"
                for name, value in members
            ) + " }"

        at = next(
            (
                index
                for index, line in enumerate(lines)
                if search(rf"^{prefix}{escape(key)}\s*=", line)
            ),
            None
        )

        if at is None:
            at = next(
                index
                for index, line in enumerate(lines)
                if search(rf"^{prefix}{escape(anchor)}\s*=", line)
            ) + 1
            lines.insert(at, f"{prefix}{key} = {literal(None)}\n")
        else:
            held      = sub(rf"^{prefix}{escape(key)}\s*=\s*", "", lines[at]).rstrip()
            lines[at] = f"{prefix}{key} = {literal(held)}\n"

        start = max(
            (index for index in range(at) if lines[index].startswith(f"{prefix}[")),
            default = 0
        )
        end = next(
            (
                index
                for index in range(at + 1, len(lines))
                if lines[index].startswith(f"{prefix}[")
                or lines[index].rstrip() == "# ///"
            ),
            len(lines)
        )
        keys = {
            index: found
            for index in range(start, end)
            if (found := fullmatch(rf"{prefix}([\w-]+)\s*=\s*(.*)\n?", lines[index]))
        }
        width = max(len(found[1]) for found in keys.values())

        for index, found in keys.items():
            lines[index] = f"{prefix}{found[1]:<{width}} = {found[2]}\n"

        file.write_text("".join(lines), encoding="utf-8")


class UvAdvisory(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    One advisory `uv audit --output-format json` reports against a package a
    lockfile resolves.
    """

    id: str
    """
    The identifier the advisory database names the advisory by.
    """

    link: str | None = None
    """
    The address the audit gives for the advisory, or `None` where it gives
    none.
    """

    package: str = Field(validation_alias=AliasPath("dependency", "name"))
    """
    The package the advisory concerns.
    """

    @property
    def advisory(self) -> Advisory:
        """
        Reads the advisory, at OSV's own page for it where the audit gives
        no address.
        """
        return Advisory(
            id      = self.id,
            link    = self.link or f"https://osv.dev/vulnerability/{self.id}",
            package = self.package
        )


class Lift(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One pin lagging its newest release, in the file declaring it, beside the
    rewrites that write the newest release there.
    """

    current: str
    """
    The version the file pins, or the tag naming the commit an action is
    pinned to.
    """

    name: str
    """
    The pin's name, which `--hold` takes, such as `python`, `polars`, or
    `actions/checkout`.
    """

    newest: str
    """
    The newest release, as its source names it.
    """

    path: Path
    """
    The file declaring the pin, relative to the repository's root.
    """

    advisories: tuple[Advisory, ...] = ()
    """
    Each advisory an audit reports against the current version that the
    newest release clears.
    """

    edits: tuple[Edit, ...] = ()
    """
    The rewrites writing the newest release into the file declaring the pin
    and into each file restating it.
    """

    held: AwareDatetime | None = None
    """
    The instant the window ends for a newest release younger than it, which
    leaves the pin where it stands, or `None` for a release that has aged or
    that an exemption admits.
    """

    pardons: tuple[Pardon, ...] = ()
    """
    The exemptions admitting the newest release before the window ends,
    which a lift clearing an advisory writes beside its edits.
    """

    released: AwareDatetime | None = None
    """
    The instant the newest release was published, or `None` where its
    source dates it nowhere.
    """

    upgraded: bool = False
    """
    Whether `uv lock` writes the lift by upgrading the package, which no
    manifest names a version of.
    """

    @property
    def major(self) -> bool:
        """
        Reads whether the newest release leaves the range Cargo's caret
        requirement on the current version allows, which holds the left-most
        non-zero of its major, minor, and patch numbers in place, so
        `0.33.1` to `0.34.0` is major and `2026.7.0` to `2026.9.0` is not.
        """
        current, newest = release(self.current), release(self.newest)

        if not current or not newest:
            return False

        place = next(
            (place for place, number in enumerate(current) if number),
            len(current) - 1
        )
        return newest[:place + 1] != current[:place + 1]

    def age(self, today: date) -> int | None:
        """
        Counts the days between the newest release's publication and
        `today`.

        Returns:
            The count, or `None` where nothing dates the release.
        """
        return (today - self.released.date()).days if self.released else None

    def cells(self, today: date) -> tuple[str, ...]:
        """
        Writes the lift's row of the report's table, its age counted up
        to `today`.
        """
        age = self.age(today)

        return (
            f"`{self.name}`",
            f"`{self.path}`",
            f"`{self.current}`",
            f"`{self.newest}`",
            "" if age is None else str(age),
            "yes" if self.major else "",
            ", ".join(advisory.cell for advisory in self.advisories),
            self.held.astimezone(UTC).strftime(
                "%Y-%m-%d %H:%M UTC"
            ) if self.held else ""
        )

    def clearing(self, advisories: Iterable[Advisory]) -> Self:
        """
        Copies the lift carrying each of `advisories` that concerns its
        package, in the order of their identifiers.
        """
        concerning = (
            advisory for advisory in advisories if advisory.package == self.name
        )
        return self.model_copy(
            update = {"advisories": tuple(sorted(concerning, key=attrgetter("id")))}
        )

    def holding(
        self,
        now     : AwareDatetime,
        pardons : tuple[Pardon, ...],
        window  : timedelta
    ) -> Self:
        """
        Applies the window to a lift whose newest release was published less
        than `window` before `now`, leaving a lift to an older release as it
        stands. Such a lift that clears an advisory takes `pardons`, which
        admit the release, and any other leaves the pin where it stands,
        carrying the instant the window ends.
        """
        if not self.released or (ends := self.released + window) <= now:
            return self

        if self.advisories:
            return self.model_copy(update={"pardons": pardons})

        return self.model_copy(
            update = {"held": ends, "upgraded": False, "edits": ()}
        )

    def write(self, root: Path):
        """
        Writes each of the lift's edits and each of its exemptions into the
        tree at `root`.
        """
        for edit in self.edits:
            edit.apply(root)

        for pardon in self.pardons:
            pardon.apply(root)


class UvAudit(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    The report `uv audit --output-format json` prints for one project or
    task script.
    """

    vulnerabilities: tuple[UvAdvisory, ...]
    """
    Each advisory the audit reports against a package the lockfile resolves.
    """


class Exact(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One requirement a file pins to an exact version with `==`, such as the
    build requirement or a dependency a task script declares inline.
    """

    follows: bool
    """
    Whether the pin moves with the version `uv.lock` resolves for its
    package rather than with the newest release a scratch project resolves.
    """

    path: Path
    """
    The file declaring the pin, relative to the repository's root.
    """

    spelled: str
    """
    The package's name as the file writes it.
    """

    version: str
    """
    The version the file pins.
    """

    @property
    def name(self) -> str:
        """
        Normalizes the package's name as PEP 503 does.
        """
        return normalized(self.spelled)

    def lift(self, package: Package) -> Lift:
        """
        Builds the lift of the pin to the release `package` resolves, whose
        rewrite writes that release beside the name as the file spells it.
        """
        return Lift(
            current = self.version,
            edits   = (
                Edit(
                    name     = self.spelled,
                    path     = self.path,
                    spelling = Spelling.REQUIREMENT,
                    version  = package.version
                ),
            ),
            name     = self.name,
            newest   = package.version,
            path     = self.path,
            released = package.released
        )


class Report(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    Every pin of one tree lagging its newest release.
    """

    lifts: tuple[Lift, ...]
    """
    Each lift the managers report, in the order they report them.
    """

    @property
    def leads(self) -> tuple[str, ...]:
        """
        Lists the name of each pin the report lifts, in the order the table
        gives them, once for each set of pins `coupled` holds together, the
        names a failing trial tries in turn.
        """
        return tuple(
            unique_everseen((lift.name for lift in self.writable), key=coupled)
        )

    @property
    def names(self) -> frozenset[str]:
        """
        Collects the name of every pin the report lists, the names `--hold`
        takes.
        """
        return frozenset(lift.name for lift in self.lifts)

    @property
    def rows(self) -> tuple[Lift, ...]:
        """
        Orders the lifts by the file declaring each, and by name within
        a file.
        """
        return tuple(sorted(self.lifts, key=attrgetter("path", "name")))

    @property
    def writable(self) -> tuple[Lift, ...]:
        """
        Lists the lifts of the table that the window leaves free to write,
        leaving out each pin it holds where it stands.
        """
        return tuple(lift for lift in self.rows if not lift.held)

    def table(self, today: date) -> str:
        """
        Writes one Markdown table holding a row for each lift, with each age
        counted up to `today`, or a line saying no pin lags where none does.
        """
        if not self.lifts:
            return "Every pin stands at its newest release"

        return markdown(
            (
                "Pin", "File", "Current", "Newest",
                "Age in Days", "Major", "Advisories", "Clears"
            ),
            (lift.cells(today) for lift in self.rows),
            right = False
        )

    def without(self, names: Collection[str]) -> Self:
        """
        Copies the report leaving out every lift of a pin `names` holds
        where it stands, and of each pin `coupled` holds together with one.
        """
        held = frozenset().union(*map(coupled, names))

        return self.model_copy(
            update = {
                "lifts": tuple(lift for lift in self.lifts if lift.name not in held)
            }
        )


def coupled(name: str) -> frozenset[str]:
    """
    Collects the pin `name` names beside each pin a check in
    `scotch.repo.checks` holds to it, such as `@vitest/coverage-v8` beside
    `vitest`, the pins a hold leaves where they stand together.
    """
    return frozenset({name}).union(
        *(check.coupled for check in Check.__subclasses__() if name in check.coupled)
    )


def release(version: str) -> tuple[int, ...]:
    """
    Reads the major, minor, and patch numbers out of the first run of dotted
    numbers in `version`, past any text such as the `v` or the name a tag
    opens on.

    Returns:
        The numbers, or an empty tuple, which sorts before every release,
        where `version` holds no number or names a commit by the forty
        hexadecimal digits of its hash, which carry no release.
    """
    if fullmatch(r"[0-9a-f]{40}", version):
        return ()

    numbers = search(r"\d+(?:\.\d+)*", version)

    return tuple(map(int, numbers[0].split(".")[:3])) if numbers else ()
