"""Runtime compatibility patches for DEO STUDIO CRM.

Hotfix for Django 5.1.x on Python 3.14+.

Django's ``BaseContext.__copy__`` used the idiom ``duplicate = copy(super())``
(see django/template/context.py). On Python 3.14+ ``super`` objects became
copyable, so that expression returned a bare ``super`` object instead of a
fresh context, and the next line ``duplicate.dicts = self.dicts[:]`` raised::

    AttributeError: 'super' object has no attribute 'dicts' and no __dict__
    for setting new attributes

This produces a 500 on virtually every Django admin (Jazzmin) page. Upstream
fixed it in Django 5.2 (ticket #35844); we replicate that exact fix here as a
monkeypatch so it applies on Django 5.1 — without upgrading dependencies, and
without breaking the Python 3.12 Docker production image (where the idiom was
never triggered in practice).

The patch only installs itself when (a) we run on Python >= 3.14 and (b) the
installed Django still contains the broken ``copy(super())`` idiom — so it is
a no-op on every environment that never hits the bug, and idempotent on every
re-import.
"""
import sys
from contextlib import suppress
from copy import copy


def _applies() -> bool:
    if sys.version_info < (3, 14):
        return False
    try:
        from django.template import context as context_module
    except Exception:
        return False
    try:
        source = str(context_module.BaseContext.__copy__.__code__.co_consts)
    except Exception:
        return False
    # Django 5.2+ replaced the copy(super()) idiom with BaseContext().
    return "BaseContext" not in source and "copy (super ()" in source.replace(" ", " ")


_patched = False


def apply() -> None:
    """Install the BaseContext.__copy__ fix, once, if applicable."""
    global _patched
    if _patched:
        return
    if not _applies():
        _patched = True
        return

    from django.template import context as context_module

    def _fixed_base_copy(self):
        duplicate = context_module.BaseContext()
        duplicate.__class__ = self.__class__
        duplicate.__dict__ = copy(self.__dict__)
        duplicate.dicts = self.dicts[:]
        return duplicate

    context_module.BaseContext.__copy__ = _fixed_base_copy

    # Context.__copy__ delegates via super().__copy__() and then copies
    # render_context; that now works with the fixed base. Same for
    # RequestContext. No further patching is needed.
    _patched = True
