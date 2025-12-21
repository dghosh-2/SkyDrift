from http.server import BaseHTTPRequestHandler
import json
import asyncio
import sys
import os
import re

# Add multiple potential paths for _lib imports
_current_dir = os.path.dirname(os.path.abspath(__file__))
_api_dir = os.path.dirname(os.path.dirname(os.path.dirname(_current_dir)))
sys.path.insert(0, _current_dir)
sys.path.insert(0, os.path.dirname(os.path.dirname(_current_dir)))  # api directory
sys.path.insert(0, _api_dir)
sys.path.insert(0, os.path.join(_api_dir, 'api'))

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

