# Develop

How does a contributor build, check, and document *Scotch* on a clone? Every check the repository runs is a mise task, so a contributor runs on a clone what CI runs on a push, and each page under `docs/` carries its tables, its figures, and the definitions of the sources it cites from the declarations `mise run docs:render` writes them from.

Each page of this section answers one question about working on the repository:

| **Page** | **Question It Answers** |
|---|---|
| [Tasks](tasks.md) | *Which tasks does the repository declare, and what does each one do?* |
| [Citing and Writing a Page](citing.md) | *How does a page cite a source, and how are its tables and figures written?* |

A task added under `.mise/tasks/` shows the loop every page follows. `mise tasks` lists it once the file is there, the next `mise run docs:render` writes it into the table on [Tasks](tasks.md), and `mise run repo:audit` fails on that table until the render has run, so the page and the declaration it is written from cannot drift apart. The drawing below is written the same way, from the example match `mise run docs:render` writes for the [Viewer](../viewer/index.md).
