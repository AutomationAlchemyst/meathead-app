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
import { estimateMacros, type EstimateMacrosInput, type EstimateMacrosOutput } from '@/ai/flows/estimate-macros';
import { parseNaturalLanguageFoodInput, type ParseNaturalLanguageFoodInput, type ParsedFoodItem } from '@/ai/flows/parse-natural-language-food-input';
import { getKetoGuidance, type GetKetoGuidanceInput, type GetKetoGuidanceOutput } from '@/ai/flows/get-keto-guidance';
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { updateUserStreakClientSide } from '@/lib/streakUtils';
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
interface EstimatedItemBase extends ParsedFoodItem, EstimateMacrosOutput {}
interface EnhancedEstimatedItem extends EstimatedItemBase, GetKetoGuidanceOutput {}
const MAX_FREE_AI_LOGS = 3;

export const FoodLogForm = () => {
  const { user, loading: authLoading, isPremium } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isEstimatingMacros, setIsEstimatingMacros] = useState(false);
  const [isGettingKetoGuidance, setIsGettingKetoGuidance] = useState(false);
  const [processedItemsDisplay, setProcessedItemsDisplay] = useState<EnhancedEstimatedItem[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  const [monthlyFreeAILogsUsed, setMonthlyFreeAILogsUsed] = useState(0);
  const [trialAvailable, setTrialAvailable] = useState(true);
  
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
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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


  const incrementUsageAndCheckLimit = () => { /* ... (no changes here) ... */ };
  const startTrial = () => { /* ... (no changes here) ... */ };

  const onSubmit = async (data: FoodLogFormValues) => {
    // ... existing onSubmit logic is perfect and requires no changes ...
    if (!user || !selectedDate) return;
    if (!canUseAILogging) return;
    incrementUsageAndCheckLimit();

    setIsSubmitting(true);
    setIsParsing(true);
    setProcessedItemsDisplay(null);
    setIsEstimatingMacros(false);
    setIsGettingKetoGuidance(false);

    try {
      const parsedItems = await parseNaturalLanguageFoodInput({ naturalLanguageQuery: data.naturalLanguageQuery });
      setIsParsing(false);
      if (!parsedItems || parsedItems.length === 0) throw new Error("Could not understand the meal description.");

      setIsEstimatingMacros(true);
      const itemsWithMacros: EstimatedItemBase[] = await Promise.all(parsedItems.map(async (item) => {
        try {
          const macros = await estimateMacros({ foodItem: item.foodItem, quantity: item.quantity });
          return { ...item, ...macros };
        } catch { return { ...item, calories: 0, protein: 0, carbs: 0, fat: 0 }; }
      }));
      setIsEstimatingMacros(false);

      setIsGettingKetoGuidance(true);
      const finalProcessedItems: EnhancedEstimatedItem[] = await Promise.all(itemsWithMacros.map(async (item) => {
        try {
          const guidance = await getKetoGuidance(item);
          return { ...item, ...guidance };
        } catch { return { ...item, isKetoFriendly: false, suggestion: "Could not get keto guidance." }; }
      }));
      setIsGettingKetoGuidance(false);
      
      if (finalProcessedItems.length > 0) {
        const batch = writeBatch(db);
        finalProcessedItems.forEach(item => {
          const foodLogRef = doc(collection(db, 'users', user.uid, 'foodLogs'));
          const newFoodLog: Omit<FoodLog, 'id'> = {
            userId: user.uid, foodItem: item.foodItem, quantity: item.quantity,
            calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat,
            loggedAt: Timestamp.fromDate(selectedDate),
          };
          batch.set(foodLogRef, newFoodLog);
        });
        await batch.commit();
        await updateUserStreakClientSide(user.uid);
        setProcessedItemsDisplay(finalProcessedItems);
        toast({ title: `Meal Logged for ${format(selectedDate, 'PPP')}!`, description: `${finalProcessedItems.length} item(s) saved.` });
        form.reset();
      } else {
        throw new Error("No items could be processed.");
      }
    } catch (error: any) {
      toast({ title: 'Logging Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
      setIsParsing(false);
      setIsEstimatingMacros(false);
      setIsGettingKetoGuidance(false);
    }
  };

  const getButtonText = () => { /* ... (no changes here) ... */ };
  const renderFreemiumHeader = () => { /* ... (no changes here) ... */ return null; };

  return (
    <div className="space-y-6">
      {/* Freemium UI and Form JSX */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="naturalLanguageQuery" className="flex items-center">
              <MessageSquareText className="mr-2 h-4 w-4 text-muted-foreground" />
              Describe your meal
            </Label>
            {/* --- UI UPDATE --- Added Mic button */}
            <div className="flex items-start gap-2">
              <Textarea
                id="naturalLanguageQuery"
                {...form.register('naturalLanguageQuery')}
                placeholder="e.g., A bowl of oatmeal with blueberries and a black coffee"
                rows={3}
                disabled={isSubmitting || authLoading || !canUseAILogging || isListening}
                className="min-h-[80px]"
              />
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={handleListen}
                disabled={isSubmitting || authLoading || !canUseAILogging}
                className="h-full aspect-square min-h-[80px]"
              >
                <Mic className={`h-6 w-6 ${isListening ? 'animate-pulse' : ''}`} />
                <span className="sr-only">Log with voice</span>
              </Button>
            </div>
            {form.formState.errors.naturalLanguageQuery && <p className="text-sm text-destructive">{form.formState.errors.naturalLanguageQuery.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mealDate" className="flex items-center">
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              Log for Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="mealDate"
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal h-10", !selectedDate && "text-muted-foreground")}
                  disabled={isSubmitting || authLoading}
                >
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || authLoading || !canUseAILogging}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
          {getButtonText()}
        </Button>
      </form>
      {/* Display logic for processed items remains the same */}
    </div>
  );
};
