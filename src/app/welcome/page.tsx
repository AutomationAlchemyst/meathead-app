
'use client';

import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, Sparkles, Newspaper, Handshake, ArrowRight, UserCheck, Utensils, CheckCircle, Compass, CalendarDays, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from "@/components/ui/separator";
import { format, parseISO, isValid as isValidDateFn } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import Image from 'next/image';
import { Logo } from '@/components/icons/Logo'; // Added import for Logo

function WelcomePageSkeleton() {
    return (
        <AppLayout>
            <div className="container mx-auto py-12 px-4">
                <Skeleton className="h-10 w-3/4 md:w-1/2 mx-auto mb-6" />
                <Skeleton className="h-6 w-1/2 md:w-1/3 mx-auto mb-12" />
                
                <Card className="mb-12 shadow-xl border-2 border-primary bg-gradient-to-br from-primary/5 via-card to-secondary/5">
                    <CardHeader className="text-center">
                        <Skeleton className="h-12 w-12 mx-auto mb-3 rounded-full" />
                        <Skeleton className="h-8 w-3/4 mx-auto" />
                    </CardHeader>
                    <CardContent className="text-center space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6 mx-auto" />
                        <Skeleton className="h-12 w-2/3 mx-auto mt-4" />
                    </CardContent>
                </Card>

                 <div className="text-center mb-10">
                    <Skeleton className="h-6 w-1/2 mx-auto mb-6" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => (
                            <Skeleton key={`secondary-skel-${i}`} className="h-10 w-full" />
                        ))}
                    </div>
                </div>

                <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i} className="shadow-lg">
                            <CardHeader>
                                <Skeleton className="h-12 w-20 mx-auto mb-3 rounded-full" /> {/* Adjusted for image */}
                                <Skeleton className="h-6 w-3/4 mx-auto" />
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}


