'use client';

import { Soup, Clock, Hash, ShoppingBasket, CookingPot, Sparkles, Info, PlusCircle, Minus, Plus, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import type { GenerateDetailedRecipeOutput, RecipeIngredient, RecipeStep, RecipeMacros } from '@/ai/schemas/recipe-schemas';

interface GeneratedRecipeDisplayProps {
  recipe: GenerateDetailedRecipeOutput;
  servingsToLog: number;
  onServingsChange: (servings: number) => void;
  onLogRecipe: (recipeToLog: GenerateDetailedRecipeOutput, servingsToLog: number) => Promise<void>;
  isLoggingRecipe: boolean;
  recipeSource?: string;
}

export function GeneratedRecipeDisplay({
  recipe,
  servingsToLog,
  onServingsChange,
  onLogRecipe,
  isLoggingRecipe,
  recipeSource
}: GeneratedRecipeDisplayProps) {
  const { user } = useAuth();

  // Scale macros for the selected number of servings
  const scale = servingsToLog / recipe.servings;
  const scaledMacros: RecipeMacros = {
    calories: Math.round(recipe.macrosPerServing.calories * scale),
    protein: Math.round(recipe.macrosPerServing.protein * scale * 10) / 10,
    carbs: Math.round(recipe.macrosPerServing.carbs * scale * 10) / 10,
    fat: Math.round(recipe.macrosPerServing.fat * scale * 10) / 10,
  };

  const incrementServings = () => onServingsChange(Math.min(servingsToLog + 1, recipe.servings));
  const decrementServings = () => onServingsChange(Math.max(servingsToLog - 1, 1));

  return (
    <Card className="mt-8 shadow-xl bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="bg-primary/10 p-6 rounded-t-2xl">
        <CardTitle className="text-3xl font-headline text-primary flex items-center">
          <Soup className="h-8 w-8 mr-3 animate-pulse" /> {recipe.recipeName}
        </CardTitle>
        <CardDescription className="text-base pt-1 text-foreground/80">{recipe.description}</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2 p-3 bg-muted/65 rounded-lg border border-border/30">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <span className="font-semibold text-muted-foreground">Prep:</span> {recipe.prepTime}
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-muted/65 rounded-lg border border-border/30">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <span className="font-semibold text-muted-foreground">Cook:</span> {recipe.cookTime}
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-muted/65 rounded-lg border border-border/30">
            <Hash className="h-5 w-5 text-primary" />
            <div>
              <span className="font-semibold text-muted-foreground">Servings:</span> {recipe.servings}
            </div>
          </div>
        </div>

        <Separator className="bg-border/50" />

        <div>
          <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
            <ShoppingBasket className="h-6 w-6 mr-2 text-primary" />
            Ingredients
          </h3>
          <ul className="list-disc list-inside space-y-1.5 pl-2 columns-1 sm:columns-2 text-sm text-foreground/90">
            {recipe.ingredients.map((ing: RecipeIngredient, index: number) => (
              <li key={index}>
                {ing.quantity} {ing.unit} {ing.name}
                {ing.notes && <span className="text-muted-foreground text-xs"> ({ing.notes})</span>}
              </li>
            ))}
          </ul>
        </div>

        <Separator className="bg-border/50" />

        <div>
          <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
            <CookingPot className="h-6 w-6 mr-2 text-primary" />
            Instructions
          </h3>
          <ol className="space-y-3">
            {recipe.instructions.map((step: RecipeStep) => (
              <li key={step.stepNumber} className="flex">
                <Badge variant="secondary" className="mr-3 h-6 w-6 flex items-center justify-center text-primary font-bold shrink-0">{step.stepNumber}</Badge>
                <p className="text-sm leading-relaxed text-foreground/90">{step.instruction}</p>
              </li>
            ))}
          </ol>
        </div>

        <Separator className="bg-border/50" />

        <div>
          <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
            <Sparkles className="h-6 w-6 mr-2 text-primary" />
            Macros
          </h3>
          {/* Serving size selector */}
          <div className="flex items-center justify-between mb-4 p-3 bg-muted/65 rounded-lg border border-border/30">
            <span className="text-sm font-medium">Log how many servings?</span>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 bg-background/60 hover:bg-background"
                onClick={decrementServings}
                disabled={servingsToLog <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-bold text-lg w-8 text-center">{servingsToLog}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 bg-background/60 hover:bg-background"
                onClick={incrementServings}
                disabled={servingsToLog >= recipe.servings}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">/ {recipe.servings} available</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {(Object.keys(scaledMacros) as Array<keyof RecipeMacros>).map(key => (
              <div key={String(key)} className="p-3 bg-muted/65 rounded-lg text-center border border-border/30">
                <p className="font-semibold capitalize text-muted-foreground">{key}</p>
                <p className="text-foreground font-bold">{scaledMacros[key]}{key === 'calories' ? ' kcal' : ' g'}</p>
                {servingsToLog !== 1 && (
                  <p className="text-xs text-muted-foreground mt-0.5">({recipe.macrosPerServing[key]}{key === 'calories' ? ' kcal' : ' g'} &times; {servingsToLog})</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {recipe.tips && recipe.tips.length > 0 && (
          <>
            <Separator className="bg-border/50" />
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                <Info className="h-6 w-6 mr-2 text-primary" />
                Chef Ath's Tips
              </h3>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-sm text-foreground/80">
                {recipe.tips.map((tip: string, index: number) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="p-6 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/20">
        <p className="text-xs text-muted-foreground text-center sm:text-left max-w-md">Recipe generated by Chef Ath. Nutritional information is an estimate. Always verify ingredients for dietary compliance.</p>
        {user && (
          <Button
            onClick={() => onLogRecipe(recipe, servingsToLog)}
            disabled={isLoggingRecipe}
            className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/20"
          >
            {isLoggingRecipe ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {isLoggingRecipe ? 'Logging Meal...' : `Log ${servingsToLog} Serving${servingsToLog !== 1 ? 's' : ''}`}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
