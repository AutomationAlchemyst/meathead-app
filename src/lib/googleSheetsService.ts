
// This service requires GOOGLE_SHEET_ID and GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON_STRING to be set in .env.local or environment variables
import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';
import type { FeedbackSubmission } from '@/types'; // Use your actual FeedbackSubmission type
import { Timestamp } from 'firebase/firestore';

// These should be set in your environment variables (.env.local for development)
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
// This should be the string content of your service account JSON key file
const SERVICE_ACCOUNT_JSON_STRING = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON_STRING;
const SHEET_NAME = 'Sheet1'; // Or your specific sheet name/tab, make this an env var too if it changes

async function getGoogleSheetsClient() {
  if (!SERVICE_ACCOUNT_JSON_STRING) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON_STRING environment variable is not set.');
  }
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID environment variable is not set.');
  }

  try {
    const credentials = JSON.parse(SERVICE_ACCOUNT_JSON_STRING);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as any });
    return sheets;
  } catch (error: any) {
    console.error('Error parsing service account credentials or initializing GoogleAuth:', error);
    throw new Error(`Failed to initialize Google Sheets client: ${error.message}`);
  }
}

export async function appendFeedbackToSheet(feedback: FeedbackSubmission) {
  if (!SPREADSHEET_ID) {
    console.error('Google Sheet ID is not configured. Skipping sheet append.');
    return { success: false, error: 'Google Sheet ID not configured.' };
  }

  try {
    const sheets = await getGoogleSheetsClient();
    
    let submittedAtString: string;
    if (feedback.submittedAt instanceof Timestamp) {
        submittedAtString = feedback.submittedAt.toDate().toISOString();
    } else if (feedback.submittedAt instanceof Date) {
        submittedAtString = feedback.submittedAt.toISOString();
    } else {
        // Fallback or handle error if timestamp is not in expected format
        submittedAtString = new Date().toISOString(); 
        console.warn("feedback.submittedAt was not a Timestamp or Date, using current time for sheet.");
    }

    const valuesToAppend = [
      [
        submittedAtString,
        feedback.rating,
        feedback.comments,
        feedback.userDisplayName || '',
        feedback.userEmail || '',
        feedback.userId,
      ],
    ];

    const request: sheets_v4.Params$Resource$Spreadsheets$Values$Append = {
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`, // Appends after the last row with data in this range/tab
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: valuesToAppend,
      },
    };

    const response = await sheets.spreadsheets.values.append(request);
    console.log('Feedback successfully appended to Google Sheet:', response.data.updates?.updatedRange);
    return { success: true };
  } catch (error: any) {
    console.error('Error appending feedback to Google Sheet:', error.message);
    // Log more details if available
    if (error.response && error.response.data) {
        console.error('Google API Error Details:', error.response.data.error);
    }
    return { success: false, error: `Failed to write to Google Sheet: ${error.message}` };
  }
}
