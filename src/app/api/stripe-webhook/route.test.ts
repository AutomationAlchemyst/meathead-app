import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      webhooks = {
        constructEvent: vi.fn(),
      };
    },
  };
});

process.env.STRIPE_SECRET_KEY = 'test_secret';
process.env.STRIPE_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.FIREBASE_SERVICE_ACCOUNT_JSON_STRING = '{}';

// Mock Next.js headers
vi.mock('next/headers', () => {
  return {
    headers: vi.fn().mockResolvedValue({
      get: vi.fn().mockReturnValue(null), // Default to no signature for the 400 test
    }),
  };
});

// Mock Firebase Admin
vi.mock('firebase-admin', () => {
  return {
    default: {
      apps: [],
      initializeApp: vi.fn(),
      credential: { cert: vi.fn() },
      firestore: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            update: vi.fn(),
          }),
        }),
      }),
    },
  };
});

describe('Stripe Webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if signature is missing', async () => {

    const req = new Request('http://localhost/api/stripe-webhook', {
      method: 'POST',
      body: 'body',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing stripe-signature header.');
  });
});
