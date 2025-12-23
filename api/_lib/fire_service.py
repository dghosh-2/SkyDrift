import httpx
import os
from typing import Optional
from .fire import Fire, FireData
from .cache import cache_with_ttl

NASA_FIRMS_BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"


class FireService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)  # Longer timeout for large data
        self.api_key = os.getenv("NASA_FIRMS_API_KEY", "")

    async def close(self):
        await self.client.aclose()

    @cache_with_ttl("fires")
    async def get_active_fires(self) -> FireData:
        """
        Get active wildfires globally from NASA FIRMS.
        
        Returns FireData with:
        - fires: List of Fire objects (filtered for significance)
        - count: Total number of fires returned
        - regions: Dictionary mapping region coordinates to fire count
        
        Filters:
        - Only high/nominal confidence fires
        - FRP (Fire Radiative Power) > 5 MW (filters very small fires)
        
        Note: Requires NASA_FIRMS_API_KEY environment variable.
        """
        fires = []
        regions: dict[str, int] = {}
        errors: list[str] = []
        
        # Check for API key
        if not self.api_key:
            errors.append("NASA_FIRMS_API_KEY environment variable not set")
            print(f"Fire service error: {errors[0]}")
            return FireData(fires=[], count=0, regions={})
        
        try:
            # Get fires from VIIRS satellite (global coverage, last 1 day)
            # VIIRS_SNPP_NRT = Near Real-Time data from Suomi NPP satellite
            url = f"{NASA_FIRMS_BASE_URL}/{self.api_key}/VIIRS_SNPP_NRT/world/1"
            
            response = await self.client.get(url)
            
            if response.status_code == 401:
                errors.append("Invalid NASA FIRMS API key")
                print(f"Fire service error: {errors[0]}")
                return FireData(fires=[], count=0, regions={})
            
            if response.status_code == 429:
                errors.append("NASA FIRMS API rate limit exceeded")
                print(f"Fire service error: {errors[0]}")
                return FireData(fires=[], count=0, regions={})
            
            if response.status_code != 200:
                errors.append(f"NASA FIRMS API returned status {response.status_code}: {response.text[:200]}")
                print(f"Fire service error: {errors[0]}")
                return FireData(fires=[], count=0, regions={})
            
            # Check for error messages in response body
            response_text = response.text.strip()
            if response_text.startswith("Error") or response_text.startswith("Invalid"):
                errors.append(f"NASA FIRMS API error: {response_text[:200]}")
                print(f"Fire service error: {errors[0]}")
                return FireData(fires=[], count=0, regions={})
            
            lines = response_text.split("\n")
            
            if len(lines) <= 1:
                # No fires found - this is valid, not an error
                return FireData(fires=[], count=0, regions={})
            
            # Parse header to get column indices (more robust than hardcoded indices)
            header = lines[0].lower().split(",")
            col_indices = self._get_column_indices(header)
            
            if not col_indices:
                errors.append("Could not parse FIRMS CSV header")
                print(f"Fire service error: {errors[0]}")
                return FireData(fires=[], count=0, regions={})
            
            # Parse data rows
            parse_errors = 0
            for line in lines[1:]:
                if not line.strip():
                    continue
                    
                fire = self._parse_fire_line(line, col_indices)
                if fire:
                    fires.append(fire)
                    # Group by approximate region (10 degree grid for broader regions)
                    region_key = f"{int(fire.lat / 10) * 10},{int(fire.lng / 10) * 10}"
                    regions[region_key] = regions.get(region_key, 0) + 1
                else:
                    parse_errors += 1
            
            if parse_errors > 0:
                print(f"Fire service: {parse_errors} lines failed to parse or were filtered out")
                    
        except httpx.TimeoutException:
            errors.append("NASA FIRMS API request timed out")
            print(f"Fire service error: {errors[0]}")
        except httpx.RequestError as e:
            errors.append(f"NASA FIRMS API request failed: {str(e)}")
            print(f"Fire service error: {errors[0]}")
        except Exception as e:
            errors.append(f"Unexpected error: {str(e)}")
            print(f"Fire service error: {errors[0]}")
        
        return FireData(fires=fires, count=len(fires), regions=regions)

    def _get_column_indices(self, header: list[str]) -> Optional[dict[str, int]]:
        """
        Get column indices from CSV header.
        
        Expected columns: latitude, longitude, bright_ti4, acq_date, acq_time, confidence, frp
        
        Returns dict mapping column name to index, or None if required columns missing.
        """
        required = ["latitude", "longitude"]
        optional = {
            "bright_ti4": "brightness",
            "brightness": "brightness",
            "acq_date": "acq_date",
            "acq_time": "acq_time",
            "confidence": "confidence",
            "frp": "frp",
        }
        
        indices = {}
        
        # Find required columns
        for col in required:
            if col in header:
                indices[col] = header.index(col)
            else:
                return None
        
        # Find optional columns
        for csv_col, key in optional.items():
            if csv_col in header and key not in indices:
                indices[key] = header.index(csv_col)
        
        return indices

    def _parse_fire_line(self, line: str, col_indices: dict[str, int]) -> Optional[Fire]:
        """
        Parse a single line of FIRMS CSV data.
        
        Filters for significant fires:
        - High or nominal confidence
        - FRP > 5 MW (filters very small fires but keeps more than before)
        
        Returns Fire object or None if filtered out or parse error.
        """
        try:
            parts = line.split(",")
            
            # Get required fields
            lat = float(parts[col_indices["latitude"]])
            lng = float(parts[col_indices["longitude"]])
            
            # Validate coordinates
            if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                return None
            
            # Get optional fields with defaults
            brightness = 0.0
            if "brightness" in col_indices and col_indices["brightness"] < len(parts):
                try:
                    brightness = float(parts[col_indices["brightness"]])
                except ValueError:
                    pass
            
            acq_date = ""
            if "acq_date" in col_indices and col_indices["acq_date"] < len(parts):
                acq_date = parts[col_indices["acq_date"]]
            
            acq_time = ""
            if "acq_time" in col_indices and col_indices["acq_time"] < len(parts):
                acq_time = parts[col_indices["acq_time"]]
            
            confidence = "unknown"
            if "confidence" in col_indices and col_indices["confidence"] < len(parts):
                confidence = parts[col_indices["confidence"]]
            
            frp = 0.0
            if "frp" in col_indices and col_indices["frp"] < len(parts):
                try:
                    frp_str = parts[col_indices["frp"]]
                    if frp_str:
                        frp = float(frp_str)
                except ValueError:
                    pass
            
            # Filter for significant fires
            # Accept high, nominal, or numeric confidence >= 50
            confidence_lower = confidence.lower().strip()
            is_confident = confidence_lower in ('high', 'h', 'nominal', 'n')
            
            # Also accept numeric confidence
            if not is_confident:
                try:
                    conf_num = float(confidence)
                    is_confident = conf_num >= 50
                except ValueError:
                    pass
            
            if not is_confident:
                return None
            
            # FRP filter - lowered from 10 to 5 to show more fires
            if frp < 5:
                return None
            
            return Fire(
                lat=lat,
                lng=lng,
                brightness=brightness,
                confidence=confidence,
                acq_date=acq_date,
                acq_time=acq_time,
            )
        except (ValueError, IndexError, KeyError) as e:
            return None

    def is_balloon_over_fire(self, balloon_lat: float, balloon_lng: float, fires: list[Fire], radius_km: float = 50) -> bool:
        """
        Check if a balloon is within radius_km of any fire.
        
        Args:
            balloon_lat: Balloon latitude
            balloon_lng: Balloon longitude
            fires: List of fires to check against
            radius_km: Radius in km for proximity check
            
        Returns:
            True if balloon is near a fire, False otherwise
        """
        import math
        
        for fire in fires:
            # Simple distance calculation (approximate for small distances)
            lat_diff = abs(balloon_lat - fire.lat)
            lng_diff = abs(balloon_lng - fire.lng)
            
            # Rough km conversion (1 degree ≈ 111 km at equator)
            dist_km = math.sqrt(
                (lat_diff * 111) ** 2 + 
                (lng_diff * 111 * math.cos(math.radians(balloon_lat))) ** 2
            )
            
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
