'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Balloon, BalloonPosition, ViewMode, Fire, Storm, WindData, WatchZone } from '@/types';
import { createBalloonSVG } from './BalloonMarker';
import { BalloonPopup } from './BalloonPopup';
import { createRoot } from 'react-dom/client';
import { createSmoothPath, getWindColor } from '@/lib/utils';

import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapViewProps {
  balloons: Balloon[];
  mode: ViewMode;
  fires: Fire[];
  storms: Storm[];
  winds: WindData[];
  showFireOverlay: boolean;
  showStormOverlay: boolean;
  showWindOverlay: boolean;
  onBalloonDelete: (balloonId: number) => void;
  watchZones: WatchZone[];
  onWatchZoneCreate: (polygon: number[][]) => void;
  isDrawingMode: boolean;
  setIsDrawingMode: (drawing: boolean) => void;
}

export function MapView({
  balloons,
  mode,
  fires,
  storms,
  winds,
  showFireOverlay,
  showStormOverlay,
  showWindOverlay,
  onBalloonDelete,
  watchZones,
  onWatchZoneCreate,
  isDrawingMode,
  setIsDrawingMode,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [0, 20],
      zoom: 1.5,
      projection: 'mercator',
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    // Initialize draw control
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      defaultMode: 'simple_select',
    });
    map.current.addControl(draw.current as unknown as mapboxgl.IControl);

    map.current.on('load', () => {
      setMapLoaded(true);

      // Add empty sources for overlays
      map.current!.addSource('fire-overlay', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.current!.addSource('storm-overlay', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.current!.addSource('wind-overlay', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.current!.addSource('balloon-paths', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.current!.addSource('watch-zones', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Fire overlay layer - radius scales with zoom level
      map.current!.addLayer({
        id: 'fire-heat',
        type: 'circle',
        source: 'fire-overlay',
        paint: {
          // Circle radius scales with zoom: small when zoomed out, larger when zoomed in
          'circle-radius': [
            'interpolate', ['exponential', 2], ['zoom'],
            1, 2,      // At zoom 1: 2px radius
            3, 4,      // At zoom 3: 4px radius
            5, 8,      // At zoom 5: 8px radius
            7, 15,     // At zoom 7: 15px radius
            10, 30,    // At zoom 10: 30px radius
            12, 50     // At zoom 12+: 50px radius
          ],
          'circle-color': '#ef4444',
          'circle-opacity': 0.5,
          'circle-blur': 0.8,
        },
      });

      // Storm overlay layer
      map.current!.addLayer({
        id: 'storm-fill',
        type: 'fill',
        source: 'storm-overlay',
        paint: {
          'fill-color': '#1e40af',
          'fill-opacity': 0.3,
        },
      });

      map.current!.addLayer({
        id: 'storm-outline',
        type: 'line',
        source: 'storm-overlay',
        paint: {
          'line-color': '#1e40af',
          'line-width': 2,
          'line-opacity': 0.6,
        },
      });

      // Create arrow image for wind visualization - thicker and bolder
      const arrowSize = 32;
      const arrowCanvas = document.createElement('canvas');
      arrowCanvas.width = arrowSize;
      arrowCanvas.height = arrowSize;
      const ctx = arrowCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, arrowSize, arrowSize);
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Draw arrow pointing up (will be rotated by wind direction)
        ctx.beginPath();
        ctx.moveTo(16, 28); // Bottom center
        ctx.lineTo(16, 6);  // Top center
        ctx.stroke();
        // Arrow head - larger and bolder
        ctx.beginPath();
        ctx.moveTo(16, 4);
        ctx.lineTo(8, 14);
        ctx.lineTo(16, 10);
        ctx.lineTo(24, 14);
        ctx.closePath();
        ctx.fill();
      }
      
      arrowCanvas.toBlob((blob) => {
        if (blob) {
          const img = new Image();
          img.onload = () => {
            if (map.current && !map.current.hasImage('wind-arrow')) {
              map.current.addImage('wind-arrow', img, { sdf: true });
            }
          };
          img.src = URL.createObjectURL(blob);
        }
      });

      // Wind arrows layer - size varies with wind speed
      map.current!.addLayer({
        id: 'wind-points',
        type: 'symbol',
        source: 'wind-overlay',
        layout: {
          'icon-image': 'wind-arrow',
          // Size proportional to wind speed: base 0.6, scales up with speed
          'icon-size': [
            'interpolate', ['linear'], ['get', 'speed'],
            0, 0.5,    // Very light wind: small
            5, 0.7,    // Light wind
            10, 0.9,   // Moderate wind
            15, 1.1,   // Strong wind
            20, 1.3,   // Very strong wind
            30, 1.5    // Extreme wind: large
          ],
          'icon-rotate': ['get', 'direction'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        paint: {
          'icon-color': ['get', 'color'],
          'icon-opacity': 0.9,
        },
      });

      // Balloon paths layer
      map.current!.addLayer({
        id: 'balloon-paths',
        type: 'line',
        source: 'balloon-paths',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
          'line-opacity': 0.6,
        },
      });

      // Watch zones layer
      map.current!.addLayer({
        id: 'watch-zones-fill',
        type: 'fill',
        source: 'watch-zones',
        paint: {
          'fill-color': '#8b5cf6',
          'fill-opacity': 0.15,
        },
      });

      map.current!.addLayer({
        id: 'watch-zones-outline',
        type: 'line',
        source: 'watch-zones',
        paint: {
          'line-color': '#8b5cf6',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });

    });

    // Handle draw events
    map.current.on('draw.create', (e: { features: GeoJSON.Feature[] }) => {
      const feature = e.features[0];
      if (feature.geometry.type === 'Polygon') {
        const coords = (feature.geometry as GeoJSON.Polygon).coordinates[0] as number[][];
        onWatchZoneCreate(coords);
        draw.current?.deleteAll();
        setIsDrawingMode(false);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Handle drawing mode
  useEffect(() => {
    if (!draw.current) return;
    
    if (isDrawingMode) {
      draw.current.changeMode('draw_polygon');
    } else {
      draw.current.changeMode('simple_select');
      draw.current.deleteAll();
    }
  }, [isDrawingMode]);

  // Update fire overlay
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('fire-overlay') as mapboxgl.GeoJSONSource;
    if (!source) return;

    if (showFireOverlay && fires.length > 0) {
      const features = fires.map((fire) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [fire.lng, fire.lat],
        },
        properties: {
          brightness: fire.brightness,
        },
      }));

      source.setData({
        type: 'FeatureCollection',
        features,
      });
      map.current.setLayoutProperty('fire-heat', 'visibility', 'visible');
    } else {
      source.setData({ type: 'FeatureCollection', features: [] });
      map.current.setLayoutProperty('fire-heat', 'visibility', 'none');
    }
  }, [fires, showFireOverlay, mapLoaded]);

  // Update storm overlay
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('storm-overlay') as mapboxgl.GeoJSONSource;
    if (!source) return;

    if (showStormOverlay && storms.length > 0) {
      const features = storms
        .filter((storm) => storm.polygon && storm.polygon.length > 0)
        .map((storm) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
            coordinates: [storm.polygon!],
          },
          properties: {
            name: storm.name,
            severity: storm.severity,
          },
        }));

      // Add circles for storms without polygons
      const circleFeatures = storms
        .filter((storm) => !storm.polygon || storm.polygon.length === 0)
        .map((storm) => {
          // Create a circle polygon
          const center = [storm.lng, storm.lat];
          const radius = 100; // km
          const points = 32;
          const coords = [];
          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * 2 * Math.PI;
            const dx = radius / 111 * Math.cos(angle);
            const dy = radius / (111 * Math.cos(storm.lat * Math.PI / 180)) * Math.sin(angle);
            coords.push([center[0] + dy, center[1] + dx]);
          }
          return {
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [coords],
            },
            properties: {
              name: storm.name,
              severity: storm.severity,
            },
          };
        });

      source.setData({
        type: 'FeatureCollection',
        features: [...features, ...circleFeatures],
      });
      map.current.setLayoutProperty('storm-fill', 'visibility', 'visible');
      map.current.setLayoutProperty('storm-outline', 'visibility', 'visible');
    } else {
      source.setData({ type: 'FeatureCollection', features: [] });
      map.current.setLayoutProperty('storm-fill', 'visibility', 'none');
      map.current.setLayoutProperty('storm-outline', 'visibility', 'none');
    }
  }, [storms, showStormOverlay, mapLoaded]);

  // Update wind overlay
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8ae83d41-f86b-428d-9d07-0128f8355eba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapView.tsx:wind-effect-entry',message:'Wind useEffect triggered',data:{showWindOverlay,windsLength:winds.length,mapLoaded,hasMap:!!map.current},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion

    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('wind-overlay') as mapboxgl.GeoJSONSource;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8ae83d41-f86b-428d-9d07-0128f8355eba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapView.tsx:wind-source-check',message:'Wind source check',data:{hasSource:!!source},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (!source) return;

    if (showWindOverlay && winds.length > 0) {
      const features = winds.map((wind) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [wind.lng, wind.lat],
        },
        properties: {
          direction: wind.direction,
          speed: wind.speed,
          color: getWindColor(wind.speed),
        },
      }));

      source.setData({
        type: 'FeatureCollection',
        features,
      });
      map.current.setLayoutProperty('wind-points', 'visibility', 'visible');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/8ae83d41-f86b-428d-9d07-0128f8355eba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapView.tsx:wind-visible',message:'Wind layer set to VISIBLE',data:{featuresCount:features.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    } else {
      source.setData({ type: 'FeatureCollection', features: [] });
      map.current.setLayoutProperty('wind-points', 'visibility', 'none');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/8ae83d41-f86b-428d-9d07-0128f8355eba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapView.tsx:wind-hidden',message:'Wind layer set to HIDDEN',data:{showWindOverlay,windsLength:winds.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})}).catch(()=>{});
      // #endregion
    }
  }, [winds, showWindOverlay, mapLoaded]);

  // Update watch zones
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('watch-zones') as mapboxgl.GeoJSONSource;
    if (!source) return;

    const features = watchZones.map((zone) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [zone.polygon],
      },
      properties: {
        id: zone.id,
        name: zone.name,
      },
    }));

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [watchZones, mapLoaded]);

  // Update balloon markers and paths
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Close any open popup
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    // Create path features
    const pathFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];

    balloons.forEach((balloon) => {
      // Skip balloons without valid current position
      if (!balloon.current) return;

      // Determine which positions to show based on mode
      let positionsToShow: { pos: BalloonPosition; opacity: number; label?: string }[] = [];

      if (mode === 'present') {
        positionsToShow = [{ pos: balloon.current, opacity: 1 }];
      } else if (mode === 'historic') {
        // Show -23h, -13h, -5h, and current
        const historicHours = [23, 13, 5, 0];
        const labels = ['-23', '-13', '-5', ''];
        
        historicHours.forEach((hour, idx) => {
          const pos = balloon.positions.find((p) => p.hours_ago === hour);
          if (pos) {
            const opacity = hour === 0 ? 1 : 0.3 + (1 - hour / 23) * 0.4;
            positionsToShow.push({ pos, opacity, label: labels[idx] || undefined });
          }
        });

        // Create smooth path through all positions
        const allPositions = balloon.positions
          .filter((p) => p.hours_ago >= 0)
          .sort((a, b) => b.hours_ago - a.hours_ago);
        
        if (allPositions.length >= 2) {
          const pathFeature = createSmoothPath(allPositions);
          if (pathFeature) {
            pathFeature.properties = { color: balloon.color };
            pathFeatures.push(pathFeature);
          }
        }
      } else if (mode === 'future') {
        // Show current and future positions
        positionsToShow = [{ pos: balloon.current, opacity: 1 }];

        if (balloon.future_positions) {
          balloon.future_positions.forEach((pos) => {
            const hoursAhead = Math.abs(pos.hours_ago);
            const opacity = 0.7 - hoursAhead * 0.03;
            const label = `+${hoursAhead}`;
            positionsToShow.push({ pos, opacity, label });
          });

          // Create path from current through future
          const futurePositions = [
            balloon.current,
            ...balloon.future_positions.sort((a, b) => a.hours_ago - b.hours_ago),
          ];
          
          if (futurePositions.length >= 2) {
            const pathFeature = createSmoothPath(futurePositions);
            if (pathFeature) {
              pathFeature.properties = { color: balloon.color };
              pathFeatures.push(pathFeature);
            }
          }
        }
      }

      // Create markers for each position
      positionsToShow.forEach(({ pos, opacity, label }) => {
        // Skip invalid positions
        if (!pos) {
          return;
        }

        const el = document.createElement('div');
        el.className = 'balloon-marker';
        el.style.cursor = 'pointer';

        const img = document.createElement('img');
        img.src = createBalloonSVG({
          color: balloon.color,
          opacity,
          label,
          size: 36,
        });
        img.style.width = '36px';
        img.style.height = '36px';
        el.appendChild(img);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([pos.lng, pos.lat])
          .addTo(map.current!);

        el.addEventListener('click', () => {
          // Close existing popup
          if (popupRef.current) {
            popupRef.current.remove();
          }

          // Create popup container
          const popupContainer = document.createElement('div');
          const root = createRoot(popupContainer);
          
          const popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            maxWidth: '360px',
            anchor: 'bottom',
            offset: [0, -10],
          })
            .setLngLat([pos.lng, pos.lat])
            .setDOMContent(popupContainer)
            .addTo(map.current!);

          popupRef.current = popup;

          root.render(
            <BalloonPopup
              balloon={balloon}
              position={pos}
              onClose={() => popup.remove()}
              onDelete={pos.hours_ago === 0 ? () => {
                onBalloonDelete(balloon.id);
                popup.remove();
              } : undefined}
              isFuture={mode === 'future' && pos.hours_ago < 0}
              fires={fires}
              mode={mode}
            />
          );

          popup.on('close', () => {
            root.unmount();
            popupRef.current = null;
          });
        });

        markersRef.current.push(marker);
      });
    });

    // Update paths source
    const pathSource = map.current.getSource('balloon-paths') as mapboxgl.GeoJSONSource;
    if (pathSource) {
      pathSource.setData({
        type: 'FeatureCollection',
        features: pathFeatures,
      });
      map.current.setLayoutProperty(
        'balloon-paths',
        'visibility',
        mode !== 'present' ? 'visible' : 'none'
      );
    }
  }, [balloons, mode, mapLoaded, onBalloonDelete, fires]);

  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
}

