'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from "@/components/ui/toaster";

/**
 * This component is marked as a client component. Its sole purpose is to
 * wrap all of our client-side context providers, keeping our main layout clean
 * and separating server/client concerns.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {/* The main application content will be rendered here */}
      {children}
      
      {/* The Toaster component for notifications also needs to be within a client component */}
      <Toaster />
    </AuthProvider>
  );
}
