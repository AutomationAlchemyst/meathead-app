
// /src/app/api/create-checkout-session/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Stripe from 'stripe'; // Import Stripe

// Ensure STRIPE_SECRET_KEY is loaded from .env
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error("[API /create-checkout-session] CRITICAL ERROR: STRIPE_SECRET_KEY is not set.");
  // We won't throw here to allow the server to start, but checkout will fail.
}
// Initialize Stripe outside the handler, only if the key exists.
// If the key is missing, stripe will be undefined, and we'll return an error in POST.
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20', // Use your desired API version
}) : undefined;


export async function POST(req: NextRequest) {
  console.log("[API /create-checkout-session] Received POST request.");

  if (!stripe) {
    console.error("[API /create-checkout-session] Error: Stripe SDK not initialized. STRIPE_SECRET_KEY might be missing.");
    return NextResponse.json({ error: 'Stripe configuration error on server.' }, { status: 500 });
  }
  if (!process.env.NEXT_PUBLIC_APP_BASE_URL) {
      console.error("[API /create-checkout-session] Error: NEXT_PUBLIC_APP_BASE_URL is not set.");
      return NextResponse.json({ error: 'App base URL not configured on server.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { userId, priceId, userEmail } = body;

    console.log("[API /create-checkout-session] Request body:", { userId, priceId, userEmail });

    if (!userId) {
      console.error("[API /create-checkout-session] Error: userId is missing.");
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }
    if (!priceId) {
      console.error("[API /create-checkout-session] Error: priceId is missing. Using default monthly if available.");
      // Fallback or error - for now, let's use a placeholder if not provided, or you can make it mandatory.
      // priceId = process.env.STRIPE_PRICE_ID_MONTHLY; // Example: Fallback to monthly
      // if (!priceId) {
      //   return NextResponse.json({ error: 'Price ID is required and default not set.' }, { status: 400 });
      // }
      return NextResponse.json({ error: 'Price ID is required.' }, { status: 400 });
    }
    
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId, // The ID of the Price object for your subscription plan
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${appBaseUrl}/profile?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl}/profile?payment_cancelled=true`,
      client_reference_id: userId, // Good for reconciliation if metadata isn't enough
      customer_email: userEmail, // Optional: prefill email
      metadata: {
        firebaseUserId: userId, // Store Firebase UID in Stripe metadata
      }
    };

    console.log("[API /create-checkout-session] Creating Stripe Checkout session with params:", JSON.stringify(sessionParams, null, 2));
    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log("[API /create-checkout-session] Stripe session created successfully. ID:", session.id);
    return NextResponse.json({ sessionId: session.id });

  } catch (error: any) {
    console.error('[API /create-checkout-session] Error creating checkout session:', error);
    // Check if it's a Stripe error
    let errorMessage = 'Failed to create checkout session.';
    if (error instanceof Stripe.errors.StripeError) {
        errorMessage = `Stripe Error (${error.type}): ${error.message}`;
    } else if (error.message) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
