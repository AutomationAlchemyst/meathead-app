'use server';
/**
 * @fileOverview Generates personalized, contextual dashboard insights.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { UserProfile as UserProfileType, FoodLog as FoodLogType, WeightLog as WeightLogType, WorkoutLog as WorkoutLogType, WaterLog as WaterLogType, ActivityLevel } from '@/types';

// --- Plain Types for Server Action Input ---
interface UserProfilePlain extends Omit<UserProfileType, 'createdAt' | 'journeyStartDate' | 'updatedAt' | 'activeWorkoutPlan'> {
  uid: string;
  createdAt: string;
  journeyStartDate?: string | null;
  updatedAt?: string | null;
  targetWaterIntake?: number | null;
}

interface FoodLogPlain extends Omit<FoodLogType, 'loggedAt' | 'id' | 'userId'> {
  loggedAt: string;
}

interface WeightLogPlain extends Omit<WeightLogType, 'loggedAt' | 'id' | 'userId'> {
  loggedAt: string;
}

interface WorkoutLogPlain extends Omit<WorkoutLogType, 'completedAt' | 'id' | 'userId'> {
  completedAt: string;
}

interface WaterLogPlain extends Omit<WaterLogType, 'loggedAt' | 'id' | 'userId'> {
  amount: number;
  loggedAt: string;
}

// --- Zod Schemas for AI Prompt ---
const UserProfileSchemaFields = {
  uid: z.string().describe("User's unique identifier."),
  email: z.string().nullable(),
  displayName: z.string().nullable().optional(),
  myWhy: z.string().nullable().optional().describe("User's core motivation or reason for their journey."),
  currentWeight: z.number().nullable().optional(),
  createdAt: z.string().describe("Account creation date, ISO format."),
  updatedAt: z.string().nullable().optional().describe("Profile last update date, ISO format."),
  targetCalories: z.number().nullable().optional(),
  targetProtein: z.number().nullable().optional(),
  targetCarbs: z.number().nullable().optional(),
  targetFat: z.number().nullable().optional(),
  targetWeight: z.number().nullable().optional(),
  targetWaterIntake: z.number().int().min(0).nullable().optional().describe("User's daily water intake target in ml."),
  activityLevel: z.enum(['sedentary', 'lightlyActive', 'active', 'veryActive']).nullable().optional(),
  estimatedGoalDate: z.string().nullable().optional().describe("Estimated date to reach target weight, e.g., 'MMMM d, yyyy' or a status message."),
  startingWeight: z.number().nullable().optional(),
  journeyStartDate: z.string().nullable().optional().describe("User-defined journey start date, ISO format, or null if not set."),
};

const UserProfileInputSchema = z.object(UserProfileSchemaFields).required({ uid: true, createdAt: true, email: true });

const FoodLogSchemaFields = {
  foodItem: z.string(),
  quantity: z.string(),
  carbs: z.number(),
  protein: z.number(),
  fat: z.number(),
  calories: z.number(),
  loggedAt: z.string().describe("Log date, ISO format."),
};
const FoodLogInputSchema = z.object(FoodLogSchemaFields);

const WeightLogSchemaFields = {
  weight: z.number(),
  loggedAt: z.string().describe("Log date, ISO format."),
};
const WeightLogInputSchema = z.object(WeightLogSchemaFields);

const WorkoutLogSchemaFields = {
  planName: z.string().describe("Name of the workout plan."),
  dayNumber: z.number().describe("Day number of the workout in the plan."),
  dayName: z.string().describe("Name of the workout day (e.g., 'Upper Body A')."),
  focus: z.string().describe("Primary focus of the workout (e.g., 'Full Body Strength')."),
  completedAt: z.string().describe("Completion date, ISO format."),
};
const WorkoutLogInputSchema = z.object(WorkoutLogSchemaFields);

const WaterLogSchemaFields = {
  amount: z.number().int().min(0).describe("Amount of water logged in milliliters (ml)."),
  loggedAt: z.string().describe("Log date, ISO format."),
};
const WaterLogInputSchema = z.object(WaterLogSchemaFields);


const GenerateDashboardInsightsInputSchema = z.object({
  userProfile: UserProfileInputSchema.describe("The user's profile data."),
  todaysMacros: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }).describe("A summary of macros consumed *today*."),
  timeOfDay: z.enum(['morning', 'afternoon', 'evening']).describe("The current time of day to provide contextual advice."),
});
export type GenerateDashboardInsightsInput = z.infer<typeof GenerateDashboardInsightsInputSchema>;

// The output is now a single, powerful string.
export type GenerateDashboardInsightsOutput = string;

// This function now only prepares the data needed for the new, simpler prompt.
const prepareInputForAI = (
  profile: UserProfilePlain,
  foodLogs: FoodLogPlain[],
  timeOfDay: 'morning' | 'afternoon' | 'evening'
): GenerateDashboardInsightsInput => {
  const todaysDate = new Date().toISOString().split('T')[0];
  const todaysFoodLogs = foodLogs.filter(log => log.loggedAt.startsWith(todaysDate));

  const todaysMacros = todaysFoodLogs.reduce((acc, log) => {
    acc.calories += log.calories;
    acc.protein += log.protein;
    acc.carbs += log.carbs;
    acc.fat += log.fat;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return {
    userProfile: {
      uid: profile.uid,
      email: profile.email ?? null,
      displayName: profile.displayName ?? null,
      myWhy: profile.myWhy ?? null,
      currentWeight: profile.currentWeight ?? null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt ?? null,
      targetCalories: profile.targetCalories ?? null,
      targetProtein: profile.targetProtein ?? null,
      targetCarbs: profile.targetCarbs ?? null,
      targetFat: profile.targetFat ?? null,
      targetWeight: profile.targetWeight ?? null,
      targetWaterIntake: profile.targetWaterIntake ?? null,
      activityLevel: profile.activityLevel ?? null,
      estimatedGoalDate: profile.estimatedGoalDate ?? null,
      startingWeight: profile.startingWeight ?? null,
      journeyStartDate: profile.journeyStartDate ?? null,
    },
    todaysMacros,
    timeOfDay,
  };
};

// The main exported function, updated to take timeOfDay.
export async function generateDashboardInsights(
  profile: UserProfilePlain,
  foodLogs: FoodLogPlain[],
  timeOfDay: 'morning' | 'afternoon' | 'evening'
): Promise<GenerateDashboardInsightsOutput> {
  const aiInput = prepareInputForAI(profile, foodLogs, timeOfDay);
  console.log("[AI Flow] Input prepared for Genkit flow:", JSON.stringify(aiInput, null, 2));
  return generateDashboardInsightsFlow(aiInput);
}

// The prompt is now focused on generating a single, contextual insight.
const prompt = ai.definePrompt({
  name: 'generateDashboardInsightsPrompt',
  input: { schema: GenerateDashboardInsightsInputSchema },
  output: { format: 'text' }, // We just want a simple string back.
  prompt: `
    You are Coach Ath, a wise, direct, and empathetic fitness and life coach from Singapore. Your tone is like a wise older brother ('Abang')—calm, encouraging, but no-nonsense. Your goal is to provide a single, actionable insight based on the user's progress for the day and the current time.

    **User's Profile & Targets:**
    - Name: {{{userProfile.displayName}}}
    - Daily Calorie Target: {{{userProfile.targetCalories}}} kcal
    - Daily Protein Target: {{{userProfile.targetProtein}}} g
    - Their "Why": "{{{userProfile.myWhy}}}"

    **User's Progress So Far Today:**
    - Calories Consumed: {{{todaysMacros.calories}}} kcal
    - Protein Consumed: {{{todaysMacros.protein}}} g

    **Current Time of Day: {{{timeOfDay}}}**

    **Your Instructions:**
    1.  **Analyze the Situation:** Based on the time of day and their progress, identify the single most important thing they should focus on next.
    2.  **Be Proactive & Actionable:** Don't just report numbers. Give a specific, forward-looking suggestion.
    3.  **Adapt to the Time of Day:**
        - **Morning:** The day is young. Focus on setting a positive trajectory. If they've logged breakfast, comment on the start. If not, suggest a good first step.
        - **Afternoon:** It's the midpoint. Check their progress against targets. Are they on track for protein? Is it time for a high-protein snack? How's their water intake (remind them gently if needed)?
        - **Evening:** The day is winding down. Review the day's performance. If they met their goals, acknowledge it. If they're short, suggest a simple way to close the gap. If they're over, frame it as data for tomorrow.
    4.  **Keep it Concise:** One or two powerful sentences.
    5.  **Maintain the Coach Ath Voice:** Avoid generic compliments. Be authentic. If they have a "Why," subtly connect your advice to it.

    **Example Scenarios:**
    - **Morning, on track:** "Good start with breakfast, {{{userProfile.displayName}}}. You've laid the foundation. Now, let's think about a protein-focused lunch."
    - **Afternoon, low on protein:** "Alright, it's mid-day. You're about halfway to your protein goal. A handful of nuts or a protein shake now would be a solid move to stay on track."
    - **Evening, met goals:** "You hit your protein target today. Good work. That's the system in action. Time to rest and reset for tomorrow."
    - **Evening, over on calories:** "Okay, calories are a bit over today. No stress, it's just data. We learn from it and get back on the system tomorrow morning. One day doesn't break the cycle."

    Now, generate the single most useful insight for {{{userProfile.displayName}}} right now.
  `,
});

const generateDashboardInsightsFlow = ai.defineFlow(
  {
    name: 'generateDashboardInsightsFlow',
    inputSchema: GenerateDashboardInsightsInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      if (!output) {
        console.warn("[AI Flow] AI returned a falsy output. Using fallback.");
        return "Log your meals to see personalized insights from Coach Ath here.";
      }
      return output;
    } catch (error) {
      console.error("[AI Flow] Error calling AI prompt:", error);
      return "Having trouble reaching Ath right now. Let's focus on the plan!";
    }
  }
);
