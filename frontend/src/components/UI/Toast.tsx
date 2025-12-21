'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
  locationName?: string;
}

export function Toast({ message, type = 'success', duration = 5000, onClose, locationName }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 50);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [duration, onClose]);

  const bgColor = type === 'success' 
    ? 'from-emerald-500 to-green-500' 
    : type === 'error' 
      ? 'from-red-500 to-pink-500'
      : 'from-indigo-500 to-purple-500';

  const shadowColor = type === 'success'
    ? 'shadow-emerald-200'
    : type === 'error'
      ? 'shadow-red-200'
      : 'shadow-indigo-200';

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50 
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
    >
      <div className={`bg-gradient-to-r ${bgColor} text-white rounded-2xl shadow-xl ${shadowColor} overflow-hidden min-w-[300px]`}>
        <div className="p-4 flex items-center gap-3">
          <div className="text-2xl">
            {type === 'success' ? '🎈' : type === 'error' ? '⚠️' : 'ℹ️'}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{message}</p>
            {locationName && (
              <p className="text-white/80 text-xs mt-0.5">📍 {locationName}</p>
            )}
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-white/20">
          <div 
            className="h-full bg-white/50 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

