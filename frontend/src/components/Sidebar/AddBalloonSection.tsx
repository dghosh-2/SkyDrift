'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface AddBalloonSectionProps {
  onAddBalloon: (lat: number, lng: number, name: string) => void;
}

export function AddBalloonSection({ onAddBalloon }: AddBalloonSectionProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.parseLocation(query.trim());

      if (result.success && result.lat !== undefined && result.lng !== undefined) {
        onAddBalloon(result.lat, result.lng, result.name || query);
        setQuery('');
      } else {
        setError(result.error || 'Could not find that location. Please try a city, country, or region name.');
      }
    } catch {
      setError('Failed to parse location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>➕</span> Add Balloon
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            placeholder="Tokyo, Pacific Ocean, etc."
            className="w-full pl-10 pr-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl
                       focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100
                       placeholder:text-gray-400 transition-all"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg border border-red-100">
            <span className="text-red-500 mt-0.5">⚠️</span>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold
                     hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300
                     flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Finding location...</span>
            </>
          ) : (
            <>
              <span>🎈</span>
              <span>Add Balloon</span>
            </>
          )}
        </button>
      </form>

      <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
        💡 Enter any location in natural language. The balloon will appear with simulated history and predictions.
      </p>
    </div>
  );
}
