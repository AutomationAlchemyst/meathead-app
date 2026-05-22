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

  // 1. Transactional Idempotency Check
  let shouldProcess = false;
  try {
    shouldProcess = await adminDb.runTransaction(async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (eventDoc.exists) {
        const data = eventDoc.data();
        if (data?.status === 'completed' || data?.status === 'processing') {
          console.log(`[API /stripe-webhook] Event ID ${event.id} already has status: ${data.status}. Skipping processing.`);
          return false;
        }
      }
      // Set status to processing transactionally
      transaction.set(eventRef, {
        type: event.type,
        status: 'processing',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    });
  } catch (txError: any) {
    console.error(`[API /stripe-webhook] Transaction error checking idempotency for event ${event.id}:`, txError.message);
    return NextResponse.json({ error: 'Database transaction failed check' }, { status: 500 });
  }

  if (!shouldProcess) {
    return NextResponse.json({ received: true, skipped: true });
  }

  // 2. Dispatch event to handler
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.warn(`[API /stripe-webhook] Unhandled event type: ${event.type}`);
    }

    // 3. Mark event as completed on success
    await eventRef.update({
      status: 'completed',
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  } catch (err: any) {
    console.error(`[API /stripe-webhook] Error processing event ${event.id} (${event.type}):`, err.message);

    // Mark event as failed on error
    await eventRef.update({
      status: 'failed',
      lastError: err.message || String(err),
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ error: `Handler failed: ${err.message}` }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
