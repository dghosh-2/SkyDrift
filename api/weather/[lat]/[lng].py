from http.server import BaseHTTPRequestHandler
import json
import asyncio
import sys
import os
import re

# api/weather/[lat]/[lng].py -> need to go up 2 levels to reach api directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from _lib.weather_service import get_weather_service


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Extract lat/lng from path
        match = re.search(r'/weather/([^/]+)/([^/]+)', self.path)
        if not match:
            self.send_error(400, "Invalid path")
            return
        
        lat = float(match.group(1))
        lng = float(match.group(2))
        
        result = asyncio.run(self._get_weather(lat, lng))
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    async def _get_weather(self, lat: float, lng: float):
        service = get_weather_service()
        weather = await service.get_weather_at_location(lat, lng)
        return weather.model_dump() if weather else None

