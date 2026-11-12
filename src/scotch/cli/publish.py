"""
Holds `store`, the `scotch publish store` command, which writes the index
as the file the site matches a game against, run by the `data:publish` task.
`publish_group` registers it as the group the app imports by its path.
"""

from cyclopts import App

from scotch.cli.settings import Settings


def store():
    """
    Writes the index under the data directory as the one file the site reads
    a piece at a time, into its `store` folder under a name hashed from the
    file's bytes, beside a `manifest.json` naming it, replacing what that
    folder holds, and prints the file's path.

    Exits nonzero naming the folder where no index has been built or the one
    built holds another layout.
    """
    settings = Settings()
    print(f"Published {settings.opened().publish(settings.store)}")


publish_group = App(name="publish")
publish_group.command(store)
