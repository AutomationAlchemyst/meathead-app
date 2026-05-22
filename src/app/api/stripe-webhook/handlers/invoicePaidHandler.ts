import Stripe from 'stripe';
import { admin } from '@/lib/firebaseAdmin';

export function handleInvoicePaid(
  transaction: admin.firestore.Transaction,
  userDocRef: admin.firestore.DocumentReference,
  invoice: Stripe.Invoice
) {
  console.log(`[Webhook Handler] Processing successful invoice payment for user ${userDocRef.id}`);

  transaction.update(userDocRef, {
    isPremium: true,
    premiumSubscriptionStatus: 'active',
    subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[Webhook Handler] User ${userDocRef.id} subscription confirmed active on invoice payment inside transaction.`);
}
