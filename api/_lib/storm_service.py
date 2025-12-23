import httpx
import os
import json
from typing import Optional
from openai import AsyncOpenAI
from .storm import Storm, StormData
from .cache import cache_with_ttl

# NOAA National Weather Service API (no key required)
NOAA_ALERTS_URL = "https://api.weather.gov/alerts/active"

# Cache for zone-to-coordinate lookups to avoid repeated OpenAI calls
_zone_coordinate_cache: dict[str, tuple[float, float]] = {}


class StormService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

    async def close(self):
        await self.client.aclose()

    async def _get_coordinates_for_zone(self, area_desc: str, ugc_codes: list[str]) -> tuple[float, float]:
        """
        Use OpenAI to convert a NOAA zone description to approximate coordinates.
        
        Args:
            area_desc: Human-readable area description (e.g., "Northern Lynn Canal")
            ugc_codes: UGC zone codes (e.g., ["PKZ854"])
            
        Returns:
            Tuple of (latitude, longitude) or (0.0, 0.0) if conversion fails
        """
        # Create a cache key from the area description
        cache_key = area_desc.lower().strip()
        if cache_key in _zone_coordinate_cache:
            return _zone_coordinate_cache[cache_key]
        
        try:
            # Build context for OpenAI
            zone_info = f"Area: {area_desc}"
            if ugc_codes:
                zone_info += f"\nNOAA Zone Codes: {', '.join(ugc_codes)}"
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a geographic coordinate resolver for NOAA weather zones. 
Given a NOAA weather zone description and/or UGC codes, return the approximate center coordinates.

IMPORTANT: Respond ONLY with a JSON object in this exact format, no other text:
{"lat": <latitude as number>, "lng": <longitude as number>}

Examples:
- "Northern Lynn Canal" -> {"lat": 59.2, "lng": -135.3}
- "Sledge Island to Wales" -> {"lat": 65.0, "lng": -166.5}
- "San Francisco Bay" -> {"lat": 37.8, "lng": -122.4}

