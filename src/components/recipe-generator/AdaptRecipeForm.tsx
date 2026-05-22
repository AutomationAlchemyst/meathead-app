'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Brain, GitFork } from 'lucide-react';
import type { AdaptRecipeInput } from '@/ai/flows/adapt-recipe-flow';

const adaptationGoals = [
    { value: "makeKeto", label: "Make it Keto" },
    { value: "makeHalal", label: "Make it Halal" },
    { value: "suggestSubstitutions", label: "Suggest Ingredient Substitutions" },
    { value: "makeKetoHalal", label: "Make it Keto & Halal" }
] as const;

interface AdaptRecipeFormProps {
  isLoading: boolean;
  authLoading: boolean;
  canUseFeature: boolean;
  onAdapt: (input: AdaptRecipeInput) => void;
}

export function AdaptRecipeForm({
  isLoading,
  authLoading,
  canUseFeature,
  onAdapt
}: AdaptRecipeFormProps) {
  const [originalRecipeText, setOriginalRecipeText] = useState<string>('');
  const [adaptationGoal, setAdaptationGoal] = useState<string>("makeKeto");
  const [servings, setServings] = useState<number>(2);
  const [specificIngredientToSubstitute, setSpecificIngredientToSubstitute] = useState<string>('');
  const [preferredSubstitution, setPreferredSubstitution] = useState<string>('');
  const [additionalDietaryRestrictions, setAdditionalDietaryRestrictions] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUseFeature) return;

    onAdapt({
      originalRecipeText,
      adaptationGoal: adaptationGoal as any,
      specificIngredientToSubstitute: adaptationGoal === "suggestSubstitutions" ? specificIngredientToSubstitute || undefined : undefined,
      preferredSubstitution: preferredSubstitution || undefined,
      dietaryRestrictions: additionalDietaryRestrictions.split(',').map(s => s.trim()).filter(Boolean),
      servings,
    });
  };

  return (
    <Card className="shadow-xl bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl">
      <CardHeader className="text-center">
        <GitFork className="mx-auto h-12 w-12 text-secondary mb-2 animate-pulse" />
        <CardTitle className="text-3xl font-headline text-secondary">Adapt Existing Recipe</CardTitle>
        <CardDescription>
          Have a recipe? Let Chef Ath adapt it for your needs (Keto, Halal, etc.) or suggest substitutions!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="originalRecipeText">Original Recipe Text</Label>
            <Textarea
              id="originalRecipeText"
              name="originalRecipeText"
              placeholder="Paste your full recipe here (ingredients and instructions)..."
              value={originalRecipeText}
              onChange={(e) => setOriginalRecipeText(e.target.value)}
              rows={10}
              disabled={isLoading || authLoading}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="adaptationGoal">Adaptation Goal</Label>
              <Select 
                name="adaptationGoal" 
                value={adaptationGoal} 
                onValueChange={setAdaptationGoal} 
                disabled={isLoading || authLoading}
              >
                <SelectTrigger id="adaptationGoal"><SelectValue placeholder="Select adaptation goal" /></SelectTrigger>
                <SelectContent className="bg-card/90 backdrop-blur-xl border-border/50">
                  {adaptationGoals.map(goal => <SelectItem key={goal.value} value={goal.value}>{goal.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adaptServings">Desired Servings (for adapted recipe)</Label>
              <Input
                id="adaptServings"
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
          {adaptationGoal === "suggestSubstitutions" && (
            <div className="space-y-2">
              <Label htmlFor="specificIngredientToSubstitute">Ingredient to Substitute</Label>
              <Input
                id="specificIngredientToSubstitute"
                name="specificIngredientToSubstitute"
                placeholder="e.g., all-purpose flour, sugar"
                value={specificIngredientToSubstitute}
                onChange={(e) => setSpecificIngredientToSubstitute(e.target.value)}
                disabled={isLoading || authLoading}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="preferredSubstitution">Preferred Substitution (Optional)</Label>
            <Input
              id="preferredSubstitution"
              name="preferredSubstitution"
              placeholder="e.g., almond flour, erythritol"
              value={preferredSubstitution}
              onChange={(e) => setPreferredSubstitution(e.target.value)}
              disabled={isLoading || authLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="additionalDietaryRestrictions">Additional Dietary Restrictions (comma-separated, optional)</Label>
            <Input
              id="additionalDietaryRestrictions"
              name="additionalDietaryRestrictions"
              placeholder="e.g., dairy-free, nut-free"
              value={additionalDietaryRestrictions}
              onChange={(e) => setAdditionalDietaryRestrictions(e.target.value)}
              disabled={isLoading || authLoading}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-secondary hover:bg-secondary/95 text-secondary-foreground h-12 shadow-lg shadow-secondary/20 hover:shadow-secondary/30 transition-all duration-300" 
            disabled={isLoading || authLoading || !canUseFeature}
          >
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Brain className="mr-2 h-5 w-5" />}
            {isLoading ? 'Chef Ath is Adapting...' : 'Adapt My Recipe!'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
