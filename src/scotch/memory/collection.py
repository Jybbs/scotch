"""
Holds `freeze_at_exit`, which the `scotch.start` file the wheel carries
names as a startup entry point, so the collections every interpreter of the
project's environment runs while it shuts down examine none of the objects
it held at exit.
"""

from atexit import register
from gc     import freeze


def freeze_at_exit():
    """
    Registers `gc.freeze` to run at exit, which moves every object
    the garbage collector tracks into the permanent generation, so the
    collections Python still runs while the interpreter shuts down examine
    none of them.
    """
    register(freeze)
