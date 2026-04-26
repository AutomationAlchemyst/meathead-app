# MeatHead App - Comprehensive Code Scrutiny
**Date:** April 26, 2026
**Repo:** https://github.com/AutomationAlchemyst/meathead-app
**Live:** https://meathead-app.vercel.app

---

## 1. Tech Stack Overview

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (Turbopack), React 18, TypeScript |
| Styling | Tailwind CSS, Radix UI, Framer Motion |
| AI | Google Genkit, Google Gemini |
| Backend | Next.js API Routes |
| Database | Firebase Firestore |
| Auth | Firebase Auth |
| Payments | Stripe |
| Hosting | Vercel |
| Languages | TypeScript (588K), JavaScript (135B), CSS (3.6K) |

---

## 2. Architecture Assessment

### Strengths
- **Clean folder structure** — `src/app`, `src/components`, `src/ai`, `src/lib`, `src/contexts`, `src/hooks` are well organized
- **Server/Client separation** — Server components for API routes, client components for UI
- **TypeScript throughout** — Good type coverage with `types/` directory
- **Environment variables** — Firebase config uses `NEXT_PUBLIC_` prefix correctly; Stripe secrets stay server-side
- **Real-time auth** — `onSnapshot` for live Firestore profile updates

### Concerns
- **Single-file API routes** — `route.ts` for stripe-webhook is 13KB+ with multiple event handlers. Should be split into handler functions.
- **No error boundaries** — React error boundaries missing for graceful failure handling
- **No loading.tsx in routes** — Missing Next.js loading conventions for Suspense

---

## 3. Security Analysis

### ✅ Good Practices

**Firestore Rules (`firestore.rules`):**
```javascript
// Users can only read/write their own document
allow read: if request.auth != null && request.auth.uid == userId;
allow create: if request.auth != null && request.auth.uid == userId;
// Food/weight/water logs: userId must match
allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
```

**Webhook Security:**
- Stripe signature verification with `stripe.webhooks.constructEvent()`
- Server-side only Stripe initialization
- Firebase Admin SDK with service account (not exposed to client)
- User lookup by `stripeCustomerId` as fallback

**Environment Variables:**
- Firebase keys use `NEXT_PUBLIC_` prefix (safe for client)
- Stripe secret key and webhook secret stay server-side only
- `FIREBASE_SERVICE_ACCOUNT_JSON_STRING` kept server-side

### ⚠️ Concerns

**Firestore Rules - Update/Delete Permissions:**
```javascript
// Food logs: update and delete are completely blocked
allow update, delete: if false; 

// Weight logs: update and delete completely blocked
allow update, delete: if false;

// Workout logs: update and delete completely blocked
allow update, delete: if false;
```
**Issue:** Users cannot edit or delete their own logs. If a user logs the wrong meal, they're stuck with incorrect data forever. This is a UX problem.

**Webhook - Missing User Verification:**
- The `checkout.session.completed` event retrieves `firebaseUserId` from session metadata OR `client_reference_id`
- If both are missing, payment links to no user — potential orphaned payments
- **Recommendation:** Validate that `firebaseUserId` exists before processing

**Hardcoded Fallback Values:**
```typescript
targetCarbs: rawData.targetCarbs ?? 20,  // Default 20g carbs
```
**Issue:** Defaults should be documented and consistent with keto guidelines.

**Feedback Submissions:**
```javascript
allow read: if true;  // Anyone can read all feedback
```
**Issue:** Feedback submissions can be read by anyone. Should restrict to admin only.

---

## 4. Stripe Integration Analysis

### Flow
1. User clicks upgrade → `create-checkout-session` API called
2. Redirect to Stripe Checkout
3. Stripe webhook `checkout.session.completed` fires
4. Firebase Admin SDK updates `isPremium: true`

### Event Handlers
| Event | Handler |
|-------|---------|
| `checkout.session.completed` | Sets `isPremium: true` |
| `customer.subscription.updated` | Syncs subscription status |
| `customer.subscription.deleted` | Sets `isPremium: false` |
| `invoice.payment_succeeded` | Confirms active status |

### Issues
- No idempotency handling — if webhook fires twice, could cause race conditions
- No retry mechanism for failed Firestore writes
- `customer.subscription.updated` fallback lookup by `stripeCustomerId` could be slow (Firestore query on every update)
- Missing `invoice.payment_failed` handler — important for churn prevention

---

## 5. AI/Genkit Implementation

