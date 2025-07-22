'use client';

// NOTE: This component has many dependencies. Ensure they are all correct.
// For this fix, we are only changing the export type.
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { generateDashboardInsights } from '@/ai/flows/generate-dashboard-insights-flow';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import UpgradePrompt from '@/components/premium/UpgradePrompt';

export const SmartInsightsCard = () => {
  const { user, userProfile, isPremium } = useAuth();
  const [insights, setInsights] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canGenerate, setCanGenerate] = useState(true);

  const handleGenerateInsights = async () => {
    if (!user || !userProfile) return;
    
    if (!isPremium) {
        setCanGenerate(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    setInsights(null);
    try {
      const result = await generateDashboardInsights({ userId: user.uid });
      setInsights(result);
    } catch (e: any) {
      setError(e.message || "Failed to generate insights.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="flex items-center text-primary">
                    <Sparkles className="h-6 w-6 mr-2" />
                    Coach Ath's Smart Insights
                </CardTitle>
                <CardDescription>Your AI-powered daily brief.</CardDescription>
            </div>
            {!isPremium && <span className="text-xs font-bold text-amber-500 bg-amber-100 px-2 py-1 rounded-full">Premium</span>}
        </div>
      </CardHeader>
      <CardContent>
        {isPremium ? (
            <>
                {isLoading && <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                {error && <p className="text-sm text-destructive">{error}</p>}
                {insights && <p className="text-sm whitespace-pre-wrap">{insights}</p>}
                {!isLoading && !insights && !error && (
                    <div className="text-center">
                        <p className="text-muted-foreground mb-4">Click to get personalized insights based on your recent activity.</p>
                        <Button onClick={handleGenerateInsights} disabled={isLoading}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate My Insights
                        </Button>
                    </div>
                )}
            </>
        ) : (
            <UpgradePrompt 
                featureName="Smart Insights"
                message="Unlock personalized AI insights from Coach Ath to analyze your trends, get motivation, and receive actionable advice. Upgrade to Premium to get your daily brief."
            />
        )}
      </CardContent>
    </Card>
  );
};