
'use client';

import type { ReactElement } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { GenerateWorkoutPlanInput } from '@/ai/flows/generate-workout-plan-flow';
import { Loader2, Brain, Star, Target, PackageCheck, CalendarDays, Clock, Focus, Ban, ClipboardList, ShieldCheck } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const fitnessLevels = ["beginner", "intermediate", "advanced"] as const;
const primaryGoals = ["weightLoss", "muscleGain", "generalFitness", "endurance", "strengthGain"] as const;
const equipmentTypes = ["bodyweight", "dumbbells", "barbell", "gymFull", "resistanceBands", "kettlebells"] as const;
const focusAreas = ["fullBody", "upperBody", "lowerBody", "core", "push", "pull", "legs"] as const;

const WorkoutPlanFormSchema = z.object({
  fitnessLevel: z.enum(fitnessLevels),
  primaryGoal: z.enum(primaryGoals),
  availableEquipment: z.array(z.enum(equipmentTypes)).min(1, "Please select at least one type of equipment."),
  daysPerWeek: z.coerce.number().int().min(1, "Must work out at least 1 day.").max(7, "Cannot work out more than 7 days."),
  sessionDurationMinutes: z.coerce.number().int().min(15, "Session must be at least 15 minutes.").max(120, "Session can be at most 120 minutes."),
  focusAreas: z.array(z.enum(focusAreas)).optional(),
  excludedExercises: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(Boolean) : []),
  jointFriendly: z.boolean().optional().default(false),
  specificRequests: z.string().optional(),
});

type WorkoutPlanFormValues = z.infer<typeof WorkoutPlanFormSchema>;

interface WorkoutPlanFormProps {
  onSubmit: (data: GenerateWorkoutPlanInput) => Promise<void>;
  isLoading: boolean;
  canGenerate: boolean; // New prop
  freeGenerationsLeft: number; // New prop
}

