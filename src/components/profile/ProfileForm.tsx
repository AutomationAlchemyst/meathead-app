'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
// FIX: Imported 'Scale' and 'Egg' and removed 'WeightIcon' and 'Droplets' for consistency.
import { Loader2, UserCircle, Target, Activity, CalendarCheck, CalendarIcon as CalendarLucideIcon, Scale, PlayCircleIcon, Flame, Beef, Wheat, Egg, Edit3, Info, Droplet, Brain, Quote } from 'lucide-react';
import type { UserProfile, ActivityLevel } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { doc as firestoreDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, addDays, isValid as isValidDateFn, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';


const activityLevels = [
  { value: 'sedentary', label: 'Sedentary (little to no exercise)' },
  { value: 'lightlyActive', label: 'Lightly Active (exercise 1-3 days/week)' },
  { value: 'active', label: 'Active (exercise 3-5 days/week)' },
  { value: 'veryActive', label: 'Very Active (exercise 6-7 days/week)' },
] as const;

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters.").optional().or(z.literal('')),
  myWhy: z.string().max(500, "Your 'Why' cannot be more than 500 characters.").optional().nullable(),
  currentWeight: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().positive("Current weight must be a positive number.").nullable()
  ),
  targetWeight: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().positive("Target weight must be a positive number.").optional().nullable()
  ),
  activityLevel: z.enum(activityLevels.map(al => al.value) as [ActivityLevel, ...ActivityLevel[]]).nullable(),
  startingWeight: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().positive("Starting weight must be a positive number.").optional().nullable()
  ),
  journeyStartDate: z.date().optional().nullable(),
  targetWaterIntake: z.preprocess( 
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().int().min(0, "Water intake must be a non-negative integer.").nullable()
  ),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const activityMultiplierMap: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightlyActive: 1.375,
  active: 1.55,
  veryActive: 1.725,
};

const calculateKetoMacros = (
  currentWeightKg: number | null | undefined,
  targetWeightKg: number | null | undefined,
  activityLevel: ActivityLevel | null | undefined
): Partial<UserProfile> => {
  if (!currentWeightKg || !activityLevel) {
    return { targetCalories: null, targetProtein: null, targetCarbs: 20, targetFat: null };
  }

  const proteinPerKg = 1.8;
  const targetCarbsFixed = 20;

  const calculatedProtein = Math.round(currentWeightKg * proteinPerKg);
  const carbCalories = targetCarbsFixed * 4;
  const proteinCalories = calculatedProtein * 4;

  const currentActivityLevel = activityLevel;
  const activityMultiplier = activityMultiplierMap[currentActivityLevel];

  const estimatedBMR = currentWeightKg * 22;
  const tdee = Math.round(estimatedBMR * activityMultiplier);

  let calorieAdjustment = 0;
  if (targetWeightKg && targetWeightKg < currentWeightKg) {
    calorieAdjustment = -500;
  } else if (targetWeightKg && targetWeightKg > currentWeightKg) {
    calorieAdjustment = 300;
  }

  let calculatedTargetCalories = tdee + calorieAdjustment;
  calculatedTargetCalories = Math.max(calculatedTargetCalories, 1200);

  const remainingCaloriesForFat = calculatedTargetCalories - carbCalories - proteinCalories;
  const calculatedFat = Math.round(Math.max(0, remainingCaloriesForFat) / 9);

  const finalTargetCalories = Math.round((targetCarbsFixed * 4) + (calculatedProtein * 4) + (calculatedFat * 9));

  return {
    targetCalories: finalTargetCalories,
    targetProtein: calculatedProtein,
    targetCarbs: targetCarbsFixed,
    targetFat: calculatedFat,
  };
};

