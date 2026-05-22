import Stripe from 'stripe';
import { adminDb, admin } from '@/lib/firebaseAdmin';

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  let firebaseUserId = subscription.metadata?.firebaseUserId;

  if (!firebaseUserId && typeof subscription.customer === 'string') {
    // Fallback: Query users collection by stripeCustomerId
    const usersRef = adminDb.collection('users');
    const querySnapshot = await usersRef.where('stripeCustomerId', '==', subscription.customer).limit(1).get();
    if (!querySnapshot.empty) {
      firebaseUserId = querySnapshot.docs[0].id;
      console.log(`[Webhook Handler] Found user ${firebaseUserId} by stripeCustomerId ${subscription.customer}`);
    }
  }

  if (!firebaseUserId) {
    throw new Error(`Could not determine firebaseUserId for subscription ${subscription.id}`);
  }

  const isPremium = subscription.status === 'active' || subscription.status === 'trialing';
  console.log(`[Webhook Handler] Updating subscription for user ${firebaseUserId} to status: ${subscription.status} (isPremium: ${isPremium})`);

  const userDocRef = adminDb.collection('users').doc(firebaseUserId);
  await userDocRef.update({
    isPremium,
    premiumSubscriptionStatus: subscription.status,
    stripeSubscriptionId: subscription.id,
    subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[Webhook Handler] User ${firebaseUserId} subscription updated successfully.`);
}
