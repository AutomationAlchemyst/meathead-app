'use client';

// NEW: Import motion from framer-motion
import { motion } from 'framer-motion';
import AppLayout from '@/components/layout/AppLayout';
import ProfileForm from '@/components/profile/ProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// NEW: Define the standard animation variants
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

// This page is now a client component to support animations.
// The ProfileForm component already handles fetching user data via the useAuth hook,
// which is the correct pattern for client-side data in this context.
export default function ProfilePage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        {/* NEW: This is our main animation container */}
        <motion.div
          className="max-w-2xl mx-auto"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-headline text-primary">User Profile</CardTitle>
              <CardDescription>Manage your account information and preferences.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* ProfileForm is a client component and fetches its own data */}
              <ProfileForm />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
