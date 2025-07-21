
'use server';

import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore'; // Added Timestamp
import type { UserProfile } from '@/types';
import { z } from 'zod';

// LoginSchema is no longer used by client-side LoginForm if signInWithEmailAndPassword is called directly
// const LoginSchema = z.object({
//   email: z.string().email(),
//   password: z.string().min(6),
// });

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2).optional(),
});

// loginUser server action is no longer called by LoginForm for standard email/password login.
// It's kept here in case it's needed for other server-side auth logic in the future.
// If not, it can be removed.
export async function loginUser(formData: FormData) {
  console.log('[Server Action - loginUser] THIS ACTION IS NO LONGER THE PRIMARY LOGIN METHOD FOR UI.');
  // This function is now effectively bypassed by client-side login in LoginForm.tsx
  // Consider removing if not used elsewhere or for specific server-side scenarios.
  // For now, we'll keep its old logic but it won't be hit by the standard login form.
  // const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
  // try {
  //   const parsedData = LoginSchema.safeParse(Object.fromEntries(formData));
  //   if (!parsedData.success) {
  //     console.error('[Server Action - loginUser] Validation failed:', parsedData.error.flatten().fieldErrors);
  //     return { error: parsedData.error.flatten().fieldErrors };
  //   }
  //   const { email, password } = parsedData.data;
  //   console.log('[Server Action - loginUser] Calling signInWithEmailAndPassword for email:', email);
  //   const userCredential = await signInWithEmailAndPassword(auth, email, password);
  //   console.log('[Server Action - loginUser] signInWithEmailAndPassword successful for email:', email, 'UID:', userCredential.user.uid);
  //   return { success: true };
  // } catch (error: any) {
  //   console.error('[Server Action - loginUser] Error during login:', error.code, error.message);
  //   return { error: error.message };
  // }
  return { error: "This server action for login is not actively used by the UI form." };
}

export async function registerUser(formData: FormData) {
  try {
    const parsedData = RegisterSchema.safeParse(Object.fromEntries(formData));
     if (!parsedData.success) {
      return { error: parsedData.error.flatten().fieldErrors };
    }
    const { email, password, displayName } = parsedData.data;
    
    console.log('[Server Action - registerUser] Attempting to create user for email:', email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('[Server Action - registerUser] User created successfully. UID:', user.uid);

    const newUserProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: displayName || user.displayName || email.split('@')[0] || null,
      createdAt: serverTimestamp() as Timestamp, // Cast to Timestamp for type consistency
      currentWeight: null,
      targetWeight: null,
      activityLevel: null,
      startingWeight: null,
      journeyStartDate: null,
      targetCalories: null,
      targetProtein: null,
      targetCarbs: 20, // Default Keto carbs
      targetFat: null,
      targetWaterIntake: null,
      estimatedGoalDate: null,
      updatedAt: serverTimestamp() as Timestamp,
      isAdmin: false, // Initialize isAdmin to false
      isPremium: false, // Initialize isPremium to false
    };
    console.log('[Server Action - registerUser] User profile to be created in Firestore:', JSON.stringify(newUserProfile, null, 2));
    await setDoc(doc(db, 'users', user.uid), newUserProfile);
    console.log('[Server Action - registerUser] User profile created in Firestore for UID:', user.uid);
    
    return { success: true, uid: user.uid }; // Return UID for potential client-side use
  } catch (error: any) {
    let errorMessage = "Failed to register user.";
    if (error.code && typeof error.message === 'string') {
        errorMessage = `Firebase Error (${error.code}): ${error.message}`;
    } else if (typeof error.message === 'string') {
        errorMessage = error.message;
    }
    console.error("[Server Action - registerUser] Registration Error:", error);
    return { error: errorMessage };
  }
}

export async function getCurrentUserServer() {
  // This is a placeholder. True server-side auth state needs Firebase Admin SDK or session cookies.
  // For client-driven apps with Firebase client SDK, auth state is managed on the client.
  // This function could be adapted if using NextAuth.js with Firebase adapter.
  if (auth.currentUser) { // Note: auth.currentUser is often null in server actions without specific setup
    console.log('[Server Action - getCurrentUserServer] auth.currentUser exists. UID:', auth.currentUser.uid);
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      console.log('[Server Action - getCurrentUserServer] User profile found for UID:', auth.currentUser.uid);
      return userDocSnap.data() as UserProfile;
    } else {
      console.log('[Server Action - getCurrentUserServer] User profile NOT found for UID:', auth.currentUser.uid);
    }
  } else {
    console.log('[Server Action - getCurrentUserServer] auth.currentUser is null.');
  }
  return null;
}
    
