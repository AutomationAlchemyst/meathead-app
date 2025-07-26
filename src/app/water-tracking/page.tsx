'use client';

// NEW: Import the 'motion' component from framer-motion
import { motion } from 'framer-motion';
import AppLayout from '@/components/layout/AppLayout';
import WaterLogForm from '@/components/water-tracking/WaterLogForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplet } from 'lucide-react';
import TodaysWaterLogsList from '@/components/water-tracking/TodaysWaterLogsList';

// NEW: Define the same animation variants we use on other pages for consistency.
const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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

export default function WaterTrackingPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        {/* NEW: This is our main animation container */}
        <motion.div
          className="max-w-lg mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* NEW: The form card is now a motion component */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-lg mb-8">
              <CardHeader className="text-center">
                <Droplet className="mx-auto h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-2xl font-headline">Log Your Water Intake</CardTitle>
                <CardDescription>Stay hydrated! Record how much water you've drunk.</CardDescription>
              </CardHeader>
              <CardContent>
                <WaterLogForm />
              </CardContent>
            </Card>
          </motion.div>
          
          {/* NEW: The list of logs is now a motion component */}
          <motion.div variants={itemVariants}>
            <TodaysWaterLogsList />
          </motion.div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
