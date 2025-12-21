import httpx
from typing import Optional
from .storm import Storm, StormData
from .cache import cache_with_ttl

# NOAA National Weather Service API (no key required)
NOAA_ALERTS_URL = "https://api.weather.gov/alerts/active"


class StormService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        await self.client.aclose()

    @cache_with_ttl("storms")
    async def get_active_storms(self) -> StormData:
        """Get active severe weather alerts from NOAA.
        
        Note: NOAA only provides US data. Only storms with valid geometry are included
        for accurate map display.
        """
        storms = []
        regions: dict[str, int] = {}
        
        try:
            headers = {
                "User-Agent": "SkyDrift Balloon Tracker (contact@example.com)",
                "Accept": "application/geo+json",
            }
            
            # Get severe weather alerts
            params = {
                "status": "actual",
                "message_type": "alert",
                "severity": "Severe,Extreme",
            }
            
            response = await self.client.get(NOAA_ALERTS_URL, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                features = data.get("features", [])
                
                for feature in features:
                    storm = self._parse_storm_feature(feature)
                    # Only include storms with valid location data
                    if storm and (storm.lat != 0 or storm.lng != 0):
                        storms.append(storm)
                        # Group by event type
                        event_type = feature.get("properties", {}).get("event", "Unknown")
                        regions[event_type] = regions.get(event_type, 0) + 1
        except Exception:
            pass
        
        return StormData(storms=storms, count=len(storms), regions=regions)

    def _parse_storm_feature(self, feature: dict) -> Optional[Storm]:
        """Parse a GeoJSON feature into a Storm object."""
        try:
            props = feature.get("properties", {})
            geometry = feature.get("geometry")
            
            # Get centroid or first coordinate for lat/lng
            lat, lng = 0.0, 0.0
            polygon = None
            
            if geometry:
                geom_type = geometry.get("type")
                coords = geometry.get("coordinates", [])
                
                if geom_type == "Polygon" and coords:
                    # Calculate centroid
                    polygon = coords[0] if coords else []
                    if polygon:
                        lngs = [p[0] for p in polygon]
                        lats = [p[1] for p in polygon]
                        lng = sum(lngs) / len(lngs)
                        lat = sum(lats) / len(lats)
                elif geom_type == "MultiPolygon" and coords:
                    # Use first polygon
                    first_poly = coords[0][0] if coords and coords[0] else []
                    if first_poly:
                        lngs = [p[0] for p in first_poly]
                        lats = [p[1] for p in first_poly]
                        lng = sum(lngs) / len(lngs)
                        lat = sum(lats) / len(lats)
                        polygon = first_poly
            
            # If no geometry, try to get from geocode
            if lat == 0 and lng == 0:
                geocode = props.get("geocode", {})
                ugc = geocode.get("UGC", [])
                # Skip if we can't determine location
                if not ugc:
                    return None
            
            return Storm(
                id=props.get("id", "unknown"),
                name=props.get("event", "Unknown Storm"),
                lat=lat,
                lng=lng,
                severity=props.get("severity", "Unknown"),
                description=props.get("headline", props.get("description", ""))[:200],
                start_time=props.get("effective"),
                end_time=props.get("expires"),
                polygon=polygon,
            )
        except Exception:
            return None

    def is_balloon_in_storm(self, balloon_lat: float, balloon_lng: float, storms: list[Storm], radius_km: float = 100) -> Optional[Storm]:
        """Check if a balloon is within a storm zone."""
        import math
        
        for storm in storms:
            # Check polygon if available
            if storm.polygon:
                if self._point_in_polygon(balloon_lat, balloon_lng, storm.polygon):
                    return storm
            else:
                # Use radius-based check
                lat_diff = abs(balloon_lat - storm.lat)
                lng_diff = abs(balloon_lng - storm.lng)
                dist_km = math.sqrt((lat_diff * 111) ** 2 + (lng_diff * 111 * math.cos(math.radians(balloon_lat))) ** 2)
                
                if dist_km <= radius_km:
                    return storm
        
        return None

    def _point_in_polygon(self, lat: float, lng: float, polygon: list[list[float]]) -> bool:
        """Check if a point is inside a polygon using ray casting algorithm."""
        n = len(polygon)
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

