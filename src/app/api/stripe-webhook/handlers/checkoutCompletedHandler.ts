import Stripe from 'stripe';
import { admin } from '@/lib/firebaseAdmin';

export function handleCheckoutSessionCompleted(
  transaction: admin.firestore.Transaction,
  userDocRef: admin.firestore.DocumentReference,
  session: Stripe.Checkout.Session
) {
  console.log(`[Webhook Handler] Processing checkout.session.completed for user ${userDocRef.id}`);

  transaction.update(userDocRef, {
    isPremium: true,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    premiumSubscriptionStatus: 'active',
    subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[Webhook Handler] User ${userDocRef.id} successfully updated to premium inside transaction.`);
}
