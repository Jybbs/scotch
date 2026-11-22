# Contributing

## Checks

| **Check** | **Runs Locally** | **Fails When** |
|---|---|---|
| `CI / Lockfiles` | `mise lockfile` | A lockfile drifts |
| `CI / Coverage` | `mise run py:coverage` | A test fails |
| `Site / Links` | `mise run site:links` | A link leads nowhere |
| `Site / Press` | `mise run site:press` | A page fails to build |
