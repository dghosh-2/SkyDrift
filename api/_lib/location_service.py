import os
from typing import Optional
from openai import AsyncOpenAI
from .location import LocationRequest, LocationResponse


class LocationService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

    async def parse_location(self, query: str) -> LocationResponse:
        """
        Use OpenAI to parse a natural language location into coordinates.
        """
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a location parser. Given a location description (city, country, region, ocean, lake, etc.), return the approximate latitude and longitude coordinates.

Respond ONLY with a JSON object in this exact format:
{"success": true, "lat": <latitude>, "lng": <longitude>, "name": "<formatted location name>"}

If the input is not a valid location or you cannot determine coordinates, respond with:
{"success": false, "error": "<brief explanation>"}

Examples:
- "Paris" -> {"success": true, "lat": 48.8566, "lng": 2.3522, "name": "Paris, France"}
- "Pacific Ocean" -> {"success": true, "lat": 0.0, "lng": -160.0, "name": "Pacific Ocean"}
- "asdfgh" -> {"success": false, "error": "Not a recognized location"}"""
                    },
                    {
                        "role": "user",
                        "content": query
                    }
                ],
                temperature=0,
                max_tokens=150,
            )
            
            content = response.choices[0].message.content
            if not content:
                return LocationResponse(success=False, error="Empty response from AI")
            
            # Parse the JSON response
            import json
            try:
                data = json.loads(content)
                return LocationResponse(
                    success=data.get("success", False),
                    lat=data.get("lat"),
                    lng=data.get("lng"),
                    name=data.get("name"),
                    error=data.get("error"),
                )
            except json.JSONDecodeError:
                return LocationResponse(success=False, error="Failed to parse AI response")
                
        except Exception as e:
            return LocationResponse(success=False, error=f"API error: {str(e)}")


# Singleton instance
_location_service: Optional[LocationService] = None


def get_location_service() -> LocationService:
    global _location_service
    if _location_service is None:
        _location_service = LocationService()
    return _location_service

