import Stripe from 'stripe';
import { admin } from '@/lib/firebaseAdmin';

export function handleSubscriptionDeleted(
  transaction: admin.firestore.Transaction,
  userDocRef: admin.firestore.DocumentReference,
  subscription: Stripe.Subscription
) {
  console.log(`[Webhook Handler] Processing subscription deletion for user ${userDocRef.id}`);

  transaction.update(userDocRef, {
    isPremium: false,
    premiumSubscriptionStatus: 'canceled',
    subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[Webhook Handler] User ${userDocRef.id} premium access removed due to subscription deletion inside transaction.`);
}
