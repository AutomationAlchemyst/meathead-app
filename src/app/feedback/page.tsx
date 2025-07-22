
'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageCircle, Send, Star, ExternalLink } from 'lucide-react';
import { submitFeedback } from '@/actions/feedback';

const feedbackFormSchema = z.object({
  rating: z.string().min(1, { message: 'Please select a rating.' }),
  comments: z.string().min(10, { message: 'Please provide at least 10 characters of feedback.' }).max(5000, "Feedback cannot exceed 5000 characters."),
});

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

const ratingOptions = [
  { value: 'Excellent', label: 'Excellent ⭐⭐⭐⭐⭐' },
  { value: 'Good', label: 'Good ⭐⭐⭐⭐' },
  { value: 'Average', label: 'Average ⭐⭐⭐' },
  { value: 'Poor', label: 'Poor ⭐⭐' },
  { value: 'Very Poor', label: 'Very Poor ⭐' },
];

export default function FeedbackPage() {
  const { user, userProfile, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpeningSheet, setIsOpeningSheet] = useState(false);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      rating: '',
      comments: '',
    },
  });

  const onSubmit = async (data: FeedbackFormValues) => {
    if (!user) {
      toast({ title: 'Not Logged In', description: 'Please log in to submit feedback.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const result = await submitFeedback(
      user.uid,
      userProfile?.displayName || user.displayName || null,
      user.email || null,
      data.rating,
      data.comments
    );

    if (result.success) {
      toast({ title: 'Feedback Submitted!', description: "Thanks for helping us improve MeatHead!" });
      form.reset();
    } else {
      let errorMsg = "Failed to submit feedback. Please try again.";
      if (typeof result.error === 'string') {
        errorMsg = result.error;
      } else if (result.error && typeof result.error === 'object' && 'comments' in result.error) {
        const commentError = (result.error as any).comments;
        if (Array.isArray(commentError) && commentError.length > 0) {
             errorMsg = commentError[0];
        } else if (typeof commentError === 'string') {
            errorMsg = commentError;
        }
      } else if (result.error && typeof result.error === 'object' && 'rating' in result.error) {
        const ratingError = (result.error as any).rating;
         if (Array.isArray(ratingError) && ratingError.length > 0) {
             errorMsg = ratingError[0];
        } else if (typeof ratingError === 'string') {
            errorMsg = ratingError;
        }
      }
      toast({ title: 'Submission Failed', description: errorMsg, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleOpenSheet = () => {
    if (!isAdmin) {
      toast({ title: 'Unauthorized', description: 'This action is for administrators only.', variant: 'destructive' });
      return;
    }

    const sheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID;
    if (!sheetId) {
      toast({ title: 'Configuration Error', description: 'Google Sheet ID is not configured for client-side access. Admins should check .env.local for NEXT_PUBLIC_GOOGLE_SHEET_ID.', variant: 'destructive' });
      console.error("NEXT_PUBLIC_GOOGLE_SHEET_ID is not set in environment variables.");
      return;
    }
    setIsOpeningSheet(true);
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;
    window.open(sheetUrl, '_blank');
    toast({ title: 'Opening Sheet', description: 'Attempting to open the feedback Google Sheet.' });
    setTimeout(() => setIsOpeningSheet(false), 1000);
  };
  
  if (authLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8 px-4 flex justify-center items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader className="text-center">
            <MessageCircle className="mx-auto h-12 w-12 text-primary mb-2" />
            <CardTitle className="text-3xl font-headline">Share Your Feedback</CardTitle>
            <CardDescription>We value your opinion! Help us make MeatHead better.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="rating" className="flex items-center">
                  <Star className="mr-2 h-4 w-4 text-muted-foreground" />
                  Overall Experience
                </Label>
                <Controller
                  name="rating"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <SelectTrigger id="rating">
                        <SelectValue placeholder="Select your rating" />
                      </SelectTrigger>
                      <SelectContent>
                        {ratingOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.rating && <p className="text-sm text-destructive">{form.formState.errors.rating.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Your Feedback & Suggestions</Label>
                <Textarea
                  id="comments"
                  {...form.register('comments')}
                  placeholder="Tell us what you think, what features you'd like, or any issues you've encountered..."
                  rows={6}
                  disabled={isSubmitting}
                />
                {form.formState.errors.comments && <p className="text-sm text-destructive">{form.formState.errors.comments.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || !user}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit Feedback
              </Button>
            </form>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="max-w-2xl mx-auto shadow-lg mt-8">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-primary">Admin Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleOpenSheet} disabled={isOpeningSheet || !user} className="w-full">
                {isOpeningSheet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                Open Feedback Sheet
              </Button>
            </CardContent>
             <CardFooter>
                <p className="text-xs text-muted-foreground">This section is visible to administrators only.</p>
            </CardFooter>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
