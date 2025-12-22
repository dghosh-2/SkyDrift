'use client';

import { useState } from 'react';
import { Fire, Storm, WatchZone } from '@/types';
import { Toggle } from '../UI/Toggle';
import { AddBalloonSection } from './AddBalloonSection';
import { WatchZonesSection } from './WatchZonesSection';
import { getWindColor } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  totalBalloons: number;
  displayedBalloons: number;
  balloonsInStorms: number;
  balloonsOverFires: number;
  fires: Fire[];
  storms: Storm[];
  showFireOverlay: boolean;
  showStormOverlay: boolean;
  showWindOverlay: boolean;
  onFireOverlayChange: (show: boolean) => void;
  onStormOverlayChange: (show: boolean) => void;
  onWindOverlayChange: (show: boolean) => void;
  onAddBalloon: (lat: number, lng: number, name: string) => void;
  watchZones: WatchZone[];
  onDeleteWatchZone: (id: number) => void;
  onStartDrawing: () => void;
  isDrawingMode: boolean;
  onOpenAbout: () => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  totalBalloons,
  displayedBalloons,
  balloonsInStorms,
  balloonsOverFires,
  fires,
  storms,
  showFireOverlay,
  showStormOverlay,
  showWindOverlay,
  onFireOverlayChange,
  onStormOverlayChange,
  onWindOverlayChange,
  onAddBalloon,
  watchZones,
  onDeleteWatchZone,
  onStartDrawing,
  isDrawingMode,
  onOpenAbout,
}: SidebarProps) {
  const [activeSection, setActiveSection] = useState<'main' | 'watchzones'>('main');

  // Group storms by region
  const stormsByRegion = storms.reduce((acc, storm) => {
    const region = storm.name.split(' ')[0] || 'Other';
    if (!acc[region]) acc[region] = [];
    acc[region].push(storm);
    return acc;
  }, {} as Record<string, Storm[]>);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className={`
          fixed top-1/2 -translate-y-1/2 z-20
          w-7 h-20 bg-white/95 backdrop-blur-sm rounded-r-xl shadow-lg border border-l-0 border-gray-200
          flex items-center justify-center
          transition-all duration-300 hover:bg-sky-50 hover:border-sky-200
          ${isOpen ? 'left-[340px]' : 'left-0'}
        `}
      >
        <svg
          className={`w-4 h-4 text-sky-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Sidebar panel */}
      <div
        className={`
          fixed top-0 left-0 h-full w-[340px] bg-gradient-to-b from-white to-gray-50 shadow-2xl z-20
          transition-transform duration-300 overflow-hidden border-r border-gray-100
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-600">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  🎈 SkyDrift
                </h1>
                <p className="text-sky-100 text-xs mt-1">Balloon Constellation Tracker</p>
              </div>
              <button
                onClick={onOpenAbout}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                title="About & Help"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="flex bg-white border-b border-gray-100">
            <button
              onClick={() => setActiveSection('main')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeSection === 'main'
                  ? 'text-sky-600 border-b-2 border-sky-500 bg-sky-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>📊</span> Dashboard
            </button>
            <button
              onClick={() => setActiveSection('watchzones')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeSection === 'watchzones'
                  ? 'text-sky-600 border-b-2 border-sky-500 bg-sky-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>🗺️</span> Watch Zones
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeSection === 'main' ? (
              <div className="p-4 space-y-5">
                {/* Highlights */}
                <section>
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>✨</span> Live Stats
                  </h2>
                  <div className="space-y-3">
                    {/* Total Balloons Card */}
                    <div className="bg-gradient-to-r from-sky-500 to-cyan-500 rounded-xl p-4 text-white shadow-lg shadow-sky-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sky-100 text-xs font-medium">Balloons on Display</p>
                          <p className="text-3xl font-bold mt-1">{displayedBalloons}</p>
                          <p className="text-sky-100 text-xs mt-1">
                            of {totalBalloons.toLocaleString()} in constellation
                          </p>
                        </div>
                        <div className="text-4xl opacity-80">🎈</div>
                      </div>
                    </div>

                    {/* Storm Card */}
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white shadow-lg shadow-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100 text-xs font-medium">In Storm Zones</p>
                          <p className="text-2xl font-bold mt-1">{balloonsInStorms}</p>
                          <p className="text-blue-200 text-xs mt-1">
                            {storms.length} active storm{storms.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-3xl opacity-80">⛈️</div>
                      </div>
                    </div>

                    {/* Fire Card */}
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white shadow-lg shadow-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-100 text-xs font-medium">Over Wildfires</p>
                          <p className="text-2xl font-bold mt-1">{balloonsOverFires}</p>
                          <p className="text-orange-200 text-xs mt-1">
                            {fires.length.toLocaleString()} active fire{fires.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-3xl opacity-80">🔥</div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Storm details - always show all types */}
                <section className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>🌀</span> Storm Activity
                  </h3>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {/* Always show these storm types */}
                    {['Flood Warning', 'Severe Thunderstorm', 'Tornado Warning', 'Winter Storm', 'Hurricane', 'Tropical Storm'].map((stormType) => {
                      const count = storms.filter(s => s.name.toLowerCase().includes(stormType.toLowerCase().split(' ')[0])).length;
                      return (
                        <div
                          key={stormType}
                          className={`flex items-center justify-between text-xs py-1.5 px-2 rounded-lg transition-colors ${count > 0 ? 'hover:bg-blue-50 bg-blue-50/30' : 'bg-gray-50/50'}`}
                        >
                          <span className={`truncate max-w-[200px] ${count > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                            {stormType}
                          </span>
                          <span className={`font-mono font-bold px-2 py-0.5 rounded-full ${count > 0 ? 'text-blue-600 bg-blue-100' : 'text-gray-400 bg-gray-100'}`}>
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Filters */}
                <section className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span>🗂️</span> Map Layers
                  </h2>
                  <div className="space-y-3">
                    <Toggle
                      enabled={showFireOverlay}
                      onChange={onFireOverlayChange}
                      label="🔥 Wildfire zones"
                      color="#ef4444"
                    />
                    <Toggle
                      enabled={showStormOverlay}
                      onChange={onStormOverlayChange}
                      label="⛈️ Storm zones"
                      color="#3b82f6"
                    />
                    <Toggle
                      enabled={showWindOverlay}
                      onChange={onWindOverlayChange}
                      label="💨 Wind patterns"
                      color="#10b981"
                    />
                  </div>

                  {/* Wind legend */}
                  {showWindOverlay && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-100">
                      <p className="text-xs font-semibold text-emerald-700 mb-2">💨 Wind Speed (m/s)</p>
                      <div className="flex items-center gap-1">
                        {[0, 2, 5, 10, 15, 20].map((speed) => (
                          <div key={speed} className="flex-1 text-center">
                            <div
                              className="h-3 rounded-sm shadow-sm"
                              style={{ backgroundColor: getWindColor(speed) }}
                            />
                            <span className="text-[10px] text-gray-500 font-mono">{speed}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* Add Balloon */}
                <section className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <AddBalloonSection onAddBalloon={onAddBalloon} />
                </section>
              </div>
            ) : (
              <WatchZonesSection
                watchZones={watchZones}
                onDelete={onDeleteWatchZone}
                onStartDrawing={onStartDrawing}
                isDrawingMode={isDrawingMode}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
