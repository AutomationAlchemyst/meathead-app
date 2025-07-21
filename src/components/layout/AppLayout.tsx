
'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Skeleton } from "@/components/ui/skeleton";
import NotificationManager from '@/components/notifications/NotificationManager'; // Added import

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayoutSkeleton() {
  console.log('[AppLayoutSkeleton] Rendering');
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
      {/* Footer skeleton removed as AppLayout will no longer render a footer */}
    </div>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading, authCheckCompleted } = useAuth();
  const router = useRouter();

  console.log(`[AppLayout] Render - user: ${user?.uid}, loading: ${loading}, authCheckCompleted: ${authCheckCompleted}`);

  useEffect(() => {
    console.log(`[AppLayout] useEffect - user: ${user?.uid}, loading: ${loading}, authCheckCompleted: ${authCheckCompleted}`);
    if (authCheckCompleted && !loading && !user) {
      console.log('[AppLayout] useEffect: Conditions met. Attempting to redirect to /login');
      router.replace('/login');
    } else {
       console.log('[AppLayout] useEffect: Conditions NOT met for redirect to /login.');
    }
  }, [user, loading, authCheckCompleted, router]);

  if (!authCheckCompleted || loading) {
    console.log('[AppLayout] Rendering: Auth check not complete OR loading is true. Showing AppLayoutSkeleton.');
    return <AppLayoutSkeleton />;
  }

  if (!user) {
    console.log('[AppLayout] Rendering: Auth check complete, not loading, NO user. Showing AppLayoutSkeleton (while useEffect redirects).');
    // Render skeleton or null here because NotificationManager shouldn't run if no user
    return <AppLayoutSkeleton />; 
  }

  console.log('[AppLayout] Rendering: Auth checks passed. Rendering children.');
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <NotificationManager /> {/* Added NotificationManager */}
      {/* Footer removed from AppLayout. The global footer will come from RootLayout in src/app/layout.tsx */}
    </div>
  );
}
