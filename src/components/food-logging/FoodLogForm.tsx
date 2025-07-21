
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Brain, CheckCircle, XCircle, MessageSquareText, CalendarIcon, Sparkles, Gem, Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { estimateMacros, type EstimateMacrosInput, type EstimateMacrosOutput } from '@/ai/flows/estimate-macros';
import { parseNaturalLanguageFoodInput, type ParseNaturalLanguageFoodInput, type ParsedFoodItem } from '@/ai/flows/parse-natural-language-food-input';
import { getKetoGuidance, type GetKetoGuidanceInput, type GetKetoGuidanceOutput } from '@/ai/flows/get-keto-guidance';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, writeBatch, doc } from 'firebase/firestore'; // Use Timestamp for specific dates
import type { FoodLog } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import UpgradePrompt from '@/components/premium/UpgradePrompt'; // Import UpgradePrompt

const foodLogSchema = z.object({
  naturalLanguageQuery: z.string().min(3, { message: 'Please describe your meal (e.g., "an apple and a cup of coffee").' }),
});

type FoodLogFormValues = z.infer<typeof foodLogSchema>;

interface EstimatedItemBase extends ParsedFoodItem, EstimateMacrosOutput {}
interface EnhancedEstimatedItem extends EstimatedItemBase, GetKetoGuidanceOutput {}

const MAX_FREE_AI_LOGS = 3; // Max free AI-powered logs per session (simulated)

