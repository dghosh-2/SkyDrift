from pydantic import BaseModel
from typing import Optional


class WeatherData(BaseModel):
    temperature: float
    humidity: int
    pressure: float
    description: str
    wind_speed: float
    wind_direction: int
    clouds: int
    region: str


class WindData(BaseModel):
    lat: float
    lng: float
    speed: float
    direction: int


class WindGrid(BaseModel):
    winds: list[WindData]
    timestamp: int

