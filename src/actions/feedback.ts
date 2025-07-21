
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
): Promise<{ success?: boolean; error?: string | z.ZodError['formErrors'] }> {
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
        submittedAt: new Date() 
    };

    appendFeedbackToSheet(feedbackForSheet)
      .then(sheetResult => {
        if (!sheetResult.success) {
          console.warn("Failed to append feedback to Google Sheet:", sheetResult.error);
        } else {
          console.log("Feedback also appended to Google Sheet.");
        }
      })
      .catch(sheetError => {
        console.error("Unexpected error during Google Sheet append operation:", sheetError);
      });

    return { success: true };
  } catch (error: any) {
    console.error("Error submitting feedback to Firestore:", error);
    return { error: error.message || "Failed to submit feedback." };
  }
}

// getFeedbackSubmissions function has been removed as it's no longer used by the feedback page.
// Admins will now directly access the Google Sheet.
