from pydantic import BaseModel
from typing import Optional


class Storm(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    severity: str
    description: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    polygon: Optional[list[list[float]]] = None  # For storm zone boundaries


class StormData(BaseModel):
    storms: list[Storm]
    count: int
    regions: dict[str, int]  # region name -> storm count

