from .balloons import router as balloons_router
from .weather import router as weather_router
from .fires import router as fires_router
from .storms import router as storms_router
from .location import router as location_router

__all__ = [
    "balloons_router",
    "weather_router",
    "fires_router",
    "storms_router",
    "location_router",
]

