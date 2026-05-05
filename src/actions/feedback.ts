
'use server';

import { db } from '@/lib/firebase'; 
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'; // Removed getDocs, query, orderBy, doc, getDoc
import { FeedbackSubmissionServerSchema } from '@/types';
import type { FeedbackSubmission, UserProfile } from '@/types'; // Removed FeedbackSubmissionPlain
import type { z } from 'zod'; 
import { appendFeedbackToSheet } from '@/lib/googleSheetsService';

export async function submitFeedback(
  userId: string,
  userDisplayName: string | null,
  userEmail: string | null,
  rating: string,
  comments: string
): Promise<{ success?: boolean; error?: any }> {
  if (!userId) {
    return { error: "User not authenticated." };
  }

  const parsedData = FeedbackSubmissionServerSchema.safeParse({
    userId,
    userDisplayName,
    userEmail,
    rating,
    comments,
  });

  if (!parsedData.success) {
    console.error("Feedback submission validation error:", parsedData.error.flatten().fieldErrors);
    return { error: parsedData.error.flatten().fieldErrors };
  }

  try {
    const feedbackDataForFirestore: Omit<FeedbackSubmission, 'id' | 'submittedAt'> & { submittedAt: any } = {
      userId: parsedData.data.userId,
      userDisplayName: parsedData.data.userDisplayName,
      userEmail: parsedData.data.userEmail,
      rating: parsedData.data.rating,
      comments: parsedData.data.comments,
      submittedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'feedbackSubmissions'), feedbackDataForFirestore);
    console.log("Feedback saved to Firestore with ID:", docRef.id);

    const feedbackForSheet: FeedbackSubmission = {
        id: docRef.id,
        userId: parsedData.data.userId,
        userDisplayName: parsedData.data.userDisplayName,
        userEmail: parsedData.data.userEmail,
        rating: parsedData.data.rating,
        comments: parsedData.data.comments,
        submittedAt: Timestamp.now() as any
    };

    try {
      const sheetResult = await appendFeedbackToSheet(feedbackForSheet);
      if (!sheetResult.success) {
        console.warn("Failed to append feedback to Google Sheet:", sheetResult.error);
        return { error: "Feedback saved but failed to update Google Sheet. Please try again." };
      }
      console.log("Feedback also appended to Google Sheet.");
      return { success: true };
    } catch (sheetError) {
      console.error("Unexpected error during Google Sheet append operation:", sheetError);
      return { error: "Failed to update Google Sheet." };
    }
  } catch (error: any) {
    console.error("Error submitting feedback to Firestore:", error);
    return { error: error.message || "Failed to submit feedback." };
  }
}

// Admins will now access the Google Sheet via a secure API route.
