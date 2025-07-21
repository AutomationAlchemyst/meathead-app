
import AppLayout from '@/components/layout/AppLayout';
import ProfileForm from '@/components/profile/ProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserProfile } from '@/actions/user';
import { auth } from '@/lib/firebase'; // We need a way to get current user server-side or pass UID
import { redirect } from 'next/navigation';
import type { User } from 'firebase/auth';

// This is a server component page.
// To get the current user reliably on the server, you'd typically use Firebase Admin SDK with session cookies,
// or a library like NextAuth.js.
// For this example, we'll assume a way to get the current user's UID.
// A practical approach with client-SDK only firebase is to make ProfileForm a client component
// that fetches its own data using useAuth hook.
// However, to demonstrate a server component page, we'll pass it:

async function getCurrentUserId(): Promise<string | null> {
  // This is a simplified mock. In a real app, you'd need a robust way
  // to get the authenticated user's ID on the server.
  // One way is to read it from a session cookie if you implement custom auth flow
  // or use Firebase Admin SDK if this were a backend route.
  // For now, we assume client-side will handle true auth state and redirection.
  // For this example, we'll proceed as if we can get a UID.
  // If auth.currentUser is available (e.g. in some server-side Firebase contexts, though less common for Next.js pages)
  const user = auth.currentUser; // Note: auth.currentUser is mostly client-side.
                                 // This will likely be null in a server component context without specific setup.
  return user ? user.uid : null;
}


export default async function ProfilePage() {
  // In a real app, you'd get userId from a server-side session or equivalent.
  // For this example, if we cannot get userId, we might redirect or show an error.
  // This is a common challenge with Firebase client SDK in Next.js Server Components.
  // The AppLayout will handle client-side redirection if not authenticated.
  // So, if this component renders, AppLayout has confirmed a user.
  // We will rely on the client-side useAuth for the UID in the ProfileForm.

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary">User Profile</CardTitle>
            <CardDescription>Manage your account information and preferences.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* ProfileForm will be a client component and use useAuth() to get user details */}
            <ProfileForm />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
