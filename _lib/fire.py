from pydantic import BaseModel
from typing import Optional


class Fire(BaseModel):
    lat: float
    lng: float
    brightness: float
    confidence: str
    acq_date: str
    acq_time: str


class FireData(BaseModel):
    fires: list[Fire]
    count: int
    regions: dict[str, int]  # region name -> fire count

