<!-- omit in toc -->
# Scotch
*Matching User Chess Games with GM Games to Learn Stronger Continuations*

<!-- omit in toc -->
## Table of Contents

- [Introduction](#introduction)
- [Data \& Parquet](#data--parquet)
- [Setup and Usage](#setup-and-usage)
- [Authors and Acknowledgements](#authors-and-acknowledgements)
- [License](#license)
- [References](#references)

## Introduction

*Scotch* is an innovative chess analytics tool designed to help users study and improve their chess gameplay by comparing their games to a database of Grandmaster-level games. The tool matches each game against the grandmaster games [PGN Mentor](https://www.pgnmentor.com/files.html) publishes for every player in its players section.

## Data & Parquet

The games come from the zip archives of Portable Game Notation (PGN) files that [PGN Mentor](https://www.pgnmentor.com/files.html) publishes in its players section, each declared once in `src/scotch/sources/sources.toml` beside its provider, the provider's home page, and the section listing it. `scotch fetch games` downloads them into `.cache/data/downloads` and records each file's address, size, SHA-256 digest, entity tag, and fetch date in the `manifest.json` beside them, so a later fetch downloads a file again only where the server reports it changed, the copy on disk no longer holds the bytes recorded, or the server sent the file with no entity tag. `scotch index games` reads every fetched archive in place into the index under `.cache/data/index`, indexing a game several files repeat under the first file declared, leaving out a game python-chess records an error for or whose `Variant` tag names a variant other than standard chess, with its file and its players named, and copying the manifest beside the index it built.

[Parquet](https://parquet.apache.org) is a columnar storage file format optimized for big data processing frameworks like Apache Spark, Apache Hive, and Apache Impala. It is designed to provide efficient data compression and encoding schemes, enabling fast querying of data stored in a columnar fashion. By using the Parquet format, the program can reduce storage space and improve query performance when working with the large dataset of chess positions.

## Setup and Usage

[mise](https://mise.jdx.dev) installs the Python interpreter and [uv](https://docs.astral.sh/uv/) at the versions `.mise/config.toml` pins, and uv builds the environment from `uv.lock`. After [installing mise](https://mise.jdx.dev/installing-mise.html), a fresh clone reaches a passing suite through the commands below:

```bash
git clone --filter=blob:none https://github.com/Jybbs/scotch.git
mise trust scotch
mise -C scotch install --locked
cd scotch
mise test
```

`--filter=blob:none` leaves every earlier layout of the game store the history keeps out of the clone, downloading a file only when a checkout needs it. `mise trust scotch` marks the clone's `.mise/config.toml` as a file mise may read, and `mise -C scotch install --locked` installs the tools it pins at the checksums `.mise/mise.lock` records. `mise test` runs the suite through `uv run --exact --locked`, which builds `.venv` from `uv.lock` on its first run and refuses a lockfile that lags `pyproject.toml`.

`mise tasks` lists every task, and the table below names the ones used most often.

| **Command** | **What It Does** |
|---|---|
| `mise test` | *Runs the test suite, passing any further arguments to pytest* |
| `mise coverage` | *Runs the suite under coverage, failing when the total falls below the `fail_under` threshold `pyproject.toml` sets* |
| `mise check` | *Reports every rewrite the formatter would make and every lint finding* |
| `mise format` | *Rewrites the Python source to the house style* |
| `mise relock` | *Re-resolves `uv.lock`, `.mise/mise.lock`, and the lockfile beside each task script against their manifests* |
| `mise audit` | *Reports where the repository's configuration disagrees with itself, such as a pin two files restate* |
| `mise ci` | *Runs every check a pull request runs, from the lockfiles and their advisories to the workflows' audit and the suite under coverage* |
| `mise run data:fetch` | *Downloads every file `sources.toml` declares into `.cache/data/downloads`, through `scotch fetch games`* |
| `mise run data:index` | *Builds the index under `.cache/data/index` from the fetched files, through `scotch index games`* |

`mise x -- uv run scotch --help` prints the help of the `scotch` command, and `mise x -- uv run scotch --version` prints the version it carries.

A fresh clone builds its store through two commands, `mise run data:fetch` and then `mise run data:index`, which run `scotch fetch games` and `scotch index games`. A fetch retries a request that fails to connect or meets a passing server fault up to the `retries` setting, five by default, and waits the `timeout_s` setting, 30 seconds by default, to connect and for each read, each moved through a `[tool.scotch]` key of the same name or a `SCOTCH_RETRIES` or `SCOTCH_TIMEOUT_S` variable.

`mise x -- uv run scotch match game <pgn>` matches the first game of a PGN file against the index of stored games under `.cache/data/index` and prints the stored game sharing the longest unbroken run of positions with it, beside the plies the two share and the move where they part. It warns where a fetch since the index was built recorded other bytes for the files than the ones the index was read from. Its `--json <file>` flag writes the match as the JSON the site's viewer reads, and the `data` key of a `[tool.scotch]` table in `pyproject.toml` or the `SCOTCH_DATA` variable moves the directory holding the index.

## Authors and Acknowledgements

This project was developed by [James Parkington](https://github.com/jparkington).

It was shaped under the supervision of [Professor Lindsay Jamieson](https://roux.northeastern.edu/people/lindsay-jamieson/) during class *5001 - Intensive Foundations of Computer Science* at the **Roux Institute of Northeastern University**.

I would like to express my gratitude to Professor Jamieson for her guidance and excellent feedback throughout this project, as well as my classmates for their valuable input and collaboration.

## License

*Scotch* is released under the MIT license, whose text `LICENSE.md` carries. The data provided, PGN Mentor, has its own terms of use, which can be found on their website.

## References

- [PGN Mentor](https://www.pgnmentor.com/)
- [Parquet File Format](https://parquet.apache.org/)
- [Chess Library for Python](https://python-chess.readthedocs.io/en/latest/)