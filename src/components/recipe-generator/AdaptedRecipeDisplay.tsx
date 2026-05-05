
'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import type { AdaptRecipeOutput, RecipeIngredient, RecipeStep, RecipeMacros } from '@/ai/flows/adapt-recipe-flow';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, ShoppingBasket, CookingPot, Sparkles, Info, CheckSquare, ChevronsRight, PlusCircle, Loader2, Flame, Beef, Wheat, Droplets as FatIcon, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface AdaptedRecipeDisplayProps {
  adaptedRecipe: AdaptRecipeOutput;
  onLogAdaptedRecipe?: (macros: RecipeMacros, recipeName: string, servingsToLog: number) => Promise<void>;
  isLoggingAdaptedRecipe?: boolean;
}

const macroIconMapping: { [key in keyof RecipeMacros]: React.ReactNode } = {
    calories: <Flame className="h-4 w-4 mr-1.5 text-red-500" />,
    protein: <Beef className="h-4 w-4 mr-1.5 text-green-500" />,
    carbs: <Wheat className="h-4 w-4 mr-1.5 text-yellow-500" />,
    fat: <FatIcon className="h-4 w-4 mr-1.5 text-blue-500" />,
};

export default function AdaptedRecipeDisplay({ adaptedRecipe, onLogAdaptedRecipe, isLoggingAdaptedRecipe }: AdaptedRecipeDisplayProps) {
  const { user } = useAuth();
  const {
    adaptedRecipeName,
    originalRecipeName,
    adaptationSummary,
    adaptationsMade,
    adaptedIngredients,
    adaptedInstructions,
    adaptedMacrosPerServing,
    notes,
    servings,
  } = adaptedRecipe;

  const recipeServings = typeof servings === 'number' && servings > 0 ? servings : 1;
  const [servingsToLog, setServingsToLog] = useState(1);

  // Scale macros for the selected number of servings
  const scale = servingsToLog / recipeServings;
  const scaledMacros: RecipeMacros = {
    calories: Math.round(adaptedMacrosPerServing.calories * scale),
    protein: Math.round(adaptedMacrosPerServing.protein * scale * 10) / 10,
    carbs: Math.round(adaptedMacrosPerServing.carbs * scale * 10) / 10,
    fat: Math.round(adaptedMacrosPerServing.fat * scale * 10) / 10,
  };

  const incrementServings = () => setServingsToLog(prev => Math.min(prev + 1, recipeServings));
  const decrementServings = () => setServingsToLog(prev => Math.max(prev - 1, 1));

  return (
    <Card className="mt-8 shadow-xl">
      <CardHeader className="bg-secondary/10 p-6 rounded-t-lg">
        <CardTitle className="text-3xl font-headline text-secondary flex items-center">
          <FileText className="h-8 w-8 mr-3" /> {adaptedRecipeName}
        </CardTitle>
        {originalRecipeName && <CardDescription className="text-sm pt-1">Adapted from: {originalRecipeName}</CardDescription>}
        <CardDescription className="text-sm pt-1">Yields: {recipeServings} serving(s)</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-2 flex items-center">
            <CheckSquare className="h-6 w-6 mr-2 text-secondary" /> Adaptation Summary
          </h3>
          <p className="text-sm text-muted-foreground">{adaptationSummary}</p>
        </div>

        {adaptationsMade && adaptationsMade.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                <ChevronsRight className="h-6 w-6 mr-2 text-secondary" /> Key Changes Made
              </h3>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="changes">
                  <AccordionTrigger className="text-base hover:no-underline text-secondary/90">Show Detailed Changes ({adaptationsMade.length})</AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc list-inside space-y-2 pl-2 text-sm">
                      {adaptationsMade.map((change, index) => (
                        <li key={index}>
                          <strong>Original:</strong> {change.originalItem} <br />
                          <strong>Changed To:</strong> {change.changedTo}
                          {change.reason && <span className="text-muted-foreground text-xs block mt-0.5">Reason: {change.reason}</span>}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </>
        )}

        <Separator />

        <div>
          <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
            <ShoppingBasket className="h-6 w-6 mr-2 text-secondary" /> Adapted Ingredients
          </h3>
          <ul className="list-disc list-inside space-y-1.5 pl-2 columns-1 sm:columns-2 text-sm">
            {adaptedIngredients.map((ing, index) => (
              <li key={index}>
                {ing.quantity} {ing.unit} {ing.name}
                {ing.notes && <span className="text-muted-foreground text-xs"> ({ing.notes})</span>}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        <div>
          <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
            <CookingPot className="h-6 w-6 mr-2 text-secondary" /> Adapted Instructions
          </h3>
          <ol className="space-y-3">
            {adaptedInstructions.map((step) => (
              <li key={step.stepNumber} className="flex">
                <Badge variant="outline" className="mr-3 h-6 w-6 flex items-center justify-center border-secondary text-secondary font-bold shrink-0">{step.stepNumber}</Badge>
                <p className="text-sm leading-relaxed">{step.instruction}</p>
              </li>
            ))}
          </ol>
        </div>

        <Separator />

        <div>
          <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
            <Sparkles className="h-6 w-6 mr-2 text-secondary" /> Adapted Macros
          </h3>
          {/* Serving size selector */}
          <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Log how many servings?</span>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
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
                className="h-8 w-8 shrink-0"
                onClick={incrementServings}
                disabled={servingsToLog >= recipeServings}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">/ {recipeServings} available</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {(Object.keys(scaledMacros) as Array<keyof RecipeMacros>).map(key => (
              <div key={key as string} className="p-3 bg-muted rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                   {macroIconMapping[key] || <Sparkles className="h-4 w-4 mr-1.5 text-muted-foreground" />}
                   <p className="font-semibold capitalize">{key as string}</p>
                </div>
                <p>{scaledMacros[key]}{key === 'calories' ? ' kcal' : ' g'}</p>
                {servingsToLog !== 1 && (
                  <p className="text-xs text-muted-foreground">({adaptedMacrosPerServing[key]}{key === 'calories' ? ' kcal' : ' g'} × {servingsToLog})</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {notes && notes.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                <Info className="h-6 w-6 mr-2 text-secondary" /> Chef Ath's Notes on Adaptation
              </h3>
              <ul className="list-disc list-inside space-y-1 pl-2 text-sm">
                {notes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="p-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs text-muted-foreground text-center sm:text-left">Recipe adapted by Chef Ath. Nutritional information is an estimate. Always verify ingredients for dietary compliance.</p>
        {user && onLogAdaptedRecipe && (
          <Button
            onClick={() => onLogAdaptedRecipe(scaledMacros, adaptedRecipeName, servingsToLog)}
            disabled={isLoggingAdaptedRecipe}
            size="sm"
            variant="secondary"
            className="w-full sm:w-auto"
          >
            {isLoggingAdaptedRecipe ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {isLoggingAdaptedRecipe ? 'Logging...' : `Log ${servingsToLog} Serving${servingsToLog !== 1 ? 's' : ''}`}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
