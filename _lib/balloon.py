from pydantic import BaseModel
from typing import Optional


class BalloonPosition(BaseModel):
    lat: float
    lng: float
    altitude: Optional[float] = None
    hours_ago: int = 0


class Balloon(BaseModel):
    id: int
    color: str
    positions: list[BalloonPosition]  # Full 24h history
    current: BalloonPosition
    future_positions: Optional[list[BalloonPosition]] = None


class BalloonHistory(BaseModel):
    balloons: list[list[Optional[list[float]]]]  # Raw data from Windborne API
    hours_ago: int


class SelectedBalloons(BaseModel):
    balloons: list[Balloon]
    total_count: int

