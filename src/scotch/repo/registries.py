"""
Holds the records of the registries under `.github/` that declare what the
repository holds on GitHub, meaning the `Labels` registry, the `Changelog`
categories, each `Ruleset`, the `GithubSettings`, each issue `Template`,
and the checks table of `Contributing`, beside the `Request` each call to
GitHub's API sends. `scotch apply labels` and `scotch apply rulesets` send
them, and `scotch audit repo` holds them to one another.
"""

from collections.abc  import Iterable
from enum             import StrEnum, auto
from functools        import partial
from http             import HTTPMethod
from json             import loads
from markdown_it      import MarkdownIt
from markdown_it.tree import SyntaxTreeNode
from math             import cbrt, sumprod
from mdit_py_plugins.front_matter import front_matter_plugin
from pydantic import AliasPath, BaseModel, BeforeValidator, Field, JsonValue, TypeAdapter
from typing   import Annotated, ClassVar
from yaml     import CSafeLoader, load

from scotch.repo.schemas import ConfigFile, Pyproject


class Category(BaseModel, extra="ignore", frozen=True, use_attribute_docstrings=True):
    """
    One release-notes category `.github/release.yml` declares.
    """

    labels: tuple[str, ...]
    """
    The labels that file a pull request under the category, where `*` takes
    every pull request no earlier category took.
    """

    title: str
    """
    The heading the category's pull requests sit under in a release's notes.
    """


class Contributing(ConfigFile, extra="forbid"):
    """
    The checks table of `.github/CONTRIBUTING.md`, the table whose first
    header reads Check.
    """

    checks: dict[str, str]
    """
    The command the table gives for running each check locally, keyed by
    the check's name.
    """

    @staticmethod
    def parser(text: str) -> dict[str, object]:
        """
        Reads the first two cells of each body row of the checks table out
        of `text` as markdown-it parses a GitHub table, a cell holding one
        code span read as the span's text, and no row where the text holds
        no such table.
        """
        tree = SyntaxTreeNode(MarkdownIt("commonmark").enable("table").parse(text))

        for table in (node for node in tree.walk() if node.type == "table"):
            header, *body = (
                [spanned(cell.children[0]) for cell in row.children]
                for row in table.walk()
                if row.type == "tr"
            )

            if header[0] == "**Check**":
                return {"checks": {row[0]: row[1] for row in body}}

        return {"checks": {}}


class Enforcement(StrEnum):
    """
    Whether a ruleset is enforced, as its `enforcement` names it.
    """

    ACTIVE   = auto()
    DISABLED = auto()
    EVALUATE = auto()