### Flows Found
| Flow | Purpose |
|------|---------|
| `adapt-recipe-flow` | Adapt any recipe to be keto/halal |
| `adapt-workout-schedule-flow` | Reschedule if user misses a day |
| `estimate-macros` | Estimate macros from food input |
| `generate-celebratory-message` | Motivational messages |
| `generate-dashboard-insights` | AI-powered insights on dashboard |
| `generate-detailed-recipe` | Full recipe generation |
| `generate-meal-plan` | Weekly meal planning |
| `generate-recipe-from-ingredients` | "What's in my fridge?" feature |
| `generate-workout-plan` | Create 7-day workout plans |
| `get-keto-guidance` | General keto advice |
| `parse-natural-language-food-input` | NLP food logging |

### Strengths
- Well-structured Genkit flows with prompts
- Schemas defined for type-safe inputs/outputs
- Premium gating on advanced flows
- Supports Halal compliance in recipe generation

### Concerns
- **No rate limiting** on AI calls — a user could spam recipe generations
- **No caching** — same prompt will hit AI every time
- **Premium features rely on client-side checks** — should verify `isPremium` server-side before returning AI results
- **Food macro estimation** — likely inaccurate without a real nutrition database

---

## 6. Firebase Structure

### Collections
```
users/{userId}
  - profile data (weights, targets, isPremium, isAdmin)
  - foodLogs/{logId}
  - weightLogs/{logId}
  - workoutLogs/{logId}
  - waterLogs/{logId}

feedbackSubmissions/{feedbackId}
  - userId, message, timestamp
```

### Concerns
- **No batch operations** — logging multiple items hits Firestore multiple times
- **No pagination** — `onSnapshot` listener could grow unbounded
- **No data migration strategy** — schema changes could break existing users
- **Admin detection** — `isAdmin` is stored in Firestore, not a custom claim. Could be manipulated if rules are wrong.

---

## 7. UI/UX Observations

### Strengths
- Clean Radix UI primitives
- Mobile-first responsive design
- Progress bars, charts, streaks for engagement
- Guided onboarding ("Welcome / Start Here" page)
- Loading states with spinners

### Concerns
- **No empty states** documented — what happens if user has no logs?
- **Streak calculation** — `streakUtils.ts` should be reviewed for edge cases
- **No offline support** — PWA capabilities not explored
- **Payment simulation page** (`/payment-simulation`) — debug/test feature left in production?

---

## 8. Critical Bugs

### Bug 1: Food/Weight/Workout Logs Cannot Be Edited or Deleted
```javascript
allow update, delete: if false; 
```
Users cannot correct mistakes in their logs. This is a significant UX flaw.

### Bug 2: Feedback Submissions Are Publicly Readable
```javascript
allow read: if true;
```
All feedback is visible to anyone. User data could leak.

### Bug 3: Missing Error Handling in AuthContext
```typescript
} catch (error) {
  console.error("[AuthContext] Profile listener error:", error);
  setUserProfile(null);
  setLoading(false);
}
```
Errors are swallowed — user sees nothing helpful.

---

## 9. Recommendations

### High Priority
1. **Fix Firestore rules** — Allow users to update/delete their own logs
2. **Restrict feedback read access** — Only admin should read submissions
3. **Add `invoice.payment_failed` handler** — For churn prevention
4. **Server-side premium verification** — Don't trust client `isPremium` flag for AI calls

### Medium Priority
5. **Split webhook route** — Extract handler functions to separate files
6. **Add rate limiting** — Especially for AI flows
7. **Add caching** — For repeated AI queries
8. **Document environment variables** — `.env.example` file missing
9. **Payment simulation page** — Remove or password-protect before production

### Low Priority
10. **Add React error boundaries**
11. **Add loading.tsx conventions** for Next.js app router
12. **PWA support** for offline tracking
13. **Data migration strategy** for schema changes

---

## 10. Summary Scores

| Category | Score | Notes |
|----------|-------|-------|
| Architecture | 8/10 | Clean, well-organized |
| Security | 6/10 | Good auth/Firestore rules, but public feedback read |
| Stripe Integration | 7/10 | Solid webhook handling, missing edge cases |
| AI/Genkit | 7/10 | Comprehensive flows, no rate limiting |
| Code Quality | 7/10 | TypeScript, clean components, some large files |
| UX | 6/10 | Good UI, but locked log editing is a major gap |

**Overall: 6.8/10** — Solid foundation with significant gaps to address before scaling.

---

## Files Reviewed
- `README.md`, `package.json`, `firestore.rules`
- `src/app/layout.tsx`, `src/app/page.tsx`
- `src/app/api/stripe-webhook/route.ts`
- `src/lib/firebase.ts`, `src/lib/googleSheetsService.ts`
- `src/contexts/AuthContext.tsx`
- `src/ai/flows/*.ts` (11 flows)
- `docs/blueprint.md`
