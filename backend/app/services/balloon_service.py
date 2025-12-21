import httpx
import asyncio
import math
from typing import Optional
from ..models import Balloon, BalloonPosition, SelectedBalloons
from ..utils.cache import cache_with_ttl, get_cache

WINDBORNE_BASE_URL = "https://a.windbornesystems.com/treasure"

# Vibrant color palette for balloons
BALLOON_COLORS = [
    "#FF6B6B",  # Coral Red
    "#4ECDC4",  # Teal
    "#45B7D1",  # Sky Blue
    "#96CEB4",  # Sage Green
    "#FFEAA7",  # Soft Yellow
    "#DDA0DD",  # Plum
    "#98D8C8",  # Mint
    "#F7DC6F",  # Sunflower
    "#BB8FCE",  # Lavender
    "#85C1E9",  # Light Blue
    "#F8B500",  # Amber
    "#00CED1",  # Dark Turquoise
    "#FF7F50",  # Coral
    "#9FE2BF",  # Sea Green
    "#DE3163",  # Cerise
    "#40E0D0",  # Turquoise
]


class BalloonService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        await self.client.aclose()

    @cache_with_ttl("balloons")
    async def fetch_all_balloon_data(self) -> list[list[Optional[list[float]]]]:
        """Fetch all 24 hours of balloon data from Windborne API."""
        tasks = []
        for hour in range(24):
            url = f"{WINDBORNE_BASE_URL}/{hour:02d}.json"
            tasks.append(self._fetch_hour_data(url, hour))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results - each result is a list of balloon positions for that hour
        hourly_data = []
        for result in results:
            if isinstance(result, Exception) or result is None:
                hourly_data.append([])
            else:
                hourly_data.append(result)
        
        return hourly_data

    async def _fetch_hour_data(self, url: str, hour: int) -> Optional[list]:
        """Fetch balloon data for a specific hour."""
        try:
            response = await self.client.get(url)
            if response.status_code == 200:
                data = response.json()
                # Handle potentially corrupted data
                if isinstance(data, list):
                    return data
            return []
        except Exception:
            return []

    def _parse_balloon_position(self, data: Optional[list], hours_ago: int) -> Optional[BalloonPosition]:
        """Parse a single balloon position from raw data."""
        if data is None or not isinstance(data, list) or len(data) < 2:
            return None
        
        try:
            lat = float(data[0]) if data[0] is not None else None
            lng = float(data[1]) if data[1] is not None else None
            altitude = float(data[2]) if len(data) > 2 and data[2] is not None else None
            
            if lat is None or lng is None:
                return None
            
            # Validate coordinates
            if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                return None
            
            return BalloonPosition(lat=lat, lng=lng, altitude=altitude, hours_ago=hours_ago)
        except (ValueError, TypeError):
            return None

    def _haversine_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate the great-circle distance between two points in km."""
        R = 6371  # Earth's radius in km
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        
        a = math.sin(delta_lat / 2) ** 2 + \
            math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c

    def _select_distributed_balloons(
        self, 
        hourly_data: list[list[Optional[list[float]]]], 
        count: int = 50
    ) -> list[int]:
        """
        Select the most spatially distributed balloons using greedy farthest-point sampling.
        Returns indices of selected balloons.
        """
        if not hourly_data or not hourly_data[0]:
            return []
        
        current_positions = hourly_data[0]  # Hour 0 = current positions
        
        # Get valid balloon indices with their current positions
        valid_balloons = []
        for idx, pos in enumerate(current_positions):
            parsed = self._parse_balloon_position(pos, 0)
            if parsed:
                valid_balloons.append((idx, parsed.lat, parsed.lng))
        
        if len(valid_balloons) <= count:
            return [b[0] for b in valid_balloons]
        
        # Greedy farthest-point sampling
        selected = []
        remaining = valid_balloons.copy()
        
        # Start with the first valid balloon
        selected.append(remaining.pop(0))
        
        while len(selected) < count and remaining:
            max_min_dist = -1
            best_idx = 0
            
            for i, (idx, lat, lng) in enumerate(remaining):
                # Find minimum distance to any selected balloon
                min_dist = float('inf')
                for sel_idx, sel_lat, sel_lng in selected:
                    dist = self._haversine_distance(lat, lng, sel_lat, sel_lng)
                    min_dist = min(min_dist, dist)
                
                # Keep track of the balloon with maximum minimum distance
                if min_dist > max_min_dist:
                    max_min_dist = min_dist
                    best_idx = i
            
            selected.append(remaining.pop(best_idx))
        
        return [b[0] for b in selected]

    async def get_selected_balloons(self, count: int = 50) -> SelectedBalloons:
        """Get the most spatially distributed balloons with full history."""
        hourly_data = await self.fetch_all_balloon_data()
        
        if not hourly_data or not hourly_data[0]:
            return SelectedBalloons(balloons=[], total_count=0)
        
        total_count = len(hourly_data[0])
        selected_indices = self._select_distributed_balloons(hourly_data, count)
        
        balloons = []
        for i, idx in enumerate(selected_indices):
            # Collect all positions for this balloon across 24 hours
            positions = []
            for hour, hour_data in enumerate(hourly_data):
                if idx < len(hour_data):
                    pos = self._parse_balloon_position(hour_data[idx], hour)
                    if pos:
                        positions.append(pos)
            
            if positions:
                current = positions[0] if positions else None
                if current:
                    balloon = Balloon(
                        id=idx,
                        color=BALLOON_COLORS[i % len(BALLOON_COLORS)],
                        positions=positions,
                        current=current,
                    )
                    balloons.append(balloon)
        
        return SelectedBalloons(balloons=balloons, total_count=total_count)

    async def get_all_balloons_current(self) -> list[BalloonPosition]:
        """Get current positions of all balloons (for counting in zones)."""
        hourly_data = await self.fetch_all_balloon_data()
        
        if not hourly_data or not hourly_data[0]:
            return []
        
        positions = []
        for idx, pos_data in enumerate(hourly_data[0]):
            pos = self._parse_balloon_position(pos_data, 0)
            if pos:
                positions.append(pos)
        
        return positions


# Singleton instance
_balloon_service: Optional[BalloonService] = None


def get_balloon_service() -> BalloonService:
    global _balloon_service
    if _balloon_service is None:
        _balloon_service = BalloonService()
    return _balloon_service

