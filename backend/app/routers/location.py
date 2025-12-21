from fastapi import APIRouter
from ..services.location_service import get_location_service
from ..models import LocationRequest, LocationResponse

router = APIRouter(prefix="/api/location", tags=["location"])


@router.post("/parse", response_model=LocationResponse)
async def parse_location(request: LocationRequest):
    """Parse a natural language location into coordinates using OpenAI."""
    service = get_location_service()
    return await service.parse_location(request.query)

