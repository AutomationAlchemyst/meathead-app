'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Brain, Refrigerator } from 'lucide-react';
import type { GenerateRecipeFromIngredientsInput } from '@/ai/flows/generate-recipe-from-ingredients-flow';

const dietaryPreferences = ["Keto", "Keto Dairy-Free", "Keto Nut-Free", "Keto Vegetarian", "Low-Carb General"] as const;
const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Side Dish", "Any"] as const;

interface FridgeRecipeFormProps {
  isLoading: boolean;
  authLoading: boolean;
  canUseFeature: boolean;
  onGenerate: (input: GenerateRecipeFromIngredientsInput) => void;
}

export function FridgeRecipeForm({
  isLoading,
  authLoading,
  canUseFeature,
  onGenerate
}: FridgeRecipeFormProps) {
  const [availableIngredients, setAvailableIngredients] = useState<string>('');
  const [dietaryPreference, setDietaryPreference] = useState<string>("Keto");
  const [cuisinePreference, setCuisinePreference] = useState<string>("Any");
  const [mealType, setMealType] = useState<string>("Any");
  const [servings, setServings] = useState<number>(2);
  const [excludedIngredients, setExcludedIngredients] = useState<string>('');
  const [specificRequests, setSpecificRequests] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUseFeature) return;

    onGenerate({
      availableIngredients: availableIngredients.split(',').map(s => s.trim()).filter(Boolean),
      dietaryPreference: dietaryPreference as any,
      cuisinePreference,
      mealType: mealType as any,
      servings,
      excludedIngredients: excludedIngredients.split(',').map(s => s.trim()).filter(Boolean),
      specificRequests: specificRequests.trim() || undefined,
    });
  };

  return (
    <Card className="shadow-xl bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl">
      <CardHeader className="text-center">
        <Refrigerator className="mx-auto h-12 w-12 text-primary mb-2 animate-pulse" />
        <CardTitle className="text-3xl font-headline text-primary">What's In My Fridge?</CardTitle>
        <CardDescription>
          List your available ingredients, and Chef Ath will whip up a Keto recipe!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="availableIngredients">Available Ingredients (comma-separated)</Label>
            <Textarea
              id="availableIngredients"
              name="availableIngredients"
              placeholder="e.g., chicken thighs, spinach, eggs, cheese, olive oil"
              value={availableIngredients}
              onChange={(e) => setAvailableIngredients(e.target.value)}
              rows={4}
              disabled={isLoading || authLoading}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fridgeDietaryPreference">Dietary Preference</Label>
              <Select 
                name="dietaryPreference" 
                value={dietaryPreference} 
                onValueChange={setDietaryPreference} 
                disabled={isLoading || authLoading}
              >
                <SelectTrigger id="fridgeDietaryPreference"><SelectValue placeholder="Select diet" /></SelectTrigger>
                <SelectContent className="bg-card/90 backdrop-blur-xl border-border/50">
                  {dietaryPreferences.map(dp => <SelectItem key={dp} value={dp}>{dp}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fridgeCuisinePreference">Cuisine Preference</Label>
              <Input 
                id="fridgeCuisinePreference" 
                name="cuisinePreference" 
                placeholder="e.g., Quick & Easy, Asian, Any" 
                value={cuisinePreference} 
                onChange={(e) => setCuisinePreference(e.target.value)} 
                disabled={isLoading || authLoading} 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fridgeMealType">Meal Type</Label>
              <Select 
                name="mealType" 
                value={mealType} 
                onValueChange={setMealType} 
                disabled={isLoading || authLoading}
              >
                <SelectTrigger id="fridgeMealType"><SelectValue placeholder="Select meal type" /></SelectTrigger>
                <SelectContent className="bg-card/90 backdrop-blur-xl border-border/50">
                  {mealTypes.map(mt => <SelectItem key={mt} value={mt}>{mt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fridgeServings">Number of Servings (for AI to generate)</Label>
              <Input 
                id="fridgeServings" 
                name="servings" 
                type="number" 
                min="1" 
                max="12" 
                value={servings || ''} 
                onChange={(e) => setServings(parseInt(e.target.value, 10) || 2)} 
                disabled={isLoading || authLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="excludedIngredients">Ingredients to Strictly Exclude (comma-separated, optional)</Label>
            <Input 
              id="excludedIngredients" 
              name="excludedIngredients" 
              placeholder="e.g., nuts, mushrooms, dairy" 
              value={excludedIngredients} 
              onChange={(e) => setExcludedIngredients(e.target.value)} 
              disabled={isLoading || authLoading} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fridgeSpecificRequests">Other Specific Requests / Notes</Label>
            <Textarea 
              id="fridgeSpecificRequests" 
              name="specificRequests" 
              placeholder="e.g., quick meal, spicy, use air fryer" 
              value={specificRequests} 
              onChange={(e) => setSpecificRequests(e.target.value)} 
              disabled={isLoading || authLoading} 
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/95 text-primary-foreground h-12 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300" 
            disabled={isLoading || authLoading || !canUseFeature}
          >
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Brain className="mr-2 h-5 w-5" />}
            {isLoading ? 'Chef Ath is Inventing...' : 'Generate Recipe From My Ingredients!'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
