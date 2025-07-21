
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CreditCard, ShieldCheck, ArrowLeft, BadgeDollarSign, CalendarClock } from 'lucide-react';

export default function PaymentSimulationPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-12 px-4 flex flex-col items-center text-center">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader>
            <CreditCard className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-3xl font-headline text-primary">Payment Gateway Simulation</CardTitle>
            <CardDescription className="text-lg text-muted-foreground mt-2">
              This is where the real magic would happen!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-foreground">
              In a live application, clicking "Upgrade to Premium" (after potentially selecting a plan) would redirect you to a secure payment page hosted by a provider like <strong className="text-accent">Stripe</strong>.
            </p>

            <div className="p-6 bg-muted/50 rounded-lg border border-border text-left space-y-4">
              <h3 className="text-xl font-semibold text-primary flex items-center">
                <BadgeDollarSign className="h-6 w-6 mr-2 text-green-500" />
                MeatHead Premium Subscription Options
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-background/70">
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg flex items-center text-primary"><CalendarClock className="h-5 w-5 mr-2"/>Monthly</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-2xl font-bold">S$12.99 <span className="text-sm font-normal text-muted-foreground">/ month</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Flexible, cancel anytime.</p>
                  </CardContent>
                </Card>
                <Card className="bg-background/70 border-2 border-accent">
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg flex items-center text-accent"><CalendarClock className="h-5 w-5 mr-2"/>Annual <span className="text-xs ml-1 px-2 py-0.5 bg-accent/20 text-accent rounded-full">Save Over 25%!</span></CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-2xl font-bold">S$99.99 <span className="text-sm font-normal text-muted-foreground">/ year</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Best value, billed annually.</p>
                  </CardContent>
                </Card>
              </div>
               <p className="text-xs text-muted-foreground pt-2 text-center">
                You would select your preferred plan before this step.
              </p>
            </div>

            <div className="p-6 bg-muted/50 rounded-lg border border-border text-left space-y-3">
              <h3 className="text-xl font-semibold text-primary flex items-center">
                <ShieldCheck className="h-6 w-6 mr-2 text-green-500" />
                What would happen next:
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>You would enter your payment details on a secure, PCI-compliant form provided by Stripe for your chosen plan (e.g., S$12.99/month or S$99.99/year).</li>
                <li>After successful payment, Stripe would notify our backend system (via a webhook).</li>
                <li>Our backend would update your user profile in Firestore, setting <code>isPremium: true</code> and storing subscription details.</li>
                <li>You would be redirected back to the MeatHead app, likely to a success page or your dashboard.</li>
                <li>The app would automatically recognize your new premium status, unlocking all features!</li>
              </ol>
            </div>
            <p className="text-sm text-muted-foreground">
              Since this is a simulation, to unlock premium features for testing, you would typically ask the app administrator to manually update your <code>isPremium</code> status in the Firestore database.
            </p>
            <Button asChild size="lg" className="mt-4">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
