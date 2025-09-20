'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// REMOVED: CardFooter from import as it's no longer used for footer content here
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
// REMOVED: WFGLogo import as CardFooter containing it is removed.

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    console.log('[LoginForm] onSubmit started. Attempting to log in user:', data.email);

    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      console.log('[LoginForm] signInWithEmailAndPassword successful for email:', data.email);
      toast({ title: 'Login Successful', description: 'Welcome back! Redirecting...' });
    } catch (error: any) {
      console.error('[LoginForm] Login failed. Firebase error:', error);
      let description = 'An unknown error occurred during login.';
      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-credential':
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            description = 'Invalid email or password. Please check your credentials and try again.';
            break;
          case 'auth/too-many-requests':
            description = 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
            break;
          case 'auth/network-request-failed':
            description = 'Network error. Please check your internet connection and try again.';
            break;
          default:
            description = `Login error: ${error.message}`;
        }
      }
      toast({ title: 'Login Failed', description, variant: 'destructive' });
      console.log('[LoginForm] Login failed toast displayed.');
    } finally {
      setIsLoading(false);
      console.log('[LoginForm] onSubmit finished.');
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline text-center text-primary">Login to MeatHead</CardTitle>
        <CardDescription className="text-center">Enter your credentials to access your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            Login
          </Button>
        </form>
      </CardContent>
      <div className="p-6 pt-0 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
          Sign Up
        </Link>
      </div>
    </Card>
  );
}
