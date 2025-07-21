
'use server';
/**
 * @fileOverview Generates detailed, personalized Keto recipes.
 *
 * - generateDetailedRecipe - A function that handles detailed recipe generation.
 * - GenerateDetailedRecipeInput - The input type for the generateDetailedRecipe function.
 * - GenerateDetailedRecipeOutput - The return type for the generateDetailedRecipe function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  RecipeIngredientSchema,
  RecipeStepSchema,
  RecipeMacrosSchema,
  GenerateDetailedRecipeOutputSchema,
  type RecipeIngredient, // Import types if they are also exported from schema file
  type RecipeStep,
  type RecipeMacros,
  type GenerateDetailedRecipeOutput
} from '@/ai/schemas/recipe-schemas'; // Adjusted import path

const spiceLevels = ["Mild", "Medium", "Spicy", "Any"] as const;

// Input Schema - Zod constant NOT EXPORTED from here
const GenerateDetailedRecipeInputSchema = z.object({
  dietaryPreference: z.enum(["Keto", "Keto Dairy-Free", "Keto Nut-Free", "Keto Vegetarian", "Low-Carb General"]).default("Keto").describe("Primary dietary constraint for the recipe."),
  cuisinePreference: z.string().optional().describe("Preferred cuisine style (e.g., 'Italian', 'Mexican', 'Singaporean Local', 'Indian', 'Mediterranean', 'Any'). Default to 'Any' if not specified."),
  mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Side Dish", "Any"]).optional().describe("Type of meal desired. Default to 'Any' if not specified."),
  mainIngredients: z.array(z.string()).optional().describe("Optional list of main ingredients the user wants to use (e.g., ['chicken breast', 'broccoli']). The recipe should feature these."),
  excludedIngredients: z.array(z.string()).optional().describe("Optional list of ingredients to avoid."),
  cookingTimePreference: z.enum(["Quick (under 30 mins)", "Moderate (30-60 mins)", "No Preference"]).optional().default("No Preference").describe("Preferred total cooking time."),
  servings: z.number().int().min(1).optional().default(2).describe("Number of servings the recipe should yield."),
  specificRequests: z.string().optional().describe("Any other specific requests, like 'one-pan meal', 'air fryer friendly'. Use this for any preferences not covered by other fields."),
  ensureHalal: z.boolean().optional().default(false).describe("If true, explicitly ensure all ingredients and preparation methods are Halal. This acts as a primary flag."),
  spiceLevel: z.enum(spiceLevels).optional().default("Any").describe("Preferred spice level for the recipe (Mild, Medium, Spicy, Any). Default to 'Any' if not specified."),
});
export type GenerateDetailedRecipeInput = z.infer<typeof GenerateDetailedRecipeInputSchema>; // Type EXPORTED

// GenerateDetailedRecipeOutput type is now imported from recipe-schemas.ts
// GenerateDetailedRecipeOutputSchema Zod object is now imported from recipe-schemas.ts

export async function generateDetailedRecipe(input: GenerateDetailedRecipeInput): Promise<GenerateDetailedRecipeOutput> {
  return generateDetailedRecipeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDetailedRecipePrompt',
  input: {schema: GenerateDetailedRecipeInputSchema},
  output: {schema: GenerateDetailedRecipeOutputSchema}, // Use imported schema
  prompt: `You are "Chef Ath", an expert culinary AI specializing in delicious and practical recipes, with a strong focus on the user's specified dietary preference (primarily {{{dietaryPreference}}}).

Your task is to generate a detailed recipe based on the user's preferences.

User Preferences:
- Dietary Focus: {{{dietaryPreference}}} (This is the most important constraint. Ensure the recipe strictly adheres to this, especially for Keto - very low net carbs.)
{{#if ensureHalal}}
- Halal Compliance: User explicitly requests Halal. All ingredients and preparation methods MUST be Halal. This overrides any cuisine-based assumptions.
{{/if}}
- Cuisine Style: {{{cuisinePreference}}} (If 'Singaporean Local' and meat is involved, and 'ensureHalal' is NOT explicitly true, assume Halal preparation methods and ingredients unless 'specificRequests' indicates otherwise. If 'Any', feel free to be creative or pick a popular style.)
- Meal Type: {{{mealType}}} (If 'Any', choose an appropriate meal type.)
- Main Ingredients to Use (if any): {{#if mainIngredients}} {{{mainIngredients}}} {{else}} None specified {{/if}}
- Ingredients to Exclude (if any): {{#if excludedIngredients}} {{{excludedIngredients}}} {{else}} None specified {{/if}}
- Desired Total Cooking Time: {{{cookingTimePreference}}}
- Desired Spice Level: {{{spiceLevel}}} (Adjust ingredients like chili, pepper, etc., accordingly. If 'Any', aim for a generally palatable, mild to medium level unless cuisine style dictates otherwise.)
- Number of Servings: {{{servings}}}
- Other Specific Requests: {{{specificRequests}}} (Pay close attention here for things like cooking method preferences or additional dietary needs not covered by dedicated fields. If 'specificRequests' mentions spice, it can override 'Desired Spice Level' if more specific.)

Recipe Output Structure (Strictly follow this JSON format):
Provide:
1.  'recipeName': A catchy and descriptive name.
2.  'description': A brief, appealing overview of the dish (2-4 sentences).
3.  'prepTime': Estimated preparation time (e.g., "15 minutes").
4.  'cookTime': Estimated cooking time (e.g., "30 minutes").
5.  'totalTime': Estimated total time.
6.  'servings': Confirm the number of servings.
7.  'ingredients': An array of objects, each with:
    *   'name': Ingredient name (e.g., "Chicken Thighs", "Broccoli Florets", "Coconut Milk").
    *   'quantity': Numerical or descriptive quantity (e.g., "200", "1", "0.5").
    *   'unit': Unit (e.g., "g", "large", "cup", "tbsp", "can"). For items like "1 large onion", quantity is "1", unit is "large onion". If no specific unit like grams or ml, use descriptive units like 'cloves', 'slices', 'fillet', or general 'unit(s)'/'item(s)'.
    *   'notes': (Optional) Brief preparation note like "skinless, boneless", "diced", "melted", "to taste".
8.  'instructions': An array of objects, each with:
    *   'stepNumber': Sequential number.
    *   'instruction': Clear, concise instruction for that step.
9.  'macrosPerServing': An object with:
    *   'calories': Estimated total calories (kcal).
    *   'protein': Estimated protein (g).
    *   'carbs': Estimated NET carbohydrates (g). For Keto, this MUST be very low. Aim for under 10-15g per serving.
    *   'fat': Estimated fat (g).
10. 'tips': (Optional) An array of 1-3 helpful strings: storage advice, variations, serving suggestions, or specific dietary notes.

Important Considerations:
-   Accuracy: Ensure macros are reasonably estimated for the {{{dietaryPreference}}}. For Keto, net carbs are critical.
-   Clarity: Instructions should be easy to follow.
-   Completeness: Include all necessary details.
-   Halal Priority: If 'ensureHalal' is true, this is paramount. Otherwise, for 'Singaporean Local' meat dishes, assume Halal unless 'specificRequests' indicates otherwise. For all other cases, avoid pork, lard, and alcohol in ingredients and instructions unless explicitly requested in 'specificRequests' for a non-Halal context.
-   Spice Level: Adhere to the 'Desired Spice Level'. If 'Any', and cuisine is known for spice (e.g. some Indian, Mexican, Thai), a mild-medium level is appropriate. Otherwise, default to mild.
-   Flavor: Recipes should sound appealing and be flavorful!
-   Ingredient Availability: Prioritize commonly available ingredients where possible, unless specific gourmet items are requested.

Generate the recipe now.
`,
});

const generateDetailedRecipeFlow = ai.defineFlow(
  {
    name: 'generateDetailedRecipeFlow',
    inputSchema: GenerateDetailedRecipeInputSchema,
    outputSchema: GenerateDetailedRecipeOutputSchema, // Use imported schema
  },
  async (input) => {
    // Add a default for cuisinePreference if it's not provided
    const flowInput = {
      ...input,
      cuisinePreference: input.cuisinePreference || 'Any',
      mealType: input.mealType || 'Any',
      ensureHalal: input.ensureHalal || false, // Ensure default for boolean
      spiceLevel: input.spiceLevel || 'Any', // Ensure default for spiceLevel
    };

    const {output} = await prompt(flowInput);
    if (!output) {
      throw new Error("Chef Ath is stumped! Failed to generate a recipe. Please try adjusting your preferences.");
    }
    // Ensure tips is an array, even if empty, if AI omits it
    if (!output.tips) {
        output.tips = [];
    }
    return output;
  }
);

