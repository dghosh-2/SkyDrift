'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ModeTabs } from '@/components/UI/ModeTabs';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { AboutModal } from '@/components/UI/AboutModal';
import { Toast } from '@/components/UI/Toast';
import { useBalloons, useAllBalloonsCurrent } from '@/hooks/useBalloons';
import { useFires, useStorms, useWindGrid } from '@/hooks/useExternalData';
import { ViewMode, Balloon, WatchZone, BalloonPosition } from '@/types';
import { pointInPolygon } from '@/lib/utils';

// Dynamically import MapView to avoid SSR issues with Mapbox
const MapView = dynamic(
  () => import('@/components/Map/MapView').then((mod) => mod.MapView),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600 font-medium">Loading map...</p>
          <p className="text-xs text-gray-400 mt-1">Initializing SkyDrift</p>
        </div>
      </div>
    ),
  }
);

// Color palette for custom balloons
const CUSTOM_BALLOON_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

interface ToastData {
  message: string;
  locationName?: string;
  type: 'success' | 'error' | 'info';
}

export default function Home() {
  const [mode, setMode] = useState<ViewMode>('present');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showFireOverlay, setShowFireOverlay] = useState(false);
  const [showStormOverlay, setShowStormOverlay] = useState(false);
  const [showWindOverlay, setShowWindOverlay] = useState(false);
  const [customBalloons, setCustomBalloons] = useState<Balloon[]>([]);
  const [deletedBalloonIds, setDeletedBalloonIds] = useState<Set<number>>(new Set());
  const [watchZones, setWatchZones] = useState<WatchZone[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [showAbout, setShowAbout] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Fetch data
  const { balloons: apiBalloons, totalCount, isLoading: balloonsLoading } = useBalloons(50);
  const { positions: allPositions } = useAllBalloonsCurrent();
  const { fires, isLoading: firesLoading } = useFires();
  const { storms, isLoading: stormsLoading } = useStorms();
  const { winds } = useWindGrid();

  // Combine API balloons with custom balloons, filtering deleted ones
  const balloons = useMemo(() => {
    const filtered = apiBalloons.filter((b) => !deletedBalloonIds.has(b.id));
    return [...filtered, ...customBalloons];
  }, [apiBalloons, customBalloons, deletedBalloonIds]);

  // Calculate balloons in storms and over fires
  const { balloonsInStorms, balloonsOverFires } = useMemo(() => {
    let inStorms = 0;
    let overFires = 0;

    allPositions.forEach((pos) => {
      // Check storms
      for (const storm of storms) {
        if (storm.polygon && storm.polygon.length > 0) {
          if (pointInPolygon(pos.lat, pos.lng, storm.polygon)) {
            inStorms++;
            break;
          }
        } else {
          // Simple distance check
          const dist = Math.sqrt(
            Math.pow((pos.lat - storm.lat) * 111, 2) +
            Math.pow((pos.lng - storm.lng) * 111 * Math.cos(pos.lat * Math.PI / 180), 2)
          );
          if (dist < 100) {
            inStorms++;
            break;
          }
        }
      }

      // Check fires
      for (const fire of fires) {
        const dist = Math.sqrt(
          Math.pow((pos.lat - fire.lat) * 111, 2) +
          Math.pow((pos.lng - fire.lng) * 111 * Math.cos(pos.lat * Math.PI / 180), 2)
        );
        if (dist < 50) {
          overFires++;
          break;
        }
      }
    });

    return { balloonsInStorms: inStorms, balloonsOverFires: overFires };
  }, [allPositions, storms, fires]);

  // Update watch zone statistics and record history
  useEffect(() => {
    if (watchZones.length === 0 || allPositions.length === 0) return;

    const now = Date.now();
    
    setWatchZones((prev) =>
      prev.map((zone) => {
        let balloonsInZone = 0;
        let balloonsInStorms = 0;
        let balloonsOverFires = 0;

        allPositions.forEach((pos) => {
          if (pointInPolygon(pos.lat, pos.lng, zone.polygon)) {
            balloonsInZone++;

            // Check if in storm
            for (const storm of storms) {
              if (storm.polygon && pointInPolygon(pos.lat, pos.lng, storm.polygon)) {
                balloonsInStorms++;
                break;
              }
            }

            // Check if over fire
            for (const fire of fires) {
              const dist = Math.sqrt(
                Math.pow((pos.lat - fire.lat) * 111, 2) +
                Math.pow((pos.lng - fire.lng) * 111 * Math.cos(pos.lat * Math.PI / 180), 2)
              );
              if (dist < 50) {
                balloonsOverFires++;
                break;
              }
            }
          }
        });

        // Add to history (limit to last 50 entries, record every update)
        const lastEntry = zone.history[zone.history.length - 1];
        const shouldRecord = !lastEntry || (now - lastEntry.timestamp > 60000); // Record at most once per minute
        
        const newHistory = shouldRecord 
          ? [...zone.history, { timestamp: now, balloonsInZone, balloonsInStorms, balloonsOverFires }].slice(-50)
          : zone.history;

        return {
          ...zone,
          balloonsInZone,
          balloonsInStorms,
          balloonsOverFires,
          history: newHistory,
        };
      })
    );
  }, [allPositions, storms, fires, watchZones.length]);

  // Handle balloon deletion
  const handleBalloonDelete = useCallback((balloonId: number) => {
    // Check if it's a custom balloon
    if (customBalloons.some((b) => b.id === balloonId)) {
      setCustomBalloons((prev) => prev.filter((b) => b.id !== balloonId));
    } else {
      setDeletedBalloonIds((prev) => new Set([...prev, balloonId]));
    }
  }, [customBalloons]);

  // Handle adding a custom balloon
  const handleAddBalloon = useCallback((lat: number, lng: number, name: string) => {
    const newId = Date.now();
    const color = CUSTOM_BALLOON_COLORS[customBalloons.length % CUSTOM_BALLOON_COLORS.length];

    // Create simulated positions for the past 24 hours
    const positions: BalloonPosition[] = [];
    for (let hour = 0; hour <= 23; hour++) {
      // Simulate slight movement over time
      const drift = hour * 0.1;
      positions.push({
        lat: lat + (Math.random() - 0.5) * drift,
        lng: lng + (Math.random() - 0.5) * drift,
        altitude: 10000 + Math.random() * 5000,
        hours_ago: hour,
      });
    }

    // Create future positions
    const futurePositions: BalloonPosition[] = [5, 10].map((hours) => ({
      lat: lat + (Math.random() - 0.5) * hours * 0.2,
      lng: lng + (Math.random() - 0.5) * hours * 0.2,
      altitude: 10000 + Math.random() * 5000,
      hours_ago: -hours,
    }));

    const newBalloon: Balloon = {
      id: newId,
      color,
      positions,
      current: positions[0],
      future_positions: futurePositions,
    };

    setCustomBalloons((prev) => [...prev, newBalloon]);
    
    // Show toast notification
    setToast({
      message: 'Balloon added successfully!',
      locationName: name,
      type: 'success',
    });
  }, [customBalloons.length]);

  // Handle watch zone creation
  const handleWatchZoneCreate = useCallback((polygon: number[][]) => {
    if (watchZones.length >= 5) return;

    const newZone: WatchZone = {
      id: Date.now(),
      name: `Zone ${watchZones.length + 1}`,
      polygon,
      balloonsInZone: 0,
      balloonsInStorms: 0,
      balloonsOverFires: 0,
      createdAt: Date.now(),
      history: [],
    };

    setWatchZones((prev) => [...prev, newZone]);
  }, [watchZones.length]);

  // Handle watch zone deletion
  const handleWatchZoneDelete = useCallback((id: number) => {
    setWatchZones((prev) => prev.filter((z) => z.id !== id));
  }, []);

  // Handle filter changes - only one filter at a time
  const handleFireOverlayChange = useCallback((show: boolean) => {
    if (show) {
      setShowStormOverlay(false);
      setShowWindOverlay(false);
    }
    setShowFireOverlay(show);
  }, []);

  const handleStormOverlayChange = useCallback((show: boolean) => {
    if (show) {
      setShowFireOverlay(false);
      setShowWindOverlay(false);
    }
    setShowStormOverlay(show);
  }, []);

  const handleWindOverlayChange = useCallback((show: boolean) => {
    if (show) {
      setShowFireOverlay(false);
      setShowStormOverlay(false);
    }
    setShowWindOverlay(show);
  }, []);

  const isLoading = balloonsLoading || firesLoading || stormsLoading;
  const isInitialLoad = balloonsLoading && balloons.length === 0;

  // Show full-screen loading until initial data is ready
  if (isInitialLoad) {
    return (
      <main className="h-screen w-screen overflow-hidden relative flex items-center justify-center">
        {/* Animated background - light blue theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-100" />
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating balloons in background */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${10 + (i % 4) * 25}%`,
                top: `${15 + Math.floor(i / 4) * 30}%`,
                animation: `float ${3 + (i % 3)}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
              }}
            >
              <div 
                className="w-6 h-7 rounded-full opacity-40"
                style={{ 
                  backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#F7DC6F', '#BB8FCE'][i % 6],
                }}
              />
            </div>
          ))}
          {/* Subtle cloud pattern */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.8) 0%, transparent 70%)',
              backgroundSize: '200px 100px',
            }}
          />
        </div>
        
        {/* Main content */}
        <div className="relative z-10 text-center px-6">
          {/* Animated logo */}
          <div className="relative mb-10">
            {/* Outer glow ring */}
            <div className="absolute inset-0 w-32 h-32 mx-auto rounded-full bg-sky-400/30 blur-xl animate-pulse" />
            
            {/* Spinning ring */}
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-sky-300/50" />
              <div 
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-cyan-400"
                style={{ animation: 'spin 2s linear infinite' }}
              />
              <div 
                className="absolute inset-2 rounded-full border border-transparent border-t-cyan-400"
                style={{ animation: 'spin 3s linear infinite reverse' }}
              />
              
              {/* Center balloon icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className="text-5xl"
                  style={{ animation: 'bounce 2s ease-in-out infinite' }}
                >
                  🎈
                </div>
              </div>
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-4xl font-bold text-sky-900 mb-3 tracking-tight">
            SkyDrift
          </h1>
          <p className="text-sky-600 text-lg mb-8 font-light">
            Balloon Constellation Tracker
          </p>
          
          {/* Loading status */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-2 h-2 bg-sky-500 rounded-full animate-ping" />
            <span className="text-sky-700 text-sm font-medium">
              Connecting to satellite network...
            </span>
          </div>
        </div>
        
        {/* CSS for float animation */}
        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden relative bg-[#fafafa]">
      {/* Map - Full screen, sidebar overlays */}
      <div className="h-full w-full absolute inset-0">
        <MapView
          balloons={balloons}
          mode={mode}
          fires={fires}
          storms={storms}
          winds={winds}
          showFireOverlay={showFireOverlay}
          showStormOverlay={showStormOverlay}
          showWindOverlay={showWindOverlay}
          onBalloonDelete={handleBalloonDelete}
          watchZones={watchZones}
          onWatchZoneCreate={handleWatchZoneCreate}
          isDrawingMode={isDrawingMode}
          setIsDrawingMode={setIsDrawingMode}
        />
      </div>

      {/* Mode tabs */}
      <ModeTabs mode={mode} onModeChange={setMode} />

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        totalBalloons={totalCount}
        displayedBalloons={balloons.length}
        balloonsInStorms={balloonsInStorms}
        balloonsOverFires={balloonsOverFires}
        fires={fires}
        storms={storms}
        showFireOverlay={showFireOverlay}
        showStormOverlay={showStormOverlay}
        showWindOverlay={showWindOverlay}
        onFireOverlayChange={handleFireOverlayChange}
        onStormOverlayChange={handleStormOverlayChange}
        onWindOverlayChange={handleWindOverlayChange}
        onAddBalloon={handleAddBalloon}
        watchZones={watchZones}
        onDeleteWatchZone={handleWatchZoneDelete}
        onStartDrawing={() => setIsDrawingMode(true)}
        isDrawingMode={isDrawingMode}
        onOpenAbout={() => setShowAbout(true)}
      />

      {/* About Modal */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          locationName={toast.locationName}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Background loading indicator (for refreshes) */}
      {isLoading && !isInitialLoad && (
        <div className="fixed bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl px-4 py-3 flex items-center gap-3 z-20 border border-gray-100">
          <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm text-gray-600 font-medium">Refreshing data...</span>
        </div>
      )}
    </main>
  );
}
