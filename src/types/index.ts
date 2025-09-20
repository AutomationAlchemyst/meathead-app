import type { Timestamp } from 'firebase/firestore';
import type { GenerateWorkoutPlanOutput } from '@/ai/schemas/workout-schemas';
import { z } from 'zod';

export type ActivityLevel = 'sedentary' | 'lightlyActive' | 'active' | 'veryActive';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  currentWeight?: number | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFat?: number | null;
  targetWeight?: number | null;
  activityLevel?: ActivityLevel | null;
  estimatedGoalDate?: string | null;
  startingWeight?: number | null;
  journeyStartDate?: Timestamp | null;
  activeWorkoutPlan?: GenerateWorkoutPlanOutput | null;
  targetWaterIntake?: number | null;
  myWhy?: string; // Added the purpose-driven field
  currentStreak?: number;
  lastLogDate?: Timestamp | null;
  isAdmin?: boolean;
  isPremium?: boolean; // Added for premium access control
}

export interface FoodLog {
  id?: string;
  userId: string;
  foodItem: string;
  quantity: string;
  carbs: number;
  protein: number;
  fat: number;
  calories: number;
  loggedAt: Timestamp;
}

export interface WeightLog {
  id?: string;
  userId: string;
  weight: number;
  loggedAt: Timestamp;
}

export interface WaterLog {
  id?: string;
  userId: string;
  amount: number; // in milliliters (ml)
  loggedAt: Timestamp;
}

export interface WorkoutLog {
  id?: string;
  userId: string;
  planName: string;
  dayNumber: number;
  dayName: string;
  focus: string;
  completedAt: Timestamp;
}

export interface FeedbackSubmission {
  id?: string;
  userId: string;
  userDisplayName: string | null;
  userEmail: string | null;
  rating: string;
  comments: string;
  submittedAt: Timestamp;
}

// Plain version for client-server serialization
export interface FeedbackSubmissionPlain extends Omit<FeedbackSubmission, 'submittedAt' | 'id'> {
  id: string; // id is fine as string
  submittedAt: string; // Timestamp converted to ISO string
}


// Define and export the Zod schema for feedback submissions
export const FeedbackSubmissionServerSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  userDisplayName: z.string().nullable(),
  userEmail: z.string().email().nullable(),
  rating: z.string().min(1, "Rating is required."),
  comments: z.string().min(5, "Comments must be at least 5 characters long.").max(5000, "Comments cannot exceed 5000 characters."),
});
