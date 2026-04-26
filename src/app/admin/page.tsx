'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Download, Users, Crown, Mail, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface SubscriberRecord {
  uid: string;
  email: string | null;
  createdAt: Timestamp | null;
  displayName: string | null;
  isPremium: boolean;
  currentWeight: number | null;
  targetWeight: number | null;
}

const ADMIN_EMAIL = 'aththaariq001@gmail.com'; // Your email - only you can access

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [subscribers, setSubscribers] = useState<SubscriberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!loading && !user) {
      setIsLoading(false);
      return;
    }

    if (!loading && user?.email !== ADMIN_EMAIL) {
      setIsLoading(false);
      return;
    }

    const fetchSubscribers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        const records: SubscriberRecord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          records.push({
            uid: doc.id,
            email: data.email || null,
            createdAt: data.createdAt || null,
            displayName: data.displayName || null,
            isPremium: data.isPremium || false,
            currentWeight: data.currentWeight || null,
            targetWeight: data.targetWeight || null,
          });
        });

        setSubscribers(records);
      } catch (err: any) {
        setError('Failed to load subscribers: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.email === ADMIN_EMAIL) {
      fetchSubscribers();
    }
  }, [user, loading]);

  const exportToCSV = () => {
    const headers = ['Email', 'Display Name', 'Joined', 'Premium', 'Current Weight (kg)', 'Target Weight (kg)'];
    const rows = subscribers.map((sub) => [
      sub.email || '',
      sub.displayName || '',
      sub.createdAt ? format(sub.createdAt.toDate(), 'yyyy-MM-dd') : '',
      sub.isPremium ? 'Yes' : 'No',
      sub.currentWeight || '',
      sub.targetWeight || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join(
        '\n'
      );

    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `meathead-subscribers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="p-8 text-center">
              <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p className="text-muted-foreground mt-2">Please log in to access the admin panel.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (user.email !== ADMIN_EMAIL) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="p-8 text-center">
              <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold">Admin Only</h2>
              <p className="text-muted-foreground mt-2">
                You don't have permission to view this page.
                <br />
                <span className="text-sm">Admin email: {ADMIN_EMAIL}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const premiumCount = subscribers.filter((s) => s.isPremium).length;
  const freeCount = subscribers.length - premiumCount;

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline">Subscriber Admin</h1>
            <p className="text-muted-foreground mt-1">Manage your subscribers for marketing and outreach</p>
          </div>
          <Button onClick={exportToCSV} disabled={subscribers.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4 text-destructive">{error}</CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Users className="mr-2 h-4 w-4" /> Total Subscribers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{subscribers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Crown className="mr-2 h-4 w-4 text-amber-500" /> Premium
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-500">{premiumCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Mail className="mr-2 h-4 w-4" /> Free Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{freeCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Subscriber List */}
        <Card>
          <CardHeader>
            <CardTitle>Subscriber List</CardTitle>
            <CardDescription>
              {subscribers.length} total users registered
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscribers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No subscribers yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Email</th>
                      <th className="text-left py-3 px-2 font-medium hidden sm:table-cell">Name</th>
                      <th className="text-left py-3 px-2 font-medium">Joined</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                      <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((sub) => (
                      <tr key={sub.uid} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <span className="break-all">{sub.email || 'No email'}</span>
                        </td>
                        <td className="py-3 px-2 hidden sm:table-cell">
                          {sub.displayName || '-'}
                        </td>
                        <td className="py-3 px-2">
                          {sub.createdAt
                            ? format(sub.createdAt.toDate(), 'MMM d, yyyy')
                            : '-'}
                        </td>
                        <td className="py-3 px-2">
                          {sub.isPremium ? (
                            <Badge variant="default" className="bg-amber-500">
                              Premium
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Free</Badge>
                          )}
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell">
                          {sub.currentWeight
                            ? `${sub.currentWeight} → ${sub.targetWeight || '?'} kg`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
