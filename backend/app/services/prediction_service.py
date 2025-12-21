import math
from typing import Optional
from ..models import Balloon, BalloonPosition, WindData
from .weather_service import get_weather_service


class PredictionService:
    def __init__(self):
        self.weather_service = get_weather_service()

    async def predict_future_positions(
        self, 
        balloon: Balloon, 
        hours_ahead: list[int] = [5, 10]
    ) -> list[BalloonPosition]:
        """
        Predict future balloon positions using trajectory momentum and wind data.
        Uses 60% trajectory momentum + 40% wind influence.
        """
        positions = balloon.positions
        if len(positions) < 2:
            return []
        
        # Calculate average velocity from recent positions (last 6 hours or available)
        recent_positions = [p for p in positions if p.hours_ago <= 6]
        if len(recent_positions) < 2:
            recent_positions = positions[:min(6, len(positions))]
        
        # Sort by hours_ago (most recent first)
        recent_positions.sort(key=lambda p: p.hours_ago)
        
        # Calculate velocity vector (degrees per hour)
        if len(recent_positions) >= 2:
            oldest = recent_positions[-1]
            newest = recent_positions[0]
            time_diff = oldest.hours_ago - newest.hours_ago
            
            if time_diff > 0:
                lat_velocity = (newest.lat - oldest.lat) / time_diff
                lng_velocity = (newest.lng - oldest.lng) / time_diff
            else:
                lat_velocity = 0
                lng_velocity = 0
        else:
            lat_velocity = 0
            lng_velocity = 0
        
        # Get wind data at current position
        current = balloon.current
        wind = await self._get_wind_at_position(current.lat, current.lng)
        
        future_positions = []
        
        for hours in hours_ahead:
            # Calculate trajectory-based position
            traj_lat = current.lat + lat_velocity * hours
            traj_lng = current.lng + lng_velocity * hours
            
            # Calculate wind-based displacement
            if wind:
                wind_lat_disp, wind_lng_disp = self._wind_to_displacement(
                    wind.speed, wind.direction, hours, current.lat
                )
            else:
                wind_lat_disp = 0
                wind_lng_disp = 0
            
            # Blend: 60% trajectory, 40% wind
            final_lat = 0.6 * traj_lat + 0.4 * (current.lat + wind_lat_disp)
            final_lng = 0.6 * traj_lng + 0.4 * (current.lng + wind_lng_disp)
            
            # Clamp to valid ranges
            final_lat = max(-90, min(90, final_lat))
            final_lng = ((final_lng + 180) % 360) - 180  # Wrap longitude
            
            future_positions.append(BalloonPosition(
                lat=final_lat,
                lng=final_lng,
                altitude=current.altitude,
                hours_ago=-hours,  # Negative for future
            ))
        
        return future_positions

    async def _get_wind_at_position(self, lat: float, lng: float) -> Optional[WindData]:
        """Get wind data at a specific position."""
        weather = await self.weather_service.get_weather_at_location(lat, lng)
        if weather:
            return WindData(
                lat=lat,
                lng=lng,
                speed=weather.wind_speed,
                direction=weather.wind_direction,
            )
        return None

    def _wind_to_displacement(
        self, 
        speed_ms: float, 
        direction_deg: float, 
        hours: float,
        lat: float
    ) -> tuple[float, float]:
        """
        Convert wind speed and direction to lat/lng displacement.
        Wind direction is where wind is coming FROM (meteorological convention).
        """
        # Convert to radians and adjust for "coming from" to "going to"
        direction_rad = math.radians((direction_deg + 180) % 360)
        
        # Distance traveled in km
        distance_km = speed_ms * 3.6 * hours  # m/s to km/h, then multiply by hours
        
        # Convert to degrees
        # 1 degree latitude ≈ 111 km
        # 1 degree longitude ≈ 111 km * cos(latitude)
        lat_displacement = (distance_km * math.cos(direction_rad)) / 111
        lng_displacement = (distance_km * math.sin(direction_rad)) / (111 * math.cos(math.radians(lat)))
        
        return lat_displacement, lng_displacement


# Singleton instance
_prediction_service: Optional[PredictionService] = None


def get_prediction_service() -> PredictionService:
    global _prediction_service
    if _prediction_service is None:
        _prediction_service = PredictionService()
    return _prediction_service

