"""Sonora ML service (FastAPI).

Phase 1: skeleton with health + heuristic placeholders so the backend can wire
the HTTP contract today. Phase 4 swaps the heuristics for real models/LLMs
behind the SAME endpoints — no backend changes required.
"""
from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import FastAPI

# Load env from the ml-service dir and the monorepo root so a single
# OPENAI_API_KEY in the project's .env powers the LLM here too.
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from . import llm  # noqa: E402  (import after env is loaded)
from pydantic import BaseModel, Field  # noqa: E402

from .schemas import (  # noqa: E402
    WeeklyInsightRequest,
    WeeklyInsightResponse,
    ObsessionRequest,
    ObsessionResponse,
    ObsessionScore,
)

app = FastAPI(title="Sonora ML", version="0.1.0")


class NarrateRequest(BaseModel):
    prompt: str
    system: str | None = None
    max_tokens: int = Field(default=320, ge=64, le=800)


class NarrateResponse(BaseModel):
    text: str | None
    model: str


@app.post("/narrate", response_model=NarrateResponse)
def narrate(req: NarrateRequest) -> NarrateResponse:
    """Generic narrative generation (wrapped, gamer insight, etc.)."""
    text = llm.generate_text(req.prompt, system=req.system, max_tokens=req.max_tokens)
    return NarrateResponse(text=text, model=llm.active_model() if text else "heuristic-v0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "llm": llm.provider_name()}


@app.post("/insights/weekly", response_model=WeeklyInsightResponse)
def weekly_insight(req: WeeklyInsightRequest) -> WeeklyInsightResponse:
    """Narrative recap of the week.

    Placeholder: template-based text from the aggregates the backend sends.
    Phase 4 replaces the body with an LLM call grounded in `req` as evidence.
    """
    # Prefer the LLM when configured; fall back to the template otherwise.
    llm_body = llm.generate_weekly_body(req)
    if llm_body:
        return WeeklyInsightResponse(title="Tu semana musical", body=llm_body, model=llm.active_model())

    top = req.top_tracks[0].title if req.top_tracks else "tu música"
    mood = _describe_mood(req.avg_valence, req.avg_energy)

    trend = ""
    if req.prev_total_minutes:
        delta = req.total_minutes - req.prev_total_minutes
        pct = round(100 * delta / req.prev_total_minutes) if req.prev_total_minutes else 0
        if pct > 10:
            trend = f" Escuchaste {pct}% más que la semana pasada."
        elif pct < -10:
            trend = f" Bajaste el ritmo un {abs(pct)}% respecto a la semana pasada."

    body = (
        f"Esta semana sumaste {req.total_minutes} minutos. "
        f"Tu canción más repetida fue «{top}» y predominó un mood {mood}.{trend}"
    )
    return WeeklyInsightResponse(title="Tu semana musical", body=body, model="heuristic-v0")


@app.post("/predict/obsessions", response_model=ObsessionResponse)
def predict_obsessions(req: ObsessionRequest) -> ObsessionResponse:
    """Score tracks likely to enter the user's top.

    Placeholder: normalized recent-play count. Phase 4 replaces with a model
    over momentum/skips/recency/artist-affinity features.
    """
    max_plays = max((c.plays for c in req.candidates), default=1) or 1
    scores = [
        ObsessionScore(track_id=c.track_id, score=round(c.plays / max_plays, 3))
        for c in sorted(req.candidates, key=lambda c: c.plays, reverse=True)
    ]
    return ObsessionResponse(scores=scores, model="heuristic-v0")


def _describe_mood(valence: float | None, energy: float | None) -> str:
    if valence is None or energy is None:
        return "variado"
    if valence >= 0.6 and energy >= 0.6:
        return "eufórico"
    if valence >= 0.6 and energy < 0.6:
        return "relajado y positivo"
    if valence < 0.4 and energy >= 0.6:
        return "intenso"
    if valence < 0.4 and energy < 0.4:
        return "melancólico"
    return "equilibrado"