const calculateGoalProjection = (
  currentWeightKg: number | null | undefined,
  targetWeightKg: number | null | undefined,
  activityLevel: ActivityLevel | null | undefined,
  calculatedTargetCalories: number | null | undefined
): string | null => {
  if (!currentWeightKg || !activityLevel) {
    return "Set current weight & activity level for estimates.";
  }
  if (!targetWeightKg) {
    return "Set target weight for projection.";
  }
  if (!calculatedTargetCalories) {
      return "Macro targets not calculated, cannot project goal date.";
  }


  if (currentWeightKg === targetWeightKg) {
    return "Goal Achieved / Maintaining!";
  }

  const currentActivityLevel = activityLevel;
  const activityMultiplier = activityMultiplierMap[currentActivityLevel];
  const estimatedBMR = currentWeightKg * 22;
  const tdee = Math.round(estimatedBMR * activityMultiplier);

  const dailyCalorieDifferenceForProjection = calculatedTargetCalories - tdee;
  const KcalPerKg = 7700;

  if (targetWeightKg < currentWeightKg) { // Weight Loss
    if (dailyCalorieDifferenceForProjection >= -200) {
      return "Target calorie deficit too small for reliable loss estimation. Adjust activity or targets.";
    }
    const totalKcalToLose = (currentWeightKg - targetWeightKg) * KcalPerKg;
    const daysToGoal = totalKcalToLose / Math.abs(dailyCalorieDifferenceForProjection);
    if (daysToGoal <=0) return "Review targets for weight loss.";
    if (daysToGoal > (365*5)) return "More than 5 years (Consider adjusting targets for faster progress).";
    const futureDate = addDays(new Date(), Math.round(daysToGoal));
    return format(futureDate, "MMMM d, yyyy");
  } else { // Weight Gain
    if (dailyCalorieDifferenceForProjection <= 200) {
      return "Target calorie surplus too small for reliable gain estimation. Adjust activity or targets.";
    }
    const totalKcalToGain = (targetWeightKg - currentWeightKg) * KcalPerKg;
    const daysToGoal = totalKcalToGain / dailyCalorieDifferenceForProjection;
    if (daysToGoal <=0) return "Review targets for weight gain.";
    if (daysToGoal > (365*5)) return "More than 5 years (Consider adjusting targets for faster progress).";
    const futureDate = addDays(new Date(), Math.round(daysToGoal));
    return format(futureDate, "MMMM d, yyyy");
  }
};


const ProfileDisplayItem: React.FC<{ label: string; value: string | number | null | undefined; icon?: React.ReactNode; unit?: string; placeholder?: string; isBlock?: boolean }> = ({ label, value, icon, unit, placeholder = "Not set", isBlock = false }) => (
  <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
    <dt className="text-sm font-medium text-muted-foreground flex items-center">
      {icon && <span className="mr-2 h-5 w-5 text-primary">{icon}</span>}
      {label}
    </dt>
    <dd className={`mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2 ${isBlock ? 'whitespace-pre-wrap' : ''}`}>
      {(value !== null && value !== undefined && (typeof value === 'string' ? value.trim() !== '' : true) ) ? `${value}${unit || ''}` : <span className="italic">{placeholder}</span>}
    </dd>
  </div>
);


