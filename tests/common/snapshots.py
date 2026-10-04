"""
Holds `PlainFile`, the snapshot extension the `--snapshot-default-extension`
option in `[tool.pytest]` names, so syrupy's own `snapshot` fixture writes
each snapshot as a plain text file.
"""

from syrupy.extensions.single_file import SingleFileSnapshotExtension, WriteMode


class PlainFile(SingleFileSnapshotExtension):
    """
    Writes each snapshot as a plain text file at
    `fixtures/<module>/<test>.txt` beside the tests that read it, the
    `fixtures` directory named by the `--snapshot-dirname` option in
    `[tool.pytest]`.
    """

    _write_mode    = WriteMode.TEXT
    file_extension = "txt"
