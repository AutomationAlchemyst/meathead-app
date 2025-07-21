
import {z} from 'genkit';

export const FitnessLevelSchema = z.enum(["beginner", "intermediate", "advanced"]).describe("User's current fitness level.");
export type FitnessLevel = z.infer<typeof FitnessLevelSchema>;

export const PrimaryGoalSchema = z.enum(["weightLoss", "muscleGain", "generalFitness", "endurance", "strengthGain"]).describe("User's primary fitness goal.");
export type PrimaryGoal = z.infer<typeof PrimaryGoalSchema>;

export const EquipmentSchema = z.enum(["bodyweight", "dumbbells", "barbell", "gymFull", "resistanceBands", "kettlebells"]).describe("Type of equipment available.");
export type Equipment = z.infer<typeof EquipmentSchema>;

export const FocusAreaSchema = z.enum(["fullBody", "upperBody", "lowerBody", "core", "push", "pull", "legs"]).describe("Specific body area focus.");
export type FocusArea = z.infer<typeof FocusAreaSchema>;

export const GenerateWorkoutPlanInputSchema = z.object({
  fitnessLevel: FitnessLevelSchema,
  primaryGoal: PrimaryGoalSchema,
  availableEquipment: z.array(EquipmentSchema).min(1).describe("List of available equipment. Must include at least one."),
  daysPerWeek: z.number().int().min(1).max(7).describe("Number of days per week the user can work out."),
  sessionDurationMinutes: z.number().int().min(15).max(120).describe("Preferred duration of each workout session in minutes."),
  focusAreas: z.array(FocusAreaSchema).optional().describe("Optional specific body areas to focus on or include."),
  excludedExercises: z.array(z.string()).optional().describe("Optional list of exercises to avoid due to preference or injury."),
  jointFriendly: z.boolean().optional().default(false).describe("If true, prioritize low-impact exercises and modifications suitable for joint sensitivity."),
  specificRequests: z.string().optional().describe("Any other specific requests, like 'low impact', 'focus on compound movements', 'short rests'."),
});
export type GenerateWorkoutPlanInput = z.infer<typeof GenerateWorkoutPlanInputSchema>;

export const ExerciseSchema = z.object({
  name: z.string().describe("Name of the exercise."),
  sets: z.string().describe("Number of sets (e.g., '3-4', '3', '5x5')."),
  reps: z.string().describe("Number of repetitions per set (e.g., '8-12', '15', 'AMRAP', '30s')."),
  restSeconds: z.string().describe("Rest time in seconds between sets (e.g., '60-90s', '45s', '2-3 min')."),
  notes: z.string().optional().describe("Specific instructions, form cues, or tips for the exercise."),
  videoSearchQuery: z.string().optional().describe("A suggested YouTube search query for finding an exercise demonstration video (e.g., 'Proper dumbbell bench press form')."),
});
export type Exercise = z.infer<typeof ExerciseSchema>;

export const DailyWorkoutSchema = z.object({
  dayNumber: z.number().int().min(1).describe("Sequential day number in the plan (1-7 for a weekly plan)."),
  dayName: z.string().describe("Name for the day, e.g., 'Day 1: Full Body A', 'Day 2: Upper Push', 'Rest Day'."),
  focus: z.string().describe("Primary focus for the day, e.g., 'Full Body Strength', 'Upper Body Hypertrophy', 'Cardio & Core', 'Active Recovery', 'Rest'."),
  warmUp: z.array(z.string()).describe("List of warm-up exercises or general warm-up routine (e.g., ['5 min light cardio', 'Dynamic stretches: arm circles, leg swings'])."),
  exercises: z.array(ExerciseSchema).optional().describe("List of exercises for the workout. Empty if it's a rest day or active recovery without specific exercises."),
  coolDown: z.array(z.string()).describe("List of cool-down exercises or general cool-down routine (e.g., ['Static stretches: hold each for 30s', '5 min light walk'])."),
});
export type DailyWorkout = z.infer<typeof DailyWorkoutSchema>;

export const GenerateWorkoutPlanOutputSchema = z.object({
  planName: z.string().describe("A descriptive name for the generated workout plan (e.g., 'Beginner Full Body Strength - 3 Days/Week')."),
  planDurationDays: z.number().describe("Duration of the plan in days. This MUST be 7 for a weekly plan structure."),
  introduction: z.string().describe("A brief introduction to the plan, its goals, and how to approach it."),
  dailyWorkouts: z.array(DailyWorkoutSchema).length(7).describe("An array of 7 daily workout schedules, covering a full week. Some days might be rest days."),
  overallNotes: z.array(z.string()).optional().describe("General advice, tips for progression, hydration, nutrition reminders related to the plan."),
  originalFitnessLevel: FitnessLevelSchema.describe("The fitness level input used to generate this plan."),
  originalPrimaryGoal: PrimaryGoalSchema.describe("The primary goal input used to generate this plan."),
});
export type GenerateWorkoutPlanOutput = z.infer<typeof GenerateWorkoutPlanOutputSchema>;


// Schemas for AdaptWorkoutSchedule flow
export const AdaptWorkoutScheduleInputSchema = z.object({
  originalPlan: GenerateWorkoutPlanOutputSchema.describe("The user's current 7-day workout plan."),
  missedDayNumber: z.number().int().min(1).max(7).describe("The day number (1-7) of the workout that was missed."),
  fitnessLevel: FitnessLevelSchema.describe("User's fitness level used for the original plan."),
  primaryGoal: PrimaryGoalSchema.describe("User's primary goal for the original plan."),
});
export type AdaptWorkoutScheduleInput = z.infer<typeof AdaptWorkoutScheduleInputSchema>;

export const AdaptWorkoutScheduleOutputSchema = z.object({
  adaptedPlanName: z.string().describe("The name for the adapted plan, e.g., 'Adapted - [Original Plan Name]'."),
  adaptationSummary: z.string().describe("A brief explanation of the changes made to the schedule."),
  updatedDailyWorkouts: z.array(DailyWorkoutSchema).length(7).describe("The new 7-day schedule of daily workouts, incorporating the adaptation."),
  overallNotes: z.array(z.string()).optional().describe("Any new or revised overall notes for the adapted plan."),
});
export type AdaptWorkoutScheduleOutput = z.infer<typeof AdaptWorkoutScheduleOutputSchema>;

