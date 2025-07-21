
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading, authCheckCompleted } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for initial auth check to complete
    if (authCheckCompleted && !loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, authCheckCompleted, router]);

  // Show loader until auth check is complete and redirect logic has run
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4 text-lg text-foreground">Loading MeatHead...</p>
    </div>
  );
}
