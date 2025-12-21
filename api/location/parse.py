from http.server import BaseHTTPRequestHandler
import json
import asyncio
import sys
import os

# Add multiple potential paths for _lib imports
_current_dir = os.path.dirname(os.path.abspath(__file__))
_api_dir = os.path.dirname(os.path.dirname(_current_dir))
sys.path.insert(0, _current_dir)
sys.path.insert(0, os.path.dirname(_current_dir))  # api directory
sys.path.insert(0, _api_dir)
sys.path.insert(0, os.path.join(_api_dir, 'api'))

from _lib.location_service import get_location_service


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body)
        query = data.get('query', '')
        
        result = asyncio.run(self._parse_location(query))
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    async def _parse_location(self, query: str):
        service = get_location_service()
        result = await service.parse_location(query)
        return result.model_dump()

