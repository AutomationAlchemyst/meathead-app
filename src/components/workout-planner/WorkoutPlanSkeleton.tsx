
'use client';

import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionItem } from "@/components/ui/accordion";

export default function WorkoutPlanSkeleton() {
  return (
    <Card className="mt-8 shadow-xl">
      <CardHeader className="bg-primary/10 p-6 rounded-t-lg">
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3 mt-1" />
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <Skeleton className="h-16 w-full" /> {/* Disclaimer Skeleton */}

        <Accordion type="multiple" className="w-full space-y-4">
          {[...Array(3)].map((_, i) => ( // Skeleton for a few accordion items
            <AccordionItem key={`skel-day-${i}`} value={`skel-day-${i}`} className="border border-border rounded-lg overflow-hidden">
                <Skeleton className="h-12 w-full px-4 py-3" /> {/* AccordionTrigger Skeleton */}
                <CardContent className="p-4 bg-background/30"> {/* AccordionContent Skeleton area */}
                    <Skeleton className="h-6 w-1/3 mb-2" /> {/* Title Skeleton */}
                    <Skeleton className="h-4 w-1/2 mb-4" /> {/* Description Skeleton */}
                    
                    {/* Warmup Skeleton */}
                    <Skeleton className="h-4 w-1/4 mb-1" />
                    <Skeleton className="h-3 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2 mb-3" />

                    {/* Exercises Skeleton */}
                    {[...Array(2)].map((_, exIdx) => (
                        <div key={`skel-ex-${exIdx}`} className="py-3 border-b border-border/50 last:border-b-0">
                            <Skeleton className="h-5 w-1/2 mb-1.5" />
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                            <Skeleton className="h-3 w-3/4 mt-1.5" />
                        </div>
                    ))}
                     {/* Cooldown Skeleton */}
                    <Skeleton className="h-4 w-1/4 mt-3 mb-1" />
                    <Skeleton className="h-3 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                </CardContent>
            </AccordionItem>
          ))}
        </Accordion>
        
        <Skeleton className="h-px w-full my-6" /> {/* Separator Skeleton */}
        <div>
            <Skeleton className="h-7 w-1/3 mb-3" /> {/* Overall Notes Title Skeleton */}
            <Skeleton className="h-4 w-full mb-1.5" />
            <Skeleton className="h-4 w-5/6" />
        </div>
      </CardContent>
      <CardFooter className="p-6 border-t">
        <Skeleton className="h-4 w-3/4" />
      </CardFooter>
    </Card>
  );
}
