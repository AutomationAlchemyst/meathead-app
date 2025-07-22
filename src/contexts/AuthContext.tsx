'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useEffect, useState, useContext } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isPremium: boolean;
  setUserProfile: (profile: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = userProfile?.isAdmin || false;
  const isPremium = userProfile?.isPremium || false;

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // First, always clean up any previous profile listener
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }

      if (firebaseUser) {
        // If a user is logged in, set their state and create a NEW listener for their profile
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const rawData = docSnap.data();
            const convertTimestamp = (tsField: any): Timestamp | null => {
              if (tsField instanceof Timestamp) return tsField;
              if (tsField && typeof tsField.seconds === 'number') {
                return new Timestamp(tsField.seconds, tsField.nanoseconds || 0);
              }
              return null;
            };

            const processedProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: rawData.email ?? firebaseUser.email ?? null,
              displayName: rawData.displayName ?? null,
              myWhy: rawData.myWhy ?? null,
              currentWeight: rawData.currentWeight ?? null,
              targetWeight: rawData.targetWeight ?? null,
              activityLevel: rawData.activityLevel ?? null,
              startingWeight: rawData.startingWeight ?? null,
              estimatedGoalDate: rawData.estimatedGoalDate ?? null,
              targetCalories: rawData.targetCalories ?? null,
              targetProtein: rawData.targetProtein ?? null,
              targetCarbs: rawData.targetCarbs ?? 20,
              targetFat: rawData.targetFat ?? null,
              targetWaterIntake: rawData.targetWaterIntake ?? null,
              createdAt: convertTimestamp(rawData.createdAt) || Timestamp.now(),
              updatedAt: convertTimestamp(rawData.updatedAt),
              journeyStartDate: convertTimestamp(rawData.journeyStartDate),
              activeWorkoutPlan: rawData.activeWorkoutPlan ?? null,
              isAdmin: !!rawData.isAdmin,
              isPremium: !!rawData.isPremium,
              // @ts-ignore
              currentStreak: rawData.currentStreak ?? 0,
              // @ts-ignore
              lastLogDate: convertTimestamp(rawData.lastLogDate),
            };
            setUserProfile(processedProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false); // Loading is complete once we have a profile (or know it doesn't exist)
        }, (error) => {
          console.error("[AuthContext] Profile listener error:", error);
          setUserProfile(null);
          setLoading(false); // Also complete loading on error
        });
      } else {
        // If no user is logged in, clear all state and mark loading as complete
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Cleanup the main auth listener on unmount
    return () => unsubscribeAuth();
  }, []); // This empty dependency array ensures this effect runs only once on mount

  const value = { user, userProfile, loading, isAdmin, isPremium, setUserProfile };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
         <div className="flex flex-col items-center gap-2">
            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-muted-foreground">Loading MeatHead...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
