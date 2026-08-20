import { useEffect, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../lib/store";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setLoading, setIsAnonymous } = useAuthStore();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsAnonymous(session.user.is_anonymous ?? false);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAnonymous(session.user.is_anonymous ?? false);
      } else {
        setUser(null);
        setIsAnonymous(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading, setIsAnonymous]);

  return <>{children}</>;
}