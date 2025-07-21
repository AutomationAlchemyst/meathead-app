
// Correction: Removing 'use server'; from schema files. Schemas are definitions, not server actions.

import {z} from 'genkit';

export const RecipeIngredientSchema = z.object({
  name: z.string().describe("Name of the ingredient."),
  quantity: z.string().describe("Quantity of the ingredient (e.g., '100', '2', '0.5')."),
  unit: z.string().describe("Unit for the quantity (e.g., 'g', 'large', 'cup', 'tbsp', 'tsp', 'ml', 'oz', 'cloves', 'slices', 'fillet'). If no specific unit, use 'unit(s)' or 'item(s)'."),
  notes: z.string().optional().describe("Additional notes for the ingredient, like 'diced', 'melted', 'finely chopped', 'to taste'."),
});
export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;

export const RecipeStepSchema = z.object({
  stepNumber: z.number().describe("The sequential number of the cooking step."),
  instruction: z.string().describe("Detailed instruction for this cooking step."),
});
export type RecipeStep = z.infer<typeof RecipeStepSchema>;

export const RecipeMacrosSchema = z.object({
  calories: z.number().describe("Estimated total calories per serving."),
  protein: z.number().describe("Estimated grams of protein per serving."),
  carbs: z.number().describe("Estimated grams of net carbohydrates per serving (ensure this is very low for Keto recipes, ideally under 10-15g per serving,fiber should not be included in this count)."),
  fat: z.number().describe("Estimated grams of fat per serving."),
});
export type RecipeMacros = z.infer<typeof RecipeMacrosSchema>;

export const GenerateDetailedRecipeOutputSchema = z.object({
  recipeName: z.string().describe("Catchy and descriptive name for the recipe."),
  description: z.string().describe("A brief, appealing overview of the dish (2-4 sentences)."),
  prepTime: z.string().describe("Estimated preparation time (e.g., '15 minutes', 'Approx. 20 mins')."),
  cookTime: z.string().describe("Estimated cooking time (e.g., '30 minutes', 'Approx. 25 mins')."),
  totalTime: z.string().describe("Estimated total time from start to finish."),
  servings: z.number().describe("Number of servings this recipe yields."),
  ingredients: z.array(RecipeIngredientSchema).describe("List of all ingredients required."),
  instructions: z.array(RecipeStepSchema).describe("Step-by-step cooking instructions."),
  macrosPerServing: RecipeMacrosSchema.describe("Estimated nutritional information per serving."),
  tips: z.array(z.string()).optional().describe("Optional tips for storage, variations, serving suggestions, or specific keto notes (e.g., 'Ensure to use full-fat cream cheese for best results.')."),
});
export type GenerateDetailedRecipeOutput = z.infer<typeof GenerateDetailedRecipeOutputSchema>;
