'use client';

import { useEffect, useState, useMemo } from 'react';
import { Balloon, BalloonPosition, WeatherData, Storm, Fire, ViewMode } from '@/types';
import { api } from '@/lib/api';
import { windDirectionToCompass } from '@/lib/utils';

interface BalloonPopupProps {
  balloon: Balloon;
  position: BalloonPosition;
  onClose: () => void;
  onDelete?: () => void;
  isFuture?: boolean;
  fires: Fire[];
  mode: ViewMode;
}

export function BalloonPopup({
  balloon,
  position,
  onClose,
  onDelete,
  isFuture = false,
  fires,
  mode,
}: BalloonPopupProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [storm, setStorm] = useState<Storm | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if balloon is over a fire locally
  const isOverFire = useMemo(() => {
    for (const fire of fires) {
      const dist = Math.sqrt(
        Math.pow((position.lat - fire.lat) * 111, 2) +
        Math.pow((position.lng - fire.lng) * 111 * Math.cos(position.lat * Math.PI / 180), 2)
      );
      if (dist < 50) return true;
    }
    return false;
  }, [position.lat, position.lng, fires]);

  // Calculate trajectory data for future predictions
  const trajectoryData = useMemo(() => {
    if (!isFuture || position.hours_ago >= 0) return null;
    
    // Get recent positions to calculate velocity
    const recentPositions = balloon.positions
      .filter(p => p.hours_ago >= 0 && p.hours_ago <= 6)
      .sort((a, b) => a.hours_ago - b.hours_ago);
    
    if (recentPositions.length < 2) return null;
    
    const newest = recentPositions[0];
    const oldest = recentPositions[recentPositions.length - 1];
    const timeDiff = oldest.hours_ago - newest.hours_ago;
    
    if (timeDiff === 0) return null;
    
    const latVelocity = (newest.lat - oldest.lat) / timeDiff;
    const lngVelocity = (newest.lng - oldest.lng) / timeDiff;
    
    // Calculate speed in km/h (approximate)
    const speedKmH = Math.sqrt(
      Math.pow(latVelocity * 111, 2) +
      Math.pow(lngVelocity * 111 * Math.cos(newest.lat * Math.PI / 180), 2)
    );
    
    // Calculate direction
    const direction = Math.atan2(lngVelocity, latVelocity) * (180 / Math.PI);
    const compassDir = direction < 0 ? direction + 360 : direction;
    
    return {
      speedKmH: speedKmH.toFixed(1),
      direction: compassDir.toFixed(0),
      compassDirection: windDirectionToCompass(compassDir),
      latVelocity: latVelocity.toFixed(4),
      lngVelocity: lngVelocity.toFixed(4),
      hoursAhead: Math.abs(position.hours_ago),
    };
  }, [balloon.positions, position.hours_ago, isFuture]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [weatherData, stormCheck] = await Promise.all([
          api.getWeather(position.lat, position.lng),
          api.checkStormAtLocation(position.lat, position.lng),
        ]);

        setWeather(weatherData);
        setStorm(stormCheck.storm);
      } catch (error) {
        console.error('Failed to fetch balloon data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [position.lat, position.lng]);

  const timeLabel = position.hours_ago === 0
    ? '📍 Current Position'
    : position.hours_ago > 0
      ? `⏪ ${position.hours_ago}h ago`
      : `⏩ ${Math.abs(position.hours_ago)}h ahead`;

  return (
    <div className="p-4 min-w-[320px] max-w-[360px]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg"
          style={{ backgroundColor: balloon.color }}
        >
          🎈
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 text-lg">
            Balloon #{balloon.id}
          </h3>
          <p className="text-xs text-gray-500 font-medium">{timeLabel}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-xs text-gray-400">Loading data...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Region */}
          {weather && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 border border-indigo-100">
              <span className="text-2xl">📍</span>
              <div>
                <p className="text-xs text-indigo-500 font-medium">Location</p>
                <p className="text-sm font-semibold text-gray-800">
                  {weather.region}
                </p>
              </div>
            </div>
          )}

          {/* Coordinates */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium mb-1">Coordinates</p>
                <p className="font-mono text-sm text-gray-700">
                  {position.lat.toFixed(4)}°, {position.lng.toFixed(4)}°
                </p>
              </div>
              {position.altitude && (
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-medium mb-1">Altitude</p>
                  <p className="font-mono text-sm text-gray-700">
                    {(position.altitude / 1000).toFixed(1)} km
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Weather */}
          {weather && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-3 border border-orange-100">
                <p className="text-xs text-orange-500 font-medium mb-1">🌡️ Temp</p>
                <p className="font-mono text-lg font-bold text-gray-800">
                  {weather.temperature.toFixed(1)}°C
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3 border border-blue-100">
                <p className="text-xs text-blue-500 font-medium mb-1">💧 Humidity</p>
                <p className="font-mono text-lg font-bold text-gray-800">
                  {weather.humidity}%
                </p>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-3 border border-teal-100">
                <p className="text-xs text-teal-500 font-medium mb-1">💨 Wind</p>
                <p className="font-mono text-sm font-bold text-gray-800">
                  {weather.wind_speed.toFixed(1)} m/s
                </p>
                <p className="text-xs text-gray-500">{windDirectionToCompass(weather.wind_direction)}</p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-3 border border-gray-200">
                <p className="text-xs text-gray-500 font-medium mb-1">☁️ Clouds</p>
                <p className="font-mono text-lg font-bold text-gray-800">
                  {weather.clouds}%
                </p>
              </div>
            </div>
          )}

          {/* Status indicators */}
          <div className="flex flex-wrap gap-2">
            {isOverFire && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg shadow-red-200">
                <span>🔥</span>
                <span>Over Wildfire!</span>
              </div>
            )}
            {storm && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg shadow-blue-200">
                <span>⛈️</span>
                <span>In Storm Zone</span>
              </div>
            )}
            {!isOverFire && !storm && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg shadow-green-200">
                <span>✓</span>
                <span>Clear Conditions</span>
              </div>
            )}
          </div>

          {/* Future prediction details */}
          {isFuture && position.hours_ago < 0 && trajectoryData && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔮</span>
                <p className="text-sm font-bold text-purple-700">
                  Prediction Details (+{trajectoryData.hoursAhead}h)
                </p>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-purple-100">
                  <span className="text-purple-600">Trajectory Speed</span>
                  <span className="font-mono font-bold text-gray-700">{trajectoryData.speedKmH} km/h</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-purple-100">
                  <span className="text-purple-600">Heading</span>
                  <span className="font-mono font-bold text-gray-700">{trajectoryData.direction}° ({trajectoryData.compassDirection})</span>
                </div>
                {weather && (
                  <div className="flex justify-between items-center py-1.5 border-b border-purple-100">
                    <span className="text-purple-600">Wind at Location</span>
                    <span className="font-mono font-bold text-gray-700">{weather.wind_speed.toFixed(1)} m/s {windDirectionToCompass(weather.wind_direction)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-purple-600">Velocity (lat/lng)</span>
                  <span className="font-mono font-bold text-gray-700">{trajectoryData.latVelocity}° / {trajectoryData.lngVelocity}°</span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-purple-100">
                <p className="text-[10px] text-purple-500 leading-relaxed">
                  📊 Prediction blend: 60% trajectory momentum + 40% wind influence
                </p>
              </div>
            </div>
          )}

          {/* Delete button (only for current balloon) */}
          {onDelete && position.hours_ago === 0 && (
            <button
              onClick={onDelete}
              className="w-full py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove Balloon
            </button>
          )}
        </div>
      )}
    </div>
  );
}
