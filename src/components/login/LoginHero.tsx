'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Sparkles } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export function LoginHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const proofRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero animations
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      
      heroTl
        .from('.hero-tagline', { opacity: 0, y: 60, duration: 1 })
        .from('.hero-subtext', { opacity: 0, y: 40, duration: 0.8 }, '-=0.5')
        .from('.hero-cta', { opacity: 0, y: 30, duration: 0.6 }, '-=0.4');

      // Features section - scroll triggered
      gsap.from('.feature-card', {
        scrollTrigger: {
          trigger: featuresRef.current,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse',
        },
        opacity: 0,
        x: -50,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out',
      });

      gsap.from('.feature-icon-wrap', {
        scrollTrigger: {
          trigger: featuresRef.current,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse',
        },
        scale: 0,
        duration: 0.5,
        stagger: 0.2,
        ease: 'back.out(1.7)',
        delay: 0.3,
      });

      // Social proof counter animation
      const counterObj = { value: 0 };
      gsap.to(counterObj, {
        scrollTrigger: {
          trigger: proofRef.current,
          start: 'top 80%',
          onEnter: () => {
            gsap.to(counterObj, {
              value: 247,
              duration: 2,
              ease: 'power2.out',
              onUpdate: () => {
                const el = document.querySelector('.counter-number');
                if (el) el.textContent = Math.round(counterObj.value).toString();
              }
            });
          },
          once: true,
        },
      });

      gsap.from('.proof-content', {
        scrollTrigger: {
          trigger: proofRef.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
        opacity: 0,
        y: 40,
        duration: 0.8,
      });

      // Form section parallax
      gsap.to(formRef.current, {
        scrollTrigger: {
          trigger: formRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
        y: -30,
        ease: 'none',
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="login-scrollytelling">
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        {/* Hero Content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <div className="hero-tagline mb-6">
            <h1 className="text-5xl md:text-7xl font-black font-headline text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500">
              Your AI-Powered
              <br />
              Keto Coach
            </h1>
          </div>
          <p className="hero-subtext text-xl md:text-2xl text-amber-800/80 mb-10 max-w-2xl mx-auto">
            Personalized macros, recipes & workouts — all tailored for your keto journey in Singapore.
          </p>
          <div className="hero-cta">
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
              <Sparkles className="h-5 w-5 text-orange-500" />
              <span className="text-amber-900 font-medium">Join the community — it&apos;s free to start</span>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-orange-400 flex items-start justify-center p-1">
            <div className="w-1.5 h-3 bg-orange-400 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="py-24 px-6 bg-gradient-to-b from-orange-100 to-amber-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-amber-900">
            Everything you need to crush your goals
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="feature-card bg-white rounded-2xl p-8 shadow-lg shadow-orange-200/50">
              <div className="feature-icon-wrap w-16 h-16 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI Recipe Genie</h3>
              <p className="text-gray-600">Halal-friendly keto meals in seconds. Just describe what&apos;s in your fridge — Chef Ath whips up the rest.</p>
            </div>

            {/* Feature 2 */}
            <div className="feature-card bg-white rounded-2xl p-8 shadow-lg shadow-orange-200/50">
              <div className="feature-icon-wrap w-16 h-16 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mb-6">
                <Dumbbell className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Workout Planner</h3>
              <p className="text-gray-600">Joint-friendly, goal-focused plans that adapt when life happens. Missed a day? Coach Ath adjusts.</p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card bg-white rounded-2xl p-8 shadow-lg shadow-orange-200/50">
              <div className="feature-icon-wrap w-16 h-16 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center mb-6">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Progress Tracking</h3>
              <p className="text-gray-600">Log meals, weight & workouts. See your wins every day with smart insights and keto macros auto-calculated.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section ref={proofRef} className="py-24 px-6 bg-gradient-to-b from-amber-50 to-orange-50">
        <div className="max-w-3xl mx-auto text-center">
          <div className="proof-content">
            <div className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500 mb-4">
              <span className="counter-number">0</span>+
            </div>
            <p className="text-xl md:text-2xl text-amber-800 font-medium">
              keto warriors crushing their goals with MeatHead
            </p>
            <p className="mt-4 text-amber-600">
              From Singapore to beyond — halal keto made simple
            </p>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section ref={formRef} className="py-24 px-6 bg-gradient-to-b from-orange-50 to-amber-100">
        <div className="max-w-md mx-auto" id="login-form">
          {/* Form will be injected here by parent */}
        </div>
      </section>
    </div>
  );
}
