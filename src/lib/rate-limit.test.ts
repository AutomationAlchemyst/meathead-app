import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from './rate-limit';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      limit: 3,
      windowMs: 50, // very small window for testing
    });
  });

  it('should allow requests within limit', () => {
    let check = limiter.check('test_key');
    expect(check.success).toBe(true);
    expect(check.remaining).toBe(2);

    check = limiter.check('test_key');
    expect(check.success).toBe(true);
    expect(check.remaining).toBe(1);

    check = limiter.check('test_key');
    expect(check.success).toBe(true);
    expect(check.remaining).toBe(0);
  });

  it('should block requests over the limit', () => {
    limiter.check('test_key');
    limiter.check('test_key');
    limiter.check('test_key');
    
    const check = limiter.check('test_key');
    expect(check.success).toBe(false);
    expect(check.remaining).toBe(0);
  });

  it('should treat different keys independently', () => {
    limiter.check('key_a');
    limiter.check('key_a');
    limiter.check('key_a');

    expect(limiter.check('key_a').success).toBe(false);
    expect(limiter.check('key_b').success).toBe(true);
  });
});
