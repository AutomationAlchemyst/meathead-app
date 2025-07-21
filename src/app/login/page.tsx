
'use client';
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';
import { Logo } from '@/components/icons/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
// WFGLogo is no longer needed here, as the global footer in layout.tsx handles it.

function LoginPageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Skeleton className="h-12 w-12 rounded-full mb-4" />
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-6 w-64 mb-8" />
      <Skeleton className="h-56 w-full max-w-md" /> {/* Adjusted height for login form inputs */}
      <Skeleton className="h-6 w-72 mt-8" />
      {/* Removed page-specific skeleton footer */}
    </div>
  );
}

function RedirectingState() {
  console.log('[LoginPage] Rendering RedirectingState component');
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4 text-lg text-foreground">Login successful! Redirecting...</p>
    </div>
  );
}

export default function LoginPage() {
  const { user, loading, authCheckCompleted } = useAuth();
  const router = useRouter();

  console.log(`[LoginPage] Page Render/Re-render. AuthContext state: user UID: ${user?.uid}, loading: ${loading}, authCheckCompleted: ${authCheckCompleted}`);

  useEffect(() => {
    console.log(`[LoginPage] useEffect triggered. Dependencies state: user UID: ${user?.uid}, loading: ${loading}, authCheckCompleted: ${authCheckCompleted}, router ready: ${!!router}`);
    
    if (authCheckCompleted && !loading && user) {
      console.log('[LoginPage] useEffect: Conditions for redirect to welcome MET. Attempting redirect...');
      router.replace('/welcome'); // Changed from /dashboard
    } else {
      let reason = '';
      if (!authCheckCompleted) reason += 'auth check not completed; ';
      if (loading) reason += 'loading is true; ';
      if (!user) reason += 'user is null; ';
      console.log(`[LoginPage] useEffect: Conditions for redirect to welcome NOT MET. Reason: ${reason || 'None'}`);
    }
  }, [user, loading, authCheckCompleted, router]);

  if (!authCheckCompleted) {
    console.log('[LoginPage] Render logic: Auth check not completed. Showing LoginPageSkeleton.');
    return <LoginPageSkeleton />;
  }

  if (loading) {
    console.log('[LoginPage] Render logic: Auth check completed, but loading is true. Showing LoginPageSkeleton.');
    return <LoginPageSkeleton />;
  }

  if (user) {
    console.log('[LoginPage] Render logic: Auth check completed, not loading, user EXISTS. Showing RedirectingState.');
    return <RedirectingState />;
  }

  console.log('[LoginPage] Render logic: Auth check completed, not loading, NO user. Showing LoginForm.');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4 selection:bg-primary/20">
      <div className="flex flex-col items-center mb-8 text-center">
        <Logo size={144} className="text-primary mb-4" />
        {/* <h1 className="text-4xl font-headline text-primary">MeatHead</h1> Removed this line */}
        <p className="text-lg text-muted-foreground/80 mt-1">by WorkFlowGuys</p>
      </div>
      <LoginForm />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Button variant="link" asChild className="text-primary p-0">
          <Link href="/register">Sign up</Link>
        </Button>
      </p>
      {/* The global footer from layout.tsx will now apply here. */}
    </div>
  );
}

