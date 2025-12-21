import httpx
import os
from typing import Optional
from .fire import Fire, FireData
from .cache import cache_with_ttl

NASA_FIRMS_BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"


class FireService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.api_key = os.getenv("NASA_FIRMS_API_KEY", "")

    async def close(self):
        await self.client.aclose()

    @cache_with_ttl("fires")
    async def get_active_fires(self) -> FireData:
        """Get active wildfires globally from NASA FIRMS.
        
        Filters to only include significant fires (high confidence, high FRP).
        """
        fires = []
        regions: dict[str, int] = {}
        
        try:
            # Get fires from VIIRS satellite (global coverage, last 1 day)
            url = f"{NASA_FIRMS_BASE_URL}/{self.api_key}/VIIRS_SNPP_NRT/world/1"
            
            response = await self.client.get(url)
            
            if response.status_code == 200:
                lines = response.text.strip().split("\n")
                if len(lines) > 1:
                    # Skip header row
                    for line in lines[1:]:
                        fire = self._parse_fire_line(line)
                        if fire:
                            fires.append(fire)
                            # Group by approximate region (10 degree grid for broader regions)
                            region_key = f"{int(fire.lat / 10) * 10},{int(fire.lng / 10) * 10}"
                            regions[region_key] = regions.get(region_key, 0) + 1
        except Exception:
            pass
        
        return FireData(fires=fires, count=len(fires), regions=regions)

    def _parse_fire_line(self, line: str) -> Optional[Fire]:
        """Parse a single line of FIRMS CSV data (VIIRS format).
        
        Only returns significant fires (high confidence and high FRP).
        """
        # VIIRS format: latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
        try:
            parts = line.split(",")
            if len(parts) < 13:
                return None
            
            lat = float(parts[0])
            lng = float(parts[1])
            brightness = float(parts[2])
            acq_date = parts[5]
            acq_time = parts[6]
            confidence = parts[9] if len(parts) > 9 else "unknown"
            
            # FRP (Fire Radiative Power) - higher = larger fire
            frp = float(parts[12]) if len(parts) > 12 and parts[12] else 0
            
            # Validate coordinates
            if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                return None
            
            # Only include significant fires:
            # - High or nominal confidence
            # - FRP > 10 MW (filters out small agricultural burns)
            confidence_lower = confidence.lower()
            if confidence_lower not in ('high', 'h', 'nominal', 'n'):
                return None
            
            if frp < 10:
                return None
            
            return Fire(
                lat=lat,
                lng=lng,
                brightness=brightness,
                confidence=confidence,
                acq_date=acq_date,
                acq_time=acq_time,
            )
        except (ValueError, IndexError):
            return None

    def is_balloon_over_fire(self, balloon_lat: float, balloon_lng: float, fires: list[Fire], radius_km: float = 50) -> bool:
        """Check if a balloon is within radius_km of any fire."""
        import math
        
        for fire in fires:
            # Simple distance calculation (approximate for small distances)
            lat_diff = abs(balloon_lat - fire.lat)
            lng_diff = abs(balloon_lng - fire.lng)
            
            # Rough km conversion (1 degree ≈ 111 km at equator)
            dist_km = math.sqrt((lat_diff * 111) ** 2 + (lng_diff * 111 * math.cos(math.radians(balloon_lat))) ** 2)
            
            if dist_km <= radius_km:
                return True
        
        return False


# Singleton instance
_fire_service: Optional[FireService] = None


def get_fire_service() -> FireService:
    global _fire_service
    if _fire_service is None:
        _fire_service = FireService()
    return _fire_service

