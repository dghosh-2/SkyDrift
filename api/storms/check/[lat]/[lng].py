from http.server import BaseHTTPRequestHandler
import json
import asyncio
import sys
import os
import re

# Set up path for _lib imports
_file_dir = os.path.dirname(os.path.abspath(__file__))
_api_dir = os.path.dirname(os.path.dirname(os.path.dirname(_file_dir)))  # [lng] -> [lat] -> check -> storms -> api
sys.path.insert(0, _api_dir)
sys.path.insert(0, '/var/task/api')

from _lib.storm_service import get_storm_service


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Extract lat/lng from path
        match = re.search(r'/storms/check/([^/]+)/([^/]+)', self.path)
        if not match:
            self.send_error(400, "Invalid path")
            return
        
        lat = float(match.group(1))
        lng = float(match.group(2))
        
        result = asyncio.run(self._check_storm(lat, lng))
        
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
    
    async def _check_storm(self, lat: float, lng: float):
        service = get_storm_service()
        storm_data = await service.get_active_storms()
        storm = service.is_balloon_in_storm(lat, lng, storm_data.storms)
        return {
            "lat": lat,
            "lng": lng,
            "in_storm": storm is not None,
            "storm": storm.model_dump() if storm else None,
        }

