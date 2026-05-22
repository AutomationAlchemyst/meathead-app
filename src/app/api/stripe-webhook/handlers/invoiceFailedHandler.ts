import Stripe from 'stripe';
import { admin } from '@/lib/firebaseAdmin';

export function handleInvoiceFailed(
  transaction: admin.firestore.Transaction,
  userDocRef: admin.firestore.DocumentReference,
  invoice: Stripe.Invoice
) {
  console.log(`[Webhook Handler] Processing failed invoice payment for user ${userDocRef.id}`);

  transaction.update(userDocRef, {
    isPremium: false,
    premiumSubscriptionStatus: 'past_due',
    subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[Webhook Handler] User ${userDocRef.id} payment failed, status set to past_due inside transaction.`);
}