export default function ProfileForm() {
  const { user, userProfile: initialProfileFromContext, loading: authLoading, setUserProfile: updateAuthContextProfile } = useAuth();
  const [displayProfile, setDisplayProfile] = useState<UserProfile | null>(initialProfileFromContext || null);
  
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [calculatedDisplayMacros, setCalculatedDisplayMacros] = useState<Partial<UserProfile>>({ targetCarbs: 20 });
  const [estimatedDisplayGoalDate, setEstimatedDisplayGoalDate] = useState<string | null>(null);
  
  const justSaved = useRef(false);


  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      myWhy: '',
      currentWeight: null,
      targetWeight: null,
      activityLevel: null,
      startingWeight: null,
      journeyStartDate: null,
      targetWaterIntake: null,
    },
  });

  const watchedCurrentWeight = form.watch('currentWeight');
  const watchedTargetWeight = form.watch('targetWeight');
  const watchedActivityLevel = form.watch('activityLevel');

  const synchronizeProfileStates = (profile: UserProfile | null) => {
    setDisplayProfile(profile); 

    if (profile) {
        let journeyStartDateJS: Date | null = null;
        if (profile.journeyStartDate instanceof Timestamp) {
            journeyStartDateJS = profile.journeyStartDate.toDate();
        } else if (typeof profile.journeyStartDate === 'string') { 
            const parsedDate = parseISO(profile.journeyStartDate);
            if (isValidDateFn(parsedDate)) journeyStartDateJS = parsedDate;
        } else if (profile.journeyStartDate instanceof Date && isValidDateFn(profile.journeyStartDate)) {
            journeyStartDateJS = profile.journeyStartDate;
        }

        const defaultFormValues: ProfileFormValues = {
          displayName: profile.displayName || '',
          myWhy: profile.myWhy || '',
          currentWeight: profile.currentWeight || null,
          targetWeight: profile.targetWeight || null,
          activityLevel: profile.activityLevel || null,
          startingWeight: profile.startingWeight || null,
          journeyStartDate: journeyStartDateJS,
          targetWaterIntake: profile.targetWaterIntake || null,
        };
        form.reset(defaultFormValues);

        const currentWtFromProfile = profile.currentWeight;
        const targetWtFromProfile = profile.targetWeight;
        const activityLevelFromProfile = profile.activityLevel;

        const macros = calculateKetoMacros(currentWtFromProfile, targetWtFromProfile, activityLevelFromProfile);
        setCalculatedDisplayMacros(macros);
        
        const projection = calculateGoalProjection(currentWtFromProfile, targetWtFromProfile, activityLevelFromProfile, macros.targetCalories);
        setEstimatedDisplayGoalDate(projection);

      } else {
        form.reset({ displayName: '', myWhy: '', currentWeight: null, targetWeight: null, activityLevel: null, startingWeight: null, journeyStartDate: null, targetWaterIntake: null });
        setCalculatedDisplayMacros({ targetCarbs: 20, targetCalories: null, targetProtein: null, targetFat: null });
        setEstimatedDisplayGoalDate("Enter profile details to see estimates.");
      }
  };

  useEffect(() => {
    if (justSaved.current) {
      justSaved.current = false; 
      return;
    }
    
    if (!authLoading && user) {
      synchronizeProfileStates(initialProfileFromContext);
    } else if (!authLoading && !user) {
      synchronizeProfileStates(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProfileFromContext, authLoading, user, form.reset]);


  useEffect(() => {
    let currentWtToUse: number | null | undefined = null;
    let targetWtToUse: number | null | undefined = null;
    let activityLevelToUse: ActivityLevel | null | undefined = null;

    if (editMode) { 
        currentWtToUse = watchedCurrentWeight;
        targetWtToUse = watchedTargetWeight;
        activityLevelToUse = watchedActivityLevel;
    } else if (displayProfile) { 
        currentWtToUse = displayProfile.currentWeight;
        targetWtToUse = displayProfile.targetWeight;
        activityLevelToUse = displayProfile.activityLevel;
    }

    if (currentWtToUse && activityLevelToUse) {
        const macros = calculateKetoMacros(currentWtToUse, targetWtToUse, activityLevelToUse);
        setCalculatedDisplayMacros(macros); 
        const projection = calculateGoalProjection(currentWtToUse, targetWtToUse, activityLevelToUse, macros.targetCalories);
        setEstimatedDisplayGoalDate(projection);
    } else {
        setCalculatedDisplayMacros({ targetCarbs: 20, targetCalories: null, targetProtein: null, targetFat: null });
        if (!currentWtToUse || !activityLevelToUse) {
            setEstimatedDisplayGoalDate("Set current weight & activity level for estimates.");
        } else if (!targetWtToUse) {
            setEstimatedDisplayGoalDate("Set target weight for projection.");
        } else {
            setEstimatedDisplayGoalDate("Calculation unavailable. Check inputs.");
        }
    }
  }, [watchedCurrentWeight, watchedTargetWeight, watchedActivityLevel, editMode, displayProfile]);


  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to update your profile.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    const finalCalculatedMacros = calculateKetoMacros(data.currentWeight, data.targetWeight, data.activityLevel);
    let finalEstimatedGoalDate = calculateGoalProjection(data.currentWeight, data.targetWeight, data.activityLevel, finalCalculatedMacros.targetCalories);


    const dataToUpdate: Partial<UserProfile> & { updatedAt?: any } = {};
    dataToUpdate.displayName = data.displayName === '' ? null : (data.displayName || null);
    dataToUpdate.myWhy = data.myWhy === '' ? null : (data.myWhy || null);
    dataToUpdate.currentWeight = data.currentWeight || null;
    dataToUpdate.targetWeight = data.targetWeight || null;
    dataToUpdate.activityLevel = data.activityLevel || null;
    dataToUpdate.startingWeight = data.startingWeight || null;
    dataToUpdate.journeyStartDate = data.journeyStartDate ? Timestamp.fromDate(data.journeyStartDate) : null;
    dataToUpdate.targetWaterIntake = data.targetWaterIntake || null;

    dataToUpdate.targetCalories = finalCalculatedMacros.targetCalories ?? null;
    dataToUpdate.targetProtein = finalCalculatedMacros.targetProtein ?? null;
    dataToUpdate.targetCarbs = finalCalculatedMacros.targetCarbs ?? 20;
    dataToUpdate.targetFat = finalCalculatedMacros.targetFat ?? null;
    dataToUpdate.estimatedGoalDate = finalEstimatedGoalDate ?? null;
    
    let hasChanges = false;
    const currentBaselineProfile = displayProfile; 

    const initialFormValuesForCompare: ProfileFormValues = {
        displayName: currentBaselineProfile?.displayName || '',
        myWhy: currentBaselineProfile?.myWhy || '',
        currentWeight: currentBaselineProfile?.currentWeight || null,
        targetWeight: currentBaselineProfile?.targetWeight || null,
        activityLevel: currentBaselineProfile?.activityLevel || null,
        startingWeight: currentBaselineProfile?.startingWeight || null,
        targetWaterIntake: currentBaselineProfile?.targetWaterIntake || null,
        journeyStartDate: currentBaselineProfile?.journeyStartDate instanceof Timestamp
                                ? currentBaselineProfile.journeyStartDate.toDate()
                                : (currentBaselineProfile?.journeyStartDate && typeof currentBaselineProfile.journeyStartDate === 'string' && isValidDateFn(parseISO(currentBaselineProfile.journeyStartDate)))
                                  ? parseISO(currentBaselineProfile.journeyStartDate)
                                  : (currentBaselineProfile?.journeyStartDate instanceof Date && isValidDateFn(currentBaselineProfile.journeyStartDate))
                                    ? currentBaselineProfile.journeyStartDate
                                    : null,
    };
    
    const fieldsToCompare: (keyof ProfileFormValues)[] = ['displayName', 'myWhy', 'currentWeight', 'targetWeight', 'activityLevel', 'startingWeight', 'targetWaterIntake'];
    for (const key of fieldsToCompare) {
        let formValue = data[key];
        let initialValue = initialFormValuesForCompare[key];

        if ((key === 'displayName' || key === 'myWhy') && (initialValue === null || initialValue === undefined) && formValue === '') { /* no change if both are effectively empty */ } 
        else if ((key === 'displayName' || key === 'myWhy') && initialValue === '' && (formValue === null || formValue === undefined)) { /* no change if both are effectively empty */ }
        else if (formValue !== initialValue) { hasChanges = true; break; }
    }
    const currentJourneyStartDateMs = data.journeyStartDate ? data.journeyStartDate.getTime() : null;
    const initialJourneyStartDateMs = initialFormValuesForCompare.journeyStartDate ? initialFormValuesForCompare.journeyStartDate.getTime() : null;
    if (currentJourneyStartDateMs !== initialJourneyStartDateMs) { hasChanges = true; }

    if(currentBaselineProfile?.targetCalories !== dataToUpdate.targetCalories ||
        currentBaselineProfile?.targetProtein !== dataToUpdate.targetProtein ||
        currentBaselineProfile?.targetFat !== dataToUpdate.targetFat ||
        currentBaselineProfile?.targetCarbs !== dataToUpdate.targetCarbs ||
        currentBaselineProfile?.estimatedGoalDate !== dataToUpdate.estimatedGoalDate) {
        hasChanges = true;
    }


    if (!hasChanges) {
      toast({ title: 'No Changes', description: 'No information was changed to save.' });
      setIsSubmitting(false);
      setEditMode(false);
      return;
    }

    dataToUpdate.updatedAt = serverTimestamp();

    try {
      const userDocRef = firestoreDoc(db, 'users', user.uid);
      await updateDoc(userDocRef, dataToUpdate);

      const updatedProfileForContextAndDisplay: UserProfile = {
        uid: user.uid,
        email: user.email, 
        createdAt: displayProfile?.createdAt || initialProfileFromContext?.createdAt || Timestamp.now(),
        
        displayName: dataToUpdate.displayName,
        myWhy: dataToUpdate.myWhy,
        currentWeight: dataToUpdate.currentWeight,
        targetWeight: dataToUpdate.targetWeight,
        activityLevel: dataToUpdate.activityLevel,
        startingWeight: dataToUpdate.startingWeight,
        journeyStartDate: dataToUpdate.journeyStartDate instanceof Timestamp ? dataToUpdate.journeyStartDate : (data.journeyStartDate ? Timestamp.fromDate(data.journeyStartDate) : null),
        targetWaterIntake: dataToUpdate.targetWaterIntake,
        
        targetCalories: dataToUpdate.targetCalories,
        targetProtein: dataToUpdate.targetProtein,
        targetCarbs: dataToUpdate.targetCarbs,
        targetFat: dataToUpdate.targetFat,
        estimatedGoalDate: dataToUpdate.estimatedGoalDate,
        updatedAt: Timestamp.now(), 
        activeWorkoutPlan: displayProfile?.activeWorkoutPlan || initialProfileFromContext?.activeWorkoutPlan || null,
      };
      
      Object.keys(updatedProfileForContextAndDisplay).forEach(keyStr => {
        const key = keyStr as keyof UserProfile;
        if ((updatedProfileForContextAndDisplay as any)[key] === undefined) {
          (updatedProfileForContextAndDisplay as any)[key] = null;
        }
      });
      
      if (updateAuthContextProfile) {
        updateAuthContextProfile(updatedProfileForContextAndDisplay);
      }
      
      setDisplayProfile(updatedProfileForContextAndDisplay); 
      synchronizeProfileStates(updatedProfileForContextAndDisplay);
      justSaved.current = true; 

      toast({ title: 'Profile Updated', description: 'Your calculated Keto targets and profile have been saved.' });
      setEditMode(false);

    } catch (error: any) {
      let errorMsg = "Failed to update profile.";
      if (error.code === 'permission-denied') {
        errorMsg = "Update failed: Insufficient permissions. Check Firestore rules.";
      } else if (error.message) {
        errorMsg = error.message;
      }
      toast({ title: 'Update Failed', description: errorMsg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading && !displayProfile) { 
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4 pb-4 border-b">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        {[...Array(7)].map((_, i) => (
            <div key={i} className="space-y-2 pt-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
          <Skeleton className="h-20 w-full mt-6" />
        <Skeleton className="h-10 w-1/3 mt-6" />
      </div>
    );
  }

  const viewProfile = displayProfile; 

  const viewDisplayName = viewProfile?.displayName || user?.email?.split('@')[0] || "User";
  const viewEmail = user?.email || "No email";
  const viewMyWhy = viewProfile?.myWhy;

  const viewStartingWeight = viewProfile?.startingWeight;
  let viewJourneyStartDate: string | null = null;
    if (viewProfile?.journeyStartDate instanceof Timestamp) {
        viewJourneyStartDate = format(viewProfile.journeyStartDate.toDate(), "PPP");
    } else if (viewProfile?.journeyStartDate && typeof viewProfile.journeyStartDate === 'string' && isValidDateFn(parseISO(viewProfile.journeyStartDate))) {
        viewJourneyStartDate = format(parseISO(viewProfile.journeyStartDate), "PPP");
    } else if (viewProfile?.journeyStartDate instanceof Date && isValidDateFn(viewProfile.journeyStartDate)) {
        viewJourneyStartDate = format(viewProfile.journeyStartDate, "PPP");
    }

  const viewCurrentWeight = viewProfile?.currentWeight;
  const viewTargetWeight = viewProfile?.targetWeight;
  const viewActivityLevelLabel = viewProfile?.activityLevel
    ? activityLevels.find(al => al.value === viewProfile.activityLevel)?.label
    : null;
  const viewTargetWaterIntake = viewProfile?.targetWaterIntake;

  const showCalculatedTargetsInForm = editMode && watchedCurrentWeight && watchedActivityLevel;
  const showTargetsInViewMode = !editMode && displayProfile?.currentWeight && displayProfile?.activityLevel;


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center space-x-4">
          <UserCircle className="h-16 w-16 text-primary" />
          <div>
            <h3 className="text-xl font-semibold">{viewDisplayName}</h3>
            <p className="text-sm text-muted-foreground">{viewEmail}</p>
          </div>
        </div>
        {!editMode && (
          <Button variant="outline" onClick={() => {
            synchronizeProfileStates(displayProfile); 
            setEditMode(true);
          }} disabled={isSubmitting || authLoading}>
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        )}
      </div>

      {!editMode ? (
        <>
          <div className="divide-y divide-border">
            <ProfileDisplayItem label="My 'Why'" value={viewMyWhy} icon={<Quote />} placeholder="What's the real reason you're here?" isBlock={true} />
            <ProfileDisplayItem label="Display Name" value={viewProfile?.displayName} icon={<UserCircle />} placeholder="Not set (uses email prefix)" />
            {/* FIX: Replaced WeightIcon with Scale */}
            <ProfileDisplayItem label="Starting Weight" value={viewStartingWeight} icon={<Scale />} unit=" kg" />
            <ProfileDisplayItem label="Journey Start Date" value={viewJourneyStartDate} icon={<PlayCircleIcon />} />
            {/* FIX: Replaced UserCircle with Scale */}
            <ProfileDisplayItem label="Current Weight" value={viewCurrentWeight} icon={<Scale />} unit=" kg" />
            <ProfileDisplayItem label="Target Weight" value={viewTargetWeight} icon={<Target />} unit=" kg" />
            <ProfileDisplayItem label="Activity Level" value={viewActivityLevelLabel} icon={<Activity />} />
            <ProfileDisplayItem label="Daily Water Target" value={viewTargetWaterIntake} icon={<Droplet />} unit=" ml" />
          </div>
          {showTargetsInViewMode && (
            <Card className="mt-6 border-primary/50 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary">Your Saved Daily Keto Targets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-2">
                  {[
                    { icon: <Flame className="h-5 w-5 text-red-500 mb-1" />, label: "Calories", value: calculatedDisplayMacros.targetCalories?.toFixed(0) || 'N/A', unit: "kcal" },
                    { icon: <Beef className="h-5 w-5 text-green-500 mb-1" />, label: "Protein", value: calculatedDisplayMacros.targetProtein?.toFixed(0) || 'N/A', unit: "g" },
                    { icon: <Wheat className="h-5 w-5 text-yellow-500 mb-1" />, label: "Carbs", value: calculatedDisplayMacros.targetCarbs?.toFixed(0) || '20', unit: "g" },
                    // FIX: Replaced Droplets with Egg
                    { icon: <Egg className="h-5 w-5 text-blue-500 mb-1" />, label: "Fat", value: calculatedDisplayMacros.targetFat?.toFixed(0) || 'N/A', unit: "g" },
                  ].map(item => (
                    <div key={item.label} className="flex flex-col items-center p-3 bg-background rounded-lg shadow">
                      {item.icon}
                      <span className="font-medium">{item.value} {item.value !== 'N/A' ? item.unit : ''}</span>
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
                {estimatedDisplayGoalDate && (
                  <p className="text-sm text-primary mt-3 flex items-center justify-center font-medium">
                    <CalendarCheck className="h-4 w-4 mr-1.5"/>
                    {estimatedDisplayGoalDate.includes("Achieved") || estimatedDisplayGoalDate.includes("Maintaining") || estimatedDisplayGoalDate.includes("missing") || estimatedDisplayGoalDate.includes("unavailable") || estimatedDisplayGoalDate.includes("small") || estimatedDisplayGoalDate.includes("Review targets") || estimatedDisplayGoalDate.includes("More than") || estimatedDisplayGoalDate.includes("Set weight") || estimatedDisplayGoalDate.includes("Check inputs") || estimatedDisplayGoalDate.includes("Set target weight") || estimatedDisplayGoalDate.includes("Set current weight") || estimatedDisplayGoalDate.includes("Macro targets not calculated") || estimatedDisplayGoalDate.includes("Enter profile details")
                      ? <span className="italic">{estimatedDisplayGoalDate}</span>
                      : <span>Est. Goal Date: {estimatedDisplayGoalDate}</span>
                    }
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" {...form.register('displayName')} placeholder="Your Name" disabled={isSubmitting} />
            {form.formState.errors.displayName && <p className="text-sm text-destructive">{form.formState.errors.displayName.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="myWhy" className="flex items-center"><Quote className="h-4 w-4 mr-1 text-muted-foreground" />My "Why"</Label>
            <Textarea 
              id="myWhy" 
              {...form.register('myWhy')} 
              placeholder="e.g., To have the energy to play with my kids, to break a family cycle..." 
              className="resize-none"
              rows={3}
              disabled={isSubmitting} 
            />
            <p className="text-sm text-muted-foreground">On the tough days, this is what we'll come back to. What's the real reason you're building this system?</p>
            {form.formState.errors.myWhy && <p className="text-sm text-destructive">{form.formState.errors.myWhy.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              {/* FIX: Replaced WeightIcon with Scale */}
              <Label htmlFor="startingWeight" className="flex items-center"><Scale className="h-4 w-4 mr-1 text-muted-foreground" />Starting Weight (kg)</Label>
              <Input id="startingWeight" type="number" step="0.1" {...form.register('startingWeight')} placeholder="e.g., 85.0 (Optional)" disabled={isSubmitting} />
              {form.formState.errors.startingWeight && <p className="text-sm text-destructive">{form.formState.errors.startingWeight.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="journeyStartDate" className="flex items-center"><PlayCircleIcon className="h-4 w-4 mr-1 text-muted-foreground" />Journey Start Date</Label>
              <Controller
                control={form.control}
                name="journeyStartDate"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
                      >
                        <CalendarLucideIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date (Optional)</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={(date) => field.onChange(date)}
                        initialFocus
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {form.formState.errors.journeyStartDate && <p className="text-sm text-destructive">{form.formState.errors.journeyStartDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              {/* FIX: Replaced UserCircle with Scale */}
              <Label htmlFor="currentWeight" className="flex items-center"><Scale className="h-4 w-4 mr-1 text-muted-foreground" />Current Weight (kg)</Label>
              <Input id="currentWeight" type="number" step="0.1" {...form.register('currentWeight')} placeholder="Enter your current weight" disabled={isSubmitting} />
              {form.formState.errors.currentWeight && <p className="text-sm text-destructive">{form.formState.errors.currentWeight.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetWeight" className="flex items-center"><Target className="h-4 w-4 mr-1 text-muted-foreground" />Target Weight (kg)</Label>
              <Input id="targetWeight" type="number" step="0.1" {...form.register('targetWeight')} placeholder="Enter your target weight (Optional)" disabled={isSubmitting} />
              {form.formState.errors.targetWeight && <p className="text-sm text-destructive">{form.formState.errors.targetWeight.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="activityLevel" className="flex items-center"><Activity className="h-4 w-4 mr-1 text-muted-foreground" />Activity Level</Label>
              <Controller
                name="activityLevel"
                control={form.control}
                render={({ field }) => (
                  <Select
                    onValueChange={(value) => field.onChange(value as ActivityLevel)}
                    value={field.value || undefined}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="activityLevel">
                      <SelectValue placeholder="Select your activity level" />
                    </SelectTrigger>
                    <SelectContent>
                      {activityLevels.map(level => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.activityLevel && <p className="text-sm text-destructive">{form.formState.errors.activityLevel.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="targetWaterIntake" className="flex items-center"><Droplet className="h-4 w-4 mr-1 text-muted-foreground" />Daily Water Target (ml)</Label>
                <Input id="targetWaterIntake" type="number" step="100" {...form.register('targetWaterIntake')} placeholder="e.g., 2500 (Optional)" disabled={isSubmitting} />
                {form.formState.errors.targetWaterIntake && <p className="text-sm text-destructive">{form.formState.errors.targetWaterIntake.message}</p>}
            </div>
          </div>
          
          {showCalculatedTargetsInForm && (
              <Alert variant="default" className="mt-6 bg-muted/30 border-2 border-primary/50 rounded-lg p-4 shadow-md">
                <Brain className="h-5 w-5 text-primary" />
                <AlertTitle className="font-semibold text-primary">Live Calculation Preview</AlertTitle>
                <AlertDescription className="space-y-3">
                <p className="text-xs">These suggestions update live as you adjust weight and activity. They will be saved with your profile.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { icon: <Flame className="h-4 w-4 text-red-500" />, label: "Calories", value: calculatedDisplayMacros.targetCalories?.toFixed(0) || 'N/A', unit: "kcal" },
                    { icon: <Beef className="h-4 w-4 text-green-500" />, label: "Protein", value: calculatedDisplayMacros.targetProtein?.toFixed(0) || 'N/A', unit: "g" },
                    { icon: <Wheat className="h-4 w-4 text-yellow-500" />, label: "Carbs", value: calculatedDisplayMacros.targetCarbs?.toFixed(0) || '20', unit: "g" },
                    // FIX: Replaced Droplets with Egg
                    { icon: <Egg className="h-4 w-4 text-blue-500" />, label: "Fat", value: calculatedDisplayMacros.targetFat?.toFixed(0) || 'N/A', unit: "g" },
                  ].map(item => (
                    <div key={item.label} className="flex flex-col items-center p-2 bg-background/70 rounded shadow-sm">
                      {item.icon}
                      <span className="font-medium text-foreground">{item.value} {item.value !== 'N/A' ? item.unit : ''}</span>
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
                {estimatedDisplayGoalDate && (
                  <p className="text-xs text-primary mt-2 flex items-center justify-center font-medium">
                    <CalendarCheck className="h-3.5 w-3.5 mr-1"/>
                    {estimatedDisplayGoalDate.includes("Achieved") || estimatedDisplayGoalDate.includes("Maintaining") || estimatedDisplayGoalDate.includes("missing") || estimatedDisplayGoalDate.includes("unavailable") || estimatedDisplayGoalDate.includes("small") || estimatedDisplayGoalDate.includes("Review targets") || estimatedDisplayGoalDate.includes("More than") || estimatedDisplayGoalDate.includes("Set weight") || estimatedDisplayGoalDate.includes("Check inputs") || estimatedDisplayGoalDate.includes("Set target weight") || estimatedDisplayGoalDate.includes("Set current weight") || estimatedDisplayGoalDate.includes("Macro targets not calculated") || estimatedDisplayGoalDate.includes("Enter profile details")
                      ? <span className="italic">{estimatedDisplayGoalDate}</span>
                      : <span>Est. Goal Date: {estimatedDisplayGoalDate}</span>
                    }
                  </p>
                )}
                </AlertDescription>
              </Alert>
          )}


          <div className="flex space-x-2 pt-4">
            <Button type="submit" className="flex-1" disabled={isSubmitting || authLoading}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Profile & Calculate Targets
            </Button>
            <Button type="button" variant="outline" onClick={() => {
                synchronizeProfileStates(displayProfile); 
                setEditMode(false);
            }} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {!editMode && !showTargetsInViewMode && (
          <Alert variant="default" className="mt-6">
            <Info className="h-5 w-5" />
            <AlertTitle>Set Your Goals!</AlertTitle>
            <AlertDescription>
              Click 'Edit Profile' and enter your current weight and activity level to see your personalized Keto macro targets. Add a target weight for an estimated goal date. You can also set your daily water intake target here.
            </AlertDescription>
          </Alert>
      )}
    </div>
  );
}
