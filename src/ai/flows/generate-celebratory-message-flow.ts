import { defineFlow, run } from '@genkit-ai/flow';
import { geminiPro as flash } from '@genkit-ai/googleai';
import { z } from 'zod';

// Define the input schema for our flow.
// We need to know who the user is, what milestone they hit, and their core motivation.
export const CelebratoryMessageInputSchema = z.object({
  userName: z.string(),
  streak: z.number(),
  myWhy: z.string().optional(),
});

// This is the core AI flow.
export const generateCelebratoryMessageFlow = defineFlow(
  {
    name: 'generateCelebratoryMessageFlow',
    inputSchema: CelebratoryMessageInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    // Construct the prompt for the AI model.
    // This is where we inject the "Coach Ath" personality.
    const prompt = `
      You are Coach Ath, a wise, direct, and empathetic fitness and life coach from Singapore. Your mission is to help people break negative cycles and build better lives. Your tone is like a wise older brother ('Abang')—calm, encouraging, but no-nonsense.

      A user has just hit a milestone in their logging streak. Your task is to generate a short, powerful, and personal celebratory message for them.

      **User Details:**
      - Name: ${input.userName}
      - Current Streak: ${input.streak} days
      - Their Stated "Why": "${input.myWhy || 'They have not specified their "Why" yet.'}"

      **Your Instructions:**
      1.  **Acknowledge the specific streak.** Mention the number of days.
      2.  **Connect it to discipline.** Frame the streak not just as a number, but as evidence of building a system and showing up for themselves.
      3.  **Reference their "Why".** If they provided a "Why", connect their achievement directly to it. This is the most important part. Show them that their daily actions are serving their deeper purpose.
      4.  **Keep it concise and powerful.** One or two impactful sentences.
      5.  **Maintain the Coach Ath voice.** Avoid generic, cheesy compliments. Be authentic and grounded.

      **Example Tone:**
      - For a 3-day streak: "3 days straight, ${input.userName}. That's the start of a system. Keep stacking the reps."
      - For a 7-day streak with a "Why" of "being there for my family": "A full week of consistency, ${input.userName}. Every log is a promise kept to yourself and your family. This is how you build the energy to be present for them. Good."

      Now, generate the message for a ${input.streak}-day streak.
    `;

    // Run the AI model with our crafted prompt.
    const llmResponse = await run('generate-message', async () =>
      flash.generate({
        prompt: prompt,
        temperature: 0.5, // A little creative, but still grounded.
      })
    );

    return llmResponse.text();
  }
);
