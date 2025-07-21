
'use server';
/**
 * @fileOverview Adapts an existing recipe to be keto-friendly, halal, or suggests ingredient substitutions.
 *
 * - adaptRecipe - A function that handles recipe adaptation.
 * - AdaptRecipeInput - The input type for the adaptRecipe function.
 * - AdaptRecipeOutput - The return type for the adaptRecipe function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  RecipeIngredientSchema,
  RecipeStepSchema,
  RecipeMacrosSchema,
  type RecipeIngredient,
  type RecipeStep,
  type RecipeMacros
} from '@/ai/schemas/recipe-schemas';


const AdaptRecipeInputSchema = z.object({
  originalRecipeText: z.string().min(50, { message: "Recipe text must be at least 50 characters." }).describe("The full text of the original recipe, including ingredients and instructions."),
  adaptationGoal: z.enum(["makeKeto", "makeHalal", "suggestSubstitutions", "makeKetoHalal"]).describe("The primary goal for adapting the recipe."),
  specificIngredientToSubstitute: z.string().optional().describe("If 'suggestSubstitutions' goal, specify the ingredient to find alternatives for (e.g., 'all-purpose flour')."),
  preferredSubstitution: z.string().optional().describe("If user has a preferred substitute in mind (e.g., 'almond flour')."),
  dietaryRestrictions: z.array(z.string()).optional().describe("Additional restrictions like 'dairy-free', 'nut-free'. Applied after primary goal."),
  servings: z.number().int().min(1).optional().default(2).describe("Desired number of servings for the adapted recipe (if scaling is implied or possible). Original servings will be assumed if not specified."),
});
export type AdaptRecipeInput = z.infer<typeof AdaptRecipeInputSchema>;

const AdaptationDetailSchema = z.object({
  originalItem: z.string().describe("The original ingredient or instruction part that was changed."),
  changedTo: z.string().describe("What it was changed to."),
  reason: z.string().optional().describe("Brief reason for the change."),
});

const AdaptRecipeOutputSchema = z.object({
  adaptedRecipeName: z.string().describe("Name of the adapted recipe, possibly derived from original or new."),
  originalRecipeName: z.string().optional().describe("Name of the original recipe, if identifiable from text."),
  adaptationSummary: z.string().describe("A brief summary of the key changes made to meet the adaptation goal."),
  adaptationsMade: z.array(AdaptationDetailSchema).describe("A list of specific adaptations made to ingredients or steps."),
  adaptedIngredients: z.array(RecipeIngredientSchema).describe("The new list of ingredients for the adapted recipe."),
  adaptedInstructions: z.array(RecipeStepSchema).describe("The new step-by-step instructions for the adapted recipe."),
  adaptedMacrosPerServing: RecipeMacrosSchema.describe("Estimated nutritional information per serving for the adapted recipe."),
  notes: z.array(z.string()).optional().describe("Additional notes, such as impact on flavor/texture, or disclaimers."),
  servings: z.number().int().min(1).describe("Number of servings the adapted recipe yields. This should match the input 'servings' field if adaptation was successful for that count, or reflect the actual yield if scaling was not possible or was adjusted."),
});
export type AdaptRecipeOutput = z.infer<typeof AdaptRecipeOutputSchema>;


export async function adaptRecipe(input: AdaptRecipeInput): Promise<AdaptRecipeOutput> {
  return adaptRecipeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adaptRecipePrompt',
  input: {schema: AdaptRecipeInputSchema},
  output: {schema: AdaptRecipeOutputSchema},
  prompt: `You are "Chef Ath," an expert culinary AI specializing in adapting recipes to meet specific dietary needs, particularly Keto and Halal.

User wants to adapt the following recipe:
Original Recipe Text:
\`\`\`
{{{originalRecipeText}}}
\`\`\`

Adaptation Goal: {{{adaptationGoal}}}
{{#if specificIngredientToSubstitute}}Specific Ingredient to Substitute: {{{specificIngredientToSubstitute}}}{{/if}}
{{#if preferredSubstitution}}User's Preferred Substitution: {{{preferredSubstitution}}}{{/if}}
{{#if dietaryRestrictions.length}}Additional Dietary Restrictions: {{{dietaryRestrictions}}}{{/if}}
Desired Servings for Adapted Recipe: {{{servings}}}

Your Task:
1.  Analyze the 'originalRecipeText' to understand its ingredients, instructions, and likely original name.
2.  Adapt the recipe based on the 'adaptationGoal'.
    *   If 'makeKeto':
        *   Identify high-carb ingredients.
        *   Suggest and implement keto-friendly substitutions.
        *   Adjust quantities. Ensure very low net carbs.
    *   If 'makeHalal':
        *   Identify non-Halal ingredients.
        *   Suggest and implement Halal alternatives. State meat should be Halal-certified.
    *   If 'suggestSubstitutions':
        *   Focus on 'specificIngredientToSubstitute'.
        *   Provide 1-3 alternatives.
    *   If 'makeKetoHalal':
        *   Apply both Keto and Halal principles.
3.  Apply any 'dietaryRestrictions' after the primary goal.
4.  Scale the recipe for the 'Desired Servings for Adapted Recipe ({{{servings}}})'. If scaling is not feasible or significantly alters the recipe, clearly state this in the notes and output the recipe for a sensible number of servings (e.g., original, or a common number like 2 or 4), ensuring the 'servings' field in the output reflects this actual yield.
5.  Structure your output strictly according to the 'AdaptRecipeOutputSchema'.
    *   'adaptedRecipeName', 'originalRecipeName', 'adaptationSummary', 'adaptationsMade', 'adaptedIngredients', 'adaptedInstructions'.
    *   'adaptedMacrosPerServing': Re-estimate macros for the adapted recipe (critical for Keto).
    *   'servings': CRITICAL - this output field MUST reflect the number of servings the adapted recipe (ingredients and instructions) is actually for. Usually this will be the 'Desired Servings for Adapted Recipe' input, but if scaling was problematic, adjust this output field and explain in notes.
    *   'notes': Include disclaimers, flavor/texture changes, or if scaling for desired 'servings' was not feasible and why, and what serving size was used.

Important Considerations:
-   Maintain Recipe Integrity.
-   Clarity.
-   Macros: For 'makeKeto' or 'makeKetoHalal', 'adaptedMacrosPerServing.carbs' MUST be very low.
-   Flavor: Comment on potential flavor/texture changes.
-   Common Sense.

Generate the adapted recipe now.
`,
});

const adaptRecipeFlow = ai.defineFlow(
  {
    name: 'adaptRecipeFlow',
    inputSchema: AdaptRecipeInputSchema,
    outputSchema: AdaptRecipeOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("Chef Ath is stumped! Failed to adapt the recipe. Please check the recipe text and try again.");
    }
    if (output && !output.notes) {
        output.notes = [];
    }
    // Ensure servings in output is a valid number, defaulting to input.servings or 2 if AI fails to provide it.
    if (output && (typeof output.servings !== 'number' || output.servings < 1)) {
        output.servings = input.servings || 2;
        if (!output.notes) output.notes = [];
        output.notes.push(`Chef's Note: Servings output field was not correctly set by AI, defaulted to ${output.servings}. Please verify recipe yield.`);
    }
    return output;
  }
);
