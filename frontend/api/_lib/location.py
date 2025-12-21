from pydantic import BaseModel
from typing import Optional


class LocationRequest(BaseModel):
    query: str


class LocationResponse(BaseModel):
    success: bool
    lat: Optional[float] = None
    lng: Optional[float] = None
    name: Optional[str] = None
    error: Optional[str] = None

