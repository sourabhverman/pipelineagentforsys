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

  const fetchUserData = async (session: Session) => {
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
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Get initial session first with timeout
    const initializeAuth = async () => {
      // Safety timeout - if auth takes more than 5 seconds, stop loading
      timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('Auth initialization timed out');
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }, 5000);

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        clearTimeout(timeoutId);
        
        if (!mounted) return;
        
        if (error) {
          console.error('Session error:', error);
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
        
        if (session?.user) {
          console.log('Initial session found:', session.user.email);
          await fetchUserData(session);
        } else {
          console.log('No initial session');
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error getting session:', error);
        if (mounted) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    initializeAuth();

    // Set up auth state listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session?.user?.email);
        
        // Skip INITIAL_SESSION as we handle it above
        if (event === 'INITIAL_SESSION') return;
        
        if (session?.user) {
          await fetchUserData(session);
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

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
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
