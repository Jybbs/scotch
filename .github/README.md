<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../docs/assets/lockup-cashmere.svg">
  <img src="../docs/assets/lockup-walnut.svg" alt="scotch. Find the grandmaster game closest to yours." width="560">
</picture>

<!-- badges -->
[![Python](../docs/assets/badges/python.svg)![3.14+](https://img.shields.io/badge/3.14+-764017?style=for-the-badge)](https://www.python.org/)
[![Coverage](../docs/assets/badges/coverage.svg)![percent](https://img.shields.io/badge/dynamic/json?url=https://scotch.fyi/coverage.json&query=%24&suffix=%25&style=for-the-badge&label=&color=764017)](https://github.com/Jybbs/scotch/actions/workflows/deploy.yml?query=branch%3Amain)
[![Docs](../docs/assets/badges/docs.svg)![Docs](https://img.shields.io/badge/Docs-764017?style=for-the-badge)](https://scotch.fyi/)
<!-- /badges -->

</div>

---

## ♟️ About

***Scotch*** reads a chess game you played from a Portable Game Notation (PGN) file, finds the grandmaster game sharing the longest unbroken run of positions with it, and shows how that game continued from the last position the two share. A game reaching a stored position by another order of moves still meets it there, since each position is matched by its key rather than by the moves reaching it, as **[Methods](https://scotch.fyi/methods/)** sets out.

## 🪺 The Games

The store holds <!-- games -->435,321<!-- /games --> games read from the <!-- files -->250<!-- /files --> player archives [PGN Mentor](https://www.pgnmentor.com/files.html) publishes, each declared once in `src/scotch/sources/sources.toml`, which **[Data](https://scotch.fyi/data/)** lists file by file. A source joins the store as a row added there, then fetched and indexed again, as **[The Store](https://scotch.fyi/guide/store)** shows.

## 🗜️ Install

[mise](https://mise.jdx.dev) installs the tools the repository pins, Python and [uv](https://docs.astral.sh/uv/) among them, and the commands below clone it, print the help of the `scotch` command, and report anything the clone still needs, as the **[Guide](https://scotch.fyi/guide/)** explains.

<!-- install -->
```bash
git clone --filter=blob:none https://github.com/Jybbs/scotch.git
mise trust scotch
mise -C scotch install
cd scotch
scotch --help
mise doctor project
```
<!-- /install -->

## 🦉 An Example

After `mise run data:fetch` and `mise run data:index` build the store, the demo game matches <!-- demo-white -->Kasparov<!-- /demo-white --> and <!-- demo-black -->Sosonko<!-- /demo-black -->'s game from <!-- demo-event -->Tilburg<!-- /demo-event --> <!-- demo-year -->1981<!-- /demo-year -->, and **[The Longest Run](https://scotch.fyi/methods/runs)** steps through a match ply by ply.

<!-- example -->
```bash
scotch match game docs/public/games/demo.pgn
```

```text
Kasparov, Gary vs. Sosonko, Gennadi, Tilburg, 1981.??.??
Game 193 of https://www.pgnmentor.com/players/Kasparov.zip
Shares 43 positions, plies 0 to 42 of the submitted game and plies 0 to 42 of the stored game
Parts where the stored game played 22. Bc2
```
<!-- /example -->

## 📗 License

*Scotch* is released under the MIT license [`LICENSE.md`](../LICENSE.md) carries. The site's faces carry the [SIL Open Font License](https://openfontlicense.org), and the chess pieces python-chess draws, by Cburnett, carry the [3-clause BSD license](https://commons.wikimedia.org/wiki/File:Chess_klt45.svg) Wikimedia Commons lists.
