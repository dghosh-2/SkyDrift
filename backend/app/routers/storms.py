from fastapi import APIRouter
from typing import Optional
from ..services.storm_service import get_storm_service
from ..models import StormData, Storm

router = APIRouter(prefix="/api/storms", tags=["storms"])


@router.get("", response_model=StormData)
async def get_active_storms():
    """Get all active severe weather alerts."""
    service = get_storm_service()
    return await service.get_active_storms()


@router.get("/check/{lat}/{lng}")
async def check_balloon_in_storm(lat: float, lng: float, radius_km: float = 100):
    """Check if a location is within any storm zone."""
    service = get_storm_service()
    storm_data = await service.get_active_storms()
    storm = service.is_balloon_in_storm(lat, lng, storm_data.storms, radius_km)
    return {
        "lat": lat,
        "lng": lng,
        "in_storm": storm is not None,
        "storm": storm.model_dump() if storm else None,
    }

