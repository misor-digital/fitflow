'use client';

import { create } from 'zustand';
import type { UserType, StaffRole } from '@/lib/supabase/types';

/**
 * Minimal auth state for client-side UI rendering.
 * NOT the source of truth for authorization (that's the DAL).
 * This drives UI elements like nav buttons, avatar, role badges.
 */

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  userType: UserType;
  staffRole: StaffRole | null;
  avatarUrl: string | null;
}

interface AuthStore {
  user: AuthUser | null;
  isLoading: boolean;

  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ user: null, isLoading: false }),
}));
