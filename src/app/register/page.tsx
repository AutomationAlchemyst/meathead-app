
'use client';
import Link from 'next/link';
import RegisterForm from '@/components/auth/RegisterForm';
import { Logo } from '@/components/icons/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
// WFGLogo is no longer needed here as the global footer handles it.

function RegisterPageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Skeleton className="h-12 w-12 rounded-full mb-4" />
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-6 w-64 mb-8" />
      <Skeleton className="h-72 w-full max-w-md" /> {/* Adjusted height for register form */}
      <Skeleton className="h-6 w-72 mt-8" />
      {/* Removed page-specific skeleton footer */}
    </div>
  );
}

function RedirectingState() {
  console.log('[RegisterPage] Rendering RedirectingState');
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4 text-lg text-foreground">Registration successful! Redirecting...</p>
    </div>
  );
}

export default function RegisterPage() {
  const { user, loading, authCheckCompleted } = useAuth();
  const router = useRouter();

  console.log(`[RegisterPage] Render - user: ${user?.uid}, loading: ${loading}, authCheckCompleted: ${authCheckCompleted}`);

  useEffect(() => {
    console.log(`[RegisterPage] useEffect - user: ${user?.uid}, loading: ${loading}, authCheckCompleted: ${authCheckCompleted}`);
    if (authCheckCompleted && !loading && user) {
      console.log('[RegisterPage] useEffect: Conditions met. Attempting to redirect to /welcome');
      router.replace('/welcome'); // Changed from /dashboard
    } else {
      console.log('[RegisterPage] useEffect: Conditions NOT met for redirect to welcome.');
    }
  }, [user, loading, authCheckCompleted, router]);

  if (!authCheckCompleted) {
    console.log('[RegisterPage] Rendering: Auth check not completed. Showing RegisterPageSkeleton.');
    return <RegisterPageSkeleton />;
  }

  if (loading) {
    console.log('[RegisterPage] Rendering: Auth check completed, but loading is true. Showing RegisterPageSkeleton.');
    return <RegisterPageSkeleton />;
  }

  if (user) {
    console.log('[RegisterPage] Rendering: Auth check completed, not loading, user exists. Showing RedirectingState.');
    return <RedirectingState />;
  }

  console.log('[RegisterPage] Rendering: Auth check completed, not loading, no user. Showing RegisterForm.');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4 selection:bg-primary/20">
      <div className="flex flex-col items-center mb-8 text-center">
        <Logo size={144} className="text-primary mb-4" />
        {/* <h1 className="text-4xl font-headline text-primary">MeatHead</h1> Removed this line */}
        <p className="text-lg text-muted-foreground/80 mt-1">by WorkFlowGuys</p>
      </div>
      <RegisterForm />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Button variant="link" asChild className="text-primary p-0">
          <Link href="/login">Log in</Link>
        </Button>
      </p>
      {/* The page-specific absolute footer has been removed. The global footer in layout.tsx will now apply. */}
    </div>
  );
}
    
