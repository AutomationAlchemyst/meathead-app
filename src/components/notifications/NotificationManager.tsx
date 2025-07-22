
'use client';

import { useEffect, useState }from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { ToastAction } from '@/components/ui/toast';
import type { ToastActionElement } from '@/components/ui/toast'; // This is React.ReactElement<typeof ToastAction>

interface Reminder {
  id: string;
  title: string;
  message: string;
  time: { hour: number; minute: number };
  actionLabel?: string;
  actionLink?: string;
}

const reminders: Reminder[] = [
  { id: 'logBreakfast', title: 'Rise & Shine!', message: 'Remember to log your breakfast to keep track of your macros.', time: { hour: 10, minute: 0 }, actionLabel: "Log Breakfast", actionLink: "/food-logging" },
  { id: 'logLunch', title: 'Lunchtime Check-in', message: "Don't forget to log your lunch and stay on top of your goals!", time: { hour: 14, minute: 0 }, actionLabel: "Log Lunch", actionLink: "/food-logging" },
  { id: 'logWaterAfternoon', title: 'Hydration Reminder', message: 'Keep sipping! Have you logged your water intake today?', time: { hour: 16, minute: 0 }, actionLabel: "Log Water", actionLink: "/water-tracking" },
  { id: 'logWorkoutEvening', title: 'Workout Time?', message: "Did you crush a workout today? Make sure to log it!", time: { hour: 18, minute: 0 }, actionLabel: "Log Workout", actionLink: "/workout-planner" },
  { id: 'logDinner', title: 'Dinner on your mind?', message: "Plan and log your dinner to round off your day's macros.", time: { hour: 20, minute: 0 }, actionLabel: "Log Dinner", actionLink: "/food-logging" },
  { id: 'dailySummary', title: "Day's End Review", message: "Great job today! Take a moment to check your daily progress on the dashboard.", time: { hour: 21, minute: 0 }, actionLabel: "View Dashboard", actionLink: "/dashboard" },
];

const LAST_SHOWN_STORAGE_PREFIX = 'meathead_reminder_last_shown_';

export default function NotificationManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  // This state is used to ensure the effect re-runs periodically due to the interval.
  const [, setCurrentTimeForEffect] = useState(new Date());

  useEffect(() => {
    if (!user) return; // Only run if user is logged in

    const checkReminders = () => {
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');

      reminders.forEach(reminder => {
        const lastShownDateStr = localStorage.getItem(`${LAST_SHOWN_STORAGE_PREFIX}${reminder.id}`);
        
        if (
          now.getHours() === reminder.time.hour &&
          now.getMinutes() === reminder.time.minute &&
          lastShownDateStr !== todayStr
        ) {
          console.log(`[NotificationManager] Triggering reminder: ${reminder.id}`);
          
          let actionElement: ToastActionElement | undefined = undefined;
          if (reminder.actionLink && reminder.actionLabel) {
              actionElement = (
                  React.createElement(ToastAction, {
                    altText: reminder.actionLabel,
                    onClick: () => router.push(reminder.actionLink!)
                  }, reminder.actionLabel)
              );
          }

          toast({
            title: reminder.title,
            description: reminder.message,
            duration: 10000, // Longer duration for reminders
            action: actionElement,
          });
          localStorage.setItem(`${LAST_SHOWN_STORAGE_PREFIX}${reminder.id}`, todayStr);
        }
      });
    };

    // Initial check
    checkReminders();

    // Set up interval to check every minute
    const timerId = setInterval(() => {
      setCurrentTimeForEffect(new Date()); // Update state to ensure effect logic runs
      // checkReminders(); // checkReminders will be called by the effect due to setCurrentTimeForEffect dependency
    }, 60000); // Every minute

    return () => clearInterval(timerId); // Cleanup interval
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, toast, router, setCurrentTimeForEffect]); // Rerun if user, toast, router, or the time state changes

  return null; // This component doesn't render anything itself
}
