import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  profile: {
    email: string;
    fullName: string | null;
  } | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAdmin: false,
    profile: null,
  });

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session?.user) {
          // Fetch profile and role, but don't block on errors
          try {
            const profileResult = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('user_id', session.user.id)
              .maybeSingle();

            const roleResult = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id);

            const isAdmin = roleResult.data?.some?.(r => r.role === 'admin') || false;

            setState({
              user: session.user,
              session,
              isLoading: false,
              isAdmin,
              profile: profileResult.data ? {
                email: profileResult.data.email,
                fullName: profileResult.data.full_name,
              } : {
                email: session.user.email || '',
                fullName: null,
              },
            });
          } catch (error) {
            console.error('Error fetching auth data:', error);
            setState({
              user: session.user,
              session,
              isLoading: false,
              isAdmin: false,
              profile: {
                email: session.user.email || '',
                fullName: null,
              },
            });
          }
        } else {
          setState({
            user: null,
            session: null,
            isLoading: false,
            isAdmin: false,
            profile: null,
          });
        }
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setState(prev => ({ ...prev, isLoading: false }));
      }
      // If there's a session, onAuthStateChange will handle it
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName }
      }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    ...state,
    signIn,
    signUp,
    signOut,
  };
};
