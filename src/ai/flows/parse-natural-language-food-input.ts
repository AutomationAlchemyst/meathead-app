
'use server';
/**
 * @fileOverview Parses a natural language description of a meal into structured food items and quantities.
 *
 * - parseNaturalLanguageFoodInput - A function that handles the natural language parsing.
 * - ParseNaturalLanguageFoodInput - The input type for the parseNaturalLanguageFoodInput function.
 * - ParseNaturalLanguageFoodOutput - The return type for the parseNaturalLanguageFoodInput function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ParseNaturalLanguageFoodInputSchema = z.object({
  naturalLanguageQuery: z.string().describe('The natural language description of the meal.'),
});
export type ParseNaturalLanguageFoodInput = z.infer<typeof ParseNaturalLanguageFoodInputSchema>;

const ParsedFoodItemSchema = z.object({
  foodItem: z.string().describe('The identified food item.'),
  quantity: z.string().describe('The estimated quantity of the food item (e.g., "1 cup", "100g", "2 medium").'),
});
export type ParsedFoodItem = z.infer<typeof ParsedFoodItemSchema>;

const ParseNaturalLanguageFoodOutputSchema = z.array(ParsedFoodItemSchema).describe('A list of identified food items and their quantities.');
export type ParseNaturalLanguageFoodOutput = z.infer<typeof ParseNaturalLanguageFoodOutputSchema>;

export async function parseNaturalLanguageFoodInput(input: ParseNaturalLanguageFoodInput): Promise<ParseNaturalLanguageFoodOutput> {
  return parseNaturalLanguageFoodInputFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseNaturalLanguageFoodPrompt',
  input: {schema: ParseNaturalLanguageFoodInputSchema},
  output: {schema: ParseNaturalLanguageFoodOutputSchema},
  prompt: `You are an expert at understanding food descriptions.
The user will provide a natural language description of what they ate.
Your task is to extract individual food items and their quantities.
If a quantity is not explicitly mentioned, try to infer a reasonable common serving size (e.g., "an apple" -> quantity "1 medium", "coffee" -> quantity "1 cup", "a slice of pizza" -> quantity "1 slice").
If multiple distinct items are mentioned, list them all.
Return the result as a JSON array of objects, where each object has a "foodItem" and a "quantity" key.

Example 1:
User input: "For breakfast I had a bowl of oatmeal, a banana, and a glass of orange juice."
Your output:
[
  { "foodItem": "oatmeal", "quantity": "1 bowl" },
  { "foodItem": "banana", "quantity": "1 medium" },
  { "foodItem": "orange juice", "quantity": "1 glass" }
]

Example 2:
User input: "two scrambled eggs and a slice of toast with butter"
Your output:
[
  { "foodItem": "scrambled eggs", "quantity": "2" },
  { "foodItem": "toast with butter", "quantity": "1 slice" }
]

Example 3:
User input: "chicken sandwich"
Your output:
[
  { "foodItem": "chicken sandwich", "quantity": "1" }
]

User input: "{{{naturalLanguageQuery}}}"
`,
  config: { // Added permissive safety settings
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  },
});

const parseNaturalLanguageFoodInputFlow = ai.defineFlow(
  {
    name: 'parseNaturalLanguageFoodInputFlow',
    inputSchema: ParseNaturalLanguageFoodInputSchema,
    outputSchema: ParseNaturalLanguageFoodOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output || []; // Ensure it returns an array even if output is null/undefined
  }
);

