
'use server';
/**
 * @fileOverview Determines if a food item is keto-friendly and provides suggestions.
 *
 * - getKetoGuidance - A function that analyzes a food item for keto-friendliness.
 * - GetKetoGuidanceInput - The input type for the getKetoGuidance function.
 * - GetKetoGuidanceOutput - The return type for the getKetoGuidance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetKetoGuidanceInputSchema = z.object({
  foodItem: z.string().describe('The name of the food item.'),
  quantity: z.string().describe('The quantity of the food item.'),
  carbs: z.number().describe('Estimated grams of carbohydrates for the item.'),
  protein: z.number().describe('Estimated grams of protein for the item.'),
  fat: z.number().describe('Estimated grams of fat for the item.'),
  calories: z.number().describe('Estimated total calories for the item.'),
});
export type GetKetoGuidanceInput = z.infer<typeof GetKetoGuidanceInputSchema>;

const GetKetoGuidanceOutputSchema = z.object({
  isKetoFriendly: z.boolean().describe('Whether the food item is generally considered keto-friendly based on its macros for the given quantity.'),
  suggestion: z.string().describe('If not keto-friendly, a brief, actionable suggestion to make it more keto-friendly. If keto-friendly, this can be a short positive remark or empty.'),
});
export type GetKetoGuidanceOutput = z.infer<typeof GetKetoGuidanceOutputSchema>;

export async function getKetoGuidance(input: GetKetoGuidanceInput): Promise<GetKetoGuidanceOutput> {
  return getKetoGuidanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getKetoGuidancePrompt',
  input: {schema: GetKetoGuidanceInputSchema},
  output: {schema: GetKetoGuidanceOutputSchema},
  prompt: `You are a nutrition assistant specializing in the ketogenic diet.
Analyze the following food item:
Food Item: "{{{foodItem}}}"
Quantity: "{{{quantity}}}"
Macros:
- Carbs: {{{carbs}}}g
- Protein: {{{protein}}}g
- Fat: {{{fat}}}g
- Calories: {{{calories}}}

Based on these details for the given quantity:
1. Determine if this food item is generally considered keto-friendly. A food item is keto-friendly if its net carbohydrate content is very low (e.g., typically under 7-10 grams for a standard serving, but use your nutritional knowledge and consider the provided quantity).
2. If it IS keto-friendly, set "isKetoFriendly" to true. The "suggestion" can be a brief positive remark like "Good choice for keto!" or left empty.
3. If it is NOT keto-friendly, set "isKetoFriendly" to false. Provide a concise, actionable "suggestion" to make this specific food item or a similar meal more keto-friendly (e.g., "Consider using cauliflower rice instead of regular rice," or "Opt for a sugar-free dressing next time.").

Focus primarily on the carbohydrate content relative to typical keto guidelines for the given serving.
Return the response in the specified JSON format.`,
});

const getKetoGuidanceFlow = ai.defineFlow(
  {
    name: 'getKetoGuidanceFlow',
    inputSchema: GetKetoGuidanceInputSchema,
    outputSchema: GetKetoGuidanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Ensure a default for suggestion if the AI doesn't provide one
    if (output && output.isKetoFriendly && !output.suggestion) {
      output.suggestion = ""; // Or a default positive remark
    }
    return output!;
  }
);
