
'use server';
/**
 * @fileOverview Generates a Keto-friendly meal plan.
 *
 * - generateMealPlan - A function that handles meal plan generation.
 * - GenerateMealPlanInput - The input type for the generateMealPlan function.
 * - GenerateMealPlanOutput - The return type for the generateMealPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MealItemSchema = z.object({
  name: z.string().describe("Name of the meal or food item."),
  description: z.string().describe("Brief description or key ingredients (2-3 short sentences max)."),
  calories: z.number().describe("Estimated calories for this item."),
  protein: z.number().describe("Estimated protein in grams for this item."),
  carbs: z.number().describe("Estimated carbs in grams for this item."),
  fat: z.number().describe("Estimated fat in grams for this item."),
  preparationNotes: z.string().optional().describe("A few simple key steps or notes for preparing the meal (e.g., 'Bake salmon at 400F for 12-15 mins. Steam broccoli.' 3-4 short sentences max). Keep it concise."),
});
export type MealItem = z.infer<typeof MealItemSchema>;

const MealPlanDaySchema = z.object({
  day: z.string().describe("Identifier for the day, e.g., 'Day 1'."),
  breakfast: MealItemSchema.describe("Breakfast meal details."),
  lunch: MealItemSchema.describe("Lunch meal details."),
  dinner: MealItemSchema.describe("Dinner meal details."),
  snacks: z.array(MealItemSchema).describe("List of 1 to 2 snack items for the day."),
  totalCalories: z.number().describe("Total estimated calories for the day."),
  totalProtein: z.number().describe("Total estimated protein in grams for the day."),
  totalCarbs: z.number().describe("Total estimated carbs in grams for the day."),
  totalFat: z.number().describe("Total estimated fat in grams for the day."),
});
export type MealPlanDay = z.infer<typeof MealPlanDaySchema>;

const GenerateMealPlanInputSchema = z.object({
  targetCalories: z.number().optional().default(2000).describe("User's target daily calories. Default to 2000 if not provided specifically."),
  // numDays: z.number().optional().default(1).describe("Number of days for the meal plan. Default to 1 for now."),
});
export type GenerateMealPlanInput = z.infer<typeof GenerateMealPlanInputSchema>;

// For the initial version, the output will be a single MealPlanDay object, not an array.
// If we decide to support multi-day plans directly from this flow, we'd change this to z.array(MealPlanDaySchema)
const GenerateMealPlanOutputSchema = MealPlanDaySchema;
export type GenerateMealPlanOutput = z.infer<typeof GenerateMealPlanOutputSchema>;


export async function generateMealPlan(input: GenerateMealPlanInput): Promise<GenerateMealPlanOutput> {
  return generateMealPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMealPlanPrompt',
  input: {schema: GenerateMealPlanInputSchema},
  output: {schema: GenerateMealPlanOutputSchema},
  prompt: `You are an expert nutritionist specializing in creating Keto diet meal plans.
Generate a 1-day Keto meal plan for a user.

Target daily calories: {{{targetCalories}}} kcal.

The meal plan should include:
- Breakfast
- Lunch
- Dinner
- One or two snack options

Dietary Restrictions:
- No pork or pork-derived ingredients (including pork lard).
- No alcohol or alcohol-containing ingredients.

For each meal item (breakfast, lunch, dinner, and each snack):
- Provide a concise "name".
- Give a brief "description" (e.g., key ingredients or simple preparation notes, 2-3 short sentences max).
- Estimate "calories" (kcal), "protein" (g), "carbs" (g), and "fat" (g).
- Provide "preparationNotes" containing a few simple, key steps for preparation (3-4 short sentences max). Focus on conciseness.

Important constraints:
- The total "carbs" for the entire day should be 20 grams or less, and in no case exceed 25 grams. Aim for the 15-20 gram range.
- The meal suggestions should be relatively simple and common for a Keto diet.
- Ensure you provide the "day" identifier as "Day 1".
- Calculate and provide the "totalCalories", "totalProtein", "totalCarbs", and "totalFat" for the entire day, ensuring these totals accurately sum the individual meal items.

Return the response in the specified JSON format.
Example for a meal item:
{
  "name": "Avocado and Egg Salad",
  "description": "Creamy avocado mixed with hard-boiled eggs, mayonnaise, and a touch of mustard. Seasoned with salt and pepper.",
  "calories": 350,
  "protein": 15,
  "carbs": 5,
  "fat": 30,
  "preparationNotes": "Hard boil eggs and peel. Mash eggs with ripe avocado, mayonnaise, mustard, salt, and pepper. Serve chilled."
}
Ensure the output strictly adheres to the full output schema, including daily totals.
`,
});

const generateMealPlanFlow = ai.defineFlow(
  {
    name: 'generateMealPlanFlow',
    inputSchema: GenerateMealPlanInputSchema,
    outputSchema: GenerateMealPlanOutputSchema,
  },
  async (input) => {
    // For now, we hardcode numDays to 1 as the prompt is tailored for a single day.
    // The input schema has numDays defaulting to 1 but it's not used in the prompt.
    const flowInput = { targetCalories: input.targetCalories || 2000 };
    
    const {output} = await prompt(flowInput);
    if (!output) {
      throw new Error("Failed to generate meal plan from AI.");
    }
    return output;
  }
);