export default function WelcomePage() {
  const { user, userProfile, loading: authLoading } = useAuth();

  if (authLoading && !user) {
    return <WelcomePageSkeleton />;
  }

  const displayName = userProfile?.displayName || user?.email?.split('@')[0] || 'MeatHead';

  const isProfileSetupComplete = !!(
    userProfile &&
    userProfile.currentWeight !== null && userProfile.currentWeight !== undefined &&
    userProfile.targetWeight !== null && userProfile.targetWeight !== undefined &&
    userProfile.activityLevel !== null && userProfile.activityLevel !== undefined
  );

  return (
    <AppLayout>
      <div className="container mx-auto py-12 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">
          Welcome to <span className="text-primary">MeatHead</span>, {displayName}!
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
          {isProfileSetupComplete 
            ? "Your Keto & Fitness AI companion is ready. Explore features or revisit your goals!" 
            : "Your personalized Keto & Fitness AI companion. Let's get you set up!"
          }
        </p>

        {/* Primary Call to Action */}
        <Card className="mb-12 shadow-xl border-2 border-primary bg-gradient-to-br from-primary/5 via-card to-secondary/5">
            <CardHeader className="text-center">
                {isProfileSetupComplete ? (
                    <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-3" />
                ) : (
                    <UserCheck className="mx-auto h-16 w-16 text-primary mb-3" />
                )}
                <CardTitle className="text-2xl md:text-3xl font-semibold text-primary">
                    {isProfileSetupComplete ? "Profile Setup Complete!" : "Let's Get You Started!"}
                </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
                {isProfileSetupComplete ? (
                    <>
                        <p className="text-md text-foreground mb-3 max-w-xl mx-auto">
                            Your basic profile information is set up, and MeatHead can now provide personalized macro targets and AI suggestions.
                        </p>
                        <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
                            You can always update your profile details, or dive into logging meals, generating recipes, or planning workouts.
                        </p>
                        <Button 
                            size="lg" 
                            asChild 
                            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg transition-all duration-300 ease-in-out hover:scale-105 text-lg py-7 px-10"
                        >
                            <Link href="/dashboard">
                                Go to Dashboard
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                         <Button 
                            variant="outline"
                            size="lg" 
                            asChild 
                            className="mt-4 sm:mt-0 sm:ml-4 text-lg py-7 px-10 shadow-sm"
                        >
                            <Link href="/profile">
                                Review/Edit Profile
                            </Link>
                        </Button>
                    </>
                ) : (
                    <>
                        <p className="text-md text-foreground mb-3 max-w-xl mx-auto">
                            The most important first step is to complete your profile.
                        </p>
                        <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
                            This helps MeatHead personalize your experience, calculate your macro targets, and tailor AI-powered suggestions for recipes and workouts.
                        </p>
                        <Button 
                            size="lg" 
                            asChild 
                            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg transition-all duration-300 ease-in-out hover:scale-105 text-lg py-7 px-10"
                        >
                            <Link href="/profile">
                                Complete Your Profile
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>

        {/* Secondary Suggestions */}
        <div className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-3">
                {isProfileSetupComplete ? "What would you like to do next?" : "Once Your Profile is Set:"}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Explore the core features of MeatHead to kickstart or continue your journey:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <Button variant="outline" asChild size="lg" className="justify-start text-left h-auto py-3">
                    <Link href="/food-logging">
                        <Utensils className="mr-3 h-5 w-5 text-primary shrink-0" />
                        <div>
                            <span className="font-semibold">Log Your Meals</span>
                            <p className="text-xs text-muted-foreground">Track macros & get Keto insights.</p>
                        </div>
                    </Link>
                </Button>
                <Button variant="outline" asChild size="lg" className="justify-start text-left h-auto py-3">
                    <Link href="/recipe-generator">
                         <Sparkles className="mr-3 h-5 w-5 text-primary shrink-0" />
                         <div>
                            <span className="font-semibold">Discover Keto Recipes</span>
                            <p className="text-xs text-muted-foreground">Let Chef Ath inspire you.</p>
                        </div>
                    </Link>
                </Button>
                 <Button variant="outline" asChild size="lg" className="justify-start text-left h-auto py-3">
                    <Link href="/dashboard">
                         <Compass className="mr-3 h-5 w-5 text-primary shrink-0" />
                         <div>
                            <span className="font-semibold">View Your Dashboard</span>
                            <p className="text-xs text-muted-foreground">See progress at a glance.</p>
                        </div>
                    </Link>
                </Button>
            </div>
        </div>
        
        <Separator className="my-12" />

        {/* Existing Content - Repositioned */}
        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8 mb-12 text-left">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="items-center">
              <div className="mb-4">
                <Image
                  src="/ath-profile.jpg" 
                  alt="Ath, creator of MeatHead"
                  width={100}
                  height={100}
                  className="rounded-full border-2 border-accent object-cover"
                  data-ai-hint="profile photo"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.srcset = ""; 
                    target.src = `https://placehold.co/100x100.png`; 
                    target.alt = "Placeholder image for Ath";
                  }}
                />
              </div>
              <CardTitle className="text-2xl font-semibold text-center">My Journey</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>
                Hey there! I&apos;m Ath, the mind behind MeatHead. My own path with Keto and fitness, especially finding Halal Keto options and joint-friendly exercises in Singapore, sparked the idea for this app.
              </p>
              <p>
                MeatHead is built to be the smart, supportive tool I wished I had – blending AI-powered guidance with a rebellious, can-do spirit. Let&apos;s make this journey awesome together!
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
               <div className="flex justify-center mb-3">
                <Logo size={56} />
              </div>
              <CardTitle className="text-2xl font-semibold text-center">About MeatHead</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>
                MeatHead is your ultimate AI companion for a Keto lifestyle, with a special focus on our Singaporean context and Halal needs.
              </p>
              <p>
                Log meals, track weight & water, generate personalized Keto recipes (Halal-friendly!), get AI-powered workout plans, and receive smart insights to keep you motivated. It&apos;s about making Keto sustainable, enjoyable, and effective.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex justify-center mb-3">
                <Newspaper className="h-12 w-12 text-accent" />
              </div>
              <CardTitle className="text-2xl font-semibold text-center">What&apos;s New?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <div>
                <p className="font-medium text-foreground/90 flex items-center"><Rocket className="h-4 w-4 mr-1.5 text-primary" />Recipe Genie Power-Up!</p>
                <p className="pl-5 text-xs">New "What's In My Fridge?" & "Adapt Recipe" tabs. Plus, enhanced Halal & Spice control.</p>
              </div>
              
              <div>
                <p className="font-medium text-foreground/90 pt-1 flex items-center"><Rocket className="h-4 w-4 mr-1.5 text-primary" />Workout Planner Upgrades!</p>
                <p className="pl-5 text-xs">Joint-friendly plans, "Missed a Day?" adaptation. See consistency with the new Workout Activity Calendar on your Dashboard!</p>
              </div>
              
              <div>
                <p className="font-medium text-foreground/90 pt-1 flex items-center"><Rocket className="h-4 w-4 mr-1.5 text-primary" />Smarter Dashboard!</p>
                <p className="pl-5 text-xs">Insights now use water & workout data. Today's stats update in real-time! Daily logging consistency calendar added.</p>
              </div>

              <div>
                <p className="font-medium text-foreground/90 pt-1 flex items-center"><Rocket className="h-4 w-4 mr-1.5 text-primary" />Enhanced Food Logging!</p>
                <p className="pl-5 text-xs">View, edit, and delete individual food log entries directly on the Food Logging page.</p>
              </div>
              
              <div>
                <p className="font-medium text-foreground/90 pt-1 flex items-center"><MessageCircle className="h-4 w-4 mr-1.5 text-primary" />Share Your Thoughts!</p>
                <p className="pl-5 text-xs">A dedicated Feedback page is now live. Help us improve MeatHead by sharing your experience and suggestions.</p>
              </div>

              <div>
                <p className="font-medium text-foreground/90 pt-1 flex items-center"><Rocket className="h-4 w-4 mr-1.5 text-primary" />Revamped Welcome & Guidance!</p>
                <p className="pl-5 text-xs">This "Start Here" page is your new guide, always accessible from the navigation bar.</p>
              </div>
              <div className="pt-3 mt-3 border-t border-border/50">
                 <p className="text-xs text-muted-foreground/80 italic text-center">Updated as of: {format(new Date(), "MMMM d, yyyy")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border/20">
            <Card className="max-w-2xl mx-auto bg-card/50 border-secondary/30">
                <CardHeader>
                    <div className="flex justify-center mb-2">
                        <Handshake className="h-10 w-10 text-secondary" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-center text-secondary">Join the Conversation (Coming Soon!)</CardTitle>
                    <CardDescription className="text-center text-sm">
                        We&apos;re building a community space! Share your journey, recipes, and support others.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <Button variant="outline" disabled>
                        Explore Community (Launching Soon)
                    </Button>
                </CardContent>
            </Card>
        </div>

      </div>
    </AppLayout>
  );
}

      