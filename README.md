# MeatHead - Your AI-Powered Keto & Fitness Companion

This is a NextJS starter in Firebase Studio that has been built into a comprehensive AI-powered application.

## App Description

MeatHead is a comprehensive web application designed to be the ultimate assistant for individuals pursuing a ketogenic lifestyle combined with a fitness regimen. Powered by AI and built with a modern tech stack (Next.js, Firebase, Genkit, Stripe), it provides personalized tracking, intelligent planning, and motivational insights to keep users on track with their health goals.

## Core Features

### 1. Personalized Dashboard
The central hub of the app, providing an at-a-glance overview of the user's daily progress.
- **Key Metrics:** Features real-time tracking cards for Current Weight, Today's Macros (calories, protein, carbs, fat), and Water Intake, with progress bars showing consumption against daily targets.
- **AI Smart Insights (Premium):** A premium feature where "Ath," the AI coach, analyzes the user's recent data (food, weight, workouts, water) to provide personalized motivational messages, identify trends, and offer actionable advice.
- **Activity Visualization:** Includes a weekly progress chart for weight and carb intake, and a full monthly calendar that visualizes daily logging consistency for meals, water, and workouts.

### 2. AI-Powered Recipe Genie
- **Generate New Recipes:** Users can get detailed, custom Keto recipes based on preferences like cuisine, meal type, ingredients, and cooking time. It includes special considerations for Halal compliance and spice levels.
- **What's In My Fridge?:** A unique feature allowing users to input ingredients they already have to generate a creative recipe, minimizing food waste.
- **Adapt Existing Recipes:** Users can paste any recipe, and the AI will adapt it to be Keto-friendly, Halal, or suggest ingredient substitutions.

### 3. Intelligent Workout Planner
- **Custom Plan Generation:** The AI "Coach Ath" creates personalized 7-day workout plans based on the user's fitness level, goals, available equipment, and time constraints. It can also create joint-friendly, low-impact plans.
- **"Missed a Day?" Adaptation (Premium):** A premium feature where the AI can intelligently adapt the rest of the week's schedule if a user misses a workout, ensuring they stay on track.
- **Workout Logging:** Users can mark workouts as complete, building a log of their activity which is used by the AI for insights.

### 4. Comprehensive Tracking & Logging
- **AI Food Logging:** Users can describe their meals in natural language (e.g., "I had two scrambled eggs and a slice of bacon"), and the AI will parse the items, estimate their macros, and log them.
- **Detailed Log Management:** Users can view, edit, or delete individual food and water log entries for the current day.
- **Weight & Water Tracking:** Simple, dedicated pages for logging weight and water intake, with a visual history chart for weight progress.

### 5. User Profile & Goal Setting
- **Automatic Target Calculation:** Upon setting their profile details (weight, activity level, etc.), the app automatically calculates and applies recommended daily targets for macros.
- **Goal Projection:** Provides an AI-estimated date for when the user might reach their target weight, which updates as their profile changes.

### 6. Premium Subscription Model with Stripe
- **Secure Payments:** Fully integrated with Stripe for handling monthly and yearly premium subscriptions.
- **Automated Access Control:** Uses Stripe Webhooks and Firebase Admin SDK to automatically grant or revoke premium status (`isPremium: true`) in the user's profile upon successful payment or cancellation.
- **Freemium Experience:** Non-premium users get limited access to AI features (e.g., a few free recipe generations or AI food logs), with clear prompts to upgrade or start a trial.

### 7. User Experience & Engagement
- **Guided Onboarding:** A "Welcome / Start Here" page guides new users to set up their profile for a personalized experience.
- **Feedback System:** A dedicated page for users to submit feedback, which is automatically sent to a Google Sheet for the administrator to review.
- **Scheduled Notifications:** A local notification system provides timely reminders to log meals, water, or workouts throughout the day.