export default function FoodLogForm() {
  const { user, loading: authLoading, isPremium } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isEstimatingMacros, setIsEstimatingMacros] = useState(false);
  const [isGettingKetoGuidance, setIsGettingKetoGuidance] = useState(false);
  const [processedItemsDisplay, setProcessedItemsDisplay] = useState<EnhancedEstimatedItem[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Freemium simulation state
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  const [monthlyFreeAILogsUsed, setMonthlyFreeAILogsUsed] = useState(0);
  const [trialAvailable, setTrialAvailable] = useState(true);

  const canUseAILogging = isPremium || trialDaysRemaining > 0 || monthlyFreeAILogsUsed < MAX_FREE_AI_LOGS;
  const freeAILogsLeft = MAX_FREE_AI_LOGS - monthlyFreeAILogsUsed;

  const form = useForm<FoodLogFormValues>({
    resolver: zodResolver(foodLogSchema),
    defaultValues: {
      naturalLanguageQuery: '',
    },
  });

  const incrementUsageAndCheckLimit = () => {
    if (!isPremium && trialDaysRemaining <= 0) {
      setMonthlyFreeAILogsUsed(prev => prev + 1);
    }
  };

  const startTrial = () => {
    setTrialDaysRemaining(3); 
    setTrialAvailable(false); 
    toast({ title: "Premium Trial Started!", description: "Enjoy full AI food logging for 3 days." });
  };

  const onSubmit = async (data: FoodLogFormValues) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }
    if (!selectedDate) {
      toast({ title: 'Error', description: 'Please select a date for your meal log.', variant: 'destructive' });
      return;
    }

    if (!canUseAILogging) {
      toast({ title: "AI Logging Limit Reached", description: "Upgrade to Premium or start a trial for unlimited AI-powered food logging.", variant: "destructive" });
      return;
    }
    incrementUsageAndCheckLimit();

    setIsSubmitting(true);
    setIsParsing(true);
    setIsEstimatingMacros(false);
    setIsGettingKetoGuidance(false);
    setProcessedItemsDisplay(null);

    let parsedItems: ParsedFoodItem[] = [];
    try {
      const parseInput: ParseNaturalLanguageFoodInput = { naturalLanguageQuery: data.naturalLanguageQuery };
      parsedItems = await parseNaturalLanguageFoodInput(parseInput);
      setIsParsing(false);

      if (!parsedItems || parsedItems.length === 0) {
        toast({ title: 'Parsing Failed', description: "Could not understand the meal description. Please try rephrasing or be more specific.", variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }
      
      setIsEstimatingMacros(true);
      const itemsWithMacros: EstimatedItemBase[] = [];
      for (const item of parsedItems) {
        try {
          const macroInput: EstimateMacrosInput = { foodItem: item.foodItem, quantity: item.quantity };
          const aiEstimatedMacros = await estimateMacros(macroInput);
          if (aiEstimatedMacros && typeof aiEstimatedMacros.calories === 'number') {
            itemsWithMacros.push({ ...item, ...aiEstimatedMacros });
          } else {
            itemsWithMacros.push({ ...item, calories: 0, protein: 0, carbs: 0, fat: 0 });
          }
        } catch (estimationError) {
           itemsWithMacros.push({ ...item, calories: 0, protein: 0, carbs: 0, fat: 0 });
        }
      }
      setIsEstimatingMacros(false);

      if (itemsWithMacros.length === 0) {
        toast({ title: 'Macro Estimation Failed', description: "Could not estimate macros for any items in your meal. Please try again.", variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      setIsGettingKetoGuidance(true);
      const firestoreBatch = writeBatch(db);
      const finalProcessedItems: EnhancedEstimatedItem[] = [];

      for (const itemWithMacro of itemsWithMacros) {
        const macroEstimationFailed = itemWithMacro.calories === 0 && itemWithMacro.protein === 0 && itemWithMacro.carbs === 0 && itemWithMacro.fat === 0 && parsedItems.find(p => p.foodItem === itemWithMacro.foodItem);

        if (macroEstimationFailed) {
           finalProcessedItems.push({ ...itemWithMacro, isKetoFriendly: false, suggestion: "Macro estimation failed for this item." });
        } else {
            try {
              const ketoInput: GetKetoGuidanceInput = { ...itemWithMacro };
              const ketoGuidance = await getKetoGuidance(ketoInput);
              finalProcessedItems.push({ ...itemWithMacro, ...ketoGuidance });
            } catch (ketoError) {
              finalProcessedItems.push({ ...itemWithMacro, isKetoFriendly: false, suggestion: "Could not get keto guidance for this item." });
            }
        }
        
        const newFoodLog: Omit<FoodLog, 'id'> = {
          userId: user.uid,
          foodItem: itemWithMacro.foodItem,
          quantity: itemWithMacro.quantity,
          calories: itemWithMacro.calories,
          protein: itemWithMacro.protein,
          carbs: itemWithMacro.carbs,
          fat: itemWithMacro.fat,
          loggedAt: Timestamp.fromDate(selectedDate),
        };
        const foodLogRef = doc(collection(db, 'users', user.uid, 'foodLogs'));
        firestoreBatch.set(foodLogRef, newFoodLog);
      }
      setIsGettingKetoGuidance(false);
      
      if (finalProcessedItems.length > 0) {
        await firestoreBatch.commit();
        setProcessedItemsDisplay(finalProcessedItems);
        const successfulEstimations = finalProcessedItems.filter(item => item.suggestion !== "Macro estimation failed for this item.").length;
        const totalItems = finalProcessedItems.length;
        if (successfulEstimations === totalItems) {
            toast({ title: `Meal Logged for ${format(selectedDate, 'PPP')}!`, description: `${totalItems} item(s) analyzed and saved.` });
        } else {
            toast({ title: `Meal Partially Logged for ${format(selectedDate, 'PPP')}`, description: `${successfulEstimations} of ${totalItems} item(s) fully analyzed. Check details below.`, variant: 'default', duration: 7000 });
        }
        form.reset();
      } else {
        toast({ title: 'Processing Failed', description: "No items could be fully processed.", variant: 'destructive' });
      }

    } catch (error: any) {
      setIsParsing(false);
      setIsEstimatingMacros(false);
      setIsGettingKetoGuidance(false);
      let errorMsg = "Failed to log food item.";
      if (error.code === 'permission-denied' || error.message?.includes('PERMISSION_DENIED') || error.message?.includes('Missing or insufficient permissions')) {
        errorMsg = "Saving failed: Insufficient permissions. Please check your Firestore security rules.";
      } else if (error.message?.includes("API key not valid")) {
        errorMsg = "AI service configuration error. Please contact support.";
      } else if (error.message) {
        errorMsg = error.message;
      }
      toast({ title: 'Logging Failed', description: errorMsg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getButtonText = () => {
    if (isParsing) return "Understanding your meal...";
    if (isEstimatingMacros) return "Estimating macros...";
    if (isGettingKetoGuidance) return "Checking keto-friendliness...";
    if (isSubmitting) return "Logging...";
    return "Log Meal & Get AI Insights";
  };
  
  const renderFreemiumHeader = () => {
    if (isPremium) {
      return (
        <Alert variant="default" className="mb-4 bg-green-50 border-green-300 text-green-700 text-sm">
          <Gem className="h-4 w-4 text-green-600" />
          <AlertTitle className="font-semibold">Premium AI Logging Active!</AlertTitle>
          <AlertDescription>Enjoy unlimited AI-powered meal logging.</AlertDescription>
        </Alert>
      );
    }
    if (trialDaysRemaining > 0) {
      return (
        <Alert variant="default" className="mb-4 bg-blue-50 border-blue-300 text-blue-700 text-sm">
          <Zap className="h-4 w-4 text-blue-600" />
          <AlertTitle className="font-semibold">AI Logging Trial: {trialDaysRemaining} days remaining!</AlertTitle>
          <AlertDescription>Full AI food logging capabilities unlocked.</AlertDescription>
        </Alert>
      );
    }
    if (freeAILogsLeft > 0) {
      return (
        <Alert variant="default" className="mb-4 bg-orange-50 border-orange-300 text-orange-700 text-sm">
          <Sparkles className="h-4 w-4 text-orange-600" />
          <AlertTitle className="font-semibold">AI-Powered Food Logging</AlertTitle>
          <AlertDescription>You have {freeAILogsLeft} free AI-powered meal logs left this session. Upgrade for unlimited!</AlertDescription>
        </Alert>
      );
    }
    return null; 
  };


  return (
    <div className="space-y-6">
      {renderFreemiumHeader()}
      
      {!canUseAILogging && !isPremium && trialDaysRemaining <= 0 && (
         <div className="my-4">
           <UpgradePrompt
               featureName="AI Food Logging"
               message="You've used your free AI-powered logs. Upgrade to Premium or start a trial for unlimited smart meal logging!"
           />
           {trialAvailable && (
               <Button onClick={startTrial} size="lg" className="w-full mt-4">
                   <Sparkles className="mr-2 h-5 w-5" /> Start 3-Day Free Trial for AI Logging
               </Button>
           )}
         </div>
       )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="naturalLanguageQuery" className="flex items-center">
              <MessageSquareText className="mr-2 h-4 w-4 text-muted-foreground" />
              Describe your meal
            </Label>
            <Textarea 
              id="naturalLanguageQuery" 
              {...form.register('naturalLanguageQuery')} 
              placeholder="e.g., A bowl of oatmeal with blueberries and a black coffee" 
              rows={3}
              disabled={isSubmitting || authLoading || !canUseAILogging}
              className="min-h-[80px]"
            />
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
                  className={cn(
                    "w-full justify-start text-left font-normal h-10",
                    !selectedDate && "text-muted-foreground"
                  )}
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

      {isSubmitting && !processedItemsDisplay && (
        <Alert>
          <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
          <AlertTitle>{getButtonText()}</AlertTitle>
          <AlertDescription>
            Please wait while we process your meal description for {selectedDate ? format(selectedDate, 'PPP') : 'the selected date'}.
          </AlertDescription>
        </Alert>
      )}

      {processedItemsDisplay && processedItemsDisplay.length > 0 && (
         <Alert variant="default" className="bg-primary/5 border-primary/10">
          <AlertTitle className="font-semibold text-primary mb-3">Meal Processed & Logged for {selectedDate ? format(selectedDate, 'PPP') : 'selected date'}!</AlertTitle>
          <AlertDescription>
            <ul className="space-y-4">
              {processedItemsDisplay.map((item, index) => {
                const isMacroFailure = item.suggestion === "Macro estimation failed for this item.";
                const isKetoGuidanceFailure = item.suggestion === "Could not get keto guidance for this item.";
                const isAnalysisIssue = isMacroFailure || isKetoGuidanceFailure;

                return (
                  <li key={index} className="text-sm border-b border-primary/10 pb-3 last:border-b-0 last:pb-0">
                    <div className="font-semibold">{item.foodItem} ({item.quantity})</div>
                    
                    {!isMacroFailure && !(item.calories === 0 && item.protein === 0 && item.carbs === 0 && item.fat === 0) ? (
                      <div className="text-xs text-muted-foreground">
                        {item.calories.toFixed(0)} kcal &bull; 
                        P: {item.protein.toFixed(1)}g &bull; 
                        C: {item.carbs.toFixed(1)}g &bull; 
                        F: {item.fat.toFixed(1)}g
                      </div>
                    ) : !isMacroFailure && (item.calories === 0 && item.protein === 0 && item.carbs === 0 && item.fat === 0) ? (
                       <p className="text-xs text-muted-foreground">Macros appear to be zero for this item.</p>
                    ) : null}

                    <div className="mt-1.5 flex items-center">
                      {item.isKetoFriendly && !isAnalysisIssue ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white mr-2">
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Keto Friendly
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className={`${isAnalysisIssue ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'} text-white mr-2`}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> 
                          {isAnalysisIssue ? 'Analysis Issue' : 'Not Keto Friendly'}
                        </Badge>
                      )}
                    </div>

                    {item.suggestion && (
                      <p className={`mt-1 text-xs italic ${isAnalysisIssue ? 'text-destructive font-medium' : 'text-foreground/80'}`}>
                        <span className="font-medium">{isAnalysisIssue ? 'Note:' : "Ath's Suggestion:"}</span> {item.suggestion}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">All items listed above have been saved to your log. Keto guidance is for informational purposes.</p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
    