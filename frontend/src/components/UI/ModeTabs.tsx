'use client';

import { ViewMode } from '@/types';

interface ModeTabsProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function ModeTabs({ mode, onModeChange }: ModeTabsProps) {
  const tabs: { id: ViewMode; label: string; icon: string }[] = [
    { id: 'historic', label: 'Historic', icon: '⏪' },
    { id: 'present', label: 'Present', icon: '📍' },
    { id: 'future', label: 'Future', icon: '⏩' },
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-1.5 border border-gray-100">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onModeChange(tab.id)}
          className={`
            px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2
            ${mode === tab.id
              ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-200'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }
          `}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

