
import AppLayout from '@/components/layout/AppLayout';
import GreetingHeader from '@/components/dashboard/GreetingHeader';
import CurrentWeightCard from '@/components/dashboard/CurrentWeightCard';
import TodaysMacrosCard from '@/components/dashboard/TodaysMacrosCard';
import TodaysWaterCard from '@/components/dashboard/TodaysWaterCard'; 
import WeeklyProgressChart from '@/components/dashboard/WeeklyProgressChart'; 
import SmartInsightsCard from '@/components/dashboard/SmartInsightsCard';
import RecentWorkoutsCard from '@/components/dashboard/RecentWorkoutsCard';
import DailyActivityCalendar from '@/components/dashboard/DailyActivityCalendar'; // Updated import

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <GreetingHeader />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
          <CurrentWeightCard />
          <TodaysMacrosCard />
          <TodaysWaterCard /> 
          <SmartInsightsCard />
          <RecentWorkoutsCard /> 
          
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-0 bg-card rounded-lg shadow-lg overflow-hidden"> 
            <h3 className="text-xl font-semibold text-primary mb-2 px-6 pt-6">Your Progress At a Glance</h3>
            <p className="text-muted-foreground mb-4 px-6">Weekly carbohydrate intake (vs 20g target) and daily weight.</p> 
            <div className="px-2 pb-6 sm:px-4"> 
              <WeeklyProgressChart />
            </div>
          </div>
          <div className="p-0 bg-card rounded-lg shadow-lg overflow-hidden"> 
             <DailyActivityCalendar /> 
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
