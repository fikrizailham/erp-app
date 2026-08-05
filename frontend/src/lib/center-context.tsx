'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './auth';
import { api } from './api';
import type { Center } from '@/types';

interface CenterContextValue {
  centers: Center[];
  activeCenterId: string; // '' means "all centers" (HQ Admin only)
  setActiveCenterId: (id: string) => void;
}

const CenterContext = createContext<CenterContextValue | null>(null);

export function CenterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [centers, setCenters] = useState<Center[]>([]);
  const [activeCenterId, setActiveCenterId] = useState('');

  useEffect(() => {
    if (!user || user.role === 'PARENT') return; // Parents have no center-level access
    api.get<Center[]>('/centers').then((list) => {
      setCenters(list);
      if (user.role !== 'HQ_ADMIN' && list.length > 0) {
        setActiveCenterId(list[0].id);
      }
    });
  }, [user]);

  return (
    <CenterContext.Provider value={{ centers, activeCenterId, setActiveCenterId }}>
      {children}
    </CenterContext.Provider>
  );
}

export function useCenterContext() {
  const ctx = useContext(CenterContext);
  if (!ctx) throw new Error('useCenterContext must be used within CenterProvider');
  return ctx;
}
