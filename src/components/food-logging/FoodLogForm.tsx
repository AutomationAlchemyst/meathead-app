'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Brain, CheckCircle, XCircle, MessageSquareText, CalendarIcon, Sparkles, Gem, Zap, Mic } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { logFoodWithAIAction } from '@/actions/food-ai';
import { startTrialAction } from '@/actions/user';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { FoodLog } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import UpgradePrompt from '@/components/premium/UpgradePrompt';

const foodLogSchema = z.object({
  naturalLanguageQuery: z.string().min(3, { message: 'Please describe your meal.' }),
});

type FoodLogFormValues = z.infer<typeof foodLogSchema>;

interface ParsedFoodItem {
  foodItem: string;
  quantity: string;
}
interface EstimateMacrosOutput {
  carbs: number;
  protein: number;
  fat: number;
  calories: number;
}
interface GetKetoGuidanceOutput {
  isKetoFriendly: boolean;
  suggestion: string;
}
interface EstimatedItemBase extends ParsedFoodItem, EstimateMacrosOutput {}
interface EnhancedEstimatedItem extends EstimatedItemBase, GetKetoGuidanceOutput {}
const MAX_FREE_AI_LOGS = 3;

export const FoodLogForm = () => {
  const { user, userProfile, loading: authLoading, isPremium } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [processedItemsDisplay, setProcessedItemsDisplay] = useState<EnhancedEstimatedItem[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [monthlyFreeAILogsUsed, setMonthlyFreeAILogsUsed] = useState(0);
  
  const trialEndsAt = userProfile?.trialEndsAt;
  const trialUsed = userProfile?.trialUsed;
  const trialDaysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const trialAvailable = !trialUsed && !isPremium;

  // --- NEW --- State and refs for voice input
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const canUseAILogging = isPremium || trialDaysRemaining > 0 || monthlyFreeAILogsUsed < MAX_FREE_AI_LOGS;
  const freeAILogsLeft = MAX_FREE_AI_LOGS - monthlyFreeAILogsUsed;

  const form = useForm<FoodLogFormValues>({
    resolver: zodResolver(foodLogSchema),
    defaultValues: { naturalLanguageQuery: '' },
  });

  // --- NEW --- Setup Speech Recognition API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result) => result.transcript)
            .join('');
          form.setValue('naturalLanguageQuery', transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          toast({ title: "Voice Error", description: `Couldn't hear that. Please try again. (${event.error})`, variant: "destructive" });
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, [form, toast]);

  // --- NEW --- Logic to handle voice input
  const handleListen = () => {
    if (!recognitionRef.current) {
      toast({ title: "Voice Not Supported", description: "Your browser doesn't support voice recognition.", variant: "destructive" });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast({ title: "Listening...", description: "Start speaking your meal." });
    }
  };


  // Listen to the user's monthly free AI logs quota document
  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const quotaDocRef = doc(db, 'users', user.uid, 'quotas', currentMonth);
    
    const unsubscribe = onSnapshot(quotaDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMonthlyFreeAILogsUsed(data.foodLogsUsed || 0);
      } else {
        setMonthlyFreeAILogsUsed(0);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const startTrial = async () => {
    if (!user) return;
    try {
      setIsSubmitting(true);
      const idToken = await user.getIdToken();
      const res = await startTrialAction(idToken);
      if ('error' in res && res.error) {
        throw new Error(res.error);
      }
      toast({ title: "Trial Started", description: "Your 3-day free trial has been activated!" });
    } catch (e: any) {
      toast({ title: "Failed to start trial", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: FoodLogFormValues) => {
    if (!user || !selectedDate) return;
    if (!canUseAILogging) return;

    setIsSubmitting(true);
    setIsParsing(true);
    setProcessedItemsDisplay(null);

    try {
      const idToken = await user.getIdToken();
      const result = await logFoodWithAIAction(idToken, data.naturalLanguageQuery, selectedDate.toISOString());

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.success && result.items) {
        setProcessedItemsDisplay(result.items as any);
        toast({ title: `Meal Logged for ${format(selectedDate, 'PPP')}!`, description: `${result.items.length} item(s) saved.` });
        form.reset();
      } else {
        throw new Error("No items could be processed.");
      }
    } catch (error: any) {
      toast({ title: 'Logging Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
      setIsParsing(false);
    }
  };

  const getButtonText = () => {
    if (isParsing) return "Analyzing...";
    if (isSubmitting) return "Logging...";
    return "Log Meal";
  };

  const renderFreemiumHeader = () => {
    if (authLoading) return null;
    if (isPremium) {
      return (
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 flex items-center w-fit gap-1">
          <Gem className="h-3 w-3" /> Premium Active
        </Badge>
      );
    }
    if (trialDaysRemaining > 0) {
      return (
        <Alert variant="default" className="bg-primary/5 border-primary/20 text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertTitle className="font-semibold text-sm">Premium Trial Active: {trialDaysRemaining} days remaining!</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">Enjoy unlimited AI food logging during your trial.</AlertDescription>
        </Alert>
      );
    }
    return (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm text-muted-foreground bg-background/30 p-3 rounded-lg border border-border/30">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span>Free AI Logs: <strong className="text-foreground">{freeAILogsLeft} / {MAX_FREE_AI_LOGS}</strong> remaining this month</span>
        </div>
        {trialAvailable && (
          <Button onClick={startTrial} variant="outline" size="sm" className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:text-primary transition-all duration-300">
            Start 3-Day Trial
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-lg shadow-black/20 relative overflow-hidden group">
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {renderFreemiumHeader()}

      {!canUseAILogging && !authLoading ? (
        <div className="space-y-4">
          <UpgradePrompt
            featureName="AI Food Logging"
            message="You've used all your free AI food logs this month. Upgrade to Premium for unlimited logging, or start a free 3-day trial!"
          />
          {trialAvailable && (
            <Button onClick={startTrial} className="w-full h-12 bg-primary text-primary-foreground font-headline tracking-wide" disabled={isSubmitting}>
              <Sparkles className="mr-2 h-5 w-5 animate-pulse" /> Start 3-Day Free Trial
            </Button>
          )}
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="md:col-span-2 space-y-3">
              <Label htmlFor="naturalLanguageQuery" className="flex items-center text-sm font-headline tracking-wide uppercase text-muted-foreground">
                <MessageSquareText className="mr-2 h-4 w-4 text-primary" />
                Describe your meal
              </Label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3">
                <Textarea
                  id="naturalLanguageQuery"
                  {...form.register('naturalLanguageQuery')}
                  placeholder="e.g., A bowl of oatmeal with blueberries and a black coffee"
                  rows={3}
                  disabled={isSubmitting || authLoading || !canUseAILogging || isListening}
                  className="min-h-[100px] text-base resize-none bg-background/60 border-border/50 focus-visible:ring-primary focus-visible:border-primary transition-all duration-300"
                />
                <Button
                  type="button"
                  variant={isListening ? "destructive" : "outline"}
                  size="icon"
                  onClick={handleListen}
                  disabled={isSubmitting || authLoading || !canUseAILogging}
                  className={cn(
                    "h-12 w-12 sm:h-full sm:aspect-square sm:min-h-[100px] self-center transition-all duration-300",
                    isListening ? "bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30" : "bg-card/40 border-border/50 hover:bg-primary/20 hover:text-primary hover:border-primary/50"
                  )}
                >
                  <Mic className={`h-6 w-6 ${isListening ? 'animate-pulse' : ''}`} />
                  <span className="sr-only">Log with voice</span>
                </Button>
              </div>
              {form.formState.errors.naturalLanguageQuery && <p className="text-sm text-destructive">{form.formState.errors.naturalLanguageQuery.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="mealDate" className="flex items-center text-sm font-headline tracking-wide uppercase text-muted-foreground">
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                Log for Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="mealDate"
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal h-12 bg-background/60 border-border/50 hover:bg-background hover:text-foreground transition-all duration-300", !selectedDate && "text-muted-foreground")}
                    disabled={isSubmitting || authLoading}
                  >
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card/90 backdrop-blur-xl border-border/50">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                    initialFocus
                    className="bg-transparent"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <Button 
            type="submit" 
            className="w-full sm:w-auto h-12 px-8 font-headline tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(13,242,89,0.3)] hover:shadow-[0_0_25px_rgba(13,242,89,0.5)] transition-all duration-300" 
            disabled={isSubmitting || authLoading || !canUseAILogging}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Brain className="mr-2 h-5 w-5" />}
            {getButtonText()}
          </Button>
        </form>
      )}

      {processedItemsDisplay && (
        <div className="mt-6 space-y-4 border-t border-border/50 pt-6 animate-in fade-in slide-in-from-bottom-5 duration-500 relative z-10">
          <h3 className="text-lg font-headline text-primary flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Processed Meal Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {processedItemsDisplay.map((item, idx) => (
              <div key={idx} className="bg-background/40 border border-border/30 rounded-xl p-4 space-y-3 shadow-md relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-foreground capitalize">{item.foodItem}</h4>
                    <p className="text-xs text-muted-foreground">{item.quantity}</p>
                  </div>
                  <Badge variant="outline" className={cn(
                    item.isKetoFriendly 
                      ? "bg-green-500/10 text-green-500 border-green-500/20" 
                      : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  )}>
                    {item.isKetoFriendly ? "Keto Friendly" : "Not Keto"}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-4 gap-1 text-center text-xs">
                  <div className="bg-background/20 p-1.5 rounded">
                    <span className="block text-muted-foreground">Calories</span>
                    <strong className="text-foreground">{item.calories}</strong>
                  </div>
                  <div className="bg-background/20 p-1.5 rounded">
                    <span className="block text-muted-foreground">Protein</span>
                    <strong className="text-foreground">{item.protein}g</strong>
                  </div>
                  <div className="bg-background/20 p-1.5 rounded">
                    <span className="block text-muted-foreground">Carbs</span>
                    <strong className="text-foreground">{item.carbs}g</strong>
                  </div>
                  <div className="bg-background/20 p-1.5 rounded">
                    <span className="block text-muted-foreground">Fat</span>
                    <strong className="text-foreground">{item.fat}g</strong>
                  </div>
                </div>

                {item.suggestion && (
                  <p className="text-xs text-muted-foreground italic border-t border-border/20 pt-2 flex items-start gap-1">
                    <span className="text-primary font-bold">💡 Note:</span>
                    <span>{item.suggestion}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
