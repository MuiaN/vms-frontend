import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuthStore } from '../store/auth';
import { useGetMe, getGetMeQueryKey } from '@workspace/api-client-react';

export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const [, setLocation] = useLocation();
  const { token, user, setAuth, clearAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  // Restore session
  const { data: me, isLoading, error } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token && !user,
      retry: false,
    }
  });

  useEffect(() => {
    if (token && !user && me) {
      setAuth(token, me);
    }
    if (error || (!token && !isLoading)) {
      if (error) clearAuth();
      setIsInitializing(false);
      setLocation('/login');
    } else if (user || me) {
      setIsInitializing(false);
      if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
        setLocation(user?.role === 'manufacturer' ? '/manufacturer/dashboard' : '/distributor/dashboard');
      }
    }
  }, [token, user, me, error, isLoading, setLocation, setAuth, clearAuth, allowedRoles]);

  if (isInitializing || isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="animate-pulse text-primary font-mono">INITIALIZING_SECURE_CONNECTION...</div></div>;
  }

  if (!user) return null;

  return <>{children}</>;
}
