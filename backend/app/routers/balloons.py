from fastapi import APIRouter, Query
from typing import Optional
from ..services.balloon_service import get_balloon_service
from ..services.prediction_service import get_prediction_service
from ..models import SelectedBalloons, BalloonPosition

router = APIRouter(prefix="/api/balloons", tags=["balloons"])


@router.get("/selected", response_model=SelectedBalloons)
async def get_selected_balloons(count: int = Query(default=50, ge=1, le=100)):
    """Get the most spatially distributed balloons with full 24h history."""
    service = get_balloon_service()
    balloons = await service.get_selected_balloons(count)
    
    # Add future predictions for each balloon
    prediction_service = get_prediction_service()
    for balloon in balloons.balloons:
        future_positions = await prediction_service.predict_future_positions(balloon)
        balloon.future_positions = future_positions
    
    return balloons


@router.get("/all/current", response_model=list[BalloonPosition])
async def get_all_balloons_current():
    """Get current positions of all balloons (for counting in zones)."""
    service = get_balloon_service()
    return await service.get_all_balloons_current()


@router.get("/predictions/{balloon_id}")
async def get_balloon_predictions(balloon_id: int, hours: str = "5,10"):
    """Get future position predictions for a specific balloon."""
    service = get_balloon_service()
    prediction_service = get_prediction_service()
    
    # Parse hours
    try:
        hours_list = [int(h.strip()) for h in hours.split(",")]
    except ValueError:
        hours_list = [5, 10]
    
    # Get the balloon data
    balloons = await service.get_selected_balloons(1000)  # Get all to find the specific one
    
    for balloon in balloons.balloons:
        if balloon.id == balloon_id:
            predictions = await prediction_service.predict_future_positions(balloon, hours_list)
            return {"balloon_id": balloon_id, "predictions": predictions}
    
    return {"balloon_id": balloon_id, "predictions": [], "error": "Balloon not found"}

