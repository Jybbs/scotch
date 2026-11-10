# Settings

Each `scotch` command reads the settings below from what `Settings` declares, so a change to a default goes in a `SCOTCH_` variable or under the `[tool.scotch]` table of the project's `pyproject.toml`.

<!-- settings -->
| **Variable** | **Key** | **Type** | **Default** | **Meaning** |
|---|---|---|---|---|
| `SCOTCH_DATA` | `data` | A path | `.cache/data` | The directory holding the store's data, with the fetched files under its `downloads` folder and the index under its `index` folder, read against the project's root where relative. |
| `SCOTCH_RETRIES` | `retries` | An integer from 0 | `5` | The number of times a request is sent again after it fails to connect, times out before the response's headers arrive, or meets a status naming a passing fault such as 503, the first at once and each later one after a wait doubling from 2 seconds up to 120. |
| `SCOTCH_TIMEOUT_S` | `timeout_s` | A number above 0 | `30` | The seconds a request waits to connect, and then for each read of the response, before it fails. |
<!-- /settings -->

## The Read Order

A command takes each setting from the first of these that names it:

<!-- order -->
1. A keyword argument passed to `Settings`
2. The `SCOTCH_` variable
3. The `[tool.scotch]` table of the project's `pyproject.toml`
4. The default the table above lists
<!-- /order -->

## The Root

<!-- origin -->
A relative path is read against the project's root, so the default `.cache/data` lands under the clone `mise run` builds from, wherever a command runs inside it.

`scotch.cli.settings.root` reads the directory the `scotch` distribution was installed from, which an installer records in the `direct_url.json` PEP 610 specifies, or the working directory where it recorded none.
<!-- /origin -->
