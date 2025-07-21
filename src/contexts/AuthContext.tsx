
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
  isPremium: boolean; // Added for premium status
  setUserProfile: (profile: UserProfile | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  authCheckCompleted: false,
  isAdmin: false,
  isPremium: false, // Default to false
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
  const [isPremium, setIsPremiumState] = useState(false); // State for premium status

  const setUser = (newUser: FirebaseUser | null) => {
    console.log('[AuthContext] setUser called. New user UID:', newUser?.uid);
    setUserState(newUser);
  };

  const handleSetUserProfile = (newProfile: UserProfile | null) => {
    console.log('[AuthContext] handleSetUserProfile called. Full new profile being set to state:', JSON.stringify(newProfile, (key, value) => {
      if (value instanceof Timestamp) return `Timestamp(${value.toDate().toISOString()})`;
      if (key === 'activeWorkoutPlan' && value) return `WorkoutPlan(${ (value as GenerateWorkoutPlanOutput).planName })`; 
      return value;
    }, 2));
    setUserProfileState(newProfile ? { ...newProfile } : null);
    setIsAdminState(newProfile?.isAdmin ?? false);
    setIsPremiumState(newProfile?.isPremium ?? false); // Update isPremium state
  };
  
  const setLoading = (newLoading: boolean) => {
    console.log('[AuthContext] setLoading called. New loading state:', newLoading);
    setLoadingState(newLoading);
  }

  const setAuthCheckCompleted = (newAuthCheckCompleted: boolean) => {
    console.log('[AuthContext] setAuthCheckCompleted called. New authCheckCompleted state:', newAuthCheckCompleted);
    setAuthCheckCompletedState(newAuthCheckCompleted);
  }


  useEffect(() => {
    console.log('[AuthContext] useEffect: Setting up onAuthStateChanged listener.');
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AuthContext] onAuthStateChanged: Triggered. Firebase user UID:', firebaseUser?.uid || 'null');

      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setUser(null);
        handleSetUserProfile(null); 
      }
      
      console.log(`[AuthContext] onAuthStateChanged: User state set. UID: ${firebaseUser?.uid}. AuthCheckCompleted (before update): ${authCheckCompleted}`);
      if (!authCheckCompleted) {
        setAuthCheckCompleted(true);
        console.log(`[AuthContext] onAuthStateChanged: AuthCheckCompleted set to true.`);
      }
    });

    return () => {
      console.log('[AuthContext] useEffect: Cleaning up onAuthStateChanged listener.');
      unsubscribeAuth();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    if (user) {
      console.log(`[AuthContext] User changed or detected (UID: ${user.uid}). Setting up profile listener. Current loading state (before setting true): ${loading}. AuthCheckCompleted: ${authCheckCompleted}`);
      setLoading(true); 
      
      const userDocRef = doc(db, 'users', user.uid);
      console.log(`[AuthContext] Subscribing to snapshot for users/${user.uid}`);
      
      unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
        console.log(`[AuthContext] Firestore snapshot received for users/${user.uid}. Exists: ${docSnap.exists()}`);
        const rawData = docSnap.data();
        const loggableRawData = {...rawData};
        if (loggableRawData.activeWorkoutPlan) {
            loggableRawData.activeWorkoutPlan = `WorkoutPlan(${loggableRawData.activeWorkoutPlan.planName || 'Unnamed Plan'})`;
        }
        console.log(`[AuthContext] Raw data from snapshot for users/${user.uid}:`, JSON.stringify(loggableRawData, (key, value) => value instanceof Timestamp ? `Timestamp(${value.toDate().toISOString()})` : value, 2));


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
            isPremium: typeof rawData.isPremium === 'boolean' ? rawData.isPremium : false, // Process isPremium
          };

          handleSetUserProfile(processedProfile);
          console.log(`[AuthContext] Profile listener: Profile processed and set for UID: ${user.uid}. isAdmin: ${processedProfile.isAdmin}, isPremium: ${processedProfile.isPremium}`);

        } else {
          handleSetUserProfile(null);
          if (!docSnap.exists()) {
            console.warn(`[AuthContext] Profile listener: User profile document NOT FOUND in Firestore for authed user UID: ${user.uid}.`);
          } else { 
            console.warn(`[AuthContext] Profile listener: User profile document exists for UID ${user.uid}, but rawData is unexpectedly falsy.`);
          }
        }
        console.log(`[AuthContext] Profile listener: Setting loading to false. User UID: ${user.uid}`);
        setLoading(false);
      }, (error) => {
        console.error("[AuthContext] Profile listener: Error fetching user profile:", error);
        handleSetUserProfile(null);
        setLoading(false);
      });
    } else { 
      console.log('[AuthContext] No user. Clearing profile and setting loading to false (if auth check completed). Tearing down listener if active.');
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
        console.log('[AuthContext] Cleaning up profile listener.');
        unsubscribeProfile();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authCheckCompleted]); 


  const contextValue = { user, userProfile, loading, authCheckCompleted, isAdmin, isPremium, setUserProfile: handleSetUserProfile };
   console.log('[AuthContext] PROVIDING VALUE:', {
    userId: user?.uid || 'undefined',
    loading,
    authCheckCompleted,
    isAdmin: isAdmin,
    isPremium: isPremium,
    profileExists: !!userProfile,
    profileCurrentWeight: userProfile?.currentWeight,
    profileTargetCalories: userProfile?.targetCalories,
    profileTargetProtein: userProfile?.targetProtein,
    profileTargetCarbs: userProfile?.targetCarbs,
    profileTargetFat: userProfile?.targetFat,
    profileTargetWater: userProfile?.targetWaterIntake, 
    activeWorkoutPlanName: userProfile?.activeWorkoutPlan?.planName,
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
    