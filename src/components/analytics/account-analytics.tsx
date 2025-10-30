'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  period: string;
}

export function AccountAnalytics({ period }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Analytics</CardTitle>
        <CardDescription>Account balance trends and performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground">Account analytics coming soon...</div>
      </CardContent>
    </Card>
  );
}
