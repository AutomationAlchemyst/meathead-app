'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

/**
 * This is a temporary diagnostic page for the root of the application.
 * It will show us the current authentication status to debug the redirect loop.
 * It does NOT redirect automatically.
 */
export default function RootPage() {
  const { user, loading, userProfile } = useAuth();

  // First, we handle the initial loading state from the AuthProvider.
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-muted-foreground">Auth State: Initializing...</p>
        </div>
      </div>
    );
  }

  // After the initial load, we display the current state.
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background p-8 font-mono">
      <h1 className="text-2xl font-bold mb-4 text-foreground">Auth System Diagnostic</h1>
      <div className="p-6 border rounded-lg bg-muted text-sm space-y-3 w-full max-w-md">
        <p><span className="font-bold">Initial Auth Check:</span> <span className="text-green-500 font-semibold">✅ Complete</span></p>
        <p><span className="font-bold">User Logged In:</span> {user ? <span className="text-green-500 font-semibold">Yes</span> : <span className="text-amber-500 font-semibold">No</span>}</p>
        {user && <p><span className="font-bold">User UID:</span> <span className="text-xs">{user.uid}</span></p>}
        <p><span className="font-bold">User Profile Loaded:</span> {userProfile ? <span className="text-green-500 font-semibold">Yes</span> : <span className="text-amber-500 font-semibold">No</span>}</p>
        {userProfile && <p><span className="font-bold">Profile Name:</span> {userProfile.displayName || 'Not set'}</p>}
      </div>
      <div className="mt-8">
        {user ? (
          <Link href="/dashboard" className="text-primary underline text-lg">Proceed to Dashboard</Link>
        ) : (
          <Link href="/login" className="text-primary underline text-lg">Proceed to Login Page</Link>
        )}
      </div>
    </div>
  );
}
