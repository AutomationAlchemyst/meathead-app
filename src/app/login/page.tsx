'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { Logo } from '@/components/icons/Logo';
import { LoginHero } from '@/components/login/LoginHero';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';

gsap.registerPlugin(ScrollTrigger);

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || user) return;

    const ctx = gsap.context(() => {
      gsap.from('.login-form-wrapper', {
        scrollTrigger: {
          trigger: '.login-form-wrapper',
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
        opacity: 0,
        y: 50,
        duration: 0.8,
        ease: 'power3.out',
      });
    });

    return () => ctx.revert();
  }, [loading, user]);

  if (loading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
      {/* Fixed Logo Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <Logo className="text-orange-500 h-10 w-10" />
            <div>
              <span className="text-xl font-headline text-amber-900">MeatHead</span>
              <span className="block text-xs text-amber-700/70 -mt-0.5">by WorkFlowGuys</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Scrollytelling Hero */}
      <LoginHero />

      {/* Login Form Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-amber-100 to-orange-100">
        <div className="max-w-md mx-auto">
          <div className="login-form-wrapper">
            <LoginForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-amber-900 text-amber-100">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm opacity-70">
            © 2026 MeatHead by WorkFlowGuys. Your AI Keto Coach in Singapore.
          </p>
        </div>
      </footer>
    </div>
  );
}