export default function WorkoutPlanForm({ onSubmit, isLoading, canGenerate, freeGenerationsLeft }: WorkoutPlanFormProps): ReactElement {
  const form = useForm<WorkoutPlanFormValues>({
    resolver: zodResolver(WorkoutPlanFormSchema),
    defaultValues: {
      fitnessLevel: 'beginner',
      primaryGoal: 'generalFitness',
      availableEquipment: ['bodyweight'],
      daysPerWeek: 3,
      sessionDurationMinutes: 45,
      focusAreas: [],
      excludedExercises: '',
      jointFriendly: false,
      specificRequests: '',
    },
  });

  const handleFormSubmit = (values: WorkoutPlanFormValues) => {
    if (!canGenerate) return; // Should be caught by button disabled state too
    const submissionData: GenerateWorkoutPlanInput = {
      ...values,
    };
    onSubmit(submissionData);
  };

  const getButtonText = () => {
    if (isLoading) return 'Coach Ath is Designing...';
    if (!canGenerate && freeGenerationsLeft === 0) return 'Upgrade for AI Plans'; // If strictly no free uses left
    if (!canGenerate && freeGenerationsLeft > 0) return `Generate Plan (${freeGenerationsLeft} left)`; // Should not happen if canGenerate is false
    if (canGenerate && freeGenerationsLeft < Infinity && freeGenerationsLeft >=0) return `Generate Plan (${freeGenerationsLeft} free left)`;
    return 'Generate My Workout Plan!';
  }

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="fitnessLevel" className="flex items-center">
            <Star className="mr-2 h-4 w-4 text-muted-foreground" />
            Fitness Level
          </Label>
          <Controller
            name="fitnessLevel"
            control={form.control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || !canGenerate}>
                <SelectTrigger id="fitnessLevel"><SelectValue placeholder="Select fitness level" /></SelectTrigger>
                <SelectContent>
                  {fitnessLevels.map(level => <SelectItem key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.fitnessLevel && <p className="text-sm text-destructive">{form.formState.errors.fitnessLevel.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="primaryGoal" className="flex items-center">
            <Target className="mr-2 h-4 w-4 text-muted-foreground" />
            Primary Goal
          </Label>
          <Controller
            name="primaryGoal"
            control={form.control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || !canGenerate}>
                <SelectTrigger id="primaryGoal"><SelectValue placeholder="Select primary goal" /></SelectTrigger>
                <SelectContent>
                  {primaryGoals.map(goal => <SelectItem key={goal} value={goal}>{goal.replace(/([A-Z])/g, ' $1').trim().charAt(0).toUpperCase() + goal.replace(/([A-Z])/g, ' $1').trim().slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.primaryGoal && <p className="text-sm text-destructive">{form.formState.errors.primaryGoal.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center">
          <PackageCheck className="mr-2 h-4 w-4 text-muted-foreground" />
          Available Equipment (select all that apply)
        </Label>
        <Controller
            name="availableEquipment"
            control={form.control}
            render={({ field }) => (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 p-3 border rounded-md max-h-48 overflow-y-auto">
                    {equipmentTypes.map((item) => (
                        <div key={item} className="flex items-center space-x-2">
                            <Checkbox
                                id={`equipment-${item}`}
                                checked={field.value?.includes(item)}
                                onCheckedChange={(checked) => {
                                    const newValue = checked
                                        ? [...(field.value || []), item]
                                        : (field.value || []).filter((value) => value !== item);
                                    field.onChange(newValue);
                                }}
                                disabled={isLoading || !canGenerate}
                            />
                            <Label htmlFor={`equipment-${item}`} className="font-normal text-sm">
                                {item.replace(/([A-Z])/g, ' $1').trim().charAt(0).toUpperCase() + item.replace(/([A-Z])/g, ' $1').trim().slice(1)}
                            </Label>
                        </div>
                    ))}
                </div>
            )}
        />
        {form.formState.errors.availableEquipment && <p className="text-sm text-destructive">{form.formState.errors.availableEquipment.message}</p>}
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="daysPerWeek" className="flex items-center">
            <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
            Days Per Week
          </Label>
          <Input id="daysPerWeek" type="number" {...form.register('daysPerWeek')} placeholder="e.g., 3" disabled={isLoading || !canGenerate} />
          {form.formState.errors.daysPerWeek && <p className="text-sm text-destructive">{form.formState.errors.daysPerWeek.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sessionDurationMinutes" className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            Session Duration (minutes)
          </Label>
          <Input id="sessionDurationMinutes" type="number" step="5" {...form.register('sessionDurationMinutes')} placeholder="e.g., 45" disabled={isLoading || !canGenerate} />
          {form.formState.errors.sessionDurationMinutes && <p className="text-sm text-destructive">{form.formState.errors.sessionDurationMinutes.message}</p>}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label className="flex items-center">
          <Focus className="mr-2 h-4 w-4 text-muted-foreground" />
          Focus Areas (optional, select all that apply)
        </Label>
         <Controller
            name="focusAreas"
            control={form.control}
            render={({ field }) => (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 p-3 border rounded-md max-h-40 overflow-y-auto">
                    {focusAreas.map((item) => (
                        <div key={item} className="flex items-center space-x-2">
                            <Checkbox
                                id={`focus-${item}`}
                                checked={field.value?.includes(item)}
                                onCheckedChange={(checked) => {
                                    const newValue = checked
                                        ? [...(field.value || []), item]
                                        : (field.value || []).filter((value) => value !== item);
                                    field.onChange(newValue);
                                }}
                                disabled={isLoading || !canGenerate}
                            />
                            <Label htmlFor={`focus-${item}`} className="font-normal text-sm">
                                {item.replace(/([A-Z])/g, ' $1').trim().charAt(0).toUpperCase() + item.replace(/([A-Z])/g, ' $1').trim().slice(1)}
                            </Label>
                        </div>
                    ))}
                </div>
            )}
        />
        {form.formState.errors.focusAreas && <p className="text-sm text-destructive">{form.formState.errors.focusAreas.message}</p>}
      </div>

      <div className="space-y-2">
        <Controller
          name="jointFriendly"
          control={form.control}
          render={({ field }) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="jointFriendly"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isLoading || !canGenerate}
              />
              <Label htmlFor="jointFriendly" className="flex items-center font-normal text-sm">
                <ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" />
                Prioritize Low-Impact / Joint-Friendly Exercises
              </Label>
            </div>
          )}
        />
        {form.formState.errors.jointFriendly && <p className="text-sm text-destructive">{form.formState.errors.jointFriendly.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="excludedExercises" className="flex items-center">
          <Ban className="mr-2 h-4 w-4 text-muted-foreground" />
          Excluded Exercises (comma-separated, optional)
        </Label>
        <Input id="excludedExercises" {...form.register('excludedExercises')} placeholder="e.g., Burpees, Lunges" disabled={isLoading || !canGenerate} />
        {form.formState.errors.excludedExercises && <p className="text-sm text-destructive">{form.formState.errors.excludedExercises.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="specificRequests" className="flex items-center">
          <ClipboardList className="mr-2 h-4 w-4 text-muted-foreground" />
          Specific Requests / Notes
        </Label>
        <Textarea id="specificRequests" {...form.register('specificRequests')} placeholder="e.g., low impact, focus on compound movements, short rests" disabled={isLoading || !canGenerate} />
        {form.formState.errors.specificRequests && <p className="text-sm text-destructive">{form.formState.errors.specificRequests.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || !canGenerate}>
        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Brain className="mr-2 h-5 w-5" />}
        {getButtonText()}
      </Button>
    </form>
  );
}
    