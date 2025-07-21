
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Gem, BadgeDollarSign, CalendarClock, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useAuth } from '@/hooks/useAuth';
import { loadStripe } from '@stripe/stripe-js';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils"; // <<<< ENSURED IMPORT

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY;
const yearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY;

if (!stripePublishableKey) {
  console.error("CRITICAL ERROR: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set in .env. Check client-side environment variables.");
}
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : Promise.resolve(null);


interface UpgradePromptProps {
  featureName?: string;
  message?: string;
}

export default function UpgradePrompt({ featureName = "This advanced feature", message }: UpgradePromptProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>(yearlyPriceId && monthlyPriceId ? 'yearly' : (monthlyPriceId ? 'monthly' : 'yearly'));


  const handleUpgradeClick = async () => {
    setIsRedirecting(true);
    toast({
      title: "Initiating Premium Upgrade...",
      description: "Preparing your secure checkout session. Please wait.",
      duration: 7000,
    });

    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to upgrade.", variant: "destructive" });
      setIsRedirecting(false);
      return;
    }
    if (!user.email) {
      toast({ title: "Email Missing", description: "Your account needs an email address for Stripe checkout.", variant: "destructive" });
      setIsRedirecting(false);
      return;
    }
    
    const priceIdToUse = selectedPlan === 'yearly' ? yearlyPriceId : monthlyPriceId;

    if (!priceIdToUse) {
      toast({ title: "Configuration Error", description: `Selected plan ID (${selectedPlan}) is not set. Please contact support.`, variant: "destructive" });
      console.error(`Stripe Price ID for ${selectedPlan} plan is not defined in environment variables for client-side use. Monthly: ${monthlyPriceId}, Yearly: ${yearlyPriceId}`);
      setIsRedirecting(false);
      return;
    }
    
    try {
      console.log("[UpgradePrompt] Calling /api/create-checkout-session with userId:", user.uid, "userEmail:", user.email, "and priceId:", priceIdToUse);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.uid, 
          userEmail: user.email,
          priceId: priceIdToUse 
        }),
      });

      const responseData = await response.json();
      console.log("[UpgradePrompt] Response from /api/create-checkout-session:", responseData);

      if (!response.ok || responseData.error) {
        const errorMsg = responseData.error || `Failed to create session (${response.status})`;
        console.error("[UpgradePrompt] API error from /create-checkout-session:", errorMsg);
        toast({ title: "Checkout Error", description: errorMsg, variant: "destructive" });
        setIsRedirecting(false);
        return;
      }

      const { sessionId } = responseData;

      if (!sessionId) {
        console.error("[UpgradePrompt] API did not return a sessionId.");
        toast({ title: "Checkout Error", description: "Could not retrieve a checkout session. Please try again.", variant: "destructive" });
        setIsRedirecting(false);
        return;
      }
      
      console.log("[UpgradePrompt] Received sessionId:", sessionId, "Attempting redirect to Stripe.");

      const stripe = await stripePromise;
      console.log("[UpgradePrompt] Stripe.js loaded:", !!stripe);

      if (stripe) {
        // `redirectToCheckout` itself can throw an error if it's blocked from navigating,
        // or it can return an error object if there's an issue before the redirect attempt (e.g. invalid session).
        const result = await stripe.redirectToCheckout({ sessionId });
        // This `result.error` handles cases where Stripe identifies an issue before attempting navigation.
        if (result.error) { 
          console.error("[UpgradePrompt] Stripe redirectToCheckout returned error object:", result.error.message);
          toast({ title: "Stripe Error", description: result.error.message || "Could not redirect to Stripe.", variant: "destructive" });
        }
        // If redirectToCheckout is successful, the user is navigated away, so no 'setIsRedirecting(false)' here
      } else {
        console.error("[UpgradePrompt] Stripe.js not loaded. Publishable key might be missing or invalid.");
        toast({ title: "Stripe Error", description: "Stripe.js failed to load. Please check configuration.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("[UpgradePrompt] Error in handleUpgradeClick:", error);
      const iframeErrorMessages = [
        "Failed to set a named property 'href' on 'Location'",
        "does not have permission to navigate the target frame",
        "target frame to navigate is not same-origin",
        "Blocked a frame with origin", 
      ];
      
      if (error.message && iframeErrorMessages.some(msg => error.message.includes(msg))) {
        toast({
          title: "Navigation Issue (Likely Iframe)",
          description: "Could not redirect to Stripe. This often happens in embedded browser views (like an IDE preview). Please try opening the app in a new, standalone browser tab (e.g., http://localhost:3000) and attempt the upgrade again.",
          variant: "destructive",
          duration: 25000, 
        });
      } else {
        toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
      }
    } finally {
        setIsRedirecting(false);
    }
  };

  return (
    <Card className="mt-8 shadow-xl border-2 border-primary bg-gradient-to-br from-primary/5 via-card to-secondary/5">
      <CardHeader className="text-center">
        <Gem className="mx-auto h-12 w-12 text-primary mb-3" />
        <CardTitle className="text-2xl font-headline text-primary">
          Unlock {featureName}!
        </CardTitle>
        <CardDescription className="text-base mt-1">
          {message || `Supercharge your journey with our premium tools. This powerful feature is available for MeatHead Premium members.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground mb-6">
          Gain access to exclusive AI-powered recipe generation, personalized workout plans, advanced insights, and more. Choose your plan:
        </p>

        {(!monthlyPriceId && !yearlyPriceId) ? (
            <p className="text-destructive text-sm my-4">Subscription plans are not configured. Please contact support.</p>
        ) : (
            <RadioGroup 
                defaultValue={selectedPlan} 
                onValueChange={(value: 'monthly' | 'yearly') => setSelectedPlan(value)} 
                className="space-y-3 mb-6 max-w-md mx-auto"
                disabled={isRedirecting}
            >
            {monthlyPriceId && (
                <Label htmlFor="plan-monthly" className={cn("flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors", selectedPlan === 'monthly' && "border-primary ring-2 ring-primary")}>
                    <RadioGroupItem value="monthly" id="plan-monthly" />
                    <div className="text-left">
                        <div className="font-semibold flex items-center">
                            <CalendarDays className="h-5 w-5 mr-2 text-primary/80" /> Monthly Plan
                        </div>
                        <p className="text-xs text-muted-foreground">SGD 12.99 / month. Flexible, cancel anytime.</p>
                    </div>
                </Label>
            )}
            {yearlyPriceId && (
                <Label htmlFor="plan-yearly" className={cn("flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors", selectedPlan === 'yearly' && "border-primary ring-2 ring-primary")}>
                    <RadioGroupItem value="yearly" id="plan-yearly" />
                    <div className="text-left">
                        <div className="font-semibold flex items-center">
                           <CalendarClock className="h-5 w-5 mr-2 text-primary/80" /> Annual Plan 
                           <span className="ml-2 text-xs px-2 py-0.5 bg-accent/20 text-accent rounded-full">Save 25%!</span>
                        </div>
                        <p className="text-xs text-muted-foreground">SGD 99.99 / year. Best value, billed annually.</p>
                    </div>
                </Label>
            )}
            </RadioGroup>
        )}

        <Button 
          onClick={handleUpgradeClick} 
          size="lg" 
          className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg transition-all duration-300 ease-in-out hover:scale-105"
          disabled={isRedirecting || !stripePublishableKey || (!monthlyPriceId && !yearlyPriceId) || (selectedPlan === 'monthly' && !monthlyPriceId) || (selectedPlan === 'yearly' && !yearlyPriceId) }
        >
          {isRedirecting ? (
            <Zap className="mr-2 h-5 w-5 animate-ping" />
          ) : (
            <Zap className="mr-2 h-5 w-5" />
          )}
          {isRedirecting ? "Processing..." : `Upgrade with ${selectedPlan === 'yearly' ? 'Annual' : 'Monthly'} Plan`}
        </Button>
        {!stripePublishableKey && <p className="text-xs text-destructive mt-2">Stripe payments are currently unavailable due to a configuration issue.</p>}
      </CardContent>
    </Card>
  );
}

    