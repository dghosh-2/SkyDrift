from http.server import BaseHTTPRequestHandler
import json
import asyncio
import sys
import os

# Add current directory to path for _lib imports (flat structure)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _lib.weather_service import get_weather_service


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        result = asyncio.run(self._get_wind_grid())
        
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
    
    async def _get_wind_grid(self):
        service = get_weather_service()
        wind_grid = await service.get_wind_grid()
        return wind_grid.model_dump()

