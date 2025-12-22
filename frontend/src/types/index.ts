export interface BalloonPosition {
  lat: number;
  lng: number;
  altitude?: number;
  hours_ago: number;
}

export interface Balloon {
  id: number;
  color: string;
  positions: BalloonPosition[];
  current: BalloonPosition;
  future_positions?: BalloonPosition[];
}

export interface SelectedBalloons {
  balloons: Balloon[];
  total_count: number;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  pressure: number;
  description: string;
  wind_speed: number;
  wind_direction: number;
  clouds: number;
  region: string;
}

export interface WindData {
  lat: number;
  lng: number;
  speed: number;
  direction: number;
}

export interface WindGrid {
  winds: WindData[];
  timestamp: number;
}

export interface Fire {
  lat: number;
  lng: number;
  brightness: number;
  confidence: string;
  acq_date: string;
  acq_time: string;
}

export interface FireData {
  fires: Fire[];
  count: number;
  regions: Record<string, number>;
}

export interface Storm {
  id: string;
  name: string;
  lat: number;
  lng: number;
  severity: string;
  description: string;
  start_time?: string;
  end_time?: string;
  polygon?: number[][];
}

export interface StormData {
  storms: Storm[];
  count: number;
  regions: Record<string, number>;
}

export interface LocationResponse {
  success: boolean;
  lat?: number;
  lng?: number;
  name?: string;
  error?: string;
}

export interface WatchZoneHistoryEntry {
  timestamp: number;
  balloonsInZone: number;
  balloonsInStorms: number;
  balloonsOverFires: number;
}

export interface WatchZone {
  id: number;
  name: string;
  polygon: number[][];
  balloonsInZone: number;
  balloonsInStorms: number;
  balloonsOverFires: number;
  createdAt: number;
  history: WatchZoneHistoryEntry[];
}

export type ViewMode = 'present' | 'historic' | 'future';

