'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Loader2, Brain, AlertCircle, Sparkles, Gem, Zap, Info, CopyCheck, Refrigerator, GitFork } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

// New server action integrated components and hooks
import { useRecipeGeneration } from '@/hooks/useRecipeGeneration';
import { GenerateRecipeForm } from '@/components/recipe-generator/GenerateRecipeForm';
import { FridgeRecipeForm } from '@/components/recipe-generator/FridgeRecipeForm';
import { AdaptRecipeForm } from '@/components/recipe-generator/AdaptRecipeForm';
import { GeneratedRecipeDisplay } from '@/components/recipe-generator/GeneratedRecipeDisplay';
import AdaptedRecipeDisplay from '@/components/recipe-generator/AdaptedRecipeDisplay';
import UpgradePrompt from '@/components/premium/UpgradePrompt';

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5 },
  },
};

function RecipeGeneratorSkeleton() {
  return (
    <Card className="mt-8 shadow-xl bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="bg-primary/10 p-6 rounded-t-2xl">
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-5 w-full" />
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
        <Separator />
        <div>
          <Skeleton className="h-7 w-1/3 mb-3" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-5 w-full sm:w-1/2" />)}
          </div>
        </div>
        <Separator />
        <div>
          <Skeleton className="h-7 w-1/3 mb-3" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex">
                <Skeleton className="h-6 w-6 mr-3 rounded-full shrink-0" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
        <Separator />
        <div>
          <Skeleton className="h-7 w-1/3 mb-3" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecipeAdaptationSkeleton() {
  return (
    <Card className="mt-8 shadow-xl bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="bg-secondary/10 p-6 rounded-t-2xl">
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-5 w-full" />
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <Skeleton className="h-6 w-1/2 mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <Skeleton className="h-7 w-1/3 mb-3" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={`adapt-change-${i}`} className="h-10 w-full" />)}
        </div>
        <Separator />
        <Skeleton className="h-7 w-1/3 mb-3" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={`adapt-ing-${i}`} className="h-5 w-full sm:w-1/2" />)}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RecipeGeneratorPage() {
  const {
    user,
    authLoading,
    isPremium,
    trialDaysRemaining,
    trialAvailable,
    freeGenerationsLeft,
    canUseFeature,
    generatedRecipe,
    isLoadingGeneration,
    generationError,
    isLoggingGeneratedRecipe,
    fromIngredientsRecipe,
    isLoadingFromIngredients,
    fromIngredientsError,
    isLoggingFromIngredientsRecipe,
    adaptedRecipeOutput,
    isLoadingAdaptation,
    adaptationError,
    isLoggingAdaptedRecipe,
    isStartingTrial,
    startTrial,
    generateRecipe,
    generateFromIngredients,
    adaptRecipe,
    logRecipe,
    logAdaptedRecipe,
  } = useRecipeGeneration();

  // Serving size selectors
  const [generatedServingsToLog, setGeneratedServingsToLog] = useState(1);
  const [fridgeServingsToLog, setFridgeServingsToLog] = useState(1);

  // Reset servings to log when a new recipe is generated
  useEffect(() => {
    setGeneratedServingsToLog(1);
    setFridgeServingsToLog(1);
  }, [generatedRecipe, fromIngredientsRecipe]);

  if (authLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8 px-4 flex justify-center items-center h-[calc(100vh-150px)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const renderFreemiumHeader = () => {
    if (isPremium) {
      return (
        <Alert variant="default" className="mb-6 max-w-3xl mx-auto bg-green-500/10 border-green-500/20 text-green-500">
          <Gem className="h-5 w-5 text-green-500 animate-pulse" />
          <AlertTitle className="font-semibold">Premium Access Active!</AlertTitle>
          <AlertDescription>You have unlimited access to all Recipe Genie features. Enjoy!</AlertDescription>
        </Alert>
      );
    }
    if (trialDaysRemaining > 0) {
      return (
        <Alert variant="default" className="mb-6 max-w-3xl mx-auto bg-blue-500/10 border-blue-500/20 text-blue-500">
          <Zap className="h-5 w-5 text-blue-500" />
          <AlertTitle className="font-semibold">Premium Trial Active: {trialDaysRemaining} days remaining!</AlertTitle>
          <AlertDescription>Enjoy full access to the Recipe Genie during your trial.</AlertDescription>
        </Alert>
      );
    }
    if (freeGenerationsLeft > 0) {
      return (
        <Alert variant="default" className="mb-6 max-w-3xl mx-auto bg-orange-500/10 border-orange-500/20 text-orange-500">
          <Info className="h-5 w-5 text-orange-500" />
          <AlertTitle className="font-semibold">Recipe Genie - Free Tier</AlertTitle>
          <AlertDescription>You have {freeGenerationsLeft} free AI recipe generations left this month. Upgrade for unlimited access!</AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  const isLoadingAnyFeature = isLoadingGeneration || isLoadingAdaptation || isLoadingFromIngredients;

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            {renderFreemiumHeader()}
          </motion.div>

          {!canUseFeature && !isPremium && trialDaysRemaining <= 0 && (
            <motion.div variants={itemVariants} className="max-w-3xl mx-auto mb-6">
              <UpgradePrompt
                featureName="Recipe Genie"
                message="You've used all your free AI recipe generations. Upgrade to Premium for unlimited access, or start a free trial!"
              />
              {trialAvailable && (
                <Button 
                  onClick={startTrial} 
                  size="lg" 
                  className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-headline tracking-wide h-12 shadow-lg shadow-primary/20"
                  disabled={isStartingTrial}
                >
                  {isStartingTrial ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                  Start 3-Day Free Trial
                </Button>
              )}
            </motion.div>
          )}

          <motion.div variants={itemVariants}>
            <Tabs defaultValue="generate" className="max-w-3xl mx-auto mt-6">
              <TabsList className="flex flex-wrap w-full h-auto sm:h-12 gap-1 mb-6 p-1 rounded-xl bg-muted/60 text-muted-foreground border border-border/30">
                <TabsTrigger value="generate" className="flex-1 min-w-[150px] sm:flex-auto rounded-lg">
                  <CopyCheck className="hidden sm:inline-block mr-2 h-5 w-5" />Generate New
                </TabsTrigger>
                <TabsTrigger value="fridge" className="flex-1 min-w-[150px] sm:flex-auto rounded-lg">
                  <Refrigerator className="hidden sm:inline-block mr-2 h-5 w-5" />What's In My Fridge?
                </TabsTrigger>
                <TabsTrigger value="adapt" className="flex-1 min-w-[150px] sm:flex-auto rounded-lg">
                  <GitFork className="hidden sm:inline-block mr-2 h-5 w-5" />Adapt Existing
                </TabsTrigger>
              </TabsList>

              <TabsContent value="generate">
                <GenerateRecipeForm
                  isLoading={isLoadingGeneration}
                  authLoading={authLoading}
                  canUseFeature={canUseFeature}
                  onGenerate={generateRecipe}
                />
              </TabsContent>

              <TabsContent value="fridge">
                <FridgeRecipeForm
                  isLoading={isLoadingFromIngredients}
                  authLoading={authLoading}
                  canUseFeature={canUseFeature}
                  onGenerate={generateFromIngredients}
                />
              </TabsContent>

              <TabsContent value="adapt">
                <AdaptRecipeForm
                  isLoading={isLoadingAdaptation}
                  authLoading={authLoading}
                  canUseFeature={canUseFeature}
                  onAdapt={adaptRecipe}
                />
              </TabsContent>
            </Tabs>
          </motion.div>

          <AnimatePresence>
            {/* Detailed Generation Display */}
            {isLoadingGeneration && (
              <motion.div key="gen-skeleton" variants={itemVariants} initial="hidden" animate="visible" exit="hidden" className="max-w-3xl mx-auto">
                <RecipeGeneratorSkeleton />
              </motion.div>
            )}
            {generationError && !isLoadingGeneration && (
              <motion.div key="gen-error" variants={itemVariants} initial="hidden" animate="visible" exit="hidden" className="max-w-3xl mx-auto">
                <Alert variant="destructive" className="mt-8 bg-destructive/10 border-destructive/20 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <AlertTitle>Oops! Something went wrong with generation.</AlertTitle>
                  <AlertDescription>{generationError}</AlertDescription>
                </Alert>
              </motion.div>
            )}
            {generatedRecipe && !isLoadingGeneration && (
              <motion.div key="gen-recipe" variants={itemVariants} initial="hidden" animate="visible" exit="hidden" className="max-w-3xl mx-auto">
                <GeneratedRecipeDisplay
                  recipe={generatedRecipe}
                  servingsToLog={generatedServingsToLog}
                  onServingsChange={setGeneratedServingsToLog}
                  onLogRecipe={(recipe, servings) => logRecipe(recipe, servings, 'generate')}
                  isLoggingRecipe={isLoggingGeneratedRecipe}
                  recipeSource="generate"
                />
              </motion.div>
            )}

            {/* Fridge Generation Display */}
            {isLoadingFromIngredients && (
              <motion.div key="fridge-skeleton" variants={itemVariants} initial="hidden" animate="visible" exit="hidden" className="max-w-3xl mx-auto">
                <RecipeGeneratorSkeleton />
              </motion.div>
            )}
            {fromIngredientsError && !isLoadingFromIngredients && (
              <motion.div key="fridge-error" variants={itemVariants} initial="hidden" animate="visible" exit="hidden" className="max-w-3xl mx-auto">
                <Alert variant="destructive" className="mt-8 bg-destructive/10 border-destructive/20 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <AlertTitle>Oops! Something went wrong with this generation.</AlertTitle>
                  <AlertDescription>{fromIngredientsError}</AlertDescription>
                </Alert>
              </motion.div>
            )}
            {fromIngredientsRecipe && !isLoadingFromIngredients && (
              <motion.div key="fridge-recipe" variants={itemVariants} initial="hidden" animate="visible" exit="hidden" className="max-w-3xl mx-auto">
                <GeneratedRecipeDisplay
                  recipe={fromIngredientsRecipe}
                  servingsToLog={fridgeServingsToLog}
                  onServingsChange={setFridgeServingsToLog}
                  onLogRecipe={(recipe, servings) => logRecipe(recipe, servings, 'fridge')}
                  isLoggingRecipe={isLoggingFromIngredientsRecipe}
                  recipeSource="fridge"
                />
              </motion.div>
            )}

            {/* Adaptation Display */}
            {isLoadingAdaptation && (
              <motion.div key="adapt-skeleton" variants={itemVariants} initial="hidden" animate="visible" exit="hidden" className="max-w-3xl mx-auto">
                <RecipeAdaptationSkeleton />
              </motion.div>
            )}
            {adaptationError && !isLoadingAdaptation && (
              <motion.div key="adapt-error" variants={itemVariants} initial="hidden" animate="visible" exit="hidden" className="max-w-3xl mx-auto">
                <Alert variant="destructive" className="mt-8 bg-destructive/10 border-destructive/20 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <AlertTitle>Oops! Something went wrong with adaptation.</AlertTitle>
                  <AlertDescription>{adaptationError}</AlertDescription>
                </Alert>
              </motion.div>
            )}
            {adaptedRecipeOutput && !isLoadingAdaptation && (
              <motion.div key="adapt-recipe" variants={itemVariants} initial="hidden" animate="visible" exit="hidden" className="max-w-3xl mx-auto">
                <AdaptedRecipeDisplay
                  adaptedRecipe={adaptedRecipeOutput}
                  onLogAdaptedRecipe={logAdaptedRecipe}
                  isLoggingAdaptedRecipe={isLoggingAdaptedRecipe}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AppLayout>
  );
}
