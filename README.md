# SkyDrift - Balloon Constellation Tracker

A real-time visualization app for tracking Windborne's global sounding balloon constellation, integrating weather, fire, and storm data.
App is fully deployed at: https://sky-drift.vercel.app

## Features

### Three Viewing Modes
- **Present**: View current positions of 50 spatially distributed balloons
- **Historic**: See balloon paths over the last 23 hours with smooth trajectory curves
- **Future**: Predicted positions 5 and 10 hours ahead based on trajectory + wind data

### Interactive Map
- Click on any balloon to see detailed information:
  - Location and coordinates
  - Weather data (temperature, humidity, wind, clouds)
  - Fire proximity status
  - Storm zone status
- Delete balloons from the display

### Sidebar Features
- **Highlights**: Total balloon count, balloons in storms, balloons over fires
- **Map Layers**: Toggle fire zones (red), storm zones (blue), wind patterns
- **Add Balloon**: Use natural language to add custom balloons (e.g., "Tokyo", "Pacific Ocean")
- **Watch Zones**: Draw up to 5 polygon regions to monitor balloon activity

### Data Sources
- **Windborne Systems**: Live balloon constellation data (24-hour history)
- **NASA FIRMS**: Active wildfire detection (VIIRS satellite)
- **NOAA**: Severe weather alerts and storm data
- **OpenWeatherMap**: Weather and wind data

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Mapbox GL JS, TailwindCSS
- **Backend**: Python 3.11+, FastAPI, httpx
- **Caching**: In-memory with TTL (no database required)




## API Endpoints

| Endpoint | Description | Cache TTL |
|----------|-------------|-----------|
| `GET /api/balloons/selected` | 50 selected balloons with 24h history | 5 min |
| `GET /api/balloons/all/current` | All balloon current positions | 5 min |
| `GET /api/fires` | Active wildfires globally | 15 min |
| `GET /api/storms` | Active severe weather alerts | 10 min |
| `GET /api/weather/{lat}/{lng}` | Weather at location | 10 min |
| `GET /api/weather/wind/grid` | Global wind grid data | 15 min |
| `POST /api/location/parse` | Parse location to coordinates | No cache |

## Project Structure

```
SkyDrift/
├── frontend/                 # Next.js app
│   ├── src/
│   │   ├── app/              # App router pages
│   │   ├── components/       # React components
│   │   │   ├── Map/          # Map, markers, layers
│   │   │   ├── Sidebar/      # Sidebar components
│   │   │   └── UI/           # Shared UI components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities, API client
│   │   └── types/            # TypeScript types
│   └── package.json
├── backend/                  # Python FastAPI
│   ├── app/
│   │   ├── main.py           # FastAPI app entry
│   │   ├── routers/          # API routes
│   │   ├── services/         # Business logic
│   │   ├── models/           # Pydantic models
│   │   └── utils/            # Helpers, caching
│   └── requirements.txt
├── .env                      # API keys
└── .cursorrules              # Cursor rules
```

