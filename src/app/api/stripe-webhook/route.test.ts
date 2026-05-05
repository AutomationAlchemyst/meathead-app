import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import Stripe from 'stripe';

const { constructEventMock } = vi.hoisted(() => ({
  constructEventMock: vi.fn(),
}));

vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      webhooks = {
        constructEvent: constructEventMock,
      };
    },
  };
});

process.env.STRIPE_SECRET_KEY = 'test_secret';
process.env.STRIPE_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.FIREBASE_SERVICE_ACCOUNT_JSON_STRING = '{}';

let mockHeadersGet = vi.fn().mockReturnValue(null);

vi.mock('next/headers', () => ({
  headers: vi.fn().mockImplementation(() => Promise.resolve({
    get: mockHeadersGet,
  })),
}));

const { mockUpdate, mockGet, mockLimit, mockWhere, mockDoc, mockCollection } = vi.hoisted(() => {
  const mockUpdate = vi.fn();
  const mockGet = vi.fn().mockResolvedValue({ empty: true });
  const mockLimit = vi.fn().mockReturnValue({ get: mockGet });
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });

  const mockDoc = vi.fn().mockReturnValue({ update: mockUpdate });
  const mockCollection = vi.fn().mockReturnValue({
    doc: mockDoc,
    where: mockWhere,
  });
  return { mockUpdate, mockGet, mockLimit, mockWhere, mockDoc, mockCollection };
});

vi.mock('firebase-admin', () => {
  const firestoreMock: any = () => ({
    collection: mockCollection,
  });
  firestoreMock.FieldValue = { serverTimestamp: vi.fn() };

  return {
    default: {
      apps: [],
      initializeApp: vi.fn(),
      credential: { cert: vi.fn() },
      firestore: firestoreMock,
    },
  };
});

describe('Stripe Webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeadersGet.mockReturnValue('valid_signature');
  });

  it('should return 400 if signature is missing', async () => {
    mockHeadersGet.mockReturnValue(null);
    const req = new Request('http://localhost/api/stripe-webhook', { method: 'POST', body: 'body' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing stripe-signature header.');
  });

  it('should return 500 when customer.subscription.updated fallback query throws an error', async () => {
    // Setup event
    constructEventMock.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_123',
          status: 'active',
          customer: 'cus_123',
          metadata: {},
        },
      },
    });

    // Simulate firestore lookup error
    mockGet.mockRejectedValue(new Error('Firestore down'));

    const req = new Request('http://localhost/api/stripe-webhook', { method: 'POST', body: 'body' });
    const res = await POST(req);
    
    // We expect it to return 500 because the query fails
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to query user by customer ID');
  });

  it('should process invoice.payment_failed correctly', async () => {
    constructEventMock.mockReturnValue({
      type: 'invoice.payment_failed',
      data: {
        object: {
          subscription: 'sub_123',
          customer: 'cus_123',
          metadata: { firebaseUserId: 'user_123' },
        },
      },
    });

    const req = new Request('http://localhost/api/stripe-webhook', { method: 'POST', body: 'body' });
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    expect(mockDoc).toHaveBeenCalledWith('user_123');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      isPremium: false,
      premiumSubscriptionStatus: 'past_due'
    }));
  });
});
