import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already done
const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_STRING;

if (serviceAccountJsonString && !admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(serviceAccountJsonString);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e: any) {
    console.error('[API /admin/feedback-sheet] Error initializing Firebase Admin SDK:', e.message);
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  // Support both private and public env vars so it doesn't break immediately
  const sheetId = process.env.GOOGLE_SHEET_ID || process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID;

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }

  if (!sheetId) {
    return NextResponse.json({ error: 'Google Sheet ID not configured' }, { status: 500 });
  }

  try {
    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Check if the user is an admin
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists || userDoc.data()?.isAdmin !== true) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Redirect to the Google Sheet
    return NextResponse.redirect(`https://docs.google.com/spreadsheets/d/${sheetId}`);
  } catch (error) {
    console.error('Error verifying token or fetching user:', error);
    return NextResponse.json({ error: 'Invalid token or unauthorized' }, { status: 401 });
  }
}
