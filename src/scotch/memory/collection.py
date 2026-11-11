"""
Holds `freeze_at_exit`, which the `scotch.start` file the wheel carries
names as a startup entry point, so every interpreter the project's
environment starts skips the collections Python runs while it shuts down.
"""

from atexit import register
from gc     import freeze


def freeze_at_exit():
    """
    Registers `gc.freeze` to run at exit, which moves every object the
    process holds into the permanent generation, so the collections during
    interpreter shutdown examine none of them.
    """
    register(freeze)
