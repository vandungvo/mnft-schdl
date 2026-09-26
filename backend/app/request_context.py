from __future__ import annotations

from contextvars import ContextVar

current_actor: ContextVar[str] = ContextVar("current_actor", default="local-operator")
