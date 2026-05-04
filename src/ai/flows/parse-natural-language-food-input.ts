
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

export async function parseNaturalLanguageFoodInput(input: ParseNaturalLanguageFoodInput): Promise<ParseNaturalLanguageFoodOutput | { error: string, details?: any }> {
  try {
    return await parseNaturalLanguageFoodInputFlow(input);
  } catch (error: any) {
    console.error("Server Action Error in parseNaturalLanguageFoodInput:", error);
    return { error: error.message || "Unknown error", details: error.stack || error };
  }
}

const prompt = ai.definePrompt({
  name: 'parseNaturalLanguageFoodPrompt',
  input: {schema: ParseNaturalLanguageFoodInputSchema},
  output: {schema: ParseNaturalLanguageFoodOutputSchema},
  config: { googleSearchRetrieval: true },
  prompt: `You are an expert at understanding food descriptions, especially keto and Bulletproof Coffee drinks.
The user will provide a natural language description of what they ate.
Your task is to extract ALL individual food items and their quantities, including any ADDITIVES or MIX-INS.

CRITICAL RULES:
1. ALWAYS extract every single item mentioned, even small amounts like "butter", "oil", "cream", "MCT"
2. If someone says "coffee with butter and MCT oil", you MUST list: coffee, butter, AND MCT oil as SEPARATE items
3. List each component separately - do NOT skip ingredients just because they're mentioned as additions
4. If a quantity is not explicitly mentioned, infer a reasonable common serving size

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
User input: "250ml black coffee with a tablespoon of butter and 1 tsp of MCT oil"
Your output:
[
  { "foodItem": "black coffee", "quantity": "250ml" },
  { "foodItem": "butter", "quantity": "1 tablespoon" },
  { "foodItem": "MCT oil", "quantity": "1 tsp" }
]

Example 3:
User input: "two scrambled eggs and a slice of toast with butter"
Your output:
[
  { "foodItem": "scrambled eggs", "quantity": "2" },
  { "foodItem": "toast", "quantity": "1 slice" },
  { "foodItem": "butter", "quantity": "1 pat" }
]

Example 4:
User input: "salad with chicken breast, avocado, olive oil, and cheese"
Your output:
[
  { "foodItem": "chicken breast", "quantity": "1 serving" },
  { "foodItem": "avocado", "quantity": "1/2" },
  { "foodItem": "olive oil", "quantity": "1 tablespoon" },
  { "foodItem": "cheese", "quantity": "1 serving" }
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

