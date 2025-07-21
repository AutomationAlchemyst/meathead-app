
// /src/app/api/stripe-webhook/route.ts
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import admin from 'firebase-admin'; // Import Firebase Admin SDK
import type { ServiceAccount } from 'firebase-admin'; // Import ServiceAccount type

// Ensure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are loaded from .env
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  console.error("[API /stripe-webhook] CRITICAL ERROR: STRIPE_SECRET_KEY is not set.");
}
if (!webhookSecret) {
  console.error("[API /stripe-webhook] CRITICAL ERROR: STRIPE_WEBHOOK_SECRET is not set.");
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : undefined;

// Initialize Firebase Admin SDK
const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_STRING;
let adminDb: admin.firestore.Firestore;

if (serviceAccountJsonString) {
  try {
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJsonString);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[API /stripe-webhook] Firebase Admin SDK initialized successfully.');
    } else {
      console.log('[API /stripe-webhook] Firebase Admin SDK already initialized.');
    }
    adminDb = admin.firestore();
  } catch (e: any) {
    console.error('[API /stripe-webhook] Error initializing Firebase Admin SDK:', e.message);
    console.error('[API /stripe-webhook] Check if FIREBASE_SERVICE_ACCOUNT_JSON_STRING is a valid JSON string.');
  }
} else {
  console.error("[API /stripe-webhook] CRITICAL ERROR: FIREBASE_SERVICE_ACCOUNT_JSON_STRING is not set. Firestore updates will fail.");
}


