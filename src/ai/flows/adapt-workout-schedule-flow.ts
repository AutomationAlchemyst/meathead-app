
'use server';
/**
 * @fileOverview Adapts a user's workout plan if a day is missed.
 *
 * - adaptWorkoutSchedule - A function that handles workout schedule adaptation.
 * - AdaptWorkoutScheduleInput - The input type for the adaptWorkoutSchedule function.
 * - AdaptWorkoutScheduleOutput - The return type for the adaptWorkoutSchedule function.
 */

import {ai} from '@/ai/genkit';
// Schemas are now imported from the shared workout-schemas.ts file
import { 
  AdaptWorkoutScheduleInputSchema,
  AdaptWorkoutScheduleOutputSchema,
  type AdaptWorkoutScheduleInput,
  type AdaptWorkoutScheduleOutput,
  // The following are used by the input/output schemas above
  GenerateWorkoutPlanOutputSchema, 
  DailyWorkoutSchema, 
  FitnessLevelSchema,
  PrimaryGoalSchema,
  type DailyWorkout, 
  type GenerateWorkoutPlanOutput 
} from '@/ai/schemas/workout-schemas'; 

// Export types that might be used by client components or other server actions
export type { AdaptWorkoutScheduleInput, AdaptWorkoutScheduleOutput };


export async function adaptWorkoutSchedule(input: AdaptWorkoutScheduleInput): Promise<AdaptWorkoutScheduleOutput> {
  return adaptWorkoutScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adaptWorkoutSchedulePrompt',
  input: {schema: AdaptWorkoutScheduleInputSchema},
  output: {schema: AdaptWorkoutScheduleOutputSchema},
  prompt: `You are "Coach Ath", an expert fitness AI specializing in adapting workout plans.
A user has missed a workout in their 7-day plan and needs your help to adjust it.

User's Original Plan Details:
- Plan Name: {{{originalPlan.planName}}}
- Fitness Level: {{{fitnessLevel}}}
- Primary Goal: {{{primaryGoal}}}
- Original Introduction: {{{originalPlan.introduction}}}
- Original Overall Notes: {{#if originalPlan.overallNotes}} {{{originalPlan.overallNotes}}} {{else}} None {{/if}}

Original 7-Day Schedule:
{{#each originalPlan.dailyWorkouts}}
- Day {{dayNumber}}: {{dayName}} (Focus: {{focus}})
  {{#if exercises.length}}
  Exercises: {{#each exercises}}{{name}} ({{sets}} sets, {{reps}} reps, {{restSeconds}} rest){{#unless @last}}, {{/unless}}{{/each}}
  {{else}}
  (Rest or Active Recovery)
  {{/if}}
{{/each}}

The user MISSED Day {{{missedDayNumber}}}.

Your Task:
1.  Acknowledge the missed day: Day {{{missedDayNumber}}}.
2.  Adapt the *remaining* schedule for the week (or the full week if necessary) intelligently.
    *   Prioritize the user's '{{{primaryGoal}}}' and '{{{fitnessLevel}}}'.
    *   If possible, try to incorporate the key exercises from the missed workout into a subsequent day OR slightly modify a subsequent workout to compensate. Avoid simply tacking on the full missed workout if it makes another day too long or intense.
    *   Consider shifting workouts if it makes sense. For example, if Day {{{missedDayNumber}}} was 'Upper Body' and Day {{{missedDayNumber}}}+1 was 'Rest', you might move 'Upper Body' to Day {{{missedDayNumber}}}+1.
    *   If workouts are shifted, ensure rest days are still appropriately placed to allow recovery, especially for the same muscle groups. Do not suggest more than 3 consecutive intense workout days without a rest or very light active recovery day for 'beginner' or 'intermediate' levels.
    *   If a workout has to be significantly shortened or skipped, acknowledge this.
    *   The adapted plan must still cover 7 days. Days that have already passed (before the missed day) should ideally remain as they were in the output for context, or clearly marked as "Past". However, focus your adaptation on the missed day and subsequent days. For simplicity, you can regenerate the full 7-day list with adaptations.
3.  Output an 'updatedDailyWorkouts' array of 7 DailyWorkoutSchema objects.
    *   For each day in 'updatedDailyWorkouts':
        *   Ensure 'dayNumber', 'dayName', 'focus', 'warmUp', 'exercises' (if any), and 'coolDown' are provided.
        *   If a day becomes a new rest day, reflect that in 'dayName', 'focus', and ensure 'exercises' is empty.
        *   If exercises are moved or combined, update the 'exercises' array for the relevant days.
4.  Provide a concise 'adaptationSummary' explaining the main changes made.
5.  Generate an 'adaptedPlanName', perhaps by prefixing "Adapted - " to the original.
6.  Provide 'overallNotes' for the adapted plan. These can be similar to the original plan's notes, but add any specific advice related to the adaptation (e.g., "Listen to your body, as Day X is now more intense.").

Example of combining exercises (conceptual): If missed Day 3 (Legs) and Day 4 was Upper Body. You could make Day 4 a Full Body day by taking 1-2 key leg exercises and adding them to a slightly shortened Upper Body routine.

Constraints:
- Adhere strictly to the output JSON schema.
- Ensure the 'updatedDailyWorkouts' array always contains exactly 7 entries.
- Maintain safety and effectiveness based on the user's profile.

Generate the adapted 7-day workout plan now.
`,
});

const adaptWorkoutScheduleFlow = ai.defineFlow(
  {
    name: 'adaptWorkoutScheduleFlow',
    inputSchema: AdaptWorkoutScheduleInputSchema,
    outputSchema: AdaptWorkoutScheduleOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("Coach Ath is puzzled! Failed to adapt the workout schedule. Please check the input and try again.");
    }
    if (output && !output.overallNotes) {
        output.overallNotes = [];
    }
    output.updatedDailyWorkouts.forEach(day => {
        if (day.focus.toLowerCase() !== 'rest' && day.focus.toLowerCase() !== 'rest day' && !day.exercises) {
            day.exercises = [];
        }
    });
    return output;
  }
);

