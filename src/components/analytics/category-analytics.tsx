'use client';

import { useEffect, useState } from 'react';
import { useCurrency } from '@/contexts/currency-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieLabelRenderProps } from 'recharts';
import { Loader2 } from 'lucide-react';

interface Props {
  period: string;
  compact?: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function CategoryAnalytics({ period, compact = false }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/analytics/categories?period=${period}`);
        const result = await res.json();
        
        // Transform categories data for charts
        const categoryData = (result.categories || [])
          .filter((c: any) => c.category_type === 'expense') // Only show expenses
          .slice(0, 8) // Top 8 categories
          .map((c: any) => ({
            name: c.category_name,
            value: Number(c.total_amount || 0),
            count: Number(c.transaction_count || 0),
          }));
        
        setData(categoryData);
      } catch (error) {

      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [period]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No category data available
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(props: PieLabelRenderProps) => {
              const { name, percent } = props;
              const percentValue = typeof percent === 'number' ? percent : 0;
              return `${name}: ${(percentValue * 100).toFixed(0)}%`;
            }}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Analytics</CardTitle>
        <CardDescription>Top spending categories</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Bar dataKey="value" fill="#3b82f6" name="Amount" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
