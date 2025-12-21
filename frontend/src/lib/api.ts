const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Balloons
  getSelectedBalloons: (count = 50) =>
    fetchAPI<import('@/types').SelectedBalloons>(`/api/balloons/selected?count=${count}`),

  getAllBalloonsCurrent: () =>
    fetchAPI<import('@/types').BalloonPosition[]>('/api/balloons/all/current'),

  // Weather
  getWeather: (lat: number, lng: number) =>
    fetchAPI<import('@/types').WeatherData | null>(`/api/weather/${lat}/${lng}`),

  getWindGrid: () =>
    fetchAPI<import('@/types').WindGrid>('/api/weather/wind/grid'),

  // Fires
  getFires: () =>
    fetchAPI<import('@/types').FireData>('/api/fires'),

  checkFireAtLocation: (lat: number, lng: number) =>
    fetchAPI<{ lat: number; lng: number; is_over_fire: boolean }>(
      `/api/fires/check/${lat}/${lng}`
    ),

  // Storms
  getStorms: () =>
    fetchAPI<import('@/types').StormData>('/api/storms'),

  checkStormAtLocation: (lat: number, lng: number) =>
    fetchAPI<{
      lat: number;
      lng: number;
      in_storm: boolean;
      storm: import('@/types').Storm | null;
    }>(`/api/storms/check/${lat}/${lng}`),

  // Location parsing
  parseLocation: (query: string) =>
    fetchAPI<import('@/types').LocationResponse>('/api/location/parse', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
};

// SWR fetcher
export const fetcher = <T>(url: string): Promise<T> =>
  fetch(`${API_BASE}${url}`).then((res) => res.json());

