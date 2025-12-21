import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { SelectedBalloons, BalloonPosition } from '@/types';

export function useBalloons(count = 50) {
  const { data, error, isLoading, mutate } = useSWR<SelectedBalloons>(
    `/api/balloons/selected?count=${count}`,
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      revalidateOnFocus: false,
    }
  );

  return {
    balloons: data?.balloons ?? [],
    totalCount: data?.total_count ?? 0,
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useAllBalloonsCurrent() {
  const { data, error, isLoading } = useSWR<BalloonPosition[]>(
    '/api/balloons/all/current',
    fetcher,
    {
      refreshInterval: 300000,
      revalidateOnFocus: false,
    }
  );

  return {
    positions: data ?? [],
    isLoading,
    isError: !!error,
  };
}

