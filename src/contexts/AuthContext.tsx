'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import type { GenerateWorkoutPlanOutput } from '@/ai/schemas/workout-schemas';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean; 
  authCheckCompleted: boolean; 
  isAdmin: boolean;
  isPremium: boolean;
  setUserProfile: (profile: UserProfile | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  authCheckCompleted: false,
  isAdmin: false,
  isPremium: false,
  setUserProfile: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUserState] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [loading, setLoadingState] = useState(true);
  const [authCheckCompleted, setAuthCheckCompletedState] = useState(false);
  const [isAdmin, setIsAdminState] = useState(false); 
  const [isPremium, setIsPremiumState] = useState(false);

  const setUser = (newUser: FirebaseUser | null) => {
    setUserState(newUser);
  };

  const handleSetUserProfile = (newProfile: UserProfile | null) => {
    setUserProfileState(newProfile ? { ...newProfile } : null);
    setIsAdminState(newProfile?.isAdmin ?? false);
    setIsPremiumState(newProfile?.isPremium ?? false);
  };
  
  const setLoading = (newLoading: boolean) => {
    setLoadingState(newLoading);
  }

  const setAuthCheckCompleted = (newAuthCheckCompleted: boolean) => {
    setAuthCheckCompletedState(newAuthCheckCompleted);
  }


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setUser(null);
        handleSetUserProfile(null); 
      }
      
      if (!authCheckCompleted) {
        setAuthCheckCompleted(true);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    if (user) {
      setLoading(true); 
      
      const userDocRef = doc(db, 'users', user.uid);
      
      unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
        const rawData = docSnap.data();

        if (docSnap.exists() && rawData) {
          const convertTimestamp = (tsField: any): Timestamp | null => {
            if (tsField instanceof Timestamp) return tsField;
            if (tsField && typeof tsField.seconds === 'number' && typeof tsField.nanoseconds === 'number') {
              try {
                return new Timestamp(tsField.seconds, tsField.nanoseconds);
              } catch (e) {
                console.warn("[AuthContext] Error converting pojo to Timestamp:", tsField, e);
                return null;
              }
            }
            return null;
          };
          
          const processedProfile: UserProfile = {
            uid: user.uid, 
            email: rawData.email ?? user.email ?? null,
            displayName: rawData.displayName ?? null,
            
            currentWeight: typeof rawData.currentWeight === 'number' ? rawData.currentWeight : null,
            targetWeight: typeof rawData.targetWeight === 'number' ? rawData.targetWeight : null,
            activityLevel: rawData.activityLevel ?? null,
            startingWeight: typeof rawData.startingWeight === 'number' ? rawData.startingWeight : null,
            estimatedGoalDate: rawData.estimatedGoalDate ?? null,
            
            targetCalories: typeof rawData.targetCalories === 'number' ? rawData.targetCalories : null,
            targetProtein: typeof rawData.targetProtein === 'number' ? rawData.targetProtein : null,
            targetCarbs: typeof rawData.targetCarbs === 'number' ? rawData.targetCarbs : 20, 
            targetFat: typeof rawData.targetFat === 'number' ? rawData.targetFat : null,
            targetWaterIntake: typeof rawData.targetWaterIntake === 'number' ? rawData.targetWaterIntake : null,
            
            createdAt: convertTimestamp(rawData.createdAt) || Timestamp.now(),
            updatedAt: convertTimestamp(rawData.updatedAt),
            journeyStartDate: convertTimestamp(rawData.journeyStartDate),
            activeWorkoutPlan: rawData.activeWorkoutPlan ? (rawData.activeWorkoutPlan as GenerateWorkoutPlanOutput) : null, 
            isAdmin: typeof rawData.isAdmin === 'boolean' ? rawData.isAdmin : false,
            isPremium: typeof rawData.isPremium === 'boolean' ? rawData.isPremium : false,

            // --- THE FIX ---
            // We are now telling our central data manager to look for and include
            // our new streak data in the user's profile.
            currentStreak: typeof rawData.currentStreak === 'number' ? rawData.currentStreak : 0,
            lastLogDate: convertTimestamp(rawData.lastLogDate),
          };

          handleSetUserProfile(processedProfile);

        } else {
          handleSetUserProfile(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("[AuthContext] Profile listener: Error fetching user profile:", error);
        handleSetUserProfile(null);
        setLoading(false);
      });
    } else { 
      handleSetUserProfile(null);
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }
      if (authCheckCompleted) { 
        setLoading(false);
      }
    }
    return () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authCheckCompleted]); 


  const contextValue = { user, userProfile, loading, authCheckCompleted, isAdmin, isPremium, setUserProfile: handleSetUserProfile };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
