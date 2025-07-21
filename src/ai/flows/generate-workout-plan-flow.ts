
'use server';
/**
 * @fileOverview Generates personalized workout plans.
 *
 * - generateWorkoutPlan - A function that handles workout plan generation.
 * - GenerateWorkoutPlanInput - The input type for the generateWorkoutPlan function.
 * - GenerateWorkoutPlanOutput - The return type for the generateWorkoutPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { 
    GenerateWorkoutPlanInputSchema, 
    GenerateWorkoutPlanOutputSchema,
    type GenerateWorkoutPlanInput,
    type GenerateWorkoutPlanOutput
} from '@/ai/schemas/workout-schemas';

// Export types that might be used by client components or other server actions
export type { GenerateWorkoutPlanInput, GenerateWorkoutPlanOutput };


export async function generateWorkoutPlan(input: GenerateWorkoutPlanInput): Promise<GenerateWorkoutPlanOutput> {
  return generateWorkoutPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWorkoutPlanPrompt',
  input: {schema: GenerateWorkoutPlanInputSchema},
  output: {schema: GenerateWorkoutPlanOutputSchema},
  prompt: `You are "Coach Ath", an expert fitness AI specializing in creating effective and safe workout plans, particularly for individuals on a Keto diet (though the diet itself is not the primary factor for the workout structure, keep energy levels in mind for beginners).

Your task is to generate a comprehensive 7-day workout plan based on the user's preferences.

User Preferences:
- Fitness Level: {{{fitnessLevel}}}
- Primary Goal: {{{primaryGoal}}}
- Available Equipment: {{{availableEquipment}}} (This is a list, use these resources primarily)
- Workout Days Per Week: {{{daysPerWeek}}}
- Session Duration: {{{sessionDurationMinutes}}} minutes per workout
- Focus Areas (Optional): {{#if focusAreas}} {{{focusAreas}}} {{else}} General, based on primary goal {{/if}}
- Excluded Exercises (Optional): {{#if excludedExercises}} {{{excludedExercises}}} {{else}} None {{/if}}
{{#if jointFriendly}}
- Joint-Friendly Priority: YES
{{else}}
- Joint-Friendly Priority: NO (User has not specifically requested joint-friendly exercises. Standard exercises appropriate for fitness level are fine.)
{{/if}}
- Specific Requests (Optional): {{{specificRequests}}}

Plan Structure (Strictly follow this JSON output format):
1.  'planName': A descriptive name for the plan (e.g., "Intermediate Dumbbell Muscle Gain - 4 Days/Week").
2.  'planDurationDays': Must be 7.
3.  'introduction': A brief, encouraging intro (2-3 sentences) about the plan, how to approach it, and a reminder to consult a doctor before starting.
4.  'dailyWorkouts': An array of EXACTLY 7 'DailyWorkoutSchema' objects, one for each day of the week.
    *   Distribute the '{{{daysPerWeek}}}' workout days among the 7 calendar days. The remaining days should be 'Rest Day' or 'Active Recovery'.
    *   For each 'DailyWorkoutSchema':
        *   'dayNumber': 1 through 7.
        *   'dayName': Descriptive (e.g., "Day 1: Full Body Strength", "Day 3: Upper Body Focus", "Rest Day").
        *   'focus': Brief description (e.g., "Full Body", "Upper Push", "Lower & Core", "Cardio", "Rest", "Active Recovery - Light Walk & Stretching").
        *   'warmUp': An array of 2-4 strings describing warm-up activities (e.g., ["5 min light cardio (jogging in place)", "Arm circles x15 each way", "Leg swings x10 each leg"]).
        *   'exercises': An array of 'ExerciseSchema' objects. THIS SHOULD BE EMPTY IF IT'S A REST DAY.
            *   For each 'ExerciseSchema':
                *   'name': Clear exercise name (e.g., "Dumbbell Bench Press", "Bodyweight Squats", "Plank").
                *   'sets': Number of sets (e.g., "3", "4", "3-4"). For timed exercises like planks, use "3 sets".
                *   'reps': Repetitions (e.g., "8-12", "15-20", "AMRAP", "30-60 seconds"). For endurance or bodyweight, higher reps might be suitable. For strength, lower reps.
                *   'restSeconds': Rest time (e.g., "60s", "90s", "45-60s", "2 min"). Shorter for conditioning, longer for strength.
                *   'notes': (Optional) Brief, critical form cues or intensity notes (e.g., "Keep core engaged", "Control the descent", "Go to near failure on last set"). Max 1-2 short sentences. If 'Joint-Friendly Priority' is YES, include notes on modifications for joint safety where applicable (e.g., "Perform with controlled motion to protect knees", "If full range is uncomfortable, reduce depth").
                *   'videoSearchQuery': (Optional) A concise and effective YouTube search query for finding a demonstration video. E.g., "Proper dumbbell bench press form", "Bodyweight squat tutorial".
        *   'coolDown': An array of 2-3 strings describing cool-down activities (e.g., ["Static chest stretch 30s", "Hamstring stretch 30s per leg", "5 min walk"]).
5.  'overallNotes': (Optional) An array of 2-4 general tips (e.g., "Stay hydrated throughout the day.", "Listen to your body and adjust if needed.", "Focus on progressive overload: try to increase weight, reps, or sets over time.", "Ensure adequate protein intake to support {{{primaryGoal}}}.").
6.  'originalFitnessLevel': Set this to the input '{{{fitnessLevel}}}'. This is crucial for future adaptations.
7.  'originalPrimaryGoal': Set this to the input '{{{primaryGoal}}}'. This is crucial for future adaptations.

Important Considerations:
-   Safety & Effectiveness: Prioritize safe, common exercises appropriate for the 'fitnessLevel' and 'availableEquipment'.
{{#if jointFriendly}}
-   Joint Safety: User has requested joint-friendly exercises. Give HIGH PRIORITY to low-impact movements. Suggest modifications for common exercises to reduce joint stress (e.g., suggest bodyweight squats instead of jump squats, incline push-ups instead of standard push-ups if wrist/shoulder issues are implied by the 'joint-friendly' request). AVOID high-impact activities (like jumping, running, plyometrics) unless absolutely necessary for the goal and no suitable alternative exists. If a typically higher-impact exercise is essential and a low-impact alternative isn't feasible for the goal (rare), clearly note the higher impact nature and strongly advise caution and listening to the body. Add notes to exercises regarding form cues for joint protection.
{{/if}}
-   Balance: Ensure a balanced plan, especially for 'fullBody' or if no 'focusAreas' are specified. Distribute workout days and rest days sensibly.
-   Session Duration: The total time for warm-up, exercises (including rests), and cool-down should roughly match 'sessionDurationMinutes'.
-   Keto Context: While not a diet plan, acknowledge that users might be on Keto. For beginners, this might mean slightly lower initial intensity or more attention to hydration/electrolytes (can be a general note).
-   Clarity: Exercise names should be standard. Instructions clear. Video search queries should be helpful.

Generate the 7-day workout plan now.
`,
});

const generateWorkoutPlanFlow = ai.defineFlow(
  {
    name: 'generateWorkoutPlanFlow',
    inputSchema: GenerateWorkoutPlanInputSchema,
    outputSchema: GenerateWorkoutPlanOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("Coach Ath is resting! Failed to generate a workout plan. Please try adjusting your preferences.");
    }
    // Ensure overallNotes is an array, even if empty, if AI omits it
    if (output && !output.overallNotes) {
        output.overallNotes = [];
    }
    // Ensure exercises array exists for non-rest days, even if empty (though AI should populate or mark as rest)
    output.dailyWorkouts.forEach(day => {
        if (day.focus.toLowerCase() !== 'rest' && day.focus.toLowerCase() !== 'rest day' && !day.exercises) {
            day.exercises = [];
        }
    });
    // Manually ensure originalFitnessLevel and originalPrimaryGoal are passed through from input if not directly set by AI
    // (though the prompt now instructs AI to set them)
    if (!output.originalFitnessLevel) {
        output.originalFitnessLevel = input.fitnessLevel;
    }
    if (!output.originalPrimaryGoal) {
        output.originalPrimaryGoal = input.primaryGoal;
    }
    return output;
  }
);

