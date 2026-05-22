'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Brain, Utensils, Flame, ShieldCheck } from 'lucide-react';
import type { GenerateDetailedRecipeInput } from '@/ai/flows/generate-detailed-recipe-flow';

const dietaryPreferences = ["Keto", "Keto Dairy-Free", "Keto Nut-Free", "Keto Vegetarian", "Low-Carb General"] as const;
const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Side Dish", "Any"] as const;
const cookingTimes = ["Quick (under 30 mins)", "Moderate (30-60 mins)", "No Preference"] as const;
const spiceLevels = ["Mild", "Medium", "Spicy", "Any"] as const;

interface GenerateRecipeFormProps {
  isLoading: boolean;
  authLoading: boolean;
  canUseFeature: boolean;
  onGenerate: (input: GenerateDetailedRecipeInput) => void;
}

export function GenerateRecipeForm({
  isLoading,
  authLoading,
  canUseFeature,
  onGenerate
}: GenerateRecipeFormProps) {
  const [dietaryPreference, setDietaryPreference] = useState<string>("Keto");
  const [cuisinePreference, setCuisinePreference] = useState<string>("Any");
  const [mealType, setMealType] = useState<string>("Any");
  const [cookingTimePreference, setCookingTimePreference] = useState<string>("No Preference");
  const [mainIngredients, setMainIngredients] = useState<string>('');
  const [excludedIngredients, setExcludedIngredients] = useState<string>('');
  const [spiceLevel, setSpiceLevel] = useState<string>("Any");
  const [servings, setServings] = useState<number>(2);
  const [ensureHalal, setEnsureHalal] = useState<boolean>(false);
  const [specificRequests, setSpecificRequests] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUseFeature) return;

    onGenerate({
      dietaryPreference: dietaryPreference as any,
      cuisinePreference,
      mealType: mealType as any,
      mainIngredients: mainIngredients.split(',').map(s => s.trim()).filter(Boolean),
      excludedIngredients: excludedIngredients.split(',').map(s => s.trim()).filter(Boolean),
      cookingTimePreference: cookingTimePreference as any,
      servings,
      specificRequests: specificRequests.trim() || undefined,
      ensureHalal,
      spiceLevel: spiceLevel as any,
    });
  };

  return (
    <Card className="shadow-xl bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl">
      <CardHeader className="text-center">
        <Utensils className="mx-auto h-12 w-12 text-primary mb-2 animate-bounce" />
        <CardTitle className="text-3xl font-headline text-primary">Chef Ath's Recipe Genie</CardTitle>
        <CardDescription>
          Tell Chef Ath your preferences, and get a custom Keto-focused recipe!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="dietaryPreference">Dietary Preference</Label>
              <Select 
                name="dietaryPreference" 
                value={dietaryPreference} 
                onValueChange={setDietaryPreference} 
                disabled={isLoading || authLoading}
              >
                <SelectTrigger id="dietaryPreference"><SelectValue placeholder="Select diet" /></SelectTrigger>
                <SelectContent className="bg-card/90 backdrop-blur-xl border-border/50">
                  {dietaryPreferences.map(dp => <SelectItem key={dp} value={dp}>{dp}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cuisinePreference">Cuisine Preference</Label>
              <Input 
                id="cuisinePreference" 
                name="cuisinePreference" 
                placeholder="e.g., Italian, Singaporean Local, Any" 
                value={cuisinePreference} 
                onChange={(e) => setCuisinePreference(e.target.value)} 
                disabled={isLoading || authLoading} 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="mealType">Meal Type</Label>
              <Select 
                name="mealType" 
                value={mealType} 
                onValueChange={setMealType} 
                disabled={isLoading || authLoading}
              >
                <SelectTrigger id="mealType"><SelectValue placeholder="Select meal type" /></SelectTrigger>
                <SelectContent className="bg-card/90 backdrop-blur-xl border-border/50">
                  {mealTypes.map(mt => <SelectItem key={mt} value={mt}>{mt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cookingTimePreference">Cooking Time</Label>
              <Select 
                name="cookingTimePreference" 
                value={cookingTimePreference} 
                onValueChange={setCookingTimePreference} 
                disabled={isLoading || authLoading}
              >
                <SelectTrigger id="cookingTimePreference"><SelectValue placeholder="Select cooking time" /></SelectTrigger>
                <SelectContent className="bg-card/90 backdrop-blur-xl border-border/50">
                  {cookingTimes.map(ct => <SelectItem key={ct} value={ct}>{ct}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mainIngredients">Main Ingredients to Feature (comma-separated, optional)</Label>
            <Input 
              id="mainIngredients" 
              name="mainIngredients" 
              placeholder="e.g., chicken breast, broccoli, eggs" 
              value={mainIngredients} 
              onChange={(e) => setMainIngredients(e.target.value)} 
              disabled={isLoading || authLoading} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="excludedIngredients">Ingredients to Exclude (comma-separated, optional)</Label>
            <Input 
              id="excludedIngredients" 
              name="excludedIngredients" 
              placeholder="e.g., nuts, mushrooms" 
              value={excludedIngredients} 
              onChange={(e) => setExcludedIngredients(e.target.value)} 
              disabled={isLoading || authLoading} 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="spiceLevel" className="flex items-center">
                <Flame className="mr-2 h-4 w-4 text-muted-foreground" />
                Spice Level
              </Label>
              <Select 
                name="spiceLevel" 
                value={spiceLevel} 
                onValueChange={setSpiceLevel} 
                disabled={isLoading || authLoading}
              >
                <SelectTrigger id="spiceLevel"><SelectValue placeholder="Select spice level" /></SelectTrigger>
                <SelectContent className="bg-card/90 backdrop-blur-xl border-border/50">
                  {spiceLevels.map(sl => <SelectItem key={sl} value={sl}>{sl}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="servings">Number of Servings (for AI to generate)</Label>
              <Input 
                id="servings" 
                name="servings" 
                type="number" 
                min="1" 
                max="12" 
                value={servings || ''} 
                onChange={(e) => setServings(parseInt(e.target.value, 10) || 2)} 
                disabled={isLoading || authLoading} 
              />
              <p className="text-xs text-muted-foreground">This controls the recipe serving size. Use the stepper below the recipe to log a different amount.</p>
            </div>
          </div>
          <div className="space-y-2 flex items-center">
            <Checkbox
              id="ensureHalal"
              checked={ensureHalal}
              onCheckedChange={(checked) => setEnsureHalal(!!checked)}
              disabled={isLoading || authLoading}
            />
            <Label htmlFor="ensureHalal" className="ml-2 font-normal flex items-center cursor-pointer select-none">
              <ShieldCheck className="mr-1.5 h-4 w-4 text-muted-foreground" />
              Ensure Halal Compliance
            </Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="specificRequests">Other Specific Requests / Notes</Label>
            <Textarea 
              id="specificRequests" 
              name="specificRequests" 
              placeholder="e.g., one-pan meal, air fryer friendly, use local herbs" 
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
            {isLoading ? 'Chef Ath is Thinking...' : 'Generate My Recipe!'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
