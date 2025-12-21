from http.server import BaseHTTPRequestHandler
import json
import asyncio
import sys
import os

# api/fires/index.py -> need to go up 1 level to reach api directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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