class Label(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One label `.github/labels.toml` declares, as an issue or a pull request
    carries it.
    """

    color: Annotated[str, Field(pattern=r"^[0-9a-f]{6}$")]
    """
    The color of the label's pill, as six lowercase hex digits.
    """

    description: Annotated[str, Field(max_length=100)]
    """
    What the label covers, in one line of at most the 100 characters GitHub
    accepts.
    """

    name: Annotated[str, Field(pattern=r"^\S+ [a-z]+$")]
    """
    The label's glyph and its one lowercase word, a space between them.
    """

    @property
    def arguments(self) -> tuple[str, ...]:
        """
        Writes the arguments of the `gh label create --force` call that
        creates the label, or sets the color and the description of the live
        label already carrying its name.
        """
        return (
            "label", "create", "--color", self.color,
            "--description", self.description, "--force", self.name
        )

    @property
    def lab(self) -> tuple[float, float, float]:
        """
        Converts the color into its lightness and its two opponent axes in
        OKLab, decoding each sRGB channel per IEC 61966-2-1 and applying the
        two matrices Björn Ottosson published with the space.
        """
        red, green, blue = (
            value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4
            for value in (channel / 255 for channel in bytes.fromhex(self.color))
        )
        long, medium, short = (
            cbrt(sumprod(row, (red, green, blue)))
            for row in (
                (0.4122214708, 0.5363325363, 0.0514459929),
                (0.2119034982, 0.6806995451, 0.1073969566),
                (0.0883024619, 0.2817188376, 0.6299787005)
            )
        )

        return tuple(
            sumprod(row, (long, medium, short))
            for row in (
                (0.2104542553, 0.7936177850, -0.0040720468),
                (1.9779984951, -2.4285922050, 0.4505937099),
                (0.0259040371, 0.7827717662, -0.8086757660)
            )
        )


class Policy(StrEnum):
    """
    The actions a workflow may run, as `allowed_actions` names them.
    """

    ALL        = auto()
    LOCAL_ONLY = auto()
    SELECTED   = auto()


class Request(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One call `scotch apply rulesets` makes to GitHub's API through `gh api`,
    which fills in the `{owner}` and `{repo}` placeholders of its path from
    the repository the checkout's remote names.
    """

    method: HTTPMethod
    """
    The HTTP method the call takes.
    """

    path: str
    """
    The path of the call under GitHub's API, such as `graphql` or
    `repos/{owner}/{repo}/topics`.
    """

    body: JsonValue = None
    """
    The JSON body the call sends, or `None` where it sends none.
    """

    @property
    def arguments(self) -> tuple[str, ...]:
        """
        Writes the arguments of the `gh api` call, which reads the body from
        its standard input where the call sends one and prints no response.
        """
        return (
            "api",
            *(("--input", "-") if self.body is not None else ()),
            "--method", self.method, "--silent", self.path
        )

    @property
    def payload(self) -> str | None:
        """
        Encodes the body as the JSON `gh api` reads from its standard input,
        or `None` where the call sends no body.
        """
        return None if self.body is None else TypeAdapter(JsonValue).dump_json(
            self.body
        ).decode()


class Scope(StrEnum):
    """
    The scope of the token a workflow run receives where the workflow sets
    no `permissions`, as `default_workflow_permissions` names it.
    """

    READ  = auto()
    WRITE = auto()


class SquashMessage(StrEnum):
    """
    The message a squash merge's commit takes, as
    `squash_merge_commit_message` names it.
    """

    BLANK           = "BLANK"
    COMMIT_MESSAGES = "COMMIT_MESSAGES"
    PR_BODY         = "PR_BODY"


class SquashTitle(StrEnum):
    """
    The title a squash merge's commit takes, as `squash_merge_commit_title`
    names it.
    """

    COMMIT_OR_PR_TITLE = "COMMIT_OR_PR_TITLE"
    PR_TITLE           = "PR_TITLE"


class Status(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One check a `required_status_checks` rule requires to pass.
    """

    context: str
    """
    The name the check reports under, which for a GitHub Actions job is the
    job's `name`.
    """

    integration_id: int | None = None
    """
    The ID of the app the check has to come from, or `None` where any app
    may report it.
    """


class Target(StrEnum):
    """
    What a ruleset applies to, as its `target` names it.
    """

    BRANCH = auto()
    PUSH   = auto()
    TAG    = auto()


class Template(ConfigFile):
    """
    One Markdown issue template under `.github/ISSUE_TEMPLATE/`, read for
    the front matter GitHub fills a new issue from.
    """

    labels: Annotated[
        tuple[str, ...],
        BeforeValidator(
            lambda labels: [
                name for label in labels.split(",") if (name := label.strip())
            ] if isinstance(labels, str) else labels
        )
    ] = ()
    """
    The labels an issue opened from the template takes, written in the front
    matter as a list or as one string of names between commas.
    """

    @staticmethod
    def parser(text: str) -> dict[str, object]:
        """
        Reads the YAML front matter opening `text`, an empty mapping where
        it opens on none.
        """
        tokens = MarkdownIt("commonmark").use(front_matter_plugin).parse(text)

        return next(
            (
                load(token.content, Loader=CSafeLoader) or {}
                for token in tokens
                if token.type == "front_matter"
            ),
            {}
        )


class Toggle(StrEnum):
    """
    Whether a security feature runs, as its `status` names it.
    """

    DISABLED = auto()
    ENABLED  = auto()


class Actions(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The GitHub Actions permissions `[actions]` declares, by the fields the
    call setting a repository's Actions permissions takes.
    """

    allowed_actions: Policy
    """
    The actions a workflow may run, `all` letting it run any.
    """

    enabled: bool
    """
    Whether GitHub Actions runs on the repository.
    """

    sha_pinning_required: bool
    """
    Whether a workflow has to pin each action to a full commit SHA.
    """


class Changelog(ConfigFile):
    """
    The release-notes categories `.github/release.yml` declares, which
    GitHub's generated notes sort each merged pull request into.
    """

    parser = partial(load, Loader=CSafeLoader)

    categories: tuple[Category, ...] = Field(
        validation_alias = AliasPath("changelog", "categories")
    )
    """
    The categories, in the order GitHub tries them.
    """

    @property
    def names(self) -> list[str]:
        """
        Lists each label a category names, in the order the categories name
        them and once for each category naming it, leaving out the `*` that
        names no label.
        """
        return [
            name
            for category in self.categories
            for name in category.labels
            if name != "*"
        ]


class Labels(ConfigFile, extra="forbid"):
    """
    The labels `.github/labels.toml` declares, the one place a label is
    written down, holding nothing beside its rows.
    """

    rows: tuple[Label, ...] = Field(alias="labels")
    """
    The labels, in the order the registry lists them.
    """

    @property
    def names(self) -> tuple[str, ...]:
        """
        Lists the name of each label, in the order the registry lists them.
        """
        return tuple(label.name for label in self.rows)

    def omits(self, live: Iterable[str]) -> list[str]:
        """
        Keeps each of the `live` label names no label of the registry
        carries, in the order `live` gives them.
        """
        return [name for name in live if name not in self.names]


class Parameters(BaseModel, extra="allow", frozen=True, use_attribute_docstrings=True):
    """
    The parameters one rule of a ruleset takes, holding the checks a
    `required_status_checks` rule requires beside every other parameter as
    the file writes it.
    """

    required_status_checks: tuple[Status, ...] = ()
    """
    The checks the rule requires, none for a rule of another kind.
    """


class Rule(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One rule a ruleset holds its refs to, as the rulesets API takes it.
    """

    type: str
    """
    The kind of rule, such as `pull_request` or `deletion`.
    """

    parameters: Parameters = Field(default_factory=Parameters)
    """
    The parameters the rule takes, none for a rule taking none.
    """


class Dependabot(
    BaseModel,
    alias_generator          = lambda name: name.replace("_", "-"),
    extra                    = "forbid",
    frozen                   = True,
    use_attribute_docstrings = True
):
    """
    The Dependabot settings `[dependabot]` declares, each keyed by the
    endpoint that turns it on through `PUT` and off through `DELETE`.
    """

    automated_security_fixes: bool
    """
    Whether Dependabot opens a pull request moving a vulnerable dependency.
    """

    vulnerability_alerts: bool
    """
    Whether Dependabot raises an alert for a vulnerable dependency.
    """

    @property
    def requests(self) -> list[Request]:
        """
        Writes the call setting each feature, the alerts first, since
        Dependabot opens a security update only where its alerts are on.
        """
        return [
            Request(
                method = HTTPMethod.PUT if on else HTTPMethod.DELETE,
                path   = f"repos/{{owner}}/{{repo}}/{endpoint}"
            )
            for endpoint, on in (
                ("vulnerability-alerts", self.vulnerability_alerts),
                ("automated-security-fixes", self.automated_security_fixes)
            )
        ]


class Feature(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    One security feature `security_and_analysis` turns on or off.
    """

    status: Toggle
    """
    Whether the feature runs.
    """


class Ruleset(ConfigFile, extra="forbid"):
    """
    One ruleset under `.github/rulesets/`, holding the fields the rulesets
    API takes for creating or updating a ruleset.
    """

    parser = staticmethod(loads)

    bypass_actors: tuple[dict[str, JsonValue], ...]
    """
    The actors who may bypass the ruleset.
    """

    conditions: dict[str, JsonValue]
    """
    The refs the ruleset applies to, by the patterns they match.
    """

    enforcement: Enforcement
    """
    Whether the ruleset is enforced.
    """

    name: str
    """
    The name the ruleset carries on GitHub, by which `scotch apply rulesets`
    finds the live ruleset it updates.
    """

    rules: tuple[Rule, ...]
    """
    The rules the ruleset holds its refs to.
    """

    target: Target
    """
    What the ruleset applies to, meaning branches, tags, or every push.
    """

    @property
    def contexts(self) -> tuple[str, ...]:
        """
        Collects the context of each check the ruleset requires to pass.
        """
        return tuple(
            status.context
            for rule in self.rules
            for status in rule.parameters.required_status_checks
        )

    def request(self, live: int | None) -> Request:
        """
        Writes the call updating in place the live ruleset whose ID is
        `live`, or creating the ruleset where `live` is `None`, sending each
        field as the file declares it.
        """
        return Request(
            body   = self.model_dump(exclude={"path"}, exclude_unset=True, mode="json"),
            method = HTTPMethod.POST if live is None else HTTPMethod.PUT,
            path   = "repos/{owner}/{repo}/rulesets"
            + ("" if live is None else f"/{live}")
        )


class Token(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The defaults of the token each workflow run receives, which `[workflow]`
    declares by the fields the call setting a repository's default workflow
    permissions takes.
    """

    can_approve_pull_request_reviews: bool
    """
    Whether a workflow can approve a pull request through the token.
    """

    default_workflow_permissions: Scope
    """
    The scope the token takes where a workflow sets no `permissions`.
    """


class Analysis(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The security features `[repository.security_and_analysis]` declares.
    """

    secret_scanning: Feature
    """
    Whether GitHub scans the repository for a committed secret.
    """

    secret_scanning_push_protection: Feature
    """
    Whether GitHub refuses a push carrying a secret it recognizes.
    """


class Repository(BaseModel, extra="forbid", frozen=True, use_attribute_docstrings=True):
    """
    The repository's own settings `[repository]` declares, by the fields
    `PATCH /repos/{owner}/{repo}` takes, beside `has_discussions`, which
    that call leaves out and GraphQL's `updateRepository` sets.
    """

    allow_auto_merge: bool
    """
    Whether a pull request can be set to merge once its checks pass.
    """

    allow_merge_commit: bool
    """
    Whether a pull request can merge as a merge commit.
    """

    allow_rebase_merge: bool
    """
    Whether a pull request can merge by rebasing its commits.
    """

    allow_squash_merge: bool
    """
    Whether a pull request can merge as one squashed commit.
    """

    allow_update_branch: bool
    """
    Whether a pull request offers to take in its base branch once it falls
    behind.
    """

    delete_branch_on_merge: bool
    """
    Whether a pull request's head branch is deleted once it merges.
    """

    has_discussions: bool
    """
    Whether the repository shows the Discussions tab.
    """

    has_issues: bool
    """
    Whether the repository takes issues.
    """

    has_projects: bool
    """
    Whether the repository shows the Projects tab.
    """

    has_wiki: bool
    """
    Whether the repository shows the wiki.
    """

    security_and_analysis: Analysis
    """
    The security features the repository runs.
    """

    squash_merge_commit_message: SquashMessage
    """
    The message a squash merge's commit takes.
    """

    squash_merge_commit_title: SquashTitle
    """
    The title a squash merge's commit takes.
    """

    discussions: ClassVar[str] = (
        "mutation($id: ID!, $on: Boolean!) { updateRepository(input: "
        "{repositoryId: $id, hasDiscussionsEnabled: $on}) { clientMutationId } }"
    )

    def requests(self, node: str, pyproject: Pyproject) -> list[Request]:
        """
        Writes the `PATCH` sending the settings beside the description and
        the homepage `pyproject` declares, then the GraphQL mutation setting
        Discussions on the repository whose node ID is `node`.
        """
        return [
            Request(
                body = {
                    **self.model_dump(exclude={"has_discussions"}, mode="json"),
                    "description" : pyproject.description,
                    "homepage"    : pyproject.domain
                },
                method = HTTPMethod.PATCH,
                path   = "repos/{owner}/{repo}"
            ),
            Request(
                body = {
                    "query"     : self.discussions,
                    "variables" : {"id": node, "on": self.has_discussions}
                },
                method = HTTPMethod.POST,
                path   = "graphql"
            )
        ]


class GithubSettings(ConfigFile, extra="forbid"):
    """
    Every repository setting no ruleset carries, as `.github/settings.toml`
    declares it, holding nothing beside its tables.
    """

    actions: Actions
    """
    The GitHub Actions permissions.
    """

    dependabot: Dependabot
    """
    The Dependabot features.
    """

    repository: Repository
    """
    The repository's own settings.
    """

    workflow: Token
    """
    The defaults of the token each workflow run receives.
    """

    def requests(self, node: str, pyproject: Pyproject) -> list[Request]:
        """
        Writes every call sending the settings, in the order the repository
        takes them, meaning its own settings and Discussions on the
        repository whose node ID is `node`, the topics `pyproject` declares,
        Dependabot, the Actions permissions, and the token's defaults.
        """
        return [
            *self.repository.requests(node, pyproject),
            Request(
                body   = {"names": list(pyproject.keywords)},
                method = HTTPMethod.PUT,
                path   = "repos/{owner}/{repo}/topics"
            ),
            *self.dependabot.requests,
            Request(
                body   = self.actions.model_dump(mode="json"),
                method = HTTPMethod.PUT,
                path   = "repos/{owner}/{repo}/actions/permissions"
            ),
            Request(
                body   = self.workflow.model_dump(mode="json"),
                method = HTTPMethod.PUT,
                path   = "repos/{owner}/{repo}/actions/permissions/workflow"
            )
        ]


def spanned(inline: SyntaxTreeNode) -> str:
    """
    Reads the text of a table cell's inline node, as the code span's text
    where the cell holds one code span alone and as its Markdown source
    otherwise.
    """
    match inline.children:
        case [span] if span.type == "code_inline": return span.content
        case _: return inline.content
