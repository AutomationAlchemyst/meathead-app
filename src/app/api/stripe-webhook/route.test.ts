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
  mockTransactionUpdate,
  mockRunTransaction,
} = vi.hoisted(() => {
  const mockUpdate = vi.fn().mockResolvedValue({});
  const mockDocGet = vi.fn().mockResolvedValue({ empty: true });
  const mockLimit = vi.fn().mockReturnValue({ get: mockDocGet });
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockDoc = vi.fn().mockReturnValue({
    update: mockUpdate,
    set: mockUpdate,
  });
  const mockCollection = vi.fn().mockReturnValue({
    doc: mockDoc,
    where: mockWhere,
  });

  const mockTransactionGet = vi.fn();
  const mockTransactionSet = vi.fn();
  const mockTransactionUpdate = vi.fn();
  const mockRunTransaction = vi.fn().mockImplementation(async (callback) => {
    const transaction = {
      get: mockTransactionGet,
      set: mockTransactionSet,
      update: mockTransactionUpdate,
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
    mockTransactionUpdate,
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
    // Default: query returns empty
    mockDocGet.mockResolvedValue({ empty: true });
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
    expect(json.reason).toBe('completed');
    expect(mockTransactionUpdate).not.toHaveBeenCalled();
  });

  it('should skip processing and return 200 if event is currently processing and within timeout', async () => {
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

    // Simulate event in processing status and started just now
    mockTransactionGet.mockResolvedValue({
      exists: true,
      data: () => ({
        status: 'processing',
        processingStartedAt: new Date(), // current time (0 seconds ago)
      }),
    });

    const req = new Request('http://localhost/api/stripe-webhook', { method: 'POST', body: 'body' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.skipped).toBe(true);
    expect(json.reason).toBe('processing');
    expect(mockTransactionUpdate).not.toHaveBeenCalled();
  });

  it('should recover and allow reprocessing if event is processing but timed out (> 5 mins)', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_timeout789',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'sess_123',
          metadata: { firebaseUserId: 'user_123' },
        },
      },
    });

    // Simulate event in processing status, started 6 minutes ago (timed out)
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
    mockTransactionGet.mockResolvedValue({
      exists: true,
      data: () => ({
        status: 'processing',
        processingStartedAt: sixMinutesAgo,
        attemptCount: 1,
      }),
    });

    const req = new Request('http://localhost/api/stripe-webhook', { method: 'POST', body: 'body' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    // Verifies it sets state to processing and increments attempt count
    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'processing',
        attemptCount: 2,
      }),
      { merge: true }
    );
    // Verifies it completes successfully
    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'completed',
      })
    );
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
      expect.objectContaining({ status: 'processing' }),
      { merge: true }
    );

    // Verified transactional updates for both the user doc and the event completion
    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        isPremium: false,
        premiumSubscriptionStatus: 'past_due',
      })
    );

    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'completed',
      })
    );
  });

  it('should return 500 when transaction fails and write failure log outside transaction', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_err123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'sess_123',
          metadata: { firebaseUserId: 'user_123' },
        },
      },
    });

    // Make transaction fail
    mockRunTransaction.mockRejectedValueOnce(new Error('Firestore transaction aborted'));

    const req = new Request('http://localhost/api/stripe-webhook', { method: 'POST', body: 'body' });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Firestore transaction aborted');

    // Verifies failure log is written to DB outside transaction
    expect(mockDoc).toHaveBeenCalledWith('evt_err123');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        lastError: 'Firestore transaction aborted',
      }),
      { merge: true }
    );
  });

  it('should return 400 when firebaseUserId cannot be resolved and write failure log', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_no_user',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_unknown',
          metadata: {}, // no firebaseUserId
        },
      },
    });

    // Simulate query returning empty (user not found by customer ID)
    mockDocGet.mockResolvedValueOnce({ empty: true });

    const req = new Request('http://localhost/api/stripe-webhook', { method: 'POST', body: 'body' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Could not determine firebaseUserId');

    // Verifies event is logged as failed in database
    expect(mockDoc).toHaveBeenCalledWith('evt_no_user');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        lastError: 'Could not determine firebaseUserId for event type customer.subscription.updated',
      }),
      { merge: true }
    );
  });
});
