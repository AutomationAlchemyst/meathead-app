'use client';

// NEW: Import the 'motion' component from framer-motion
import { motion } from 'framer-motion';
import AppLayout from '@/components/layout/AppLayout';
import { Separator } from '@/components/ui/separator';
import { QuickAddFood } from '@/components/food-logging/QuickAddFood';
import { FoodLogForm } from '@/components/food-logging/FoodLogForm';
import { TodaysFoodLogList } from '@/components/food-logging/TodaysFoodLogList';

// NEW: Define the same animation variants we used on the dashboard for consistency.
const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // A slightly slower stagger for a more deliberate feel
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

export default function FoodLoggingPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        {/* NEW: This is our main animation container */}
        <motion.div
          className="max-w-4xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Each logical block is now a motion component that will be animated */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h1 className="text-4xl font-bold font-headline">AI Food Logger</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Describe your meals in plain English, and let Coach Ath handle the macros.
            </p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="mb-8">
            <QuickAddFood />
          </motion.div>

          <motion.div variants={itemVariants}>
            <Separator className="my-8" />
          </motion.div>

          <motion.div variants={itemVariants}>
            <FoodLogForm />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <TodaysFoodLogList />
          </motion.div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
