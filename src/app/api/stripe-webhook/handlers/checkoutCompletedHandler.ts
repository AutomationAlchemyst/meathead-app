import Stripe from 'stripe';
import { adminDb, admin } from '@/lib/firebaseAdmin';

export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const firebaseUserId = session.metadata?.firebaseUserId || session.client_reference_id;

  if (!firebaseUserId) {
    throw new Error('firebaseUserId not found in session metadata or client_reference_id.');
  }

  console.log(`[Webhook Handler] Processing checkout.session.completed for user ${firebaseUserId}`);

  const userDocRef = adminDb.collection('users').doc(firebaseUserId);
  await userDocRef.update({
    isPremium: true,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    premiumSubscriptionStatus: 'active',
    subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[Webhook Handler] User ${firebaseUserId} successfully upgraded to premium.`);
}
