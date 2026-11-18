# Citing and Writing a Page

Two kinds of text on a page are never typed by hand, the definition of each source the page cites and each table or figure it carries from a declaration in the package, and `mise run docs:render` writes both. A change to a declaration, to `src/scotch/citations/references.bib`, or to the index reaches every page through the next run, and `mise run repo:audit` fails where a page has drifted from what the task would write.

## Citing a Source

A claim resting on published work carries a Markdown footnote marker naming its source's key, such as `[^zobrist1970]`, on the first claim in a passage resting on the source. Each source is declared once, as an entry of `src/scotch/citations/references.bib`, and `mise run docs:render` writes the definition of every source a tracked Markdown file cites beneath its text, failing on a marker no entry holds. GitHub renders the marker and its definition in a file view, an issue, and a pull request, and the site sets each marker as its source's number on a board square beside a Sources block closing the page. An issue or a pull request takes a source's definition from `scotch cite source`, set out below, which prints it from the same entry a page's definition is written from.

## Writing a Region

A table or a list a page carries from a declaration is written between a pair of HTML comments named for it, the closing one naming it after a slash as an HTML closing tag does, which neither GitHub's file view nor the site shows. A number a sentence carries from the index is a figure, written between a pair of markers inside the sentence. The task rewrites a region only where it finds one opening marker followed by one closing marker, and the sentence beside each region names what the region is written from.

<!-- command-cite-source -->
## `scotch cite source`

Prints the footnote definition citing each source named by its key in `src/scotch/citations/references.bib`, in the order given, each on one line with a blank line between two of them, ready to paste beneath the text of an issue or a pull request citing it, since a page takes its own from `scotch render docs`.

Exits nonzero without printing any definition, naming each key no entry in the file holds, or naming each block or entry that cannot be read where the file holds one.

```text
scotch cite source KEYS...
```

| **Parameter** | **Accepts** | **Default** | **Meaning** |
|---|---|---|---|
| `KEYS` | One or more words | Required | The key of each source, such as `zobrist1970`. |

It exits nonzero on each message below.

| **Message** | **When** | **Clears It** |
|---|---|---|
| `<key> names no entry in <file>` | No entry of `src/scotch/citations/references.bib` holds the key | Pass the key an entry's `@` line opens on, or add the entry |
| `Line <line> of <file> holds a block bibtexparser could not read: <reason>` | A block of `src/scotch/citations/references.bib` cannot be read | Correct the block the line opens |
<!-- /command-cite-source -->

<!-- run-cite-source -->
```bash
scotch cite source zobrist1970
```

```text
[^zobrist1970]: Zobrist, Albert L. 1970. "A New Hashing Method with Application for Game Playing," Technical Report 88, Computer Sciences Department, University of Wisconsin. <https://minds.wisc.edu/handle/1793/57624>
```
<!-- /run-cite-source -->
