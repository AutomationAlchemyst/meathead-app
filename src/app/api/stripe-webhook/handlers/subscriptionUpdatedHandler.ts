import Stripe from 'stripe';
import { admin } from '@/lib/firebaseAdmin';

export function handleSubscriptionUpdated(
  transaction: admin.firestore.Transaction,
  userDocRef: admin.firestore.DocumentReference,
  subscription: Stripe.Subscription
) {
  const isPremium = subscription.status === 'active' || subscription.status === 'trialing';
  console.log(`[Webhook Handler] Updating subscription for user ${userDocRef.id} to status: ${subscription.status} (isPremium: ${isPremium})`);

  transaction.update(userDocRef, {
    isPremium,
    premiumSubscriptionStatus: subscription.status,
    stripeSubscriptionId: subscription.id,
    subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[Webhook Handler] User ${userDocRef.id} subscription updated successfully inside transaction.`);
}
