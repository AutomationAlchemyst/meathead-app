'use server';

/**
 * @fileOverview Estimates the total carbs, protein, fat, and calories for a given food item.
 *
 * - estimateMacros - A function that handles the macro estimation process.
 * - EstimateMacrosInput - The input type for the estimateMacros function.
 * - EstimateMacrosOutput - The return type for the estimateMacros function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EstimateMacrosInputSchema = z.object({
  foodItem: z.string().describe('The food item to estimate macros for.'),
  quantity: z.string().describe('The quantity of the food item (e.g., 1 cup, 100g).'),
});
export type EstimateMacrosInput = z.infer<typeof EstimateMacrosInputSchema>;

const EstimateMacrosOutputSchema = z.object({
  carbs: z.number().describe('Estimated grams of carbohydrates.'),
  protein: z.number().describe('Estimated grams of protein.'),
  fat: z.number().describe('Estimated grams of fat.'),
  calories: z.number().describe('Estimated total calories.'),
});
export type EstimateMacrosOutput = z.infer<typeof EstimateMacrosOutputSchema>;

export async function estimateMacros(input: EstimateMacrosInput): Promise<EstimateMacrosOutput> {
  return estimateMacrosFlow(input);
}

const prompt = ai.definePrompt({
  name: 'estimateMacrosPrompt',
  input: {schema: EstimateMacrosInputSchema},
  output: {schema: EstimateMacrosOutputSchema},
  prompt: `You are a nutrition expert. Estimate the macros (carbs, protein, fat) and total calories for the following food item and quantity:

Food Item: {{{foodItem}}}
Quantity: {{{quantity}}}

Provide your estimates in the following JSON format:
{
  "carbs": <estimated carbs in grams>,
  "protein": <estimated protein in grams>,
  "fat": <estimated fat in grams>,
  "calories": <estimated total calories>
}`,
});

const estimateMacrosFlow = ai.defineFlow(
  {
    name: 'estimateMacrosFlow',
    inputSchema: EstimateMacrosInputSchema,
    outputSchema: EstimateMacrosOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
