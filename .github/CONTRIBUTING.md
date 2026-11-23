# Contributing to *Scotch*

Every change to *Scotch* starts from an issue, lands on a branch named for that issue, and reaches `main` through a pull request that squash-merges into one commit. This guide follows that path from a fresh clone to a merged pull request, then sets out the form the Python takes and the checks every pull request runs.

## ♟️ Setting Up the Clone

1. Clone the repository and install its tools through the commands the **[Guide](https://scotch.fyi/guide/)** gives, which install every tool `.mise/config.toml` pins at the checksum `.mise/mise.lock` records
2. Run `mise doctor project`, which names each condition the clone still lacks beside the command that supplies it

## 🧵 Making a Change

1. Open an issue through the [spec or bug template](https://github.com/Jybbs/scotch/issues/new/choose), naming what is wrong and what has to change. Anyone holding [triage access](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels) labels it with each domain its work touches from `.github/labels.toml`, beside the `🐞 bug` the bug template applies on its own
2. Branch from `main` as `<issue>/<slug>`, the issue's number followed by at most three words from its title (*`7/registries`*)
3. Write the change beside the tests that pin it, rerunning the tests it reaches through `mise affected` for the package and `mise run site:affected` for the site, whereas `mise test` and `mise run site:test` run every test. Then run `mise format` and `mise ci` until it passes, since every row of `♟️ CI` and `♟️ Site` runs the full suite. After editing `pyproject.toml`, `rust/Cargo.toml`, `.mise/config.toml`, or `docs/package.json`, run `mise relock`, so the lockfile it rewrites lands in the same commit
4. Commit in the form `type(scope): description`, its type one of `feat`, `fix`, `refactor`, `chore`, `docs`, or `test` and its scope one of `parser`, `position`, `matcher`, `index`, `storage`, `viewer`, `cli`, `docs`, `build`, or `ci`, left out where the change spans several, with a body of hyphenated bullets each opening on a verb
5. Open a pull request titled `[<issue>] <the issue's title>`, filling in the sections its template carries, whose Related Issues line closes the issue once the pull request merges

A pull request squash-merges into one commit on `main` that takes the pull request's title and body, which is why the title rather than any commit on the branch carries the issue's number.

A change to `.github/labels.toml`, a ruleset under `.github/rulesets/`, or `.github/settings.toml` reaches GitHub once it merges and `mise labels` or `mise rulesets` sends it, each a task run by hand that prompts for confirmation before it writes.

## 🪻 Code Style

[*Prose*](https://pypi.org/project/prose-formatter/) settles the form of the Python under `.mise/tasks`, `src`, and `tests` from the `[tool.prose]` table in `pyproject.toml`. `mise format` rewrites the source to that form, and `mise check` reports every rewrite the formatter would make beside every lint finding. A lint finding is fixed in the source, or set aside for the whole repository where its rule does not fit the codebase, through a `[tool.prose.rules.<rule>]` table that turns the rule off or narrows what it reports. No comment in a tracked Python file carries a marker silencing *Prose*, and `mise audit` fails at the file and line of each comment that does. A *Prose* directive passes only where its comment, or the comment on the line above it, carries the URL of the issue filed on *Prose* for a case no shape of the code clears.

[rustfmt](https://rust-lang.github.io/rustfmt/) settles the form of the crate under `rust/` from its defaults. `mise run rs:format` rewrites the crate to that form, and `mise run rs:check` reports every rewrite rustfmt would make beside every lint [Clippy](https://doc.rust-lang.org/clippy/) reports under each of the crate's features, its pedantic group included. A lint is turned off in the `[lints]` table of `rust/Cargo.toml`, never by an `allow` or `expect` attribute in the source, and `mise audit` fails at the line of each such attribute.

No TypeScript or Vue file under `docs/.vitepress/` carries an `eslint-disable` or `oxlint-disable` comment or a `@ts-ignore`, `@ts-expect-error`, or `@ts-nocheck` directive, and `mise audit` fails at the line of each one, whereas a lint rule is set aside for the whole site in `docs/.vitepress/config/.oxlintrc.json` and a compiler check in `docs/.vitepress/tsconfig.json`.

## ⏱️ Checks

A pull request runs `♟️ CI` wherever it changes a file outside the site's pages, its public files, and `docs/.vitepress/`, and runs `♟️ Site` wherever it changes a file the site is built or checked from, so a change to the crate, the composite action, or the toolchain's pins runs both. A draft pull request runs neither workflow until it is marked ready for review, and marking it ready runs each workflow its changed files trigger, on the head the branch holds at that moment. Each row runs one task, so the command beside each check below runs the same task on a laptop:

| **Check** | **Runs Locally** | **Fails When** |
|---|---|---|
| `♟️ CI / 🩺 Advisories` | `mise run lock:audit` | A package `uv.lock`, a task script's lockfile, `rust/Cargo.lock`, or `docs/bun.lock` resolves carries a published advisory other than one `AUDIT_IGNORE` lists while no release fixes it, `mise audit` reports an advisory for a tool `.mise/config.toml` pins other than one `AUDIT_IGNORE` lists and a contributor checks by hand while `mise audit` names no fixed release, a crate breaks a rule of `rust/.cargo/deny.toml` on its license, its version, or its source, or an advisory database cannot be reached |
| `♟️ CI / 🔐 Lockfiles` | `mise lockfile` | `uv.lock`, `.mise/mise.lock`, `rust/Cargo.lock`, `docs/bun.lock`, or the lockfile beside a task script drifts from its manifest |
| `♟️ CI / 🪻 Prose` | `mise check` | *Prose* reports a rewrite or a lint finding, each shown as an annotation on the line it concerns |
| `♟️ CI / ☂️ Coverage` | `mise coverage` | A test fails under coverage, or the suite covers less than 95% of the package |
| `♟️ CI / 📋 Audit` | `mise audit` | A check under `src/scotch/repo/` finds an inline suppression in a tracked file, such as a comment in the Python silencing *Prose* or an `allow` attribute in the crate, or a file stating a fact otherwise than its source does, such as a pin, a label, a ruleset's required check, or a row of this table |
| `♟️ CI / 🔦 Workflows` | `mise run repo:lint` | [zizmor](https://docs.zizmor.sh/) reports a finding in a workflow or in the composite action |
| `♟️ CI / 📎 Clippy` | `mise run rs:check` | rustfmt reports a rewrite in the crate under `rust/`, or [Clippy](https://doc.rust-lang.org/clippy/) reports a lint under any of its features |
| `♟️ CI / 🦀 Crate` | `mise run rs:test` | A test of the crate under `rust/` fails |
| `♟️ Site / 📰 Press` | `mise press` | VitePress fails to build a page, or a link between pages leads nowhere |
| `♟️ Site / 🔗 Links` | `mise links` | A link, an asset, or a heading fragment in the site the `📰 Press` row built, the README, or this guide names nothing the build wrote |
| `♟️ Site / ☂️ Coverage` | `mise run site:coverage` | A site test fails under coverage, or the site's coverage falls below 95% on statements, branches, functions, or lines |
| `♟️ Site / 📋 Audit` | `mise audit` | The same checks the `♟️ CI` row runs, among them the regions and footnotes of each page under `docs/pages/` |
| `♟️ Site / ✂️ Knip` | `mise cruft` | knip reports an unused file, export, or dependency in the site, or an import cycle |
| `♟️ Site / ⚓ Oxlint` | `mise lint` | Oxlint reports a finding in the site's TypeScript |
| `♟️ Site / 🧷 Types` | `mise typecheck` | `tsc` reports a type error in the site's TypeScript, or a single-file component appears that `tsc` cannot read |

Each workflow ends on a `🖋️ Scoresheet` gate that waits on every row and fails where any of them fails, and the ruleset on `main` requires that one check, on a branch up to date with `main`, so a pull request merges once every workflow it ran has passed. On a laptop, `mise ci` runs every row's task of both workflows in one go.
