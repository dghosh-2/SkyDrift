import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { FireData, StormData, WindGrid } from '@/types';

export function useFires() {
  const { data, error, isLoading } = useSWR<FireData>(
    '/api/fires',
    fetcher,
    {
      refreshInterval: 900000, // Refresh every 15 minutes
      revalidateOnFocus: false,
    }
  );

  return {
    fires: data?.fires ?? [],
    fireCount: data?.count ?? 0,
    fireRegions: data?.regions ?? {},
    isLoading,
    isError: !!error,
  };
}

export function useStorms() {
  const { data, error, isLoading } = useSWR<StormData>(
    '/api/storms',
    fetcher,
    {
      refreshInterval: 600000, // Refresh every 10 minutes
      revalidateOnFocus: false,
    }
  );

  return {
    storms: data?.storms ?? [],
    stormCount: data?.count ?? 0,
    stormRegions: data?.regions ?? {},
    isLoading,
    isError: !!error,
  };
}

export function useWindGrid() {
  const { data, error, isLoading } = useSWR<WindGrid>(
    '/api/weather/wind/grid',
    fetcher,
    {
      refreshInterval: 900000, // Refresh every 15 minutes
      revalidateOnFocus: false,
    }
  );

  const winds = data?.winds ?? [];

  return {
    winds,
    timestamp: data?.timestamp ?? 0,
    isLoading,
    isError: !!error,
  };
}

