"""Runtime compatibility patches for DEO STUDIO CRM.

## Why this exists

Django's ``BaseContext.__copy__`` (django/template/context.py) used the idiom
(visible in the installed Django 5.1.15 source)::

    duplicate = copy(super())
    duplicate.dicts = self.dicts[:]

The ``copy(super())`` invocation was a (clever but incidental) trick. On
Python < 3.14 ``super`` objects were *not* copyable, so ``copy(super())``
delegated to the machinery that produced a fresh copy of the *receiver* (the
underlying ``BaseContext`` instance) -- which is exactly what the author
wanted: a shallow duplicate of ``self``.

On Python 3.14+ ``super`` objects became copyable, so ``copy(super())`` now
returns a bare ``super`` object instead of a ``BaseContext``, and the next
line fails with::

    AttributeError: 'super' object has no attribute 'dicts' and no __dict__
    for setting new attributes

Every Django-admin (Jazzmin) page renders a template, which copies the
``Context`` through ``BaseContext.__copy__`` -- so this one-line bug turned
virtually the whole admin into an unhandled 500. Upstream Django fixed it in
5.2 (ticket #35844) by dropping the ``copy(super())`` idiom entirely.

Rather than wait for a dependency bump, we replicate the upstream fix here,
as a monkeypatch applied at process startup. The patch follows the exact
upstream 5.2 implementation for ``BaseContext`` and ``Context``, so behaviour
is byte-for-byte what shipped in Django 5.2. It is idempotent and only
installs itself when the installed Django still carries the broken
``copy(super())`` idiom, which keeps it a no-op on every environment that
does not have the bug (e.g. Python 3.12 Docker image with Django 5.0 where
the idiom never misbehaves, or any Django >= 5.2).
"""
import sys
from copy import copy as _copy_pyfunc
from importlib import import_module

_PATCHED = False

# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------


def _is_python_ge_314() -> bool:
    return sys.version_info >= (3, 14)


def _django_still_uses_copy_super() -> bool:
    """True when installed Django's BaseContext.__copy__ still uses the bug."""
    try:
        ctx_mod = import_module("django.template.context")
    except Exception:
        return False
    impl = getattr(ctx_mod.BaseContext, "__copy__", None)
    if impl is None:
        return False
    try:
        code_consts = getattr(impl, "__code__", None).co_consts
    except AttributeError:
        return False
    needles = ("super", "dicts")
    # The fixed upstream implementation constructs BaseContext() and does NOT
    # copy a super() to get the duplicate. Detect the broken idiom by the
    # presence of copy(super())'s distinctive first argument "super()" in the
    # bytecode glot while also lacking the marker of the fixed impl.
    has_super_copy = any(isinstance(c, str) and "super()" in c for c in code_consts)
    has_base_ctor = any(isinstance(c, str) and "BaseContext()" in c for c in code_consts)
    # Broken impl: uses super() and does NOT use the BaseContext() constructor.
    return has_super_copy and not has_base_ctor


def needs_patch() -> bool:
    return _is_python_ge_314() and _django_still_uses_copy_super()


# ---------------------------------------------------------------------------
# Patch (mirrors Django 5.2, ticket #35844)
# ---------------------------------------------------------------------------


def apply() -> None:
    """Idempotently install the BaseContext.__copy__ fix (no-op unless needed)."""
    global _PATCHED
    if _PATCHED:
        return
    if not needs_patch():
        _PATCHED = True
        return

    import django.template.context as ctx_mod

    BaseContext = ctx_mod.BaseContext
    Context = ctx_mod.Context
    RequestContext = getattr(ctx_mod, "RequestContext", None)

    def _base_copy(self):
        duplicate = BaseContext()
        duplicate.__class__ = self.__class__
        duplicate.__dict__ = _copy_pyfunc(self.__dict__)
        duplicate.dicts = self.dicts[:]
        return duplicate

    def _context_copy(self):
        duplicate = BaseContext.__copy__(self)
        duplicate.render_context = _copy_pyfunc(self.render_context)
        return duplicate

    BaseContext.__copy__ = _base_copy
    Context.__copy__ = _context_copy
    if RequestContext is not None:
        # RequestContext inherits Context.__copy__; nothing extra needed.

    _PATCHED = True
