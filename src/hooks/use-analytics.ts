import { useState, useEffect } from 'react';

export type TimePeriod = '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface MonthlySummary {
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  avgSavingsRate: number;
  incomeChange: number;
  expenseChange: number;
  savingsChange: number;
  totalMonths: number;
}

interface CategoryData {
  category_id: string;
  category_name: string;
  category_icon: string | null;
  category_color: string | null;
  category_type: string;
  total_amount: number;
  transaction_count: number;
}

interface TopSpending {
  name: string;
  amount: number;
  count: number;
}

interface MerchantData {
  merchant_name: string;
  total_spent: number;
  transaction_count: number;
  avg_transaction: number;
  first_transaction_date: string;
  last_transaction_date: string;
}

interface HealthScore {
  overall_score: number;
  savings_score: number;
  spending_score: number;
  budget_score: number;
  consistency_score: number;
  trend_score: number;
  grade: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface PeakExpenseDay {
  day: number;
  totalAmount: number;
  label: string;
}

interface TrendData {
  period: string;
  total_spent: number;
  total_income: number;
  net_savings: number;
  transaction_count: number;
  avg_daily_spending: number;
  trend_direction: string;
  trend_percentage: number;
  top_category: string;
  top_category_amount: number;
}

interface AnalyticsData {
  summary: MonthlySummary | null;
  categories: CategoryData[];
  topSpending: TopSpending | null;
  merchants: MerchantData[];
  healthScore: HealthScore | null;
  peakExpenseDay: PeakExpenseDay | null;
  trends: TrendData[];
  isLoading: boolean;
  error: string | null;
}

export function useAnalytics(period: TimePeriod = '6M') {
  const [data, setData] = useState<AnalyticsData>({
    summary: null,
    categories: [],
    topSpending: null,
    merchants: [],
    healthScore: null,
    peakExpenseDay: null,
    trends: [],
    isLoading: true,
    error: null,
  });

  const fetchAnalytics = async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch all analytics data in parallel
      const [summaryRes, categoriesRes, merchantsRes, healthScoreRes, patternsRes, trendsRes] = 
        await Promise.all([
          fetch(`/api/analytics/summary?period=${period}`),
          fetch(`/api/analytics/categories?period=${period}`),
          fetch(`/api/analytics/merchants?period=${period}`),
          fetch(`/api/analytics/health-score`),
          fetch(`/api/analytics/patterns?period=${period}`),
          fetch(`/api/analytics/trends?period=${period}`),
        ]);

      // Check for errors
      if (!summaryRes.ok || !categoriesRes.ok || !merchantsRes.ok || 
          !healthScoreRes.ok || !patternsRes.ok || !trendsRes.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      // Parse responses
      const summaryData = await summaryRes.json();
      const categoriesData = await categoriesRes.json();
      const merchantsData = await merchantsRes.json();
      const healthScoreData = await healthScoreRes.json();
      const patternsData = await patternsRes.json();
      const trendsData = await trendsRes.json();

      setData({
        summary: summaryData.summary,
        categories: categoriesData.categories || [],
        topSpending: categoriesData.topSpending,
        merchants: merchantsData.merchants || [],
        healthScore: healthScoreData.healthScore,
        peakExpenseDay: patternsData.peakExpenseDay,
        trends: trendsData.trends || [],
        isLoading: false,
        error: null,
      });
    } catch (error) {

      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics',
      }));
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  return {
    ...data,
    refetch: fetchAnalytics,
  };
}
