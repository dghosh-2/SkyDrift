import httpx
import os
import math
import random
from typing import Optional
from .weather import WeatherData, WindData, WindGrid
from .cache import cache_with_ttl, get_cache

OPENWEATHERMAP_BASE_URL = "https://api.openweathermap.org/data/2.5"


class WeatherService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=15.0)
        self.api_key = os.getenv("OPENWEATHERMAP_API_KEY", "")
    
    def _generate_realistic_wind(self, lat: float, lng: float) -> WindData:
        """Generate realistic wind data based on latitude and typical global patterns."""
        # Trade winds (0-30 degrees): blow from east to west
        # Westerlies (30-60 degrees): blow from west to east
        # Polar easterlies (60-90 degrees): blow from east to west
        
        abs_lat = abs(lat)
        
        if abs_lat < 30:
            # Trade winds - easterly (from east, ~5-15 m/s)
            base_direction = 90 if lat >= 0 else 270  # NE trades in NH, SE trades in SH
            base_speed = 8 + random.uniform(-3, 5)
        elif abs_lat < 60:
            # Westerlies (from west, ~10-20 m/s)
            base_direction = 270 if lat >= 0 else 90
            base_speed = 12 + random.uniform(-4, 8)
        else:
            # Polar easterlies (from east, ~5-10 m/s)
            base_direction = 90
            base_speed = 6 + random.uniform(-2, 4)
        
        # Add some randomness for natural variation
        direction = (base_direction + random.uniform(-30, 30)) % 360
        speed = max(0, base_speed + random.uniform(-2, 2))
        
        return WindData(lat=lat, lng=lng, speed=round(speed, 1), direction=round(direction))

    async def close(self):
        await self.client.aclose()

    @cache_with_ttl("weather")
    async def get_weather_at_location(self, lat: float, lng: float) -> Optional[WeatherData]:
        """Get current weather at a specific location."""
        try:
            url = f"{OPENWEATHERMAP_BASE_URL}/weather"
            params = {
                "lat": lat,
                "lon": lng,
                "appid": self.api_key,
                "units": "metric",
            }
            
            response = await self.client.get(url, params=params)
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            
            # Extract region name
            region = data.get("name", "Unknown")
            if not region or region == "":
                region = f"{lat:.2f}, {lng:.2f}"
            
            return WeatherData(
                temperature=data.get("main", {}).get("temp", 0),
                humidity=data.get("main", {}).get("humidity", 0),
                pressure=data.get("main", {}).get("pressure", 0),
                description=data.get("weather", [{}])[0].get("description", "Unknown"),
                wind_speed=data.get("wind", {}).get("speed", 0),
                wind_direction=data.get("wind", {}).get("deg", 0),
                clouds=data.get("clouds", {}).get("all", 0),
                region=region,
            )
        except Exception:
            return None

    async def get_wind_grid(self) -> WindGrid:
        """
        Get a grid of wind data points covering the globe.
        Uses realistic simulated wind patterns based on global circulation.
        
        Note: We use simulated data instead of API calls to avoid rate limiting
        and ensure reliable wind visualization.
        """
        import time
        winds = []
        
        # Generate wind data at a grid of points (every 15 degrees for better coverage)
        lat_step = 15
        lng_step = 20
        
        for lat in range(-75, 76, lat_step):
            for lng in range(-180, 180, lng_step):
                wind = self._generate_realistic_wind(lat, lng)
                winds.append(wind)
        
        print(f"[DEBUG] Generated {len(winds)} wind data points")
        return WindGrid(winds=winds, timestamp=int(time.time()))

    async def _get_wind_at_point(self, lat: float, lng: float) -> Optional[WindData]:
        """Get wind data at a specific point."""
        try:
            url = f"{OPENWEATHERMAP_BASE_URL}/weather"
            params = {
                "lat": lat,
                "lon": lng,
                "appid": self.api_key,
                "units": "metric",
            }
            
            response = await self.client.get(url, params=params)
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            wind = data.get("wind", {})
            
            return WindData(
                lat=lat,
                lng=lng,
                speed=wind.get("speed", 0),
                direction=wind.get("deg", 0),
            )
        except Exception:
            return None


# Singleton instance
_weather_service: Optional[WeatherService] = None


def get_weather_service() -> WeatherService:
    global _weather_service
    if _weather_service is None:
        _weather_service = WeatherService()
    return _weather_service

