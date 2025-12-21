from http.server import BaseHTTPRequestHandler
import json
import asyncio
import sys
import os

# Set up path for _lib imports
# In Vercel, files are bundled to /var/task/api/...
# We need to add the api directory to path
_file_dir = os.path.dirname(os.path.abspath(__file__))
_api_dir = os.path.dirname(_file_dir)  # balloons -> api
sys.path.insert(0, _api_dir)
# Also try /var/task/api for Vercel environment
sys.path.insert(0, '/var/task/api')

from _lib.balloon_service import get_balloon_service
from _lib.prediction_service import get_prediction_service


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse query parameters
        from urllib.parse import urlparse, parse_qs
        query = parse_qs(urlparse(self.path).query)
        count = int(query.get('count', ['50'])[0])
        count = max(1, min(100, count))
        
        # Run async function
        result = asyncio.run(self._get_balloons(count))
        
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
    
    async def _get_balloons(self, count: int):
        service = get_balloon_service()
        balloons = await service.get_selected_balloons(count)
        
        # Add future predictions
        prediction_service = get_prediction_service()
        for balloon in balloons.balloons:
            future_positions = await prediction_service.predict_future_positions(balloon)
            balloon.future_positions = future_positions
        
        return balloons.model_dump()

