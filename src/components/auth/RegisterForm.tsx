
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { registerUser } from '@/actions/auth';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const registerSchema = z.object({
  displayName: z.string().min(2, { message: 'Display name must be at least 2 characters.'}).optional(),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter(); // Keep for potential future use
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    const formData = new FormData();
    if(data.displayName) formData.append('displayName', data.displayName);
    formData.append('email', data.email);
    formData.append('password', data.password);

    const result = await registerUser(formData);

    // No router.refresh() here

    if (result?.error) {
       if (typeof result.error === 'string') {
        toast({ title: 'Registration Failed', description: result.error, variant: 'destructive' });
      } else {
        const fieldErrors = Object.values(result.error).flat().join(' ');
        toast({ title: 'Registration Failed', description: fieldErrors || 'Please check your input.', variant: 'destructive' });
      }
    } else if (result?.success) {
      toast({ title: 'Registration Successful', description: 'Welcome to MeatHead!' });
      // Page-level useEffect (RegisterPage) will handle redirect based on AuthContext update.
    }
    setIsLoading(false); // Set loading false after toast and all processing
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline text-center text-primary">Create Account</CardTitle>
        <CardDescription className="text-center">Join MeatHead to start tracking your fitness.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
           <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Your Name"
              {...form.register('displayName')}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              (Optional. If blank, we'll use the part of your email before the '@' symbol.)
            </p>
            {form.formState.errors.displayName && (
              <p className="text-sm text-destructive">{form.formState.errors.displayName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...form.register('email')}
              disabled={isLoading}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
             <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...form.register('password')}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

