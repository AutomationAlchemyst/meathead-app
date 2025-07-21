
'use server';
/**
 * @fileOverview Generates personalized dashboard insights and motivational messages.
 *
 * - generateDashboardInsights - A function that handles insight generation.
 * - GenerateDashboardInsightsInput - The input type for the AI prompt.
 * - GenerateDashboardInsightsOutput - The return type for the AI prompt.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
// Original types are used for defining the Plain types passed to the exported function.
import type { UserProfile as UserProfileType, FoodLog as FoodLogType, WeightLog as WeightLogType, WorkoutLog as WorkoutLogType, WaterLog as WaterLogType, ActivityLevel } from '@/types';
// Firebase Timestamp is not used here as inputs are expected to be plain.

// Define plain types for function inputs (where Timestamps are already strings)
interface UserProfilePlain extends Omit<UserProfileType, 'createdAt' | 'journeyStartDate' | 'updatedAt' | 'activeWorkoutPlan'> {
  uid: string; // Explicitly ensure uid is here
  createdAt: string; // Expecting string from client
  journeyStartDate?: string | null; // Expecting string or null from client
  updatedAt?: string | null; // Expecting string or null from client
  targetWaterIntake?: number | null; 
  // activeWorkoutPlan is not directly sent to AI for insights, specific workout logs are.
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


// Zod schemas for AI prompt input (already expect strings for dates)
const UserProfileSchemaFields = {
  uid: z.string().describe("User's unique identifier."),
  email: z.string().nullable(),
  displayName: z.string().nullable().optional(),
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
  recentFoodLogs: z.array(FoodLogInputSchema).optional().describe("Array of food logs from the last 7-14 days. Empty if none."),
  recentWeightLogs: z.array(WeightLogInputSchema).optional().describe("Array of weight logs from the last 30 days. Empty if none."),
  recentWorkoutLogs: z.array(WorkoutLogInputSchema).optional().describe("Array of completed workout logs from the last 14-30 days. Empty if none."),
  recentWaterLogs: z.array(WaterLogInputSchema).optional().describe("Array of water logs from the last 7 days. Empty if none."), 
});
export type GenerateDashboardInsightsInput = z.infer<typeof GenerateDashboardInsightsInputSchema>;

const GenerateDashboardInsightsOutputSchema = z.object({
  mainHighlight: z.string().describe("A single, prominent, impactful message or key observation for the user."),
  detailedInsights: z.array(z.string()).describe("An array of 2-4 additional specific insights, motivational messages, or pieces of guidance."),
});
export type GenerateDashboardInsightsOutput = z.infer<typeof GenerateDashboardInsightsOutputSchema>;


const prepareInputForAI = (
    profile: UserProfilePlain, 
    foodLogs: FoodLogPlain[],
    weightLogs: WeightLogPlain[],
    workoutLogs: WorkoutLogPlain[],
    waterLogs?: WaterLogPlain[] // Make waterLogs optional here to align with potential undefined calls initially
): GenerateDashboardInsightsInput => {

    let effectiveJourneyStartDate = profile.journeyStartDate;
    if (!effectiveJourneyStartDate && profile.createdAt) {
        effectiveJourneyStartDate = profile.createdAt; 
    }

    let effectiveStartingWeight = profile.startingWeight;
    if (effectiveStartingWeight === null || effectiveStartingWeight === undefined) {
        if (weightLogs.length > 0) {
            const sortedLogs = [...weightLogs].sort((a,b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
            effectiveStartingWeight = sortedLogs[0].weight;
        } else if (profile.currentWeight) {
            effectiveStartingWeight = profile.currentWeight;
        }
    }

    const aiUserProfile = {
        uid: profile.uid,
        email: profile.email ?? null,
        displayName: profile.displayName ?? null,
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
        startingWeight: effectiveStartingWeight ?? null,
        journeyStartDate: effectiveJourneyStartDate ?? null,
    };

    return {
        userProfile: aiUserProfile,
        recentFoodLogs: (foodLogs || []).map(log => ({
            ...log, 
            loggedAt: log.loggedAt,
        })),
        recentWeightLogs: (weightLogs || []).map(log => ({
            ...log,
            loggedAt: log.loggedAt, 
        })),
        recentWorkoutLogs: (workoutLogs || []).map(log => ({
            ...log,
            completedAt: log.completedAt,
        })),
        recentWaterLogs: (waterLogs || []).map(log => ({ 
            ...log,
            loggedAt: log.loggedAt,
        })),
    };
};

export async function generateDashboardInsights(
    profile: UserProfilePlain,
    foodLogs: FoodLogPlain[],
    weightLogs: WeightLogPlain[],
    workoutLogs: WorkoutLogPlain[],
    waterLogs: WaterLogPlain[] // This parameter is now consistently passed from SmartInsightsCard
): Promise<GenerateDashboardInsightsOutput> {
  const aiInput = prepareInputForAI(profile, foodLogs, weightLogs, workoutLogs, waterLogs); 
  console.log("[AI Flow] Input prepared for Genkit flow (with workouts and water):", JSON.stringify(aiInput, null, 2));
  return generateDashboardInsightsFlow(aiInput);
}

const prompt = ai.definePrompt({
  name: 'generateDashboardInsightsPrompt',
  input: {schema: GenerateDashboardInsightsInputSchema},
  output: {schema: GenerateDashboardInsightsOutputSchema},
  prompt: `
You are Ath, a highly empathetic, knowledgeable, and supportive Keto fitness coach. Your goal is to provide personalized insights and motivation to the user, {{{userProfile.displayName}}}.
Focus on holistic well-being, including non-scale victories, mental strength, hydration, and the interplay between diet and exercise. Your tone is relatable and encouraging.

User Profile:
- Name: {{{userProfile.displayName}}} (UID: {{{userProfile.uid}}})
- Current Weight: {{{userProfile.currentWeight}}} kg (if available, otherwise "not set")
- Starting Weight: {{{userProfile.startingWeight}}} kg (if available, otherwise "not set, encourage user to set this in profile for better insights")
- Target Weight: {{{userProfile.targetWeight}}} kg (if available, otherwise "not set")
- Journey Start Date: {{{userProfile.journeyStartDate}}} (if available, otherwise "not set, encourage user to set this in profile for better insights")
- Account Created At (fallback for journey start if not set): {{{userProfile.createdAt}}}
- Last Profile Update: {{{userProfile.updatedAt}}} (if available)
- Activity Level (from profile): {{{userProfile.activityLevel}}}
- Target Daily Calories: {{{userProfile.targetCalories}}} kcal
- Target Daily Protein: {{{userProfile.targetProtein}}} g
- Target Daily Carbs: {{{userProfile.targetCarbs}}} g (usually around 20g for Keto)
- Target Daily Fat: {{{userProfile.targetFat}}} g
- Target Daily Water Intake: {{{userProfile.targetWaterIntake}}} ml (if available, otherwise "not set")
- Estimated Goal Date: {{{userProfile.estimatedGoalDate}}}

Recent Weight Logs (last 30 days, if any):
{{#if recentWeightLogs.length}}
{{#each recentWeightLogs}}
- {{weight}} kg on {{loggedAt}}
{{/each}}
{{else}}
- No recent weight logs.
{{/if}}

Recent Food Logs (last 7-14 days, if any):
{{#if recentFoodLogs.length}}
{{#each recentFoodLogs}}
- {{foodItem}} ({{quantity}}): {{calories}}kcal, P:{{protein}}g, C:{{carbs}}g, F:{{fat}}g on {{loggedAt}}
{{/each}}
{{else}}
- No recent food logs.
{{/if}}

Recent Workout Logs (last 14-30 days, if any):
{{#if recentWorkoutLogs.length}}
{{#each recentWorkoutLogs}}
- Workout: {{planName}} - {{dayName}} (Focus: {{focus}}) completed on {{completedAt}}
{{/each}}
{{else}}
- No recent workout logs.
{{/if}}

Recent Water Logs (last 7 days, if any):
{{#if recentWaterLogs.length}}
{{#each recentWaterLogs}}
- Drank {{amount}}ml on {{loggedAt}}
{{/each}}
{{else}}
- No recent water logs.
{{/if}}

Based on ALL the provided data (profile, food, weight, workouts, AND water), generate:
1.  'mainHighlight': A single, prominent, impactful message. This could be a major milestone, a key observation combining diet, exercise, and hydration, or strong encouragement.
2.  'detailedInsights': An array of 2-3 concise, actionable, and personalized insights or motivational messages.

To make your insights more relatable and inspiring, you can draw from the following real experiences. Weave the sentiment or lesson into your advice.

Shared Experiences for Inspiration (Diet Focused):
1. Rapid Initial Weight Loss: "Often water weight, but a great sign your body is adapting."
2. Reduced Bloating & Increased Energy: "Less bloating and stable energy once carbs are cut."
3. Overcoming Keto Flu: "Electrolytes and hydration are key; it passes!"
4. Cravings Change: "Sugary/starchy cravings diminish over time."
5. Non-Scale Victories: "Clothes fitting looser, better sleep, clearer skin, focus – HUGE wins."
6. Joy of Keto Cooking: "Discovering new keto recipes is fun."
7. Navigating Social Situations: "Planning ahead for social events is empowering."
8. Dealing with Plateaus: "Plateaus happen. Reassess, tweak macros, focus on consistency."
9. Importance of Electrolytes: "Key to feeling good on keto."
10. Tracking Helps: "Logging food provides valuable data and awareness."
11. Listening to Your Body: "Tune into real hunger and satiety cues."
12. Finding Your 'Why': "Connecting to a deeper reason helps weather tough days."
13. Mindset Shift About Food: "Food as fuel and nutrients, not 'good' or 'bad'."

Shared Experiences for Inspiration (Exercise Focused):
14. Finding Joy in Movement: "Exercise becomes a source of energy and stress relief."
15. Consistency Over Intensity: "Regular movement is more powerful than sporadic intense workouts."
16. Non-Scale Victories from Exercise: "Feeling stronger, more endurance, clothes fitting better."
17. Exercise and Keto Synergy: "Sustained energy for workouts once keto-adapted."
18. Overcoming Gym Intimidation: "Focus on your own journey, not comparing. Everyone starts somewhere."
19. Fueling Workouts on Keto: "Stay hydrated, electrolytes in check. Small protein snack if needed."

Shared Experiences for Inspiration (Hydration Focused - NEW):
20. Hydration Boosts Energy: "Proper hydration is often overlooked but can significantly impact energy levels and reduce 'keto flu' symptoms."
21. Water Aids Fat Loss: "Staying well-hydrated supports metabolic function and can aid in fat loss processes."
22. Clearer Skin & Better Digestion: "Many notice skin improvements and smoother digestion when consistently meeting water goals."
23. Curbing False Hunger: "Sometimes thirst is mistaken for hunger. A glass of water can often satisfy that feeling."
24. Electrolyte Balance with Water: "Especially on keto, drinking enough water helps balance electrolytes, preventing cramps and fatigue."

Instructions for Insights:
-   Contextualized Weight Analysis.
-   Macro & Food Logging Correlation.
-   Workout Log Insights.
-   Hydration Insights (NEW):
    *   If userProfile.targetWaterIntake is set and logs exist, comment on progress towards the target. "Great job hitting your water goal yesterday!" or "Seeing you're logging water, keep it up! Aiming for that {{{userProfile.targetWaterIntake}}}ml target can make a big difference."
    *   If userProfile.targetWaterIntake is set but logs are sparse/low, gently encourage. "Remember to keep sipping! Reaching your {{{userProfile.targetWaterIntake}}}ml water target daily supports your keto journey."
    *   If userProfile.targetWaterIntake is NOT set, encourage setting it. "Staying hydrated is key on keto. Consider setting a daily water goal in your profile!"
    *   Link hydration to energy, keto flu, or exercise if relevant data exists.
-   Troubleshooting & Guidance (Keto, Fitness, Hydration Tips).
-   Motivational Messages: Celebrate milestones (diet, weight, workouts, hydration). Reinforce positive habits.
-   Handling Missing Data: Encourage profile updates and consistent logging in all areas (food, weight, workouts, water).
-   Persona: Ath - Positive, uplifting, concise.
-   Prioritization: Pick the most relevant points. Try to connect diet, exercise, and hydration insights.

Output Format: Ensure your response strictly adheres to the JSON output schema.
`,
});

const generateDashboardInsightsFlow = ai.defineFlow(
  {
    name: 'generateDashboardInsightsFlow',
    inputSchema: GenerateDashboardInsightsInputSchema, 
    outputSchema: GenerateDashboardInsightsOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await prompt(input);
      if (!output) {
        console.warn("[AI Flow - generateDashboardInsightsFlow] AI returned a falsy output. Using fallback.");
        return {
          mainHighlight: "Welcome to MeatHead! Log meals, weight, water, and workouts to see personalized insights here.",
          detailedInsights: [
              "Update your profile with your current weight, target weight, activity level, and water target for more tailored advice.",
              "Consistent logging of food, weight, water, and workouts is key to understanding your progress!"
          ],
        };
      }
      return output;
    } catch (error) {
      console.error("[AI Flow - generateDashboardInsightsFlow] Error calling AI prompt:", error);
      return {
        mainHighlight: "Having trouble reaching Ath right now. Let's focus on basics!",
        detailedInsights: [
            "Log your meals, weight, water, and workouts consistently to track your progress.",
            "Ensure your profile details are up-to-date for the best experience.",
            "We'll try to get Ath's insights for you a bit later!"
        ],
      };
    }
  }
);

    