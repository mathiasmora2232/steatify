"""Request/response contracts shared with the NestJS backend.

The backend owns the database; it sends already-aggregated features to this
service, which returns text/scores. This keeps the ML service stateless and
horizontally scalable, and avoids two services writing the same tables.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class TrackPlay(BaseModel):
    track_id: str
    title: str
    artist: str
    plays: int
    valence: float | None = None
    energy: float | None = None


class WeeklyInsightRequest(BaseModel):
    user_id: str
    period_start: str
    period_end: str
    total_minutes: int
    top_tracks: list[TrackPlay] = Field(default_factory=list)
    avg_valence: float | None = None
    avg_energy: float | None = None
    # Compared to the previous week, for trend detection.
    prev_total_minutes: int | None = None
    # Notable events this week (comebacks, records, new obsessions, anniversaries).
    events: list[str] = Field(default_factory=list)


class WeeklyInsightResponse(BaseModel):
    title: str
    body: str
    model: str


class ObsessionRequest(BaseModel):
    user_id: str
    candidates: list[TrackPlay]


class ObsessionScore(BaseModel):
    track_id: str
    score: float
    growth_rate: float | None = None


class ObsessionResponse(BaseModel):
    scores: list[ObsessionScore]
    model: str
