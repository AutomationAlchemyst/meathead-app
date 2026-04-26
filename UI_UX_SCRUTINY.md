# MeatHead UI/UX Scrutiny
**Date:** April 26, 2026
**App:** https://meathead-app.vercel.app

---

## Overall UI/UX Assessment

**Strengths:**
- Clean, cohesive dark/light theme with consistent primary color
- Good use of Framer Motion animations throughout
- Loading skeletons on all major components
- Responsive grid layouts (mobile-first)
- Toast notifications for user feedback
- Clear premium/freemium gating with upgrade prompts
- Radix UI primitives for accessibility
- Onboarding flow with profile setup modal
- Real-time Firestore listeners for live data updates

**Issues Found:** 15 identified

---

## Critical UX Bugs

### 1. Free Generations Not Persisted (Revenue Leak)
**File:** `src/app/recipe-generator/page.tsx`
**Line:** `monthlyFreeGenerationsUsed` stored in React state only

```typescript
const [monthlyFreeGenerationsUsed, setMonthlyFreeGenerationsUsed] = useState(0);
```

**Problem:** Refresh the page = counter resets = unlimited free generations
**Fix:** Store in Firestore user document or localStorage with date tracking

---

### 2. No Empty States for Key Screens
**Files:** Multiple dashboard components

**Problem:** When a user has no data yet:
- No food logs → blank macros card
- No workouts → empty workout card
- No weight history → empty chart

**Fix:** Add empty state illustrations + "Get Started" CTAs

---

### 3. "Log This Meal" Always Logs 1 Serving
**File:** `GeneratedRecipeDisplay` in recipe-generator/page.tsx

```typescript
<Button onClick={() => onLogRecipe(recipe)}>
  Log This Meal (1 Serving)
</Button>
```

**Problem:** User might want to log different serving sizes. No option to adjust.
**UX Confusion:** Serving size selector missing

---

## Medium Priority Issues

### 4. Recipe Page is 700+ Lines
**File:** `src/app/recipe-generator/page.tsx`

**Problem:** Massive single file with 3 tab contents + skeletons + helper components
**Fix:** Split into:
- `components/recipe-generator/RecipeGeneratorForm.tsx`
- `components/recipe-generator/FridgeForm.tsx`
- `components/recipe-generator/AdaptForm.tsx`
- `components/recipe-generator/RecipeResult.tsx`

---

### 5. No Confirmation Dialogs for Destructive Actions
**Problem:** Delete food log, delete water entry = immediate delete
**Fix:** Add confirmation dialog (Radix AlertDialog)

---

### 6. Tabs May Overflow on Small Mobile
**File:** `src/app/recipe-generator/page.tsx`

```typescript
<TabsList className="flex flex-wrap w-full h-auto sm:h-10 gap-1 mb-6 p-1..."
```

**Problem:** On very small screens (<375px), tabs might stack awkwardly

---

### 7. No Loading State for Firestore Operations
**File:** `src/components/dashboard/TodaysMacrosCard.tsx`

**Good:** Has `macrosLoading` state
**Problem:** Some components skip this, showing raw loading spinners

---

### 8. Error Messages Too Generic
**Example from recipe-generator:**
```typescript
} catch (e: any) {
  const errorMessage = e.message || "Failed to generate recipe...";
```

**Problem:** AI errors are often cryptic or irrelevant to users
**Fix:** Map common error codes to friendly messages

---

### 9. Missing ARIA Labels
**File:** `src/components/Navbar.tsx` (assumed)

**Problem:** Navigation may not be keyboard/screen-reader accessible
**Fix:** Add `aria-label` to icon-only buttons

---

### 10. No Offline Indicator
**Problem:** App doesn't show when offline (Firestore queries will silently fail)
**Fix:** Add network status indicator

---

## Low Priority Issues

### 11. "Join the Conversation" Still in Welcome Page
**File:** `src/app/welcome/page.tsx`

```typescript
<Button variant="outline" disabled>
  Explore Community (Launching Soon)
</Button>
```

**Question:** Is this still coming? If not, remove dead UI

---

### 12. Profile Photo Fallback Chain is Complex
**File:** `src/app/welcome/page.tsx`

```typescript
onError={(e) => {
  target.srcset = "";
  target.src = `https://placehold.co/100x100.png`;
}}
```

**Problem:** Multiple fallback hops can cause flicker
**Fix:** Use Next.js `<Image>` with blur placeholder

---

### 13. Button States Not Always Disabled
**File:** Multiple forms

**Problem:** Submit buttons sometimes stay enabled during API calls
**Fix:** Ensure all mutation buttons check `isLoading` before allowing submit

---

### 14. No Way to Cancel AI Generation
**Problem:** User starts recipe generation, changes mind = no way to cancel
**Fix:** Add AbortController or similar

---

### 15. Calendar Legend Missing
**File:** `src/components/dashboard/DailyActivityCalendar.tsx`

**Problem:** Color-coded calendar but no legend explaining colors
**Fix:** Add small legend (e.g., "Green = logged, Blue = workout, etc.")

---

## Component Quality Scores

| Component | Score | Notes |
|-----------|-------|-------|
| TodaysMacrosCard | 9/10 | Excellent - loading, error, empty states |
| WelcomePage | 8/10 | Good onboarding, clear CTAs |
| RecipeGeneratorPage | 6/10 | Feature-rich but monolithic file |
| DashboardLayout | 8/10 | Good animations, responsive grid |
| FoodLogList | 7/10 | Good, needs edit/delete confirmation |
| Navbar | 7/10 | Clean, needs accessibility check |

---

## Recommendations (Priority Order)

### Must Fix (Before Launch)
1. **Persist free generation counter** - Revenue depends on this
2. **Add empty states** - First-time user experience is broken
3. **Serving size selector** - Core logging feature incomplete

### Should Fix (Before Production)
4. **Split recipe-generator page** - Unmaintainable at 700+ lines
5. **Add confirmation dialogs** - Destructive actions need guards
6. **Improve error messages** - Map AI errors to user-friendly text
7. **Calendar legend** - UX clarity issue

### Nice to Have (Post-Launch)
8. Offline indicator
9. Cancel AI generation
10. Accessibility audit
11. Community section (or remove dead UI)

---

## Summary

**UI Quality: 8/10** - Visually polished, good animations, cohesive design
**UX Quality: 6/10** - Good features but free-tier bug is critical, empty states missing

**Most Critical:** Fix the free generation persistence bug before launching paid tier.
