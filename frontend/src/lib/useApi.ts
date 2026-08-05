'use client';

import useSWR from 'swr';
import { api } from './api';

export function useApi<T>(path: string | null) {
  const { data, error, isLoading, mutate } = useSWR<T>(path, (p: string) => api.get<T>(p));
  return { data, error, isLoading, mutate };
}
