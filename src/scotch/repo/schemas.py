"""
Holds the records `scotch audit repo` reads out of a checkout, meaning the
manifest, the mise config, the license, the lockfile, the site's package
manifest, the workflows with their jobs and steps, the action manifests, the
mise tasks, and the task scripts, beside the `Finding` each check reports.
"""

from collections.abc import Callable, Iterable, Mapping
from enum            import StrEnum, auto
from itertools       import product
from json            import loads as from_json
from pathlib         import Path
from pydantic        import AliasPath, BaseModel, BeforeValidator, Field, ValidationError
from re              import MULTILINE, Match, findall, fullmatch, search, split, sub
from tomllib         import loads
from typing          import Annotated, ClassVar, Self, assert_never
from urllib.parse    import urlsplit
from yaml            import AliasToken, AnchorToken, CSafeLoader, YAMLError, load, scan


class Author(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    One entry of `[project].authors` in `pyproject.toml`.
    """

    name: str
    """
    The author's name.
    """


class ConfigFile(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    A record read out of one configuration file, parsed as TOML unless
    a subclass's `parser` reads another format, holding the fields its
    subclass declares beside the file's path.
    """

    path: Path
    """
    The file.
    """

    parser: ClassVar[Callable[[str], dict[str, object]]] = staticmethod(loads)

    @classmethod
    def read(cls, path: Path) -> Self:
        """
        Reads the file at `path`.

        Raises:
            ValidationError: Titled with `path`, where the file fails to
                             parse or to validate as the record.
        """
        text = path.read_text(encoding="utf-8")

        try:
            return cls.model_validate({**cls.parser(text), "path": path})
        except ValidationError as error:
            details = error.errors()
        except (ValueError, YAMLError) as error:
            details = [
                {
                    "input" : text,
                    "type"  : "value_error",
                    "ctx"   : {"error": error},
                    "loc"   : ()
                }
            ]

        raise ValidationError.from_exception_data(str(path), details) from None


class Format(StrEnum):
    """
    The shape `scotch audit repo` prints each finding in.
    """

    GITHUB = auto()
    TEXT   = auto()


class Level(StrEnum):
    """
    The severity of a finding, each member's value being the workflow
    command GitHub Actions turns into an annotation of that severity.
    """

    ERROR   = auto()
    WARNING = auto()


class License(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The license file `[project].license-files` names, read for its title and
    the holders its copyright line names.
    """

    holders: tuple[str, ...]
    """
    The names the copyright line gives after its years, in the order it
    gives them.
    """

    path: Path
    """
    The license file.
    """

    title: str
    """
    The file's first line, such as `MIT License`.
    """

    @classmethod
    def read(cls, path: Path) -> Self:
        """
        Reads the license file at `path`, splitting the holders on the
        commas and the `and` between them.
        """
        text   = path.read_text(encoding="utf-8")
        notice = search(r"^Copyright \(c\) [\d, -]+ (.+)$", text, MULTILINE)

        return cls(
            holders = tuple(
                split(r",\s*|\s+and\s+", notice[1])
            ) if notice else (),
            path  = path,
            title = text.partition("\n")[0].strip()
        )


class Package(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    One `[[package]]` entry of `uv.lock`.
    """

    name: str
    """
    The package's normalized name.
    """

    version: str = ""
    """
    The version the lockfile resolves, empty for a package uv locks from a
    path with no version.
    """


class Script(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    The inline metadata a task script declares, per PEP 723.
    """

    path: Path
    """
    The task script.
    """

    dependencies: tuple[str, ...] = ()
    """
    The requirements the script runs with.
    """

    python: str = Field("", alias="requires-python")
    """
    The specifier the script's `requires-python` declares.
    """

    @property
    def pins(self) -> dict[str, str]:
        """
        Maps the normalized name of each requirement pinned with `==` to the
        version it pins, normalized as PEP 503 normalizes a project name.
        """
        return {
            sub(r"[-_.]+", "-", pin["name"]).lower(): pin["version"]
            for dependency in self.dependencies
            if (pin := pinned(dependency))
        }

    @classmethod
    def read(cls, path: Path) -> Self | None:
        """
        Reads the `script` block of the file at `path` through the
        expression PEP 723 gives for finding one.

        Returns:
            The script's metadata, or `None` where the file declares none.
        """
        block = search(
            r"(?m)^# /// script$\s(?P<content>(^#(| .*)$\s)+)^# ///$",
            path.read_text(encoding="utf-8")
        )

        if block is None:
            return None

        content = "".join(
            line.removeprefix("#").removeprefix(" ")
            for line in block["content"].splitlines(keepends=True)
        )
        return cls.model_validate({**loads(content), "path": path})


class Step(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    One step of a job or of a composite action.
    """

    inputs: dict[str, str | int | bool] = Field({}, alias="with")
    """
    The inputs the step's `with` block passes the action it uses.
    """

    run: str = ""
    """
    The shell script the step runs.
    """

    uses: str = ""
    """
    The action the step uses, a local path or an owner, a repository, and a
    ref joined by `@`.
    """

    @property
    def action(self) -> str:
        """
        Cuts the ref off `uses`, leaving the action it names.
        """
        return self.uses.partition("@")[0]

    @property
    def commands(self) -> tuple[str, ...]:
        """
        Lists the command each line of the step's script opens on, such as a
        task file the script runs by its path.
        """
        return tuple(
            words[0] for line in self.run.splitlines() if (words := line.split())
        )

    @property
    def pin(self) -> str:
        """
        Cuts the action off `uses`, leaving the ref it is pinned to, empty
        for a local action.
        """
        return self.uses.partition("@")[2]

    @property
    def saves(self) -> bool:
        """
        Reads whether the step passes the provisioning action `save:
        'true'`, which writes the tool cache back once the install finishes
        on a cache miss.
        """
        return self.inputs.get("save") == "true"

    @property
    def tasks(self) -> tuple[str, ...]:
        """
        Lists the mise tasks the step's script runs through `mise run`.
        """
        return tuple(findall(r"\bmise run ([\w:-]+)", self.run))

    @property
    def tools(self) -> frozenset[str]:
        """
        Splits the `tools` input into the tools it names, which
        `jdx/mise-action` sorts before hashing them into its cache key.
        """
        return frozenset(str(self.inputs.get("tools", "")).split())

    @property
    def wrangler(self) -> str:
        """
        Reads the version of Wrangler the step's `wranglerVersion` input
        names, or an empty text where it passes none.
        """
        return str(self.inputs.get("wranglerVersion", ""))

    @property
    def writes_summary(self) -> bool:
        """
        Reads whether the step's script names the workflow step summary.
        """
        return "GITHUB_STEP_SUMMARY" in self.run

    def expand(self, leg: Mapping[str, str]) -> Self:
        """
        Copies the step with each `${{ matrix.<key> }}` expression in its
        inputs and its script replaced by the value `leg` holds for that
        key.
        """
        return self.model_copy(
            update = {
                "inputs" : {
                    name: filled(leg, value) for name, value in self.inputs.items()
                },
                "run"    : filled(leg, self.run)
            }
        )


class Task(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    One task `mise tasks ls --json` lists.
    """

    depends: tuple[str, ...]
    """
    The tasks mise runs before this one.
    """

    file: Path | None
    """
    The task's file, `None` for a task declared inline in a config.
    """

    name: str
    """
    The task's name, such as `repo:ci`.
    """

    aliases: tuple[str, ...] = ()
    """
    The words `mise <alias>` runs the task under.
    """

    @property
    def command(self) -> str:
        """
        Writes the shortest command running the task from a shell, `mise`
        and the task's first alias where it has one and `mise run` and its
        name otherwise.
        """
        return f"mise {self.aliases[0]}" if self.aliases else f"mise run {self.name}"

    @property
    def writes_summary(self) -> bool:
        """
        Reads whether the task's file names the workflow step summary.
        """
        return self.file is not None and "GITHUB_STEP_SUMMARY" in self.file.read_text(
            encoding = "utf-8"
        )


class Trigger(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    The filters one event a workflow fires on declares.
    """

    paths: tuple[str, ...] = ()
    """
    The paths at least one of which a push has to touch for the workflow to
    fire.
    """


class Action(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    A composite action's manifest, `action.yml` in the action's folder.
    """

    anchors: tuple[int, ...]
    """
    The line of each anchor and alias the manifest carries, counting from
    one.
    """

    path: Path
    """
    The manifest.
    """

    inputs: Annotated[tuple[str, ...], BeforeValidator(tuple)] = ()
    """
    The name of each input the manifest declares.
    """

    steps: tuple[Step, ...] = Field(validation_alias=AliasPath("runs", "steps"))
    """
    The steps the action runs.
    """

    @property
    def provisions(self) -> bool:
        """
        Reads whether the action installs tools through `jdx/mise-action`.
        """
        return any(step.action == "jdx/mise-action" for step in self.steps)

    @classmethod
    def read(cls, path: Path) -> Self:
        """
        Reads the manifest at `path`, finding each anchor and alias through
        the tokens `yaml.scan` yields, since a load resolves both before any
        record holds the result.
        """
        text = path.read_text(encoding="utf-8")

        return cls.model_validate(
            {
                **load(text, Loader=CSafeLoader),
                "anchors" : tuple(
                    token.start_mark.line + 1
                    for token in scan(text, Loader=CSafeLoader)
                    if isinstance(token, AnchorToken | AliasToken)
                ),
                "path"    : path
            }
        )


class Finding(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One divergence a check reports, at the file and, where one applies, the
    line it concerns.
    """

    message: str
    """
    The sentence naming the divergence.
    """

    path: Path
    """
    The file the divergence sits in.
    """

    level: Level = Level.ERROR
    """
    The severity, where only an error fails the audit.
    """

    line: int | None = None
    """
    The line the divergence sits on, counting from one.
    """

    def render(self, output: Format) -> str:
        """
        Renders the finding as a line of text, or as the workflow command
        GitHub Actions turns into an annotation on the file.

        The command form escapes the characters GitHub's command syntax
        reserves, `%` and the line breaks in the message, and those plus `:`
        and `,` in each property.
        """
        match output:
            case Format.GITHUB:
                data       = {"%": "%25", "\n": "%0A", "\r": "%0D"}
                properties = {"file": self.path.as_posix(), "line": self.line}
                escaped    = str.maketrans(data | {",": "%2C", ":": "%3A"})
                fields     = ",".join(
                    f"{key}={str(value).translate(escaped)}"
                    for key, value in properties.items()
                    if value is not None
                )
                message = self.message.translate(str.maketrans(data))

                return f"::{self.level} {fields}::{message}"
            case Format.TEXT:
                location = f"{self.path}:{self.line}" if self.line else self.path
                return f"{location}: {self.level}: {self.message}"
            case _: assert_never(output)


class Issue(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    One problem `mise tasks validate` reports for a task.
    """

    message: str
    """
    The sentence mise prints for the problem.
    """

    severity: Level
    """
    Whether mise reports the problem as an error or as a warning.
    """

    task: str
    """
    The name of the task the problem sits in.
    """

    details: str = ""
    """
    The sentence mise prints beneath the message, such as the task a
    dependency names.
    """

    @property
    def sentence(self) -> str:
        """
        Joins the message and, where mise prints one, the details in
        parentheses after it.
        """
        return f"{self.message} ({self.details})" if self.details else self.message


class Job(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    One job of a workflow.
    """

    id: str
    """
    The key the workflow's `jobs` mapping gives the job.
    """

    condition: str = Field("", alias="if")
    """
    The expression the job's `if` runs it under.
    """

    matrix: dict[str, tuple[str | dict[str, str], ...]] = Field(
        {},
        validation_alias = AliasPath("strategy", "matrix")
    )
    """
    The matrix the job's strategy declares, each axis a list of values and
    `include` a list of legs.
    """

    name: str = ""
    """
    The name GitHub shows for the job and a ruleset's required check names.
    """

    needs: Annotated[
        tuple[str, ...],
        BeforeValidator(lambda needs: (needs,) if isinstance(needs, str) else needs)
    ] = ()
    """
    The jobs the job waits for, whether `needs` names one or a list.
    """

    runner: str = Field(alias="runs-on")
    """
    The runner image the job runs on.
    """

    steps: tuple[Step, ...] = ()
    """
    The steps the job runs.
    """

    @property
    def always(self) -> bool:
        """
        Reads whether the job runs under `always()`, whether or not its
        condition is wrapped in `${{ }}`.
        """
        return self.condition.strip("${} ") == "always()"

    @property
    def checks(self) -> tuple[tuple[str, str], ...]:
        """
        Pairs the name each leg of the job's matrix reports its check under
        with each task the leg runs.
        """
        return tuple(
            (filled(leg, self.name), task)
            for leg in self.legs
            for step in self.steps
            for task in step.expand(leg).tasks
        )

    @property
    def gate(self) -> bool:
        """
        Reads whether the job runs `gha:brief`, the task the `⏱️ Brief` gate
        runs.
        """
        return "gha:brief" in self.tasks

    @property
    def instances(self) -> tuple[Step, ...]:
        """
        Expands each step once for each leg of the job's matrix.
        """
        return tuple(step.expand(leg) for leg in self.legs for step in self.steps)

    @property
    def legs(self) -> tuple[Mapping[str, str], ...]:
        """
        Expands the matrix into its legs the way GitHub does, crossing each
        axis value with every other axis's, then merging each `include`
        entry into every leg it overwrites no axis value of, and taking an
        entry that fits no leg as a leg of its own.

        Returns:
            The legs, or one empty leg for a job with no matrix.
        """
        axes = {key: values for key, values in self.matrix.items() if key != "include"}
        legs = [dict(zip(axes, values)) for values in product(
            *axes.values()
        )] if axes else []
        added = []

        for entry in self.matrix.get("include", ()):
            fits = [leg for leg in legs if all(
                leg[key] == entry[key] for key in entry.keys() & axes.keys()
            )]

            for leg in fits:
                leg.update(entry)

            if not fits:
                added.append(entry)

        return (*legs, *added) or ({},)

    @property
    def tasks(self) -> frozenset[str]:
        """
        Collects the mise tasks the job runs across every leg of its matrix.
        """
        return frozenset(task for step in self.instances for task in step.tasks)


class Lock(ConfigFile):
    """
    The packages `uv.lock` resolves.
    """

    packages: tuple[Package, ...] = Field(alias="package")
    """
    Each package the lockfile resolves.
    """

    def version(self, name: str) -> str | None:
        """
        Looks up the package `name` names among those the lockfile resolves.

        Returns:
            The version the lockfile resolves for it, or `None` where it
            resolves no such package.
        """
        return next(
            (package.version for package in self.packages if package.name == name),
            None
        )


class MiseConfig(ConfigFile):
    """
    The fields of `.mise/config.toml` the checks compare against the files
    that restate them.
    """

    node: str | None = Field(None, validation_alias=AliasPath("tools", "node"))
    """
    The Node.js version mise pins for the site, or `None` where it pins
    none.
    """

    python: str = Field(validation_alias=AliasPath("tools", "python"))
    """
    The Python version mise pins.
    """

    uv: str = Field(validation_alias=AliasPath("tools", "uv"))
    """
    The uv version mise pins.
    """

    wrappers: Path = Field(validation_alias=AliasPath("env", "_", "path"))
    """
    The folder the `_.path` entry puts first on `PATH`, holding a wrapper for
    each program run by name out of `.venv`.
    """

    @property
    def lockfile(self) -> Path:
        """
        Locates `mise.lock` beside the config file.
        """
        return self.path.with_name("mise.lock")

    @property
    def minor(self) -> str:
        """
        Cuts the Python version mise pins down to its major and minor, such
        as `3.14` for `3.14.6`.
        """
        return ".".join(self.python.split(".")[:2])


class Pyproject(ConfigFile):
    """
    The fields of `pyproject.toml` the checks compare against the files that
    restate them, beside the description, the homepage, and the keywords
    `scotch apply rulesets` sends to the repository.
    """

    authors: tuple[Author, ...] = Field(
        validation_alias = AliasPath("project", "authors")
    )
    """
    The authors `[project]` names.
    """

    builds: tuple[str, ...] = Field(
        validation_alias = AliasPath("build-system", "requires")
    )
    """
    The requirements `[build-system]` builds the package with.
    """

    constraints: tuple[str, ...] = Field(
        (),
        validation_alias = AliasPath("tool", "uv", "build-constraint-dependencies")
    )
    """
    The constraints `[tool.uv]` holds a source distribution's build to.
    """

    description: str = Field(validation_alias=AliasPath("project", "description"))
    """
    The sentence `[project].description` declares, which the repository's
    About box carries.
    """

    homepage: str = Field(validation_alias=AliasPath("project", "urls", "Homepage"))
    """
    The address `[project.urls].Homepage` declares, where the docs site
    serves.
    """

    keywords: tuple[str, ...] = Field(validation_alias=AliasPath("project", "keywords"))
    """
    The words `[project].keywords` declares, which the repository carries as
    its topics.
    """

    license: str = Field(validation_alias=AliasPath("project", "license"))
    """
    The SPDX expression `[project].license` declares.
    """

    licenses: tuple[Path, ...] = Field(
        validation_alias = AliasPath("project", "license-files")
    )
    """
    The license files `[project].license-files` names.
    """

    python: str = Field(validation_alias=AliasPath("project", "requires-python"))
    """
    The specifier `[project].requires-python` declares.
    """

    readme: Path = Field(validation_alias=AliasPath("project", "readme"))
    """
    The README `[project].readme` names, relative to the repository's root.
    """

    target: str = Field(validation_alias=AliasPath("tool", "prose", "target-version"))
    """
    The Python version `[tool.prose]` formats the source for.
    """

    uv: str = Field(validation_alias=AliasPath("tool", "uv", "required-version"))
    """
    The specifier `[tool.uv].required-version` holds uv to.
    """

    @property
    def domain(self) -> str:
        """
        Cuts the homepage down to its host, such as `scotch.fyi`, the bare
        domain the repository's About box links.
        """
        return urlsplit(self.homepage).netloc

    @property
    def loose(self) -> tuple[str, ...]:
        """
        Lists each build requirement and build constraint that is not an
        exact pin.
        """
        return tuple(
            requirement
            for requirement in (*self.builds, *self.constraints)
            if not pinned(requirement)
        )


class Site(ConfigFile):
    """
    The fields of the site's `docs/package.json` the checks compare against
    the pins that restate them.
    """

    parser = staticmethod(from_json)

    dependencies: dict[str, str] = {}
    """
    The version each package the site runs with is pinned to, keyed by its
    name.
    """

    overrides: dict[str, str] = {}
    """
    The version each package the site's packages depend on is held to in
    place of the one they ask for, keyed by its name.
    """

    packages: dict[str, str] = Field({}, validation_alias="devDependencies")
    """
    The version each package the site builds and checks with is pinned to,
    keyed by its name.
    """

    @property
    def loose(self) -> tuple[tuple[str, str], ...]:
        """
        Lists the name and the version of each dependency, each package, and
        each override not pinned to one exact version.
        """
        return tuple(
            (name, version)
            for name, version in (
                *self.dependencies.items(),
                *self.packages.items(),
                *self.overrides.items()
            )
            if not exact(version)
        )


class Validation(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    The report `mise tasks validate --json` prints.
    """

    issues: tuple[Issue, ...]
    """
    Each problem mise found, in the order it reports them.
    """


class Workflow(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    One workflow under `.github/workflows/`.
    """

    jobs: tuple[Job, ...]
    """
    The workflow's jobs, in the order the file declares them.
    """

    path: Path
    """
    The workflow file.
    """

    triggers: dict[str, Trigger | None]
    """
    The events the workflow fires on, each beside the filters it declares.
    """

    @property
    def gate(self) -> Job | None:
        """
        Finds the job running `gha:brief`.

        Returns:
            The gate, or `None` where no job runs `gha:brief`.
        """
        return next((job for job in self.jobs if job.gate), None)

    @property
    def instances(self) -> tuple[Step, ...]:
        """
        Expands every job's steps once for each leg of the job's matrix.
        """
        return tuple(step for job in self.jobs for step in job.instances)

    @property
    def paths(self) -> tuple[str, ...]:
        """
        Reads the path filter a push to the workflow declares, empty where
        it declares none.
        """
        return push.paths if (push := self.triggers.get("push")) else ()

    @property
    def requests(self) -> bool:
        """
        Reads whether the workflow fires on a pull request.
        """
        return "pull_request" in self.triggers

    @property
    def rows(self) -> tuple[Job, ...]:
        """
        Lists every job but the gate.
        """
        return tuple(job for job in self.jobs if not job.gate)

    @property
    def saves(self) -> bool:
        """
        Reads whether any step of the workflow passes `save: 'true'`,
        writing the tool cache back.
        """
        return any(step.saves for step in self.instances)

    @property
    def steps(self) -> tuple[Step, ...]:
        """
        Lists every job's steps as the file declares them.
        """
        return tuple(step for job in self.jobs for step in job.steps)

    @property
    def ungated(self) -> tuple[str, ...]:
        """
        Lists every job the gate does not wait for, empty where the workflow
        has no gate.
        """
        if (gate := self.gate) is None:
            return ()

        return tuple(job.id for job in self.rows if job.id not in gate.needs)

    def filters(self, path: Path) -> bool:
        """
        Reads whether the `push` filter takes `path` in, where the last
        pattern matching it decides and a pattern opening on `!` leaves
        it out.
        """
        last = next(
            (pattern for pattern in reversed(self.paths) if path.full_match(
                pattern.removeprefix("!")
            )),
            "!"
        )
        return not last.startswith("!")

    @classmethod
    def read(cls, path: Path) -> Self:
        """
        Reads the workflow file at `path`.

        YAML 1.1, which PyYAML follows, reads the bare `on` key as the
        boolean `True`, so the events load from that key into `triggers`.
        """
        workflow = load(path.read_text(encoding="utf-8"), Loader=CSafeLoader)

        return cls.model_validate(
            {
                **workflow,
                "jobs" : [{**job, "id": key} for key, job in workflow["jobs"].items()],
                "path" : path,
                "triggers": workflow[True]
            }
        )

    def unfiltered(self, paths: Iterable[Path], root: Path) -> list[Path]:
        """
        Lists each of `paths`, and the workflow's own file, that the `push`
        filter leaves out, each relative to `root`, the directory the
        patterns are relative to. The last pattern matching a path decides,
        as it does for GitHub, so a pattern opening on `!` leaves out a
        path an earlier pattern took in, and each pattern reads through
        `PurePath.full_match`, where `*` stops at a `/` and a `**` segment
        spans any number of folders.
        """
        relative = {path.relative_to(root) for path in {*paths, self.path}}

        return sorted(path for path in relative if not self.filters(path))


def exact(version: str) -> Match[str] | None:
    """
    Matches `version` against the shape of one exact version as npm writes
    it, meaning a major, a minor, and a patch, with an optional prerelease
    and build after them, and no range.
    """
    return fullmatch(r"\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?", version)


def filled[T: (str, int, bool)](leg: Mapping[str, str], text: T) -> T:
    """
    Replaces each `${{ matrix.<key> }}` expression in `text` with the value
    `leg` holds for that key, an expression naming a key the leg lacks
    reading as empty, leaving a value that is no string as it stands.
    """
    if not isinstance(text, str):
        return text

    return sub(
        r"\$\{\{\s*matrix\.([\w-]+)\s*\}\}",
        lambda match: leg.get(match[1], ""),
        text
    )


def pinned(requirement: str) -> Match[str] | None:
    """
    Matches `requirement` against the shape of an exact pin, meaning a name,
    `==`, and one version with no wildcard.

    Returns:
        The match, whose `name` and `version` groups hold the two halves, or
        `None` where `requirement` is not an exact pin.
    """
    return fullmatch(r"(?P<name>[\w.-]+)==(?P<version>[\w.+!]+)", requirement)
