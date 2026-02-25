'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { useAuthStore } from '@/store/authStore';
import type { AuthUser } from '@/store/authStore';

/**
 * Listens to Supabase auth state changes and syncs to the Zustand store.
 * Must be placed in the root layout (below <body>).
 * 
 * On mount: checks current session.
 * On auth change: updates store (login, logout, token refresh).
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, clear, setLoading } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    // Check initial session
    async function initSession() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await fetchAndSetProfile(session.user.id, session.user.email ?? '');
      } else {
        clear();
      }
    }

    // Fetch profile and update store
    async function fetchAndSetProfile(userId: string, email: string) {
      try {
        // Fetch profile from a lightweight API endpoint
        const res = await fetch('/api/auth/profile');
        if (res.ok) {
          const profile = await res.json();
          const authUser: AuthUser = {
            id: userId,
            email,
            fullName: profile.full_name ?? '',
            userType: profile.user_type ?? 'customer',
            staffRole: profile.staff_role ?? null,
            avatarUrl: profile.avatar_url ?? null,
          };
          setUser(authUser);
        } else {
          clear();
        }
      } catch {
        clear();
      }
    }

    initSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchAndSetProfile(session.user.id, session.user.email ?? '');
        } else if (event === 'SIGNED_OUT') {
          clear();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Profile might have changed — refresh
          await fetchAndSetProfile(session.user.id, session.user.email ?? '');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, clear, setLoading]);

  return <>{children}</>;
}
