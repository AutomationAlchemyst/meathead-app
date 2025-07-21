"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"


export function ProfileSetupModal() {
  const totalSteps = 4;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: '',
    currentWeight: '',
    targetWeight: '',
    activityLevel: '',
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- NEW ---
  // A helper function to create a small delay for better UX.
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };
  
  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);

    try {
      const userDocRef = doc(db, 'users', user.uid);

      const profileData = {
        displayName: formData.displayName,
        currentWeight: Number(formData.currentWeight),
        targetWeight: Number(formData.targetWeight),
        activityLevel: formData.activityLevel,
        isProfileComplete: true, 
      };

      await updateDoc(userDocRef, profileData);

      toast({ title: "Success!", description: "Your profile has been updated." });
      
      // --- IMPROVEMENT ---
      // We add a 1-second delay here. This gives the user time to read the "Success!" toast
      // before the modal closes and the page re-renders.
      await delay(1000); 

      setIsOpen(false);

    } catch (error) {
      console.error("Error updating profile: ", error);
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleActivityLevelChange = (value: string) => {
    setFormData(prev => ({ ...prev, activityLevel: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)} size="lg" className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg transition-all duration-300 ease-in-out hover:scale-105 text-lg py-7 px-10">
          Start Profile Setup
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Welcome to MeatHead!</DialogTitle>
          <DialogDescription>
            Let's get your profile set up. A few quick questions will help Coach Ath personalize your journey.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {step === 1 && (
            <div>
              <h3 className="font-semibold mb-4 text-center">Step 1: What should we call you?</h3>
              <div className="grid w-full max-w-sm items-center gap-1.5 mx-auto">
                <Label htmlFor="displayName">Display Name</Label>
                <Input 
                  type="text" 
                  id="displayName" 
                  name="displayName"
                  placeholder="e.g., Ath the Cycle Breaker"
                  value={formData.displayName}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold mb-4 text-center">Step 2: Your Current Stats</h3>
              <div className="grid w-full max-w-sm items-center gap-1.5 mx-auto">
                <Label htmlFor="currentWeight">Current Weight (kg)</Label>
                <Input 
                  type="number" 
                  id="currentWeight" 
                  name="currentWeight"
                  placeholder="e.g., 85"
                  value={formData.currentWeight}
                  onChange={handleChange}
                />
              </div>
              <div className="grid w-full max-w-sm items-center gap-1.5 mx-auto">
                <Label htmlFor="targetWeight">Target Weight (kg)</Label>
                <Input 
                  type="number" 
                  id="targetWeight" 
                  name="targetWeight"
                  placeholder="e.g., 75"
                  value={formData.targetWeight}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="font-semibold mb-4 text-center">Step 3: Your Activity Level</h3>
              <RadioGroup 
                name="activityLevel"
                onValueChange={handleActivityLevelChange} 
                defaultValue={formData.activityLevel}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sedentary" id="r1" />
                  <Label htmlFor="r1">Sedentary (little or no exercise)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="r2" />
                  <Label htmlFor="r2">Lightly active (light exercise/sports 1-3 days/week)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="moderate" id="r3" />
                  <Label htmlFor="r3">Moderately active (moderate exercise/sports 3-5 days/week)</Label>
                </div>
                 <div className="flex items-center space-x-2">
                  <RadioGroupItem value="very" id="r4" />
                  <Label htmlFor="r4">Very active (hard exercise/sports 6-7 days a week)</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2">
              <h3 className="font-semibold mb-4 text-center">Step 4: Confirmation</h3>
              <p>Please confirm your details are correct:</p>
              <ul className="list-disc list-inside bg-muted p-4 rounded-md text-sm">
                <li><strong>Display Name:</strong> {formData.displayName}</li>
                <li><strong>Current Weight:</strong> {formData.currentWeight} kg</li>
                <li><strong>Target Weight:</strong> {formData.targetWeight} kg</li>
                <li><strong>Activity Level:</strong> {formData.activityLevel}</li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={prevStep} disabled={isSubmitting}>Back</Button>
          )}
          {step < totalSteps ? (
            <Button onClick={nextStep} disabled={isSubmitting}>Next</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Finish Setup"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
