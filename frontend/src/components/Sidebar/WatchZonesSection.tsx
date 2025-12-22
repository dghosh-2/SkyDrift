'use client';

import { useState } from 'react';
import { WatchZone } from '@/types';

interface WatchZonesSectionProps {
  watchZones: WatchZone[];
  onDelete: (id: number) => void;
  onStartDrawing: () => void;
  isDrawingMode: boolean;
}

// Simple mini chart component
function MiniChart({ data, color, label }: { data: number[]; color: string; label: string }) {
  if (data.length < 2) return null;
  
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-500">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{data[data.length - 1]}</span>
      </div>
      <svg viewBox="0 0 100 40" className="w-full h-8">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    </div>
  );
}

export function WatchZonesSection({
  watchZones,
  onDelete,
  onStartDrawing,
  isDrawingMode,
}: WatchZonesSectionProps) {
  const [expandedZone, setExpandedZone] = useState<number | null>(null);
  const canAddMore = watchZones.length < 5;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <span>📍</span> Watch Zones
        </h2>
        <span className="text-xs font-semibold text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">
          {watchZones.length}/5
        </span>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        Draw polygons on the map to monitor balloon activity in specific regions. Click a zone to view historic data.
      </p>

      {/* Add zone button */}
      <button
        onClick={onStartDrawing}
        disabled={!canAddMore || isDrawingMode}
        className={`
          w-full py-3.5 rounded-xl text-sm font-semibold transition-all
          flex items-center justify-center gap-2
          ${isDrawingMode
            ? 'bg-gradient-to-r from-sky-100 to-cyan-100 text-sky-700 border-2 border-sky-300 shadow-lg shadow-sky-100'
            : canAddMore
              ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-200 hover:shadow-xl hover:shadow-sky-300'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        {isDrawingMode ? (
          <>
            <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
            <span>Drawing... Click on map</span>
          </>
        ) : (
          <>
            <span>✏️</span>
            <span>{canAddMore ? 'Draw New Zone' : 'Maximum zones reached'}</span>
          </>
        )}
      </button>

      {isDrawingMode && (
        <div className="flex items-start gap-2 p-3 bg-sky-50 rounded-xl border border-sky-100">
          <span className="text-sky-500">💡</span>
          <p className="text-xs text-sky-700">
            Click points on the map to draw a polygon. Double-click to complete.
          </p>
        </div>
      )}

      {/* Watch zones list */}
      <div className="space-y-3">
        {watchZones.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <p className="text-4xl mb-3">🗺️</p>
            <p className="text-sm font-medium text-gray-600">No watch zones yet</p>
            <p className="text-xs text-gray-400 mt-1">Draw a polygon on the map to get started</p>
          </div>
        ) : (
          watchZones.map((zone, index) => (
            <div
              key={zone.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Zone header */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-800">{zone.name}</h3>
                      {zone.createdAt && (
                        <p className="text-[10px] text-gray-400">
                          Active for {formatDuration(Date.now() - zone.createdAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}
                      className="text-gray-400 hover:text-sky-500 transition-colors p-1.5 hover:bg-sky-50 rounded-lg"
                      title="View history"
                    >
                      <svg className={`w-4 h-4 transition-transform ${expandedZone === zone.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(zone.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg"
                      title="Delete zone"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gradient-to-br from-sky-50 to-cyan-50 rounded-lg p-2.5 text-center border border-sky-100">
                    <p className="font-mono text-xl font-bold text-sky-600">
                      {zone.balloonsInZone}
                    </p>
                    <p className="text-[10px] text-sky-500 font-medium">🎈 Balloons</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-2.5 text-center border border-blue-100">
                    <p className="font-mono text-xl font-bold text-blue-600">
                      {zone.balloonsInStorms}
                    </p>
                    <p className="text-[10px] text-blue-500 font-medium">⛈️ Storms</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-2.5 text-center border border-orange-100">
                    <p className="font-mono text-xl font-bold text-red-600">
                      {zone.balloonsOverFires}
                    </p>
                    <p className="text-[10px] text-red-500 font-medium">🔥 Fires</p>
                  </div>
                </div>
              </div>

              {/* Expanded history section */}
              {expandedZone === zone.id && (
                <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50 to-white p-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>📊</span> Historic Data
                  </h4>
                  
                  {zone.history && zone.history.length > 1 ? (
                    <div className="space-y-3">
                      {/* Mini charts */}
                      <div className="grid grid-cols-1 gap-2">
                        <MiniChart 
                          data={zone.history.map(h => h.balloonsInZone)} 
                          color="#0ea5e9" 
                          label="Balloons in Zone"
                        />
                        <MiniChart 
                          data={zone.history.map(h => h.balloonsInStorms)} 
                          color="#3b82f6" 
                          label="In Storm Zones"
                        />
                        <MiniChart 
                          data={zone.history.map(h => h.balloonsOverFires)} 
                          color="#ef4444" 
                          label="Over Fires"
                        />
                      </div>
                      
                      {/* Time range */}
                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-gray-100">
                        <span>{formatTime(zone.history[0].timestamp)}</span>
                        <span>{zone.history.length} data points</span>
                        <span>{formatTime(zone.history[zone.history.length - 1].timestamp)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      <p className="text-xs">Not enough data yet</p>
                      <p className="text-[10px] mt-1">History will appear as data is collected</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
