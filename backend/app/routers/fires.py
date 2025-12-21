from fastapi import APIRouter
from ..services.fire_service import get_fire_service
from ..models import FireData

router = APIRouter(prefix="/api/fires", tags=["fires"])


@router.get("", response_model=FireData)
async def get_active_fires():
    """Get all active wildfires globally."""
    service = get_fire_service()
    return await service.get_active_fires()


@router.get("/check/{lat}/{lng}")
async def check_balloon_over_fire(lat: float, lng: float, radius_km: float = 50):
    """Check if a location is near any active fires."""
    service = get_fire_service()
    fire_data = await service.get_active_fires()
    is_over_fire = service.is_balloon_over_fire(lat, lng, fire_data.fires, radius_km)
    return {"lat": lat, "lng": lng, "is_over_fire": is_over_fire}

