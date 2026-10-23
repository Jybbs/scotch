"""
Holds `Pins` and its kinds, through which `scotch lift pins` lists every
pin lagging its newest release, each kind reading its pins out of a tree,
querying the tool that manages them for the newest release of each, and
yielding a `Lift` for each pin that lags it.
"""

from abc             import ABC, abstractmethod
from collections.abc import Collection, Iterable, Iterator
from json            import dumps, loads
from pathlib         import Path
from pydantic        import AwareDatetime, BaseModel, TypeAdapter
from re              import findall
from shutil          import copy2
from tempfile        import TemporaryDirectory

from scotch.pins.schemas import (
    Advisory,
    Bulletin,
    Edit,
    Exact,
    Lift,
    Listing,
    Outdated,
    Published,
    Spelling,
    UvAdvisory,
    release
)
from scotch.pins.trees   import Tree
from scotch.repo.schemas import Lock, minor, normalized, pinned


class Pins(BaseModel, ABC, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The pins of one kind, read out of one tree through the tool that manages
    them.
    """

    tree: Tree
    """
    The tree declaring the pins.
    """

    @abstractmethod
    def lifts(self) -> Iterator[Lift]:
        """
        Yields one lift for each pin of the kind lagging its newest release.
        """


class ActionPins(Pins):
    """
    The commit each workflow and each composite action pins an action
    to, lifted to the commit the tag of the latest release GitHub's REST
    endpoint reports for the action's repository names, read through `git
    ls-remote`.
    """

    def lifts(self) -> Iterator[Lift]:
        """
        Yields a lift for each file pinning an action to a commit other than
        the one its latest release's tag names, named for the tag naming the
        pinned commit where one does, and for the commit otherwise.
        """
        steps = [(path, step) for path, step in self.tree.checkout.steps if step.pin]

        for action in sorted({step.action for _, step in steps}):
            repository = "/".join(action.split("/")[:2])
            latest     = Published.model_validate_json(
                self.tree.read(
                    "gh",
                    "api",
                    f"repos/{repository}/releases/latest"
                ).stdout
            )
            tags   = self.tags(repository)
            newest = tags[latest.tag]

            for path, pin in sorted(
                {(path, step.pin) for path, step in steps if step.action == action}
            ):
                if pin != newest:
                    yield Lift(
                        current = max(
                            (tag for tag, commit in tags.items() if commit == pin),
                            default = pin,
                            key     = lambda tag: (len(release(tag)), tag)
                        ),
                        edits = (
                            Edit(
                                name     = action,
                                path     = self.tree.relative(path),
                                spelling = Spelling.REF,
                                version  = newest
                            ),
                        ),
                        name     = action,
                        newest   = latest.tag,
                        path     = self.tree.relative(path),
                        released = latest.published
                    )

    def tags(self, repository: str) -> dict[str, str]:
        """
        Maps each tag of the GitHub repository `repository` names to the
        commit it names, read through `git ls-remote`, which prints an
        annotated tag twice, once naming the tag object and once, behind
        `^{}`, naming the commit the tag object points at.
        """
        refs = dict(
            reversed(line.split("\t"))
            for line in self.tree.read(
                "git",
                "ls-remote",
                "--tags",
                f"https://github.com/{repository}"
            ).stdout.splitlines()
        )
        return {
            ref.removeprefix("refs/tags/"): refs.get(f"{ref}^{{}}", commit)
            for ref, commit in refs.items()
            if not ref.endswith("^{}")
        }


class BunPins(Pins):
    """
    Every npm package the repository pins, meaning each package and override
    of the site's `docs/package.json` and the Wrangler version a workflow
    passes its action, whose newest releases `bun outdated` and `bun info`
    report and whose cleared advisories `bun audit` reports.
    """

    @property
    def folder(self) -> Path:
        """
        Locates the site's folder, the one holding the manifest `bun` reads.
        """
        return self.tree.checkout.site.path.parent

    def audit(self, folder: Path) -> frozenset[Advisory]:
        """
        Runs `bun audit` over the site's lockfile in `folder`, which exits 1
        where it reports any advisory.

        Raises:
            subprocess.CalledProcessError: Where the audit exits with any
                                           other nonzero status.
        """
        return frozenset(
            bulletin.advisory(package)
            for package, bulletins in TypeAdapter(
                dict[str, tuple[Bulletin, ...]]
            ).validate_json(
                self.tree.audit("bun", "audit", f"--cwd={folder}", "--json")
            ).items()
            for bulletin in bulletins
        )

    def cleared(self, lifts: Collection[Lift]) -> frozenset[Advisory]:
        """
        Collects the advisories `bun audit` reports against the site's
        lockfile that it no longer reports once `lifts` are written into
        a copy of the site's manifest and that copy is relocked without
        installing.
        """
        if not lifts:
            return frozenset()

        with TemporaryDirectory(prefix="scotch-lift-") as scratch:
            copy = Path(scratch) / self.tree.relative(self.folder)
            copy.mkdir()

            for name in ("bun.lock", "bunfig.toml", "package.json"):
                copy2(self.folder / name, copy / name)

            for lift in lifts:
                lift.write(Path(scratch))

            self.tree.tool("bun", "install", f"--cwd={copy}", "--lockfile-only")

            return self.audit(self.folder) - self.audit(copy)

    def info(self, field: str, name: str) -> object:
        """
        Queries `bun info` for the field `field` names of the package `name`
        names, such as the `version` its `latest` tag names or the `time`
        each of its releases was published at.

        Returns:
            The field, read out of the JSON `bun info` prints.
        """
        return loads(
            self.tree.tool("bun", "info", f"--cwd={self.folder}", name, field, "--json")
                .stdout
        )

    def lift(
        self,
        *,
        current  : str,
        key      : str,
        name     : str,
        newest   : str,
        path     : Path,
        spelling : Spelling
    ) -> Lift:
        """
        Builds the lift of the package `name` from `current` to `newest` in
        the file at `path`, dated through `bun info`, whose rewrite finds
        the version beside `key` spelled the way `spelling` names.
        """
        times = TypeAdapter(dict[str, AwareDatetime]).validate_python(
            self.info("time", name)
        )
        return Lift(
            current = current,
            edits   = (
                Edit(
                    name     = key,
                    path     = path,
                    spelling = spelling,
                    version  = newest
                ),
            ),
            name     = name,
            newest   = newest,
            path     = path,
            released = times.get(newest)
        )

    def lifts(self) -> Iterator[Lift]:
        """
        Yields a lift for each package `bun outdated` reports, for each
        override whose package has a newer release, and for each Wrangler
        version a step passes, the site's lifts carrying the advisories the
        newest releases clear.
        """
        site  = self.tree.checkout.site
        found = dict(
            findall(
                r"(?m)^\| (\S+)(?: \(\w+\))? +\| \S+ +\| \S+ +\| (\S+) +\|$",
                self.tree.tool("bun", "outdated", f"--cwd={self.folder}").stdout
            )
        )
        path  = self.tree.relative(site.path)
        lifts = [
            self.lift(
                current  = current,
                key      = name,
                name     = name,
                newest   = newest,
                path     = path,
                spelling = Spelling.MEMBER
            )
            for name, current, newest in (
                *(
                    (name, current, found.get(name, current))
                    for name, current in {**site.dependencies, **site.packages}.items()
                ),
                *(
                    (name, current, self.info("version", name))
                    for name, current in site.overrides.items()
                )
            )
            if newest != current
        ]
        cleared = self.cleared(lifts)

        for lift in lifts:
            yield lift.clearing(cleared)

        for path, step in self.tree.checkout.steps:
            newest = step.wrangler and self.info("version", "wrangler")

            if newest != step.wrangler:
                yield self.lift(
                    current  = step.wrangler,
                    key      = "wranglerVersion",
                    name     = "wrangler",
                    newest   = newest,
                    path     = self.tree.relative(path),
                    spelling = Spelling.INPUT
                )


class MisePins(Pins):
    """
    The tools `.mise/config.toml` pins, whose newest releases `mise
    outdated` reports, `node` stopping inside the major of the newest
    `@types/node`, and the floor its `min_version` sets, whose newest
    release is the newest `mise ls-remote` lists for mise itself, each dated
    through `mise ls-remote`.
    """

    def lifts(self) -> Iterator[Lift]:
        """
        Yields a lift for each tool `mise outdated` reports against the
        config that has a release to move to, then one for the floor where
        mise has a newer release.
        """
        config = self.tree.checkout.mise
        path   = self.tree.relative(config.path)
        report = TypeAdapter(dict[str, Outdated]).validate_json(
            self.tree.mise("outdated", "--bump", "--json", "--local").stdout
        )

        for name, tool in sorted(report.items()):
            if tool.source.resolve() == config.path.resolve() and (
                (newest := self.newest(name, tool)).version != tool.requested
            ):
                yield Lift(
                    current = tool.requested,
                    edits   = (
                        Edit(
                            name     = name,
                            path     = path,
                            spelling = Spelling.ASSIGNMENT,
                            version  = newest.version
                        ),
                        *self.restatements(name, newest.version)
                    ),
                    name     = name,
                    newest   = newest.version,
                    path     = path,
                    released = newest.created
                )

        if config.floor:
            newest = max(
                (
                    listed
                    for listed in self.releases("github:jdx/mise")
                    if not listed.prerelease
                ),
                key = lambda listed: release(listed.version)
            )

            if release(newest.version) > release(config.floor):
                yield Lift(
                    current = config.floor,
                    edits   = (
                        Edit(
                            name     = "min_version",
                            path     = path,
                            spelling = Spelling.ASSIGNMENT,
                            version  = newest.version
                        ),
                    ),
                    name     = "mise",
                    newest   = newest.version,
                    path     = path,
                    released = newest.created
                )

    def newest(self, name: str, tool: Outdated) -> Listing:
        """
        Finds the release the tool `name` names lifts to, the `latest` `mise
        outdated` reports in `tool`, except that `node` passing the major
        of the newest `@types/node` stops at its newest release inside that
        major where the site pins `@types/node`, since `NodeTypesCheck` in
        `scotch.repo.checks` holds the two to one major.

        Returns:
            The release as `mise ls-remote` lists it, undated where mise
            lists it undated or not at all, or the pinned version where no
            release inside that major is newer.
        """
        listed  = self.releases(name)
        version = tool.latest
        current = release(tool.requested)
        typed   = "@types/node" in self.tree.checkout.site.packages

        if name == "node" and release(version)[:1] > current[:1] and typed:
            ceiling = release(BunPins(tree=self.tree).info("version", "@types/node"))
            version = max(
                (
                    entry.version
                    for entry in listed
                    if not entry.prerelease
                    and release(entry.version)[:1] <= ceiling[:1]
                ),
                default = tool.requested,
                key     = release
            )

        return next(
            (entry for entry in listed if entry.version == version),
            Listing(version=version)
        )

    def releases(self, tool: str) -> tuple[Listing, ...]:
        """
        Lists each release `mise ls-remote` reads for `tool`.
        """
        return TypeAdapter(tuple[Listing, ...]).validate_json(
            self.tree.mise("ls-remote", "--json", tool).stdout
        )

    def restatements(self, tool: str, version: str) -> tuple[Edit, ...]:
        """
        Lists the rewrites moving each restatement of the pin of `tool`
        that `PinCheck` and `ScriptCheck` in `scotch.repo.checks` hold
        to it, meaning the minor of `python` in `requires-python`,
        in each task script's own `requires-python`, and in
        `[tool.prose].target-version`, and the `uv` version in
        `[tool.uv].required-version`.
        """
        manifest = self.tree.relative(self.tree.checkout.pyproject.path)

        match tool:
            case "python":
                return (
                    Edit(
                        name     = "requires-python",
                        path     = manifest,
                        spelling = Spelling.ASSIGNMENT,
                        version  = minor(version)
                    ),
                    Edit(
                        name     = "target-version",
                        path     = manifest,
                        spelling = Spelling.ASSIGNMENT,
                        version  = minor(version)
                    ),
                    *(
                        Edit(
                            name     = "requires-python",
                            path     = self.tree.relative(script.path),
                            spelling = Spelling.ASSIGNMENT,
                            version  = minor(version)
                        )
                        for script in self.tree.checkout.scripts
                        if script.python
                    )
                )
            case "uv":
                return (
                    Edit(
                        name     = "required-version",
                        path     = manifest,
                        spelling = Spelling.ASSIGNMENT,
                        version  = version
                    ),
                )
            case _: return ()


class UvPins(Pins):
    """
    Every Python package the repository pins, meaning each package `uv.lock`
    resolves, each requirement a task script pins inline, and the build
    requirement and the build constraints of `pyproject.toml`, whose
    newest releases `uv lock --upgrade` over a copy of the manifest and its
    lockfile, and `uv lock` over a scratch project depending on each exact
    pin's package, resolve, and whose cleared advisories `uv audit` reports.
    """

    @property
    def exact(self) -> list[Exact]:
        """
        Lists each exact pin of the build requirement, the build
        constraints, and the task scripts, a task script's pin of a
        package `uv.lock` resolves following `uv.lock`, as `ScriptCheck` in
        `scotch.repo.checks` holds it to.
        """
        checkout = self.tree.checkout
        manifest = checkout.pyproject

        return [
            Exact(
                follows = path != manifest.path
                and checkout.lock.package(normalized(pin["name"])) is not None,
                path    = self.tree.relative(path),
                spelled = pin["name"],
                version = pin["version"]
            )
            for path, requirements in (
                (manifest.path, manifest.build_requirements),
                *((script.path, script.dependencies) for script in checkout.scripts)
            )
            for requirement in requirements
            if (pin := pinned(requirement))
        ]

    def audit(self, *targets: Path) -> frozenset[Advisory]:
        """
        Runs `uv audit` over the project at each of `targets` that is a
        directory and over the task script at each that is a file, which
        exits 1 where it reports any advisory.

        Raises:
            subprocess.CalledProcessError: Where an audit exits with any
                                           other nonzero status, such as the
                                           2 an unreachable advisory service
                                           exits with.
        """
        return frozenset(
            vulnerability.advisory
            for target in targets
            for vulnerability in TypeAdapter(tuple[UvAdvisory, ...]).validate_python(
                loads(
                    self.tree.audit(
                        "uv",
                        "audit",
                        "--frozen",
                        "--output-format",
                        "json",
                        "--preview-features",
                        "audit-command,json-output",
                        *(
                            ("--project", target)
                            if target.is_dir()
                            else ("--script", target)
                        )
                    )
                )["vulnerabilities"]
            )
        )

    def lifts(self) -> Iterator[Lift]:
        """
        Yields a lift for each package `uv lock --upgrade` moves, written
        by upgrading it, and for each exact pin lagging the release the
        upgraded `uv.lock` resolves for its package where the pin follows
        it, and the release a scratch project resolves otherwise, each lift
        carrying the advisories its newest release clears.
        """
        checkout = self.tree.checkout

        with TemporaryDirectory(prefix="scotch-lift-") as scratch:
            upgraded, required = Path(scratch) / "upgraded", Path(scratch) / "required"
            upgraded.mkdir()
            required.mkdir()

            for path in (checkout.pyproject.path, checkout.lock.path):
                copy2(path, upgraded / path.name)

            locked, newest = checkout.lock, self.lock(upgraded, "--upgrade")
            pins           = self.exact
            resolved       = self.resolve(
                {pin.name for pin in pins if not pin.follows},
                required
            )
            cleared = self.audit(
                self.tree.root,
                *(script.path for script in checkout.scripts)
            ) - self.audit(upgraded, required)

            for package in locked.packages:
                if (
                    (lifted := newest.package(package.name))
                    and lifted.version != package.version
                ):
                    yield Lift(
                        current  = package.version,
                        name     = package.name,
                        newest   = lifted.version,
                        path     = self.tree.relative(locked.path),
                        released = lifted.released,
                        upgraded = True
                    ).clearing(cleared)

            for pin in pins:
                lifted = (newest if pin.follows else resolved).package(pin.name)

                if lifted and lifted.version != pin.version:
                    yield pin.lift(lifted).clearing(cleared)

    def lock(self, project: Path, *flags: str) -> Lock:
        """
        Locks the scratch project at `project` through `uv lock`, passing
        `flags`, and downloading no interpreter where none on `PATH`
        satisfies its `requires-python`.

        Returns:
            The lockfile `uv lock` writes.
        """
        self.tree.tool(
            "uv",
            "lock",
            "--no-locked",
            "--no-python-downloads",
            "--project",
            project,
            *flags
        )
        return Lock.read(project / "uv.lock")

    def resolve(self, names: Iterable[str], project: Path) -> Lock:
        """
        Writes into `project` a scratch manifest depending on each package
        `names` names, unpinned, under the checkout's `requires-python`, and
        locks it.

        Returns:
            The lockfile resolving each package to its newest release.
        """
        (project / "pyproject.toml").write_text(
            "[project]\n"
            'name = "pins"\n'
            'version = "0"\n'
            f"requires-python = {dumps(self.tree.checkout.pyproject.python)}\n"
            f"dependencies = {dumps(sorted(names))}\n",
            encoding = "utf-8"
        )
        return self.lock(project)
