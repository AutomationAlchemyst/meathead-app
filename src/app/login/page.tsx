'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm'; // --- THE FIX --- No curly braces
import { Logo } from '@/components/icons/Logo';
import Link from 'next/link';

/**
 * This is the public login page.
 * It does NOT use the protected AppLayout. It has its own simple layout.
 * It will redirect logged-in users away to the dashboard.
 */
export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If the auth check is done and we find a user, they don't belong here.
    // Redirect them to the dashboard.
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // While the initial auth check is running, we can show a simple loader
  // or nothing, as the AuthProvider's main loader will be active.
  // Once the check is done and we know there's no user, we show the form.
  if (loading || user) {
    // Show a minimal loader or a blank screen to prevent the login form from flashing
    // for an already logged-in user before the redirect happens.
    return (
        <div className="flex items-center justify-center h-screen bg-background">
            <div className="flex flex-col items-center gap-2">
                <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        </div>
    );
  }

  // If loading is complete and there is no user, show the login page.
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md">
            <div className="flex justify-center mb-8">
                <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
                    <Logo className="text-primary h-10 w-10" />
                    <div>
                        <span className="text-2xl font-headline">MeatHead</span>
                        <span className="block text-sm text-muted-foreground/80 -mt-1">by WorkFlowGuys</span>
                    </div>
                </Link>
            </div>
            <LoginForm />
        </div>
    </div>
  );
}
