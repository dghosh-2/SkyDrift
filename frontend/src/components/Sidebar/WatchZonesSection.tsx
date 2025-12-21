'use client';

import { WatchZone } from '@/types';

interface WatchZonesSectionProps {
  watchZones: WatchZone[];
  onDelete: (id: number) => void;
  onStartDrawing: () => void;
  isDrawingMode: boolean;
}

export function WatchZonesSection({
  watchZones,
  onDelete,
  onStartDrawing,
  isDrawingMode,
}: WatchZonesSectionProps) {
  const canAddMore = watchZones.length < 5;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <span>📍</span> Watch Zones
        </h2>
        <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
          {watchZones.length}/5
        </span>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        Draw polygons on the map to monitor balloon activity in specific regions.
      </p>

      {/* Add zone button */}
      <button
        onClick={onStartDrawing}
        disabled={!canAddMore || isDrawingMode}
        className={`
          w-full py-3.5 rounded-xl text-sm font-semibold transition-all
          flex items-center justify-center gap-2
          ${isDrawingMode
            ? 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border-2 border-purple-300 shadow-lg shadow-purple-100'
            : canAddMore
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        {isDrawingMode ? (
          <>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
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
        <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-xl border border-purple-100">
          <span className="text-purple-500">💡</span>
          <p className="text-xs text-purple-700">
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
              className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </span>
                  <h3 className="font-semibold text-sm text-gray-800">{zone.name}</h3>
                </div>
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

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-2.5 text-center border border-indigo-100">
                  <p className="font-mono text-xl font-bold text-indigo-600">
                    {zone.balloonsInZone}
                  </p>
                  <p className="text-[10px] text-indigo-500 font-medium">🎈 Balloons</p>
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
          ))
        )}
      </div>
    </div>
  );
}
