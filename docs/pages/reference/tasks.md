# Tasks

Every task the repository declares sits below under its group, beside its alias and its description, written from what `mise tasks` reports, so a task added under `.mise/tasks/` reaches this page through the next `mise run docs:render`.

<!-- tasks -->
## `data`

| **Task** | **Alias** | **Description** |
|---|---|---|
| `data:fetch` |  | Download each file sources.toml declares into its provider's folder under .cache/data/downloads |
| `data:index` |  | Build the index under .cache/data/index from the files data:fetch downloaded |
| `data:publish` |  | Write the store the site matches against under .cache/data/store from the index data:index built |

## `docs`

| **Task** | **Alias** | **Description** |
|---|---|---|
| `docs:render` |  | Write each file a declaration in the repository renders into, and each one the index renders into where one has been built |

## `gha`

| **Task** | **Alias** | **Description** |
|---|---|---|
| `gha:cut` |  | Cut the draft release a version bump on `main` calls for |
| `gha:order` |  | Decide which commit a `♟️ Deploy` run builds, if any |
| `gha:prune` |  | Delete each tool cache and Cargo cache a newer one replaced |
| `gha:retire` |  | Delete each store file R2 holds past the newest earlier ones |
| `gha:reuse` |  | Copy the coverage total `♟️ CI` attached for the tree on `main` |
| `gha:scoresheet` |  | Write the workflow run's summary and exit with its verdict |
| `gha:total` |  | Write the total the package's suite covered as a whole number into `coverage.json` in the folder given, creating the folder where missing, which the published site serves |

## `lock`

| **Task** | **Alias** | **Description** |
|---|---|---|
| `lock:audit` |  | Fail on any advisory published for a package `uv.lock`, a task script's lockfile, `rust/Cargo.lock`, or `docs/bun.lock` resolves, or where an advisory database cannot be reached |
| `lock:check` | `lockfile` | Verify every lockfile is in sync with its manifest |
| `lock:lift` | `lift` | List every pin lagging its newest release, try the lift in a scratch clone under `--try`, and write it as one diff under `--write` |
| `lock:sync` | `relock` | Re-resolve every lockfile against its manifest |

## `py`

| **Task** | **Alias** | **Description** |
|---|---|---|
| `py:affected` | `affected` | Run the tests a change reaches under pytest-testmon, beside each test that failed on its last run, rerunning the whole suite where a file testmon cannot trace, or a file under `src/scotch/cli/` whose docstrings the help snapshots read, changed since the last full run, and passing any further arguments to pytest |
| `py:check` | `check` | Report every formatting rewrite and lint finding, as annotations under GitHub Actions, passing any further arguments to the formatter |
| `py:coverage` | `coverage` | Run the test suite under coverage, failing below `fail_under`, writing the HTML report, and passing any further arguments to pytest |
| `py:format` | `format` | Rewrite the Python source to the house style, passing any further arguments to the formatter |
| `py:test` | `test` | Run the test suite, passing any further arguments to pytest |

## `repo`

| **Task** | **Alias** | **Description** |
|---|---|---|
| `repo:audit` | `audit` | Report every place the repository's configuration drifts from itself, as annotations under GitHub Actions |
| `repo:ci` | `ci` | Run every check a pull request runs, from the lockfiles to the site's links |
| `repo:labels` | `labels` | Create or update every label `.github/labels.toml` declares on GitHub, listing each live label it omits |
| `repo:lint` |  | Audit every workflow and action manifest through zizmor, online wherever a GitHub token is set, as annotations under GitHub Actions |
| `repo:rulesets` | `rulesets` | Apply the rulesets under `.github/rulesets/` and send every setting `.github/settings.toml` declares, listing each live ruleset no file names |

## `rs`

| **Task** | **Alias** | **Description** |
|---|---|---|
| `rs:check` |  | Report every rewrite rustfmt would make to the crate and every lint Clippy finds in it under each feature, passing any further arguments to Clippy |
| `rs:format` |  | Rewrite the crate in the form rustfmt sets, passing any further arguments to `cargo fmt` |
| `rs:test` |  | Run the crate's tests, passing any further arguments to `cargo test` |
| `rs:wasm` |  | Build the crate to WebAssembly and write its wasm-bindgen module into `docs/.vitepress/lib/games/crate` for the site |

## `site`

| **Task** | **Alias** | **Description** |
|---|---|---|
| `site:affected` |  | Run the site's tests a change since the branch left `origin/main` reaches, or the whole suite where the Vitest config or `package.json` changed, passing any further arguments to Vitest |
| `site:coverage` |  | Run the site's suite under coverage, failing where statements, branches, functions, or lines fall below the `fail_under` that `pyproject.toml` sets, writing the HTML report, and passing any further arguments to Vitest |
| `site:cruft` | `cruft` | Report an unused file, export, or dependency in the site, and an import cycle, passing any further arguments to knip |
| `site:install` |  | Install the site's packages from `docs/bun.lock`, pruning any it no longer names |
| `site:links` | `links` | Check every link, asset, and heading fragment in the site `site:press` built, the README, and the contributor guide with no network, passing any further arguments to lychee |
| `site:lint` | `lint` | Lint the site's TypeScript with Oxlint, as annotations under GitHub Actions, passing any further arguments to Oxlint |
| `site:press` | `press` | Build the site and a card per page into `docs/.vitepress/dist`, failing on a link between pages that leads nowhere, and passing any further arguments to VitePress |
| `site:serve` | `serve` | Serve the site locally, reloading a page as it is edited, and passing any further arguments to VitePress |
| `site:test` |  | Run the site's suite, passing any further arguments to Vitest |
| `site:typecheck` | `typecheck` | Type-check the site's TypeScript, failing on a single-file component `tsc` cannot read, and passing any further arguments to `tsc` |
<!-- /tasks -->
