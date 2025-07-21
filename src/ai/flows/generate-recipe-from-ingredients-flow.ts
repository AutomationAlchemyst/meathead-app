
'use server';
/**
 * @fileOverview Generates detailed Keto recipes primarily based on a list of available ingredients.
 *
 * - generateRecipeFromIngredients - A function that handles recipe generation from ingredients.
 * - GenerateRecipeFromIngredientsInput - The input type for this function.
 * - GenerateRecipeFromIngredientsOutput - The return type, same as detailed recipe generation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  GenerateDetailedRecipeOutputSchema, // Import the Zod schema
  type GenerateDetailedRecipeOutput,  // Import the TypeScript type
  type RecipeIngredient,              // Import related types if needed by this file's exports
  type RecipeStep,
  type RecipeMacros
} from '@/ai/schemas/recipe-schemas'; // Adjusted import path

// Re-exporting the output type for clarity, as it's the same structure.
export type { GenerateDetailedRecipeOutput as GenerateRecipeFromIngredientsOutput, RecipeIngredient, RecipeStep, RecipeMacros };

// Re-using enums for consistency (can be defined in a shared types file later)
const dietaryPreferences = ["Keto", "Keto Dairy-Free", "Keto Nut-Free", "Keto Vegetarian", "Low-Carb General"] as const;
const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Side Dish", "Any"] as const;

const GenerateRecipeFromIngredientsInputSchema = z.object({
  availableIngredients: z.array(z.string()).min(1, { message: "Please provide at least one ingredient." }).describe("List of ingredients the user has on hand."),
  dietaryPreference: z.enum(dietaryPreferences).default("Keto").describe("Primary dietary constraint for the recipe."),
  cuisinePreference: z.string().optional().describe("Preferred cuisine style (e.g., 'Italian', 'Mexican', 'Singaporean Local', 'Indian', 'Any'). Default to 'Any' if not specified."),
  mealType: z.enum(mealTypes).optional().describe("Type of meal desired. Default to 'Any' if not specified."),
  servings: z.number().int().min(1).optional().default(2).describe("Number of servings the recipe should yield."),
  specificRequests: z.string().optional().describe("Any other specific requests, like 'one-pan meal', 'air fryer friendly', 'spicy', 'mild', 'ensure Halal ingredients if suggesting meats'. For Singaporean context, assume Halal unless specified otherwise for meat dishes."),
  excludedIngredients: z.array(z.string()).optional().describe("Optional list of ingredients to strictly avoid, even if they are common pantry staples."),
});
export type GenerateRecipeFromIngredientsInput = z.infer<typeof GenerateRecipeFromIngredientsInputSchema>;


export async function generateRecipeFromIngredients(input: GenerateRecipeFromIngredientsInput): Promise<GenerateDetailedRecipeOutput> {
  return generateRecipeFromIngredientsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRecipeFromIngredientsPrompt',
  input: {schema: GenerateRecipeFromIngredientsInputSchema},
  output: {schema: GenerateDetailedRecipeOutputSchema}, // Use the imported Zod schema
  prompt: `You are "Chef Ath", an expert culinary AI specializing in creating delicious and practical recipes, particularly focusing on the user's specified dietary preference (primarily {{{dietaryPreference}}}).

Your task is to generate a detailed recipe based on the ingredients the user has on hand, supplemented by common pantry staples if necessary.

User Preferences:
- Available Ingredients: {{{availableIngredients}}} (These are the KEY ingredients to prioritize in the recipe.)
- Dietary Focus: {{{dietaryPreference}}} (This is the most important constraint. Ensure the recipe strictly adheres to this, especially for Keto - very low net carbs.)
- Cuisine Style: {{{cuisinePreference}}} (If 'Singaporean Local' and meat is involved, assume Halal preparation methods and ingredients unless 'specificRequests' indicates otherwise. If 'Any', feel free to be creative or pick a popular style.)
- Meal Type: {{{mealType}}} (If 'Any', choose an appropriate meal type.)
- Number of Servings: {{{servings}}}
- Other Specific Requests: {{{specificRequests}}}
- Ingredients to Exclude (if any): {{#if excludedIngredients}} {{{excludedIngredients}}} (Strictly avoid these.) {{else}} None specified {{/if}}

Recipe Generation Rules:
1.  **Prioritize User's Ingredients**: The recipe MUST primarily use the 'availableIngredients'.
2.  **Supplement Wisely**: You may add a FEW (2-4) common pantry staples (e.g., salt, pepper, oil, common spices like garlic powder or onion powder, a basic cooking liquid like water or broth if absolutely essential) if they are crucial for making a coherent dish. DO NOT assume a fully stocked pantry.
3.  **Recipe Completeness**: Generate a full recipe including:
    *   'recipeName': A catchy name, perhaps hinting at the main ingredients used.
    *   'description': A brief, appealing overview of the dish.
    *   'prepTime', 'cookTime', 'totalTime': Estimated times.
    *   'servings': Confirm the number of servings.
    *   'ingredients': Full list, clearly distinguishing user's ingredients from any added staples.
    *   'instructions': Step-by-step cooking instructions.
    *   'macrosPerServing': Estimated nutritional info per serving (Net Carbs MUST be very low for Keto).
    *   'tips': (Optional) Storage, variations, or notes on ingredient flexibility.
4.  **Adherence**: Strictly follow all dietary constraints, exclusions, and specific requests.
5.  **No Pork/Lard/Alcohol**: Unless explicitly requested for a non-Halal context in 'specificRequests', avoid pork, lard, and alcohol. Assume Halal for 'Singaporean Local' meat dishes by default.
6.  **Output Format**: Structure your output strictly according to the JSON format defined by the 'GenerateDetailedRecipeOutputSchema'.

Example for an ingredient entry if you added a staple:
{ "name": "Olive Oil", "quantity": "1", "unit": "tbsp", "notes": "Pantry staple (added)" }

Generate the recipe now.
`,
});

const generateRecipeFromIngredientsFlow = ai.defineFlow(
  {
    name: 'generateRecipeFromIngredientsFlow',
    inputSchema: GenerateRecipeFromIngredientsInputSchema,
    outputSchema: GenerateDetailedRecipeOutputSchema, // Use the imported Zod schema
  },
  async (input) => {
    const flowInput = {
      ...input,
      cuisinePreference: input.cuisinePreference || 'Any',
      mealType: input.mealType || 'Any',
    };

    const {output} = await prompt(flowInput);
    if (!output) {
      throw new Error("Chef Ath is stumped! Failed to generate a recipe from your ingredients. Please try adjusting your ingredients or preferences.");
    }
    // Ensure tips is an array, even if empty, if AI omits it
    if (!output.tips) {
        output.tips = [];
    }
    return output;
  }
);
