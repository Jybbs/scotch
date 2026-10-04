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

*Scotch* is an innovative chess analytics tool designed to help users study and improve their chess gameplay by comparing their games to a database of Grandmaster-level games. The tool processes a large dataset of over 7 million chess positions from professional tournament games, sourced from [PGN Mentor](https://www.pgnmentor.com).

## Data & Parquet

The program processes a large dataset containing over 7 million chess positions from professional tournament games as of May 2023. The source material for this dataset comes from [PGN Mentor](https://www.pgnmentor.com), a popular resource for chess games in the PGN (Portable Game Notation) format.

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
| `mise relock` | *Re-resolves `uv.lock` and `.mise/mise.lock` against their manifests* |
| `mise ci` | *Runs the lockfile check, the formatter's check, and the suite under coverage* |

`mise x -- uv run scotch --help` prints the help of the `scotch` command, and `mise x -- uv run scotch --version` prints the version it carries.

`mise x -- uv run scotch match game <pgn>` matches the first game of a PGN file against the index of stored games under `.cache/data/index` and prints the stored game sharing the longest unbroken run of positions with it, beside the plies the two share and the move where they part. Its `--json <file>` flag writes the match as the JSON the site's viewer reads, and the `data` key of a `[tool.scotch]` table in `pyproject.toml` or the `SCOTCH_DATA` variable moves the directory holding the index.

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