from fastapi import APIRouter
from typing import Optional
from ..services.weather_service import get_weather_service
from ..models import WeatherData, WindGrid

router = APIRouter(prefix="/api/weather", tags=["weather"])


# NOTE: Static routes MUST come before dynamic routes to avoid path conflicts
@router.get("/wind/grid", response_model=WindGrid)
async def get_wind_grid():
    """Get a grid of wind data for visualization."""
    service = get_weather_service()
    return await service.get_wind_grid()


@router.get("/{lat}/{lng}", response_model=Optional[WeatherData])
async def get_weather_at_location(lat: float, lng: float):
    """Get weather data at a specific location."""
    service = get_weather_service()
    return await service.get_weather_at_location(lat, lng)

