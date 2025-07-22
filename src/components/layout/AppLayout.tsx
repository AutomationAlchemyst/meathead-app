'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Skeleton } from "@/components/ui/skeleton";
import NotificationManager from '@/components/notifications/NotificationManager';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: ReactNode;
}

// The skeleton component remains a good fallback for the loading state.
function AppLayoutSkeleton() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-24 hidden md:block" />
          <Skeleton className="h-8 w-8 md:hidden" />
        </div>
      </header>
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </main>
    </div>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  // --- THE FIX ---
  // We now only need 'user' and 'loading' from our streamlined AuthContext.
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // This logic is now simpler and more reliable.
    // If loading is finished and there is still no user, redirect to login.
    // We also check to make sure we're not already on a public page like /login.
    if (!loading && !user && pathname !== '/login' && pathname !== '/register') {
      router.replace('/login');
    }
  }, [user, loading, router, pathname]);

  // The main condition is now much simpler. Our AuthProvider already shows a
  // full-page loader. This skeleton is a secondary fallback for the layout itself.
  if (loading) {
    return <AppLayoutSkeleton />;
  }

  // If we're done loading but there's no user, the useEffect above will handle
  // the redirect. We can show the skeleton while that happens to prevent flashes of content.
  if (!user) {
    return <AppLayoutSkeleton />;
  }

  // If loading is done and we have a user, render the full application layout.
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <NotificationManager />
    </div>
  );
}
