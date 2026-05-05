import '@testing-library/jest-dom/vitest'

process.env.STRIPE_SECRET_KEY = 'test_secret';
process.env.STRIPE_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.FIREBASE_SERVICE_ACCOUNT_JSON_STRING = '{}';
