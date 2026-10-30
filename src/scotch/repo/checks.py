"""
Holds `Check` and the checks `scotch audit repo` runs, each reading the
records a `Checkout` loads and yielding a `Finding` wherever two files
that restate one fact disagree or a file breaks a rule the repository holds
itself to.
"""

from abc             import ABC, abstractmethod
from collections.abc import Iterator
from itertools       import combinations
from math            import dist
from more_itertools  import duplicates_everseen, unique_everseen
from pathlib         import Path
from pydantic        import BaseModel, ValidationError
from re              import search
from statistics      import mode
from typing          import ClassVar

from scotch.repo.checkout import Checkout
from scotch.repo.schemas  import Finding, exact


class Check(BaseModel, ABC, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    A rule the repository holds itself to, read against one checkout.
    """

    checkout: Checkout
    """
    The repository the check reads.
    """

    coupled: ClassVar[frozenset[str]] = frozenset()
    """
    The pins the check holds to one another, which a hold of `scotch lift
    pins` leaves where they stand together.
    """

    @abstractmethod
    def scan(self) -> Iterator[Finding]:
        """
        Yields one finding for each place the checkout breaks the rule.
        """


class ActionPinCheck(Check):
    """
    Fails where one action is pinned to two different commits across the
    workflows and the composite actions.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding at each step whose pin differs from the one most
        steps using that action carry.
        """
        steps = self.checkout.steps

        for path, step in steps:
            if step.pin != (usual := mode(
                other.pin for _, other in steps if other.action == step.action
            )):
                yield Finding(
                    message = (
                        f"`{step.action}` is pinned to `{step.pin}` here "
                        f"and to `{usual}` elsewhere"
                    ),
                    path = path
                )


class AnchorCheck(Check):
    """
    Fails on an anchor or an alias in a composite action's manifest, which
    GitHub's action-manifest parser rejects before any step runs.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding at the line of each anchor and alias.
        """
        for action in self.checkout.actions:
            for line in action.anchors:
                yield Finding(
                    line    = line,
                    message = (
                        "The manifest carries a YAML anchor or alias, "
                        "which GitHub's action-manifest parser rejects"
                    ),
                    path = action.path
                )


class CommandCheck(Check):
    """
    Fails on a command in a task or a wrapper that departs from how the
    repository runs its tools, meaning:

    - A `uv run` that does not open its arguments on `--exact --locked`
    - A `bun install`, or its alias `bun i`, carrying neither
      `--frozen-lockfile` nor `--lockfile-only`, which could rewrite
      `docs/bun.lock` instead of installing from it
    - A `bunx` or `bun x`, which can run a copy of a tool from outside
      `docs/node_modules`
    """

    commands: ClassVar[dict[str, str]] = {
        r"\bbun ?x\b": (
            "`bunx` and `bun x` can run a copy of a tool from outside "
            "`docs/node_modules`"
        ),

        r"\buv run\b(?! --exact --locked(?:\s|$))":
            "`uv run` does not open its arguments on `--exact --locked`",

        r"^(?!.*--(?:frozen-lockfile|lockfile-only)\b).*\bbun (?:install|i)\b":
            "`bun install` carries neither `--frozen-lockfile` nor `--lockfile-only`"
    }

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding at the line of each such command.
        """
        for path, line, text in self.checkout.lines():
            for pattern, message in self.commands.items():
                if search(pattern, text):
                    yield Finding(line=line, message=message, path=path)


class ContributingCheck(Check):
    """
    Fails where the checks table of `.github/CONTRIBUTING.md` names a check
    no pull-request workflow runs, leaves out one a workflow runs, or gives
    a check another command than the task its row runs.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding at `.github/CONTRIBUTING.md` for each such row, a
        row's command being `mise` and its task's first alias, or `mise run`
        and its name.
        """
        contributing = self.checkout.contributing
        commands     = {task.name: task.command for task in self.checkout.tasks}
        rows         = {
            name: commands.get(run, f"mise run {run}")
            for workflow in self.checkout.requested
            for job in workflow.rows
            for name, run in job.checks
        }

        for name, command in rows.items():
            if (given := contributing.checks.get(name)) is None:
                yield Finding(
                    message = (
                        f"The checks table leaves out `{name}`, "
                        "which a pull-request workflow runs"
                    ),
                    path = contributing.path
                )
            elif given != command:
                yield Finding(
                    message = (
                        f"The checks table runs `{name}` through `{given}` "
                        f"where its row runs `{command}`"
                    ),
                    path = contributing.path
                )

        for name in contributing.checks.keys() - rows.keys():
            yield Finding(
                message = (
                    f"The checks table names `{name}`, "
                    "which no pull-request workflow runs"
                ),
                path = contributing.path
            )


class ExactPinCheck(Check):
    """
    Fails on a build requirement in `[build-system]` or a build constraint
    in `[tool.uv]` that is not an exact pin.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding for each requirement that is not an exact pin.
        """
        for requirement in self.checkout.pyproject.loose:
            yield Finding(
                message = f"`{requirement}` is not an exact `==` pin",
                path    = self.checkout.pyproject.path
            )


class GateCheck(Check):
    """
    Fails on a workflow that ends on no gate, or whose gate sets no name,
    takes a name the other gates do not, runs under any condition but
    `always()`, or leaves a job out of its `needs`.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding for each way a workflow's gate departs from the
        rule.
        """
        gates = [workflow.gate for workflow in self.checkout.workflows if workflow.gate]

        for workflow in self.checkout.workflows:
            if (gate := workflow.gate) is None:
                yield Finding(
                    message = "The workflow ends on no gate job running `gha:brief`",
                    path    = workflow.path
                )
                continue

            if not gate.name:
                yield Finding(
                    message = f"The gate `{gate.id}` sets no name",
                    path    = workflow.path
                )
            elif gate.name != (usual := mode(other.name for other in gates)):
                yield Finding(
                    message = (
                        f"The gate `{gate.id}` is named `{gate.name}` "
                        f"where the other gates are named `{usual}`"
                    ),
                    path = workflow.path
                )

            if not gate.always:
                yield Finding(
                    message = f"The gate `{gate.id}` does not run under `always()`",
                    path    = workflow.path
                )

            for job in workflow.ungated:
                yield Finding(
                    message = f"The gate `{gate.id}` does not wait for `{job}`",
                    path    = workflow.path
                )


class InputCheck(Check):
    """
    Fails where a step passes a composite action an input its manifest does
    not declare, which GitHub only warns about before running the action on
    its defaults.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding for each input a step passes that the action it
        calls does not declare.
        """
        for path, step in self.checkout.steps:
            if action := self.checkout.action(step.uses):
                for name in sorted(step.inputs.keys() - set(action.inputs)):
                    yield Finding(
                        message = f"`{step.uses}` declares no input `{name}`",
                        path    = path
                    )


class KitCheck(Check):
    """
    Fails where the tool subsets the workflows install differ from the ones
    a step saving the tool cache installs, since each subset is a cache
    archive of its own.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding at each step installing a subset no step saves, and
        at each step saving a subset no other step installs.
        """
        provisions = self.checkout.provisions
        installed  = {step.tools for _, step in provisions if not step.saves}
        saved      = {step.tools for _, step in provisions if step.saves}

        for path, step in provisions:
            tools = " ".join(sorted(step.tools))

            if not step.saves and step.tools not in saved:
                yield Finding(
                    message = (
                        f"No step saves the tool cache for `{tools}`, "
                        "which this workflow installs"
                    ),
                    path = path
                )

            if step.saves and step.tools not in installed:
                yield Finding(
                    message = (
                        f"No other step installs `{tools}`, "
                        "whose tool cache this workflow saves"
                    ),
                    path = path
                )


class LabelCheck(Check):
    """
    Fails where the label registry, the release-notes categories, or an
    issue template departs from the rules the registry holds, meaning:

    - A file that fails its record, such as a row leaving out a field or
      carrying one the registry does not declare
    - Two labels sharing a name or a color, or two colors closer in OKLab
      than the 0.15 that keeps their pills apart in both of GitHub's themes
    - A label sitting in no category or in several, or a category naming a
      label the registry lacks
    - A template naming a label the registry lacks
    """

    def categories(self) -> Iterator[Finding]:
        """
        Yields a finding at `.github/release.yml` for each label sitting in
        no category or in several, and for each label a category names that
        the registry lacks.
        """
        changelog, labels = self.checkout.changelog, self.checkout.labels

        for name in labels.names:
            if name not in changelog.names:
                yield Finding(
                    message = f"`{name}` sits in no release-notes category",
                    path    = changelog.path
                )

        for name in unique_everseen(duplicates_everseen(changelog.names)):
            yield Finding(
                message = f"`{name}` sits in more than one release-notes category",
                path    = changelog.path
            )

        for name in unique_everseen(changelog.names):
            if name not in labels.names:
                yield Finding(
                    message = f"A category names `{name}`, which the registry lacks",
                    path    = changelog.path
                )

    def registry(self) -> Iterator[Finding]:
        """
        Yields a finding at `.github/labels.toml` for each name and each
        color two labels share, and for each pair of colors under 0.15 apart
        in OKLab, Björn Ottosson's perceptual color space.
        """
        floor, labels = 0.15, self.checkout.labels

        for field in ("name", "color"):
            for value in unique_everseen(
                duplicates_everseen(getattr(label, field) for label in labels.rows)
            ):
                yield Finding(
                    message = f"More than one label carries the {field} `{value}`",
                    path    = labels.path
                )

        for first, second in combinations(labels.rows, 2):
            if (distance := dist(first.lab, second.lab)) < floor:
                yield Finding(
                    message = (
                        f"`{first.name}` and `{second.name}` sit {distance:.3f} "
                        f"apart in OKLab, under the {floor} that keeps two pills apart"
                    ),
                    path = labels.path
                )

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding for each departure, or for each error a file raised
        where one fails its record.
        """
        try:
            self.checkout.changelog, self.checkout.labels, self.checkout.templates
        except ValidationError as error:
            yield from unread(error)
            return

        yield from self.registry()
        yield from self.categories()
        yield from self.templates()

    def templates(self) -> Iterator[Finding]:
        """
        Yields a finding at each issue template for each label it names that
        the registry lacks.
        """
        names = self.checkout.labels.names

        for template in self.checkout.templates:
            for name in template.labels:
                if name not in names:
                    yield Finding(
                        message =
                            f"The template names `{name}`, which the registry lacks",
                        path = template.path
                    )


class LicenseCheck(Check):
    """
    Fails where the license the license file declares or its copyright
    holders diverge from the manifest's `license` or `authors`.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding for the license and for the holders wherever either
        diverges.
        """
        file, pyproject = self.checkout.license, self.checkout.pyproject
        authors         = {author.name for author in pyproject.authors}

        if file.identifier != pyproject.license:
            yield Finding(
                message = (
                    f"The license file declares `{file.identifier}` "
                    f"while the manifest declares `{pyproject.license}`"
                ),
                path = file.path
            )

        if set(file.holders) != authors:
            yield Finding(
                message = (
                    f"The copyright names {', '.join(file.holders) or 'no holder'} "
                    f"while the manifest's authors are {', '.join(sorted(authors))}"
                ),
                path = file.path
            )


class NodeTypesCheck(Check):
    """
    Fails where the major of `@types/node` in `docs/package.json` differs
    from the major of the `node` `.mise/config.toml` pins, so the types the
    site checks against describe the runtime it builds on.
    """

    coupled: ClassVar[frozenset[str]] = frozenset({"@types/node", "node"})

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding where both are pinned and their majors differ.
        """
        site, node = self.checkout.site, self.checkout.mise.node
        types      = site.packages.get("@types/node")

        if types and node and types.split(".")[0] != node.split(".")[0]:
            yield Finding(
                message = (
                    f"`@types/node` is `{types}`, whose major differs from the "
                    f"`node` `{node}` `.mise/config.toml` pins"
                ),
                path = site.path
            )


class PinCheck(Check):
    """
    Fails where `pyproject.toml` or the crate's `Cargo.toml` restates a
    version `.mise/config.toml` pins and the two disagree, meaning the
    Python minor `requires-python` and `[tool.prose].target-version` name,
    the uv `required-version` holds every machine to, and the `wasm-bindgen`
    the crate requires, which its command line has to match exactly.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding for each restated pin that disagrees, at the file
        restating it.
        """
        crate, mise, pyproject = (
            self.checkout.crate, self.checkout.mise, self.checkout.pyproject
        )
        restated = {
            crate.path: {
                "`wasm-bindgen`": (crate.bindgen, mise.bindgen and f"={mise.bindgen}")
            },

            pyproject.path: {
                "`[tool.prose].target-version`" : (pyproject.target, mise.minor),
                "`[tool.uv].required-version`"  : (pyproject.uv, f"=={mise.uv}"),
                "`requires-python`"             : (pyproject.python, f">={mise.minor}")
            }
        }

        for path, pins in restated.items():
            for key, (found, pinned) in pins.items():
                if found != pinned:
                    yield Finding(
                        message = (
                            f"{key} is `{found}` "
                            f"where `.mise/config.toml` sets `{pinned}`"
                        ),
                        path = path
                    )


class RenderCheck(Check):
    """
    Fails where a file `scotch render docs` writes from a declaration
    in the repository has drifted from it, meaning a JSON file the site
    imports, the favicon or a lockup, a part of a page a declaration fills
    in, a figure a page sets inside a sentence, or the footnote definitions
    closing a Markdown file, leaving out the files written from the index,
    which a checkout holds no copy of.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding at each place a file has drifted, naming the task
        that rewrites it, and a finding naming the error at a page whose
        markers no longer enclose one region, which cites a key no entry of
        `docs/references.bib` holds, or which cites a source while the file
        holds a block bibtexparser could not read or an entry of another
        shape, none of which the task can rewrite.
        """
        root = self.checkout.root

        for output in self.checkout.outputs:
            try:
                problems = [
                    (line, f"{problem}, which `mise run docs:render` rewrites")
                    for line, problem in output.problems(root)
                ]
            except ValueError as error:
                problems = [(None, str(error))]

            for line, problem in problems:
                yield Finding(line=line, message=problem, path=root / output.path)


class RowCheck(Check):
    """
    Fails where a task a pull-request row runs is no dependency of
    `repo:ci`, or where `repo:ci` depends on a task no pull-request row
    runs, so `mise ci` and the rows run the same checks.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding at the workflow for each row task `repo:ci` leaves
        out, and at `repo:ci` for each dependency no row runs.
        """
        rows = {
            (workflow.path, task)
            for workflow in self.checkout.requested
            for job in workflow.rows
            for task in job.tasks
        }
        ci      = self.checkout.task("repo:ci")
        depends = set(ci.depends) if ci else set()

        for path, task in sorted(rows):
            if task not in depends:
                yield Finding(
                    message = (
                        f"The row running `{task}` "
                        "is no dependency of `repo:ci`"
                    ),
                    path = path
                )

        for task in sorted(depends - {task for _, task in rows}):
            yield Finding(
                message = (
                    f"`repo:ci` depends on `{task}`, "
                    "which no pull-request row runs"
                ),
                path = ci.file
            )


class RulesetCheck(Check):
    """
    Fails where a ruleset fails its record, two rulesets share the name
    `scotch apply rulesets` matches a live ruleset by, or a ruleset requires
    a check no pull-request workflow's gate reports.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding at each such ruleset, or for each error a ruleset
        raised where one fails its record.
        """
        try:
            rulesets = self.checkout.rulesets
        except ValidationError as error:
            yield from unread(error)
            return

        gates = {
            workflow.gate.name for workflow in self.checkout.requested if workflow.gate
        }
        named = list(duplicates_everseen(ruleset.name for ruleset in rulesets))

        for ruleset in rulesets:
            if ruleset.name in named:
                yield Finding(
                    message = f"Another ruleset carries the name `{ruleset.name}` too",
                    path    = ruleset.path
                )

            for context in ruleset.contexts:
                if context not in gates:
                    yield Finding(
                        message = (
                            f"The ruleset requires `{context}`, "
                            "which no pull-request workflow's gate reports"
                        ),
                        path = ruleset.path
                    )


class RunnerCheck(Check):
    """
    Fails where two jobs name different runner images.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding at each job whose image differs from the one most
        jobs name.
        """
        jobs = [
            (workflow.path, job)
            for workflow in self.checkout.workflows
            for job in workflow.jobs
        ]

        for path, job in jobs:
            if job.runner != (usual := mode(other.runner for _, other in jobs)):
                yield Finding(
                    message = (
                        f"`{job.id}` runs on `{job.runner}` "
                        f"where the other jobs run on `{usual}`"
                    ),
                    path = path
                )


class ScriptCheck(Check):
    """
    Fails where a task script's inline metadata declares a `requires-python`
    other than the manifest's, or pins a package to a version other than the
    one `uv.lock` resolves.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding for each such declaration.
        """
        python = self.checkout.pyproject.python

        for script in self.checkout.scripts:
            if script.python != python:
                yield Finding(
                    message = (
                        f"`requires-python` is `{script.python}` "
                        f"where the manifest declares `{python}`"
                    ),
                    path = script.path
                )

            for name, version in script.pins.items():
                if (locked := self.checkout.lock.version(name)) not in (None, version):
                    yield Finding(
                        message = (
                            f"`{name}` is pinned to `{version}` "
                            f"where `uv.lock` resolves `{locked}`"
                        ),
                        path = script.path
                    )


class SettingsCheck(Check):
    """
    Fails where `.github/settings.toml` carries a table or a key its record
    does not declare, leaves one out, or holds a value outside the set
    GitHub takes, so a misspelled setting fails before anything is sent.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding for each error the file raised.
        """
        try:
            self.checkout.settings
        except ValidationError as error:
            yield from unread(error)


class SitePinCheck(Check):
    """
    Fails on a package or an override in the site's `docs/package.json`, or
    a `wranglerVersion` a step passes, that is not one exact version.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding for each package, override, and `wranglerVersion`
        that is not one exact version.
        """
        site = self.checkout.site

        for name, version in site.loose:
            yield Finding(
                message = f"`{name}` is `{version}`, which is not one exact version",
                path    = site.path
            )

        for path, step in self.checkout.steps:
            if (version := step.wrangler) and not exact(version):
                yield Finding(
                    message = (
                        f"`wranglerVersion` is `{version}`, which is not one "
                        "exact version"
                    ),
                    path = path
                )


class SummaryCheck(Check):
    """
    Fails where a job other than a gate, or a step of a composite action,
    writes the workflow step summary, which the gate alone writes.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding at each such job and each such step.
        """
        for workflow in self.checkout.workflows:
            for job in workflow.rows:
                if any(self.checkout.summarizes(step) for step in job.instances):
                    yield Finding(
                        message = (
                            f"`{job.id}` writes the step summary, "
                            "which only the gate writes"
                        ),
                        path = workflow.path
                    )

        for action in self.checkout.actions:
            if any(self.checkout.summarizes(step) for step in action.steps):
                yield Finding(
                    message = "A step of the composite action writes the step summary",
                    path    = action.path
                )


class TaskCheck(Check):
    """
    Fails on each error `mise tasks validate` reports, and passes each
    warning on as a finding that fails nothing.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding at the task's file, or at `.mise/config.toml` for a
        task declared inline, for each problem mise reports.
        """
        for issue in self.checkout.validation.issues:
            task = self.checkout.task(issue.task)

            yield Finding(
                level   = issue.severity,
                message = f"`{issue.task}`: {issue.sentence}",
                path    = task.file if task and task.file else self.checkout.mise.path
            )


class VitestCheck(Check):
    """
    Fails where `@vitest/coverage-v8` in `docs/package.json` is pinned to
    a version other than `vitest`'s, since Vitest takes only the coverage
    provider of its own release.
    """

    coupled: ClassVar[frozenset[str]] = frozenset({"@vitest/coverage-v8", "vitest"})

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding where both are pinned to different versions.
        """
        site     = self.checkout.site
        provider = site.packages.get("@vitest/coverage-v8")
        runner   = site.packages.get("vitest")

        if provider and runner and provider != runner:
            yield Finding(
                message = (
                    f"`@vitest/coverage-v8` is `{provider}` "
                    f"where `vitest` is `{runner}`"
                ),
                path = site.path
            )


class WarmCheck(Check):
    """
    Fails where the `push` filter of a workflow saving the tool cache
    leaves out a file the cache key depends on, meaning the mise config
    and lockfile `jdx/mise-action` hashes, and the provisioning action's
    manifest and the workflow itself, which set the mise version and the
    tools the key carries.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding for each file the filter leaves out.
        """
        root   = self.checkout.root
        inputs = {
            *(action.path for action in self.checkout.actions if action.provisions),
            self.checkout.mise.lockfile,
            self.checkout.mise.path
        }

        for workflow in self.checkout.workflows:
            if workflow.saves:
                for path in workflow.unfiltered(inputs, root):
                    yield Finding(
                        message = (
                            f"The `push` filter leaves out `{path}`, "
                            "which the cache key depends on"
                        ),
                        path = workflow.path
                    )


class WrapperCheck(Check):
    """
    Fails on a wrapper under `.mise/bin` that is a symlink, which git checks
    out as a plain file holding the link's target wherever `core.symlinks`
    is off, or whose bytes differ from the first wrapper's.
    """

    def scan(self) -> Iterator[Finding]:
        """
        Yields a finding for each such wrapper.
        """
        wrappers = self.checkout.wrappers

        for wrapper in wrappers:
            if wrapper.is_symlink():
                yield Finding(
                    message = "The wrapper is a symlink rather than a copy",
                    path    = wrapper
                )
            elif wrapper.read_bytes() != wrappers[0].read_bytes():
                yield Finding(
                    message = f"The wrapper's bytes differ from `{wrappers[0].name}`'s",
                    path    = wrapper
                )


def unread(error: ValidationError) -> Iterator[Finding]:
    """
    Yields one finding for each error a record raised on reading its file,
    at the file the error's title names, each naming the field it sits in
    where it sits in one.
    """
    for detail in error.errors():
        location = ".".join(map(str, detail["loc"]))

        yield Finding(
            message = f"`{location}`: {detail['msg']}" if location else detail["msg"],
            path    = Path(error.title)
        )
