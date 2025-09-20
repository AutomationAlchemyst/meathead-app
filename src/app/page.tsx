'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * This is the root page of the application.
 * Its primary purpose is to redirect users to the correct starting page
 * based on their authentication status.
 */
export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until the initial authentication check is complete.
    if (!loading) {
      if (user) {
        // If a user is logged in, send them to the main dashboard.
        router.replace('/dashboard');
      } else {
        // If no user is logged in, send them to the login page.
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // While the authentication check is running, display a full-page loader.
  // This is consistent with the loader shown in other parts of the app.
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-2">
        <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-muted-foreground">Initializing...</p>
      </div>
    </div>
  );
}