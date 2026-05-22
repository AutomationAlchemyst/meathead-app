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

// Mock Database variables
const {
  mockUpdate,
  mockDocGet,
  mockLimit,
  mockWhere,
  mockDoc,
  mockCollection,
  mockTransactionGet,
  mockTransactionSet,
  mockRunTransaction,
} = vi.hoisted(() => {
  const mockUpdate = vi.fn().mockResolvedValue({});
  const mockDocGet = vi.fn().mockResolvedValue({ empty: true });
  const mockLimit = vi.fn().mockReturnValue({ get: mockDocGet });
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockDoc = vi.fn().mockReturnValue({
    update: mockUpdate,
  });
  const mockCollection = vi.fn().mockReturnValue({
    doc: mockDoc,
    where: mockWhere,
  });

  const mockTransactionGet = vi.fn();
  const mockTransactionSet = vi.fn();
  const mockRunTransaction = vi.fn().mockImplementation(async (callback) => {
    const transaction = {
      get: mockTransactionGet,
      set: mockTransactionSet,
    };
    return await callback(transaction);
  });

  return {
    mockUpdate,
    mockDocGet,
    mockLimit,
    mockWhere,
    mockDoc,
    mockCollection,
    mockTransactionGet,
    mockTransactionSet,
    mockRunTransaction,
  };
});

// Mock @/lib/firebaseAdmin
vi.mock('@/lib/firebaseAdmin', () => {
  const mockAdmin: any = {
    firestore: {
      FieldValue: {
        serverTimestamp: vi.fn().mockReturnValue('mock-timestamp'),
      },
    },
  };
  return {
    adminDb: {
      collection: mockCollection,
      runTransaction: mockRunTransaction,
    },
    admin: mockAdmin,
  };
});

describe('Stripe Webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeadersGet.mockReturnValue('valid_signature');
    // Default: event does not exist in db
    mockTransactionGet.mockResolvedValue({ exists: false });
  });

  it('should return 400 if signature is missing', async () => {
    mockHeadersGet.mockReturnValue(null);
    const req = new Request('http://localhost/api/stripe-webhook', { method: 'POST', body: 'body' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing stripe-signature header.');
  });

  it('should skip processing and return 200 if event is already completed', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_dup123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'sess_123',
          metadata: { firebaseUserId: 'user_123' },
        },
      },
    });

    // Simulate already completed event
    mockTransactionGet.mockResolvedValue({
      exists: true,
      data: () => ({ status: 'completed' }),
    });

    const req = new Request('http://localhost/api/stripe-webhook', { method: 'POST', body: 'body' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.skipped).toBe(true);
    expect(mockTransactionSet).not.toHaveBeenCalled();
  });

  it('should skip processing and return 200 if event is currently processing', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_dup456',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'sess_123',
          metadata: { firebaseUserId: 'user_123' },
        },
      },
    });

    // Simulate event in processing status
    mockTransactionGet.mockResolvedValue({
      exists: true,
      data: () => ({ status: 'processing' }),
    });

    const req = new Request('http://localhost/api/stripe-webhook', { method: 'POST', body: 'body' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.skipped).toBe(true);
    expect(mockTransactionSet).not.toHaveBeenCalled();
  });

  it('should process invoice.payment_failed correctly', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_failed123',
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
    // Verified transaction sets 'processing' status
    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'processing' })
    );

    // Verified collection updates user document
    expect(mockDoc).toHaveBeenCalledWith('user_123');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      isPremium: false,
      premiumSubscriptionStatus: 'past_due',
    }));

    // Verified updates status to 'completed'
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
    }));
  });

  it('should return 500 when customer.subscription.updated fallback query throws an error', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_updated123',
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

    // Simulate customer lookup query failure
    mockDocGet.mockRejectedValue(new Error('Firestore down'));

    const req = new Request('http://localhost/api/stripe-webhook', { method: 'POST', body: 'body' });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Firestore down');

    // Verified updates status to 'failed'
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      lastError: 'Firestore down',
    }));
  });
});