If you cannot determine coordinates, respond with:
{"lat": 0, "lng": 0}"""
                    },
                    {
                        "role": "user",
                        "content": zone_info
                    }
                ],
                temperature=0,
                max_tokens=50,
            )
            
            content = response.choices[0].message.content
            if content:
                # Clean up response - remove markdown code blocks if present
                content = content.strip()
                if content.startswith("```"):
                    content = content.split("\n", 1)[1] if "\n" in content else content
                if content.endswith("```"):
                    content = content.rsplit("```", 1)[0]
                content = content.strip()
                
                data = json.loads(content)
                lat = float(data.get("lat", 0))
                lng = float(data.get("lng", 0))
                
                # Validate coordinates
                if -90 <= lat <= 90 and -180 <= lng <= 180:
                    _zone_coordinate_cache[cache_key] = (lat, lng)
                    return (lat, lng)
        except Exception as e:
            # Log error but don't fail - return default coordinates
            print(f"Error getting coordinates for zone '{area_desc}': {e}")
        
        return (0.0, 0.0)

    @cache_with_ttl("storms")
    async def get_active_storms(self) -> StormData:
        """
        Get active severe weather alerts from NOAA.
        
        Returns StormData with:
        - storms: List of Storm objects with coordinates
        - count: Total number of storms
        - regions: Dictionary mapping event type to count
        
        Note: NOAA only provides US data. Storms without geometry will have
        coordinates resolved via OpenAI from their zone descriptions.
        """
        storms = []
        regions: dict[str, int] = {}
        errors: list[str] = []
        
        try:
            headers = {
                "User-Agent": "SkyDrift Balloon Tracker (skydrift@example.com)",
                "Accept": "application/geo+json",
            }
            
            # Get severe weather alerts (Severe and Extreme severity)
            params = {
                "status": "actual",
                "message_type": "alert",
                "severity": "Severe,Extreme",
            }
            
            response = await self.client.get(NOAA_ALERTS_URL, headers=headers, params=params)
            
            if response.status_code != 200:
                errors.append(f"NOAA API returned status {response.status_code}")
                return StormData(storms=[], count=0, regions={})
            
            data = response.json()
            features = data.get("features", [])
            
            if not features:
                # No severe weather alerts - this is valid, not an error
                return StormData(storms=[], count=0, regions={})
            
            for feature in features:
                storm = await self._parse_storm_feature(feature)
                if storm:
                    storms.append(storm)
                    # Group by event type for the regions summary
                    event_type = feature.get("properties", {}).get("event", "Unknown")
                    regions[event_type] = regions.get(event_type, 0) + 1
                    
        except httpx.TimeoutException:
            errors.append("NOAA API request timed out")
        except httpx.RequestError as e:
            errors.append(f"NOAA API request failed: {str(e)}")
        except json.JSONDecodeError:
            errors.append("Failed to parse NOAA API response")
        except Exception as e:
            errors.append(f"Unexpected error: {str(e)}")
        
        # Log errors for debugging but still return whatever data we have
        if errors:
            print(f"Storm service errors: {errors}")
        
        return StormData(storms=storms, count=len(storms), regions=regions)

    async def _parse_storm_feature(self, feature: dict) -> Optional[Storm]:
        """
        Parse a GeoJSON feature into a Storm object.
        
        If the feature has geometry, extract coordinates from it.
        If not, use OpenAI to resolve coordinates from the area description.
        
        Returns None only if we cannot determine any location information.
        """
        try:
            props = feature.get("properties", {})
            geometry = feature.get("geometry")
            
            # Get centroid or first coordinate for lat/lng
            lat, lng = 0.0, 0.0
            polygon = None
            
            # Try to get coordinates from geometry first
            if geometry:
                geom_type = geometry.get("type")
                coords = geometry.get("coordinates", [])
                
                if geom_type == "Polygon" and coords:
                    polygon = coords[0] if coords else []
                    if polygon:
                        lngs = [p[0] for p in polygon]
                        lats = [p[1] for p in polygon]
                        lng = sum(lngs) / len(lngs)
                        lat = sum(lats) / len(lats)
                elif geom_type == "MultiPolygon" and coords:
                    first_poly = coords[0][0] if coords and coords[0] else []
                    if first_poly:
                        lngs = [p[0] for p in first_poly]
                        lats = [p[1] for p in first_poly]
                        lng = sum(lngs) / len(lngs)
                        lat = sum(lats) / len(lats)
                        polygon = first_poly
            
            # If no geometry coordinates, use OpenAI to resolve from zone description
            if lat == 0 and lng == 0:
                area_desc = props.get("areaDesc", "")
                geocode = props.get("geocode", {})
                ugc_codes = geocode.get("UGC", [])
                
                if area_desc:
                    lat, lng = await self._get_coordinates_for_zone(area_desc, ugc_codes)
                
                # If still no coordinates, skip this storm
                if lat == 0 and lng == 0:
                    return None
            
            return Storm(
                id=props.get("id", props.get("@id", "unknown")),
                name=props.get("event", "Unknown Storm"),
                lat=lat,
                lng=lng,
                severity=props.get("severity", "Unknown"),
                description=props.get("headline", props.get("description", ""))[:200] if props.get("headline") or props.get("description") else "",
                start_time=props.get("effective"),
                end_time=props.get("expires"),
                polygon=polygon,
            )
        except Exception as e:
            print(f"Error parsing storm feature: {e}")
            return None

    def is_balloon_in_storm(self, balloon_lat: float, balloon_lng: float, storms: list[Storm], radius_km: float = 100) -> Optional[Storm]:
        """
        Check if a balloon is within a storm zone.
        
        Args:
            balloon_lat: Balloon latitude
            balloon_lng: Balloon longitude
            storms: List of storms to check against
            radius_km: Radius in km for proximity check (used when no polygon)
            
        Returns:
            The Storm object if balloon is in a storm zone, None otherwise
        """
        import math
        
        for storm in storms:
            # Check polygon if available (more accurate)
            if storm.polygon:
                if self._point_in_polygon(balloon_lat, balloon_lng, storm.polygon):
                    return storm
            elif storm.lat != 0 or storm.lng != 0:
                # Use radius-based check for storms without polygon
                lat_diff = abs(balloon_lat - storm.lat)
                lng_diff = abs(balloon_lng - storm.lng)
                dist_km = math.sqrt(
                    (lat_diff * 111) ** 2 + 
                    (lng_diff * 111 * math.cos(math.radians(balloon_lat))) ** 2
                )
                
                if dist_km <= radius_km:
                    return storm
        
        return None

    def _point_in_polygon(self, lat: float, lng: float, polygon: list[list[float]]) -> bool:
        """Check if a point is inside a polygon using ray casting algorithm."""
        n = len(polygon)
        if n < 3:
            return False
            
        inside = False
        
        p1_lng, p1_lat = polygon[0]
        for i in range(1, n + 1):
            p2_lng, p2_lat = polygon[i % n]
            if lat > min(p1_lat, p2_lat):
                if lat <= max(p1_lat, p2_lat):
                    if lng <= max(p1_lng, p2_lng):
                        if p1_lat != p2_lat:
                            xinters = (lat - p1_lat) * (p2_lng - p1_lng) / (p2_lat - p1_lat) + p1_lng
                        if p1_lng == p2_lng or lng <= xinters:
                            inside = not inside
            p1_lng, p1_lat = p2_lng, p2_lat
        
        return inside


# Singleton instance
_storm_service: Optional[StormService] = None


def get_storm_service() -> StormService:
    global _storm_service
    if _storm_service is None:
        _storm_service = StormService()
    return _storm_service
