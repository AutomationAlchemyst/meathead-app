import Stripe from 'stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminDb, admin } from '@/lib/firebaseAdmin';

// Event Handlers
import { handleCheckoutSessionCompleted } from './handlers/checkoutCompletedHandler';
import { handleSubscriptionUpdated } from './handlers/subscriptionUpdatedHandler';
import { handleSubscriptionDeleted } from './handlers/subscriptionDeletedHandler';
import { handleInvoicePaid } from './handlers/invoicePaidHandler';
import { handleInvoiceFailed } from './handlers/invoiceFailedHandler';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  console.error("[API /stripe-webhook] CRITICAL ERROR: STRIPE_SECRET_KEY is not set.");
}
if (!webhookSecret) {
  console.error("[API /stripe-webhook] CRITICAL ERROR: STRIPE_WEBHOOK_SECRET is not set.");
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : undefined;

async function resolveFirebaseUserId(event: Stripe.Event): Promise<string | null> {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    return session.metadata?.firebaseUserId || session.client_reference_id || null;
  }

  let stripeCustomerId: string | null = null;
  let metadataUserId: string | null = null;

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    metadataUserId = subscription.metadata?.firebaseUserId || null;
    stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : null;
  } else if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    metadataUserId = invoice.metadata?.firebaseUserId || null;
    stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : null;
  }

  if (metadataUserId) {
    return metadataUserId;
  }

  if (stripeCustomerId && adminDb) {
    const usersRef = adminDb.collection('users');
    const querySnapshot = await usersRef.where('stripeCustomerId', '==', stripeCustomerId).limit(1).get();
    if (!querySnapshot.empty) {
      const foundId = querySnapshot.docs[0].id;
      console.log(`[API /stripe-webhook] Found user ${foundId} by stripeCustomerId ${stripeCustomerId}`);
      return foundId;
    }
  }

  return null;
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
    console.error('[API /stripe-webhook] Error: Firebase Admin SDK Firestore instance not available.');
    return NextResponse.json({ error: 'Server database configuration error.' }, { status: 500 });
  }

  const rawBody = await req.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature');

  if (!sig) {
    console.error('[API /stripe-webhook] Error: Missing stripe-signature header.');
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log('[API /stripe-webhook] Stripe event constructed successfully:', event.type, 'ID:', event.id);
  } catch (err: any) {
    console.error('[API /stripe-webhook] Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const eventRef = adminDb.collection('stripeEvents').doc(event.id);

  // 1. Resolve firebaseUserId outside the transaction (Firestore transactions cannot run collection queries)
  let firebaseUserId: string | null = null;
  try {
    firebaseUserId = await resolveFirebaseUserId(event);
  } catch (resolveErr: any) {
    console.error('[API /stripe-webhook] Error resolving firebaseUserId:', resolveErr.message);
  }

  if (!firebaseUserId) {
    const errorMsg = `Could not determine firebaseUserId for event type ${event.type}`;
    console.error(`[API /stripe-webhook] ${errorMsg}`);
    try {
      await eventRef.set({
        type: event.type,
        status: 'failed',
        lastError: errorMsg,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        attemptCount: 1,
      }, { merge: true });
    } catch (dbErr: any) {
      console.error('[API /stripe-webhook] Failed to write failed event status to database:', dbErr.message);
    }
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const userDocRef = adminDb.collection('users').doc(firebaseUserId);

  // 2. Execute user updates and idempotency in a single atomic transaction
  let txResult;
  try {
    txResult = await adminDb.runTransaction(async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      let attemptCount = 1;

      if (eventDoc.exists) {
        const data = eventDoc.data();
        if (data?.status === 'completed') {
          console.log(`[API /stripe-webhook] Event ID ${event.id} already completed. Skipping.`);
          return { skipped: true, reason: 'completed' };
        }
        if (data?.status === 'processing') {
          const processingStartedAt = data.processingStartedAt;
          const startedTime = processingStartedAt
            ? (typeof processingStartedAt.toDate === 'function' ? processingStartedAt.toDate().getTime() : new Date(processingStartedAt).getTime())
            : 0;
          const nowTime = Date.now();
          // Timeout/Recovery window: 5 minutes (300,000 ms)
          if (nowTime - startedTime < 5 * 60 * 1000) {
            console.log(`[API /stripe-webhook] Event ID ${event.id} is currently processing (started ${nowTime - startedTime}ms ago). Throttling/skipping.`);
            return { skipped: true, reason: 'processing' };
          }
          console.log(`[API /stripe-webhook] Event ID ${event.id} was stuck in processing. Retrying/recovering.`);
        }
        attemptCount = (data?.attemptCount || 0) + 1;
      }

      // Mark event as processing inside transaction
      transaction.set(eventRef, {
        type: event.type,
        status: 'processing',
        processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        attemptCount,
        lastError: null,
      }, { merge: true });

      // Dispatch event to modular handlers inside the transaction (passing transaction & userDocRef)
      switch (event.type) {
        case 'checkout.session.completed':
          handleCheckoutSessionCompleted(transaction, userDocRef, event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.updated':
          handleSubscriptionUpdated(transaction, userDocRef, event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          handleSubscriptionDeleted(transaction, userDocRef, event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          handleInvoicePaid(transaction, userDocRef, event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          handleInvoiceFailed(transaction, userDocRef, event.data.object as Stripe.Invoice);
          break;

        default:
          console.warn(`[API /stripe-webhook] Unhandled event type inside transaction: ${event.type}`);
      }

      // Mark event as completed inside the transaction
      transaction.update(eventRef, {
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { skipped: false };
    });
  } catch (txError: any) {
    console.error(`[API /stripe-webhook] Transaction failed for event ${event.id}:`, txError.message);

    // Rollback happened automatically. Write failure log outside transaction.
    try {
      await eventRef.set({
        type: event.type,
        status: 'failed',
        lastError: txError.message || String(txError),
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (writeErr: any) {
      console.error('[API /stripe-webhook] Failed to log failure in database:', writeErr.message);
    }

    return NextResponse.json({ error: `Transaction failed: ${txError.message}` }, { status: 500 });
  }

  if (txResult.skipped) {
    return NextResponse.json({ received: true, skipped: true, reason: txResult.reason });
  }

  return NextResponse.json({ received: true });
}
