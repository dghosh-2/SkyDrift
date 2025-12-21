'use client';

import { useMemo } from 'react';

interface BalloonMarkerProps {
  color: string;
  opacity?: number;
  label?: string;
  size?: number;
}

export function createBalloonSVG({
  color,
  opacity = 1,
  label,
  size = 24,
}: BalloonMarkerProps): string {
  // Generate unique filter ID based on color to avoid conflicts when multiple SVGs are rendered
  const filterId = `shadow-${color.replace('#', '')}-${Math.random().toString(36).substr(2, 5)}`;
  
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.2"/>
        </filter>
      </defs>
      <g filter="url(#${filterId})" opacity="${opacity}">
        <!-- Balloon body -->
        <ellipse cx="12" cy="10" rx="7" ry="8" fill="${color}"/>
        <!-- Balloon highlight -->
        <ellipse cx="9" cy="7" rx="2" ry="3" fill="white" opacity="0.3"/>
        <!-- Balloon tie -->
        <path d="M10 18 L12 16 L14 18 L12 20 Z" fill="${color}"/>
        <!-- String -->
        <line x1="12" y1="20" x2="12" y2="24" stroke="${color}" stroke-width="1" opacity="0.6"/>
        ${label ? `
        <!-- Time label background -->
        <circle cx="12" cy="10" r="6" fill="rgba(0,0,0,0.5)"/>
        <!-- Time label text -->
        <text x="12" y="13" text-anchor="middle" fill="white" font-size="7" font-family="Space Mono, monospace" font-weight="700">${label}</text>
        ` : ''}
      </g>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function BalloonMarkerElement({
  color,
  opacity = 1,
  label,
  size = 24,
}: BalloonMarkerProps) {
  const svgContent = useMemo(() => {
    return createBalloonSVG({ color, opacity, label, size });
  }, [color, opacity, label, size]);

  return (
    <img
      src={svgContent}
      alt="Balloon marker"
      className="balloon-marker"
      style={{ width: size, height: size }}
    />
  );
}

