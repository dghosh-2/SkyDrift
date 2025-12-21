from http.server import BaseHTTPRequestHandler
import json
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from _lib.balloon_service import get_balloon_service


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        result = asyncio.run(self._get_all_current())
        
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
    
    async def _get_all_current(self):
        service = get_balloon_service()
        positions = await service.get_all_balloons_current()
        return [p.model_dump() for p in positions]