// Helper function to read the request body as a buffer (Stripe requires this for signature verification)
async function buffer(readable: ReadableStream<Uint8Array>) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: Request) {
  console.log('[API /stripe-webhook] Received POST request.');

  if (!stripe) {
    console.error('[API /stripe-webhook] Error: Stripe SDK not initialized. STRIPE_SECRET_KEY might be missing.');
    return NextResponse.json({ error: 'Stripe configuration error on server.' }, { status: 500 });
  }
  if (!webhookSecret) {
    console.error('[API /stripe-webhook] Error: Stripe webhook secret is not configured on server.');
    return NextResponse.json({ error: 'Stripe webhook secret not configured on server.' }, { status: 500 });
  }
  if (!adminDb) {
    console.error('[API /stripe-webhook] Error: Firebase Admin SDK Firestore instance not available. Updates will fail.');
    return NextResponse.json({ error: 'Server database configuration error.' }, { status: 500 });
  }

  const buf = await buffer(req.body!);
  const sig = headers().get('stripe-signature');

  if (!sig) {
    console.error('[API /stripe-webhook] Error: Missing stripe-signature header.');
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf.toString(), sig, webhookSecret);
    console.log('[API /stripe-webhook] Stripe event constructed successfully:', event.type, 'ID:', event.id);
  } catch (err: any) {
    console.error('[API /stripe-webhook] Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('[API /stripe-webhook] Checkout session completed. Session ID:', session.id);
      
      // Metadata should contain firebaseUserId.
      // client_reference_id is also available if you set it during session creation.
      const firebaseUserId = session.metadata?.firebaseUserId || session.client_reference_id;

      if (firebaseUserId) {
        console.log(`[API /stripe-webhook] Updating Firestore for user ID: ${firebaseUserId}. Stripe Customer ID: ${session.customer}, Stripe Subscription ID: ${session.subscription}`);
        const userDocRef = adminDb.collection('users').doc(firebaseUserId);
        try {
          await userDocRef.update({
            isPremium: true,
            stripeCustomerId: session.customer, 
            stripeSubscriptionId: session.subscription, 
            premiumSubscriptionStatus: 'active', // Or derive status from the subscription object
            subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`[API /stripe-webhook] User ${firebaseUserId} successfully marked as premium.`);
        } catch (firestoreError: any) {
          console.error(`[API /stripe-webhook] Firestore update error for user ${firebaseUserId}:`, firestoreError);
          // Consider retry mechanisms or logging for manual intervention
          return NextResponse.json({ error: `Firestore update failed: ${firestoreError.message}` }, { status: 500 });
        }
      } else {
        console.error('[API /stripe-webhook] Error: firebaseUserId not found in session metadata or client_reference_id. Session ID:', session.id);
        // This is a critical issue, as you can't link the payment to a user.
        return NextResponse.json({ error: 'User ID not found in Stripe session.' }, { status: 400 });
      }
      break;

    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object as Stripe.Subscription;
      console.log(`[API /stripe-webhook] Subscription updated. ID: ${updatedSubscription.id}, Status: ${updatedSubscription.status}`);
      // Attempt to get firebaseUserId from subscription metadata (best practice)
      // Or, you might need to query your users collection by stripeCustomerId if metadata isn't on the subscription.
      let updatedSubFirebaseUserId = updatedSubscription.metadata?.firebaseUserId;

      if (!updatedSubFirebaseUserId && typeof updatedSubscription.customer === 'string') {
        // Fallback: Query users collection by stripeCustomerId
        try {
            const usersRef = adminDb.collection('users');
            const querySnapshot = await usersRef.where('stripeCustomerId', '==', updatedSubscription.customer).limit(1).get();
            if (!querySnapshot.empty) {
                updatedSubFirebaseUserId = querySnapshot.docs[0].id;
                console.log(`[API /stripe-webhook] Found user ${updatedSubFirebaseUserId} by stripeCustomerId ${updatedSubscription.customer}`);
            } else {
                console.warn(`[API /stripe-webhook] No user found with stripeCustomerId ${updatedSubscription.customer} for subscription update.`);
            }
        } catch (lookupError: any) {
            console.error(`[API /stripe-webhook] Error looking up user by stripeCustomerId ${updatedSubscription.customer}:`, lookupError);
        }
      }


      if (updatedSubFirebaseUserId) {
        const newPremiumStatus = updatedSubscription.status === 'active' || updatedSubscription.status === 'trialing';
        const userDocRefForUpdate = adminDb.collection('users').doc(updatedSubFirebaseUserId);
         try {
           await userDocRefForUpdate.update({
             isPremium: newPremiumStatus,
             premiumSubscriptionStatus: updatedSubscription.status,
             stripeSubscriptionId: updatedSubscription.id, 
             subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
           });
           console.log(`[API /stripe-webhook] User ${updatedSubFirebaseUserId} premium status updated to ${newPremiumStatus} based on subscription ${updatedSubscription.id} status ${updatedSubscription.status}.`);
         } catch (firestoreError: any) {
            console.error(`[API /stripe-webhook] Firestore update error for user ${updatedSubFirebaseUserId} on subscription update:`, firestoreError);
         }
      } else {
         console.warn(`[API /stripe-webhook] Could not determine firebaseUserId for subscription ${updatedSubscription.id}. Cannot update Firestore.`);
      }
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription;
      console.log(`[API /stripe-webhook] Subscription deleted. ID: ${deletedSubscription.id}`);
      let deletedSubFirebaseUserId = deletedSubscription.metadata?.firebaseUserId;

      if (!deletedSubFirebaseUserId && typeof deletedSubscription.customer === 'string') {
        try {
            const usersRef = adminDb.collection('users');
            const querySnapshot = await usersRef.where('stripeCustomerId', '==', deletedSubscription.customer).limit(1).get();
            if (!querySnapshot.empty) {
                deletedSubFirebaseUserId = querySnapshot.docs[0].id;
            }
        } catch (lookupError: any) {
            console.error(`[API /stripe-webhook] Error looking up user by stripeCustomerId for deleted subscription:`, lookupError);
        }
      }

      if (deletedSubFirebaseUserId) {
        const userDocRefForDelete = adminDb.collection('users').doc(deletedSubFirebaseUserId);
         try {
           await userDocRefForDelete.update({
             isPremium: false,
             premiumSubscriptionStatus: 'canceled', 
             subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
           });
           console.log(`[API /stripe-webhook] User ${deletedSubFirebaseUserId} premium status set to false due to subscription deletion.`);
         } catch (firestoreError: any) {
            console.error(`[API /stripe-webhook] Firestore update error for user ${deletedSubFirebaseUserId} on subscription deletion:`, firestoreError);
         }
      } else {
         console.warn(`[API /stripe-webhook] Could not determine firebaseUserId for deleted subscription ${deletedSubscription.id}. Cannot update Firestore.`);
      }
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice;
      console.log('[API /stripe-webhook] Invoice payment succeeded for subscription:', invoice.subscription, 'Customer:', invoice.customer);
      // This event is often used for recurring subscription payments.
      // You might update subscription status or renewal dates here if needed.
      // The `checkout.session.completed` handles the initial upgrade.
      if (invoice.subscription && invoice.customer) {
        // Similar to subscription.updated, you might need to find the user by customerId or subscriptionId
        // and ensure their `premiumSubscriptionStatus` is 'active' and `subscriptionUpdatedAt` is current.
        let invoiceUserFirebaseId = invoice.metadata?.firebaseUserId; // if passed during checkout
        if (!invoiceUserFirebaseId && typeof invoice.customer === 'string') {
            try {
                const usersRef = adminDb.collection('users');
                const querySnapshot = await usersRef.where('stripeCustomerId', '==', invoice.customer).limit(1).get();
                if (!querySnapshot.empty) {
                    invoiceUserFirebaseId = querySnapshot.docs[0].id;
                    const userDocRef = adminDb.collection('users').doc(invoiceUserFirebaseId);
                    await userDocRef.update({
                        premiumSubscriptionStatus: 'active', // Ensure active on renewal
                        subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    console.log(`[API /stripe-webhook] User ${invoiceUserFirebaseId} subscription confirmed active on invoice payment.`);
                }
            } catch (lookupError: any) {
                console.error(`[API /stripe-webhook] Error processing invoice.payment_succeeded for customer ${invoice.customer}:`, lookupError);
            }
        } else if (invoiceUserFirebaseId) {
            // If firebaseUserId was available directly (e.g., from invoice metadata if Stripe supports it this way)
            const userDocRef = adminDb.collection('users').doc(invoiceUserFirebaseId);
             await userDocRef.update({
                premiumSubscriptionStatus: 'active',
                subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`[API /stripe-webhook] User ${invoiceUserFirebaseId} subscription confirmed active via invoice metadata.`);
        }

      }
      break;

    default:
      console.warn(`[API /stripe-webhook] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
