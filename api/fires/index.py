from http.server import BaseHTTPRequestHandler
import json
import asyncio
import sys
import os

# Set up path for _lib imports
_file_dir = os.path.dirname(os.path.abspath(__file__))
_api_dir = os.path.dirname(_file_dir)  # fires -> api
sys.path.insert(0, _api_dir)
sys.path.insert(0, '/var/task/api')

from _lib.fire_service import get_fire_service


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        result = asyncio.run(self._get_fires())
        
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
    
    async def _get_fires(self):
        service = get_fire_service()
        fires = await service.get_active_fires()
        return fires.model_dump()

