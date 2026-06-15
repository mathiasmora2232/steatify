"""LLM-backed insight generation (provider-agnostic).

Prefers OpenAI when ``OPENAI_API_KEY`` is set, falls back to Anthropic when
``ANTHROPIC_API_KEY`` is set, and returns ``None`` when neither is configured so
the caller uses the heuristic template. This keeps the stack running offline in
development and turns "intelligent" with a single env var.

Models are configurable: ``OPENAI_MODEL`` (default ``gpt-4o-mini``) and
``ANTHROPIC_MODEL`` (default ``claude-opus-4-8``).
"""
from __future__ import annotations

import os
from functools import lru_cache

from .schemas import WeeklyInsightRequest

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-8")

SYSTEM = (
    "Eres el narrador de un diario musical personal. Escribe en español, en segunda "
    "persona, con tono cálido y cercano. Convierte los datos en una HISTORIA, no en un "
    "reporte: NO menciones números crudos de valence/energía (tradúcelos a estados de "
    "ánimo). Si hay 'Eventos destacados' (regresos, récords, nuevas obsesiones, "
    "aniversarios), incorpóralos con emoción — son lo más interesante. Devuelve "
    "ÚNICAMENTE el párrafo final (2-4 frases), sin preámbulos, sin markdown ni comillas. "
    "Básate solo en los datos proporcionados; no inventes canciones ni cifras."
)


@lru_cache(maxsize=1)
def _provider() -> tuple[str | None, object | None]:
    """Return (name, client) for the first configured provider, or (None, None)."""
    if os.getenv("OPENAI_API_KEY"):
        try:
            from openai import OpenAI

            return ("openai", OpenAI())
        except ImportError:
            pass
    if os.getenv("ANTHROPIC_API_KEY"):
        try:
            import anthropic

            return ("anthropic", anthropic.Anthropic())
        except ImportError:
            pass
    return (None, None)


def is_enabled() -> bool:
    return _provider()[0] is not None


def active_model() -> str:
    name, _ = _provider()
    if name == "openai":
        return OPENAI_MODEL
    if name == "anthropic":
        return ANTHROPIC_MODEL
    return "heuristic-v0"


def provider_name() -> str:
    return _provider()[0] or "heuristic"


def _build_prompt(req: WeeklyInsightRequest) -> str:
    tracks = "\n".join(
        f"- «{t.title}» de {t.artist} ({t.plays} reproducciones)" for t in req.top_tracks[:5]
    ) or "- (sin canciones destacadas)"

    trend = ""
    if req.prev_total_minutes:
        delta = req.total_minutes - req.prev_total_minutes
        pct = round(100 * delta / req.prev_total_minutes) if req.prev_total_minutes else 0
        trend = f"Semana pasada: {req.prev_total_minutes} minutos ({pct:+d}% de cambio)."

    events = ""
    if getattr(req, "events", None):
        bullets = "\n".join(f"- {e}" for e in req.events[:6])
        events = f"\nEventos destacados de la semana:\n{bullets}\n"

    return (
        f"Datos de la semana ({req.period_start} a {req.period_end}):\n"
        f"- Minutos escuchados: {req.total_minutes}\n"
        f"- Valence medio (positividad 0-1): {req.avg_valence}\n"
        f"- Energía media (0-1): {req.avg_energy}\n"
        f"{trend}\n"
        f"Canciones más repetidas:\n{tracks}\n"
        f"{events}\n"
        "Escribe el resumen de la semana musical."
    )


def generate_text(prompt: str, system: str | None = None, max_tokens: int = 320) -> str | None:
    """Generic narrative generation for any surface (wrapped, gamer, eras…)."""
    name, client = _provider()
    if client is None:
        return None
    sys = system or SYSTEM
    try:
        if name == "openai":
            resp = client.chat.completions.create(  # type: ignore[attr-defined]
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": sys},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.8,
            )
            text = (resp.choices[0].message.content or "").strip()
        else:  # anthropic
            resp = client.messages.create(  # type: ignore[attr-defined]
                model=ANTHROPIC_MODEL,
                max_tokens=max_tokens + 100,
                system=sys,
                messages=[{"role": "user", "content": prompt}],
            )
            parts = [b.text for b in resp.content if getattr(b, "type", None) == "text"]
            text = " ".join(p.strip() for p in parts).strip()
    except Exception:
        return None
    return text or None


def generate_weekly_body(req: WeeklyInsightRequest) -> str | None:
    """Return an LLM-written recap, or None to signal the caller to fall back."""
    name, client = _provider()
    if client is None:
        return None

    prompt = _build_prompt(req)
    try:
        if name == "openai":
            resp = client.chat.completions.create(  # type: ignore[attr-defined]
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=300,
                temperature=0.7,
            )
            text = (resp.choices[0].message.content or "").strip()
        else:  # anthropic
            resp = client.messages.create(  # type: ignore[attr-defined]
                model=ANTHROPIC_MODEL,
                max_tokens=400,
                system=SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
            parts = [b.text for b in resp.content if getattr(b, "type", None) == "text"]
            text = " ".join(p.strip() for p in parts).strip()
    except Exception:  # network / auth / rate limit — fall back gracefully
        return None

    return text or None
