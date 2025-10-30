'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCurrency } from '@/contexts/currency-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from 'recharts';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

interface Props {
  period: string;
  compact?: boolean;
}

export function IncomeExpensesChart({ period, compact = false }: Props) {
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area');
  const [showMovingAverage, setShowMovingAverage] = useState(false);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { formatCurrency, currencyConfig } = useCurrency();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/analytics/summary?period=${period}`);
        const data = await res.json();
        setMonthlyData(data.monthlyData || []);
      } catch (error) {

      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [period]);

  // Transform monthly data for charts
  const data = useMemo(() => {
    return monthlyData.map((item: any, index, arr) => {
      const month = new Date(item.month).toLocaleDateString('en-US', { month: 'short' });
      const income = Number(item.total_income || 0);
      const expenses = Number(item.total_expenses || 0);
      const savings = income - expenses;
      const cumulativeSavings = arr.slice(0, index + 1).reduce((sum, d) => 
        sum + (Number(d.total_income || 0) - Number(d.total_expenses || 0)), 0);
      
      // Calculate 3-month moving average
      let movingAvgIncome = income;
      let movingAvgExpenses = expenses;
      if (index >= 2) {
        const window = arr.slice(index - 2, index + 1);
        movingAvgIncome = window.reduce((sum, d) => sum + Number(d.total_income || 0), 0) / 3;
        movingAvgExpenses = window.reduce((sum, d) => sum + Number(d.total_expenses || 0), 0) / 3;
      }
      
      return {
        month,
        income,
        expenses,
        savings,
        cumulativeSavings,
        movingAvgIncome,
        movingAvgExpenses,
      };
    }).reverse(); // Reverse to show oldest first
  }, [monthlyData]);

  const stats = useMemo(() => {
    const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
    const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);
    const avgIncome = totalIncome / data.length;
    const avgExpenses = totalExpenses / data.length;
    const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;

    return {
      totalIncome,
      totalExpenses,
      avgIncome,
      avgExpenses,
      savingsRate,
      totalSavings: totalIncome - totalExpenses,
    };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-medium">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

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
          No income/expense data available for this period
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-xs" />
          <YAxis 
            className="text-xs" 
            tickFormatter={(value) => {
              if (value >= 1000 || value <= -1000) {
                return `${currencyConfig.symbol}${(value / 1000).toFixed(1)}k`;
              }
              return `${currencyConfig.symbol}${value}`;
            }} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#10b981"
            fill="url(#colorIncome)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="#ef4444"
            fill="url(#colorExpenses)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Income</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatCurrency(stats.avgIncome)}/mo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatCurrency(stats.avgExpenses)}/mo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Savings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.totalSavings)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalSavings > 0 ? (
                <span className="text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Positive
                </span>
              ) : (
                <span className="text-red-600 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Negative
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Savings Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.savingsRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Of total income</p>
          </CardContent>
        </Card>
      </div>

      {/* Income vs Expenses Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Income vs Expenses Trend</CardTitle>
              <CardDescription>Monthly comparison with cumulative savings</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                Line
              </Button>
              <Button
                variant={chartType === 'area' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('area')}
              >
                Area
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                Bar
              </Button>
              <Button
                variant={showMovingAverage ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowMovingAverage(!showMovingAverage)}
              >
                MA
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            {chartType === 'line' ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" />
                <YAxis 
                  yAxisId="left" 
                  tickFormatter={(v) => {
                    if (v >= 1000 || v <= -1000) {
                      return `${currencyConfig.symbol}${(v / 1000).toFixed(1)}k`;
                    }
                    return `${currencyConfig.symbol}${v}`;
                  }} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Income"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Expenses"
                />
                {showMovingAverage && (
                  <>
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="movingAvgIncome"
                      stroke="#10b981"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Income MA"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="movingAvgExpenses"
                      stroke="#ef4444"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Expenses MA"
                    />
                  </>
                )}
                <Brush dataKey="month" height={30} stroke="#8884d8" />
              </LineChart>
            ) : chartType === 'area' ? (
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" />
                <YAxis 
                  tickFormatter={(v) => {
                    if (v >= 1000 || v <= -1000) {
                      return `${currencyConfig.symbol}${(v / 1000).toFixed(1)}k`;
                    }
                    return `${currencyConfig.symbol}${v}`;
                  }} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  fill="url(#colorIncome)"
                  strokeWidth={2}
                  name="Income"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  fill="url(#colorExpenses)"
                  strokeWidth={2}
                  name="Expenses"
                />
                <Brush dataKey="month" height={30} stroke="#8884d8" />
              </AreaChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" />
                <YAxis 
                  tickFormatter={(v) => {
                    if (v >= 1000 || v <= -1000) {
                      return `${currencyConfig.symbol}${(v / 1000).toFixed(1)}k`;
                    }
                    return `${currencyConfig.symbol}${v}`;
                  }} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                <Brush dataKey="month" height={30} stroke="#8884d8" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cumulative Savings Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cumulative Savings</CardTitle>
          <CardDescription>Total accumulated savings over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" />
              <YAxis 
                tickFormatter={(v) => {
                  if (v >= 1000 || v <= -1000) {
                    return `${currencyConfig.symbol}${(v / 1000).toFixed(1)}k`;
                  }
                  return `${currencyConfig.symbol}${v}`;
                }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulativeSavings"
                stroke="#3b82f6"
                fill="url(#colorCumulative)"
                strokeWidth={2}
                name="Cumulative Savings"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
