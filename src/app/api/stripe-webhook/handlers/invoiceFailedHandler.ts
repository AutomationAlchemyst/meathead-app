import Stripe from 'stripe';
import { adminDb, admin } from '@/lib/firebaseAdmin';

export async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  let firebaseUserId = invoice.metadata?.firebaseUserId;

  if (!firebaseUserId && typeof invoice.customer === 'string') {
    // Fallback: Query users collection by stripeCustomerId
    const usersRef = adminDb.collection('users');
    const querySnapshot = await usersRef.where('stripeCustomerId', '==', invoice.customer).limit(1).get();
    if (!querySnapshot.empty) {
      firebaseUserId = querySnapshot.docs[0].id;
      console.log(`[Webhook Handler] Found user ${firebaseUserId} by stripeCustomerId ${invoice.customer}`);
    }
  }

  if (!firebaseUserId) {
    throw new Error(`Could not determine firebaseUserId for failed invoice ${invoice.id}`);
  }

  console.log(`[Webhook Handler] Processing failed invoice payment for user ${firebaseUserId}`);

  const userDocRef = adminDb.collection('users').doc(firebaseUserId);
  await userDocRef.update({
    isPremium: false,
    premiumSubscriptionStatus: 'past_due',
    subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[Webhook Handler] User ${firebaseUserId} payment failed, status set to past_due.`);
}
