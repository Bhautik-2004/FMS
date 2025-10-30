'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  data: Array<{ value: number }>;
  positive?: boolean;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  data,
  positive = true,
}: StatCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isPositive = change >= 0;
  const trendColor = positive
    ? isPositive
      ? 'text-green-600'
      : 'text-red-600'
    : isPositive
    ? 'text-red-600'
    : 'text-green-600';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-xs">
            {isPositive ? (
              <TrendingUp className={cn('h-4 w-4', trendColor)} />
            ) : (
              <TrendingDown className={cn('h-4 w-4', trendColor)} />
            )}
            <span className={cn('font-medium', trendColor)}>
              {Math.abs(change)}%
            </span>
            <span className="text-muted-foreground ml-1">{changeLabel}</span>
          </div>
          <div className="h-8 w-20 border rounded-md p-1 bg-background/50">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={isPositive ? '#22c55e' : '#ef4444'}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor={isPositive ? '#22c55e' : '#ef4444'}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={isPositive ? '#22c55e' : '#ef4444'}
                    strokeWidth={2}
                    fill={`url(#gradient-${title})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full animate-pulse bg-muted rounded-sm" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
