'use client';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🎈</span>
              <div>
                <h2 className="text-2xl font-bold">SkyDrift</h2>
                <p className="text-sky-100 text-sm">Balloon Constellation Tracker</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Introduction */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span>👋</span> Welcome!
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              SkyDrift visualizes Windborne Systems&apos; global sounding balloon constellation in real-time. 
              Track balloon positions, view historical paths, and see predicted future locations based on 
              trajectory analysis and wind patterns. The app displays 50 spatially distributed balloons 
              from the full constellation of ~1,000 balloons.
            </p>
          </section>

          {/* Viewing Modes */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>🎯</span> Viewing Modes
            </h3>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">⏪</span>
                  <span className="font-semibold text-gray-800">Historic</span>
                </div>
                <p className="text-sm text-gray-600">
                  View balloon positions from the past 23 hours. Shows markers at -23h, -13h, -5h, 
                  and current position with smooth trajectory paths.
                </p>
              </div>
              <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📍</span>
                  <span className="font-semibold text-gray-800">Present</span>
                </div>
                <p className="text-sm text-gray-600">
                  Default view showing current balloon positions. Click any balloon to see 
                  weather data, fire/storm status, and location details.
                </p>
              </div>
              <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">⏩</span>
                  <span className="font-semibold text-gray-800">Future</span>
                </div>
                <p className="text-sm text-gray-600">
                  Predicted positions at +5h and +10h ahead. Uses trajectory momentum and wind 
                  data to estimate where balloons will travel.
                </p>
              </div>
            </div>
          </section>

          {/* Prediction Math */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>🔮</span> How Predictions Work
            </h3>
            <div className="bg-gradient-to-br from-sky-50 to-cyan-50 rounded-xl p-4 border border-sky-100">
              <p className="text-sm text-gray-700 mb-3">
                Future positions are calculated using a weighted blend of two factors:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-3">
                  <span className="bg-sky-200 text-sky-700 px-2 py-0.5 rounded font-mono text-xs font-bold">60%</span>
                  <div>
                    <span className="font-semibold text-gray-800">Trajectory Momentum</span>
                    <p className="text-gray-600 text-xs mt-0.5">
                      Calculated from the balloon&apos;s velocity over the last 6 hours. 
                      We compute lat/lng velocity (degrees per hour) and extrapolate forward.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-cyan-200 text-cyan-700 px-2 py-0.5 rounded font-mono text-xs font-bold">40%</span>
                  <div>
                    <span className="font-semibold text-gray-800">Wind Influence</span>
                    <p className="text-gray-600 text-xs mt-0.5">
                      Current wind speed and direction at the balloon&apos;s location, converted 
                      to displacement using: distance = speed × time, then to lat/lng degrees.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-sky-200">
                <p className="text-xs text-sky-600 font-mono">
                  final_position = 0.6 × trajectory_position + 0.4 × wind_displaced_position
                </p>
              </div>
            </div>
          </section>

          {/* Watch Zones */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>🗺️</span> Watch Zones & Historic Data
            </h3>
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-700 mb-3">
                Watch Zones allow you to monitor specific regions of interest:
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-sky-500">•</span>
                  Draw up to 5 custom polygon regions on the map
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-500">•</span>
                  Track balloons entering/exiting your zones in real-time
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-500">•</span>
                  View storm and fire exposure for balloons in each zone
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-500">•</span>
                  <strong>Historic Data:</strong> Click the expand arrow on any zone to see graphs showing how balloon count, storm exposure, and fire exposure have changed over time since the zone was created
                </li>
              </ul>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  📊 Data is recorded every minute and stored for the session duration
                </p>
              </div>
            </div>
          </section>

          {/* Features */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>✨</span> Features
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <span className="text-lg">🔥</span>
                <p className="text-sm font-semibold text-gray-800 mt-1">Wildfire Overlay</p>
                <p className="text-xs text-gray-500">NASA FIRMS satellite data</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <span className="text-lg">⛈️</span>
                <p className="text-sm font-semibold text-gray-800 mt-1">Storm Zones</p>
                <p className="text-xs text-gray-500">NOAA weather alerts</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <span className="text-lg">💨</span>
                <p className="text-sm font-semibold text-gray-800 mt-1">Wind Patterns</p>
                <p className="text-xs text-gray-500">OpenWeatherMap data</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <span className="text-lg">➕</span>
                <p className="text-sm font-semibold text-gray-800 mt-1">Add Balloon</p>
                <p className="text-xs text-gray-500">Natural language location</p>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>💡</span> Tips
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-sky-500">•</span>
                Click any balloon to see detailed weather, fire, and storm data
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500">•</span>
                Use &quot;Add Balloon&quot; to place custom balloons at any location using natural language (e.g., &quot;Paris&quot;, &quot;Pacific Ocean&quot;)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500">•</span>
                Only one map layer (fire/storm/wind) can be active at a time
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500">•</span>
                Watch Zones track historic data - click the expand arrow to view graphs
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500">•</span>
                The sidebar shows &quot;Balloons on Display&quot; (50) out of the full constellation (~1,000)
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Data sources: Windborne Systems • NASA FIRMS • NOAA • OpenWeatherMap
          </p>
        </div>
      </div>
    </div>
  );
}

