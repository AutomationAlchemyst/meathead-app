'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LogOut, LayoutDashboard, UserCircle, Sparkles, Dumbbell, Droplet, MessageCircle, Compass } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { Logo } from '@/components/icons/Logo';
import { useAuth } from '@/contexts/AuthContext';


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/welcome', label: 'Start Here', icon: Compass },
  { href: '/recipe-generator', label: 'Recipe Genie', icon: Sparkles },
  { href: '/workout-planner', label: 'Workout Planner', icon: Dumbbell },
  { href: '/water-tracking', label: 'Water Log', icon: Droplet },
  { href: '/feedback', label: 'Feedback', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: UserCircle },
];

export function Navbar() {
  const { user } = useAuth();
  const router = useRouter(); // Keep useRouter for potential future use, though not needed for logout now.

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // --- THE FIX ---
      // We no longer need to manually redirect here.
      // The onAuthStateChanged listener in AuthContext and the useEffect in AppLayout
      // will detect the user is null and handle the redirect automatically and safely.
      // router.push('/login'); // This line is removed.
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
          <Logo className="text-primary" />
          <div>
            <span className="font-headline">MeatHead</span>
            <span className="block text-xs text-muted-foreground/80 -mt-1">by WorkFlowGuys</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-4">
          {navItems.map((item) => (
            <Button key={item.href} variant="ghost" asChild>
              <Link href={item.href} className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs flex flex-col p-0">
              <SheetHeader className="p-6 pb-4 border-b">
                <SheetTitle asChild>
                  <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
                    <Logo className="text-primary" />
                    <div>
                      <span className="font-headline">MeatHead</span>
                      <span className="block text-xs text-muted-foreground/80 -mt-1">by WorkFlowGuys</span>
                    </div>
                  </Link>
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Main navigation menu for MeatHead application. Use this menu to navigate to different sections of the app.
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 p-6 overflow-y-auto">
                <nav className="flex flex-col space-y-3">
                  {navItems.map((item) => (
                    <Button key={item.href} variant="ghost" asChild className="justify-start">
                      <Link href={item.href} className="flex items-center gap-3 py-2.5 text-base">
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    </Button>
                  ))}
                </nav>
              </div>
              <div className="p-6 pt-4 border-t">
                <Button variant="outline" onClick={handleLogout} className="w-full flex items-center gap-3 py-2.5 text-base justify-center">
                  <LogOut className="h-5 w-5" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
