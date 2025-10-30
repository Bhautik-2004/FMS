import { createClient } from '@/lib/supabase/client';

export type InsightType = 'spending_pattern' | 'saving_opportunity' | 'budget_recommendation' | 'anomaly' | 'goal_tracking' | 'trend_prediction';
export type InsightSeverity = 'positive' | 'negative' | 'neutral' | 'warning';
export type InsightPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Insight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  priority: InsightPriority;
  title: string;
  description: string;
  value?: number;
  metadata?: Record<string, any>;
  actionable: boolean;
  actions?: InsightAction[];
  createdAt: Date;
  expiresAt?: Date;
  dismissed?: boolean;
  helpful?: boolean;
}

export interface InsightAction {
  label: string;
  action: 'create_budget' | 'view_transactions' | 'view_category' | 'view_merchant' | 'adjust_budget' | 'set_goal' | 'view_analytics';
  params?: Record<string, any>;
}

interface TransactionData {
  id: string;
  amount: number;
  date: string;
  category_id?: string;
  merchant?: string;
  type: 'income' | 'expense';
}

interface CategorySpending {
  category_id: string;
  category_name: string;
  total: number;
  count: number;
  avg_amount: number;
}

interface BudgetData {
  id: string;
  category_id: string;
  amount: number;
  spent: number;
  remaining: number;
}

// ==================== SPENDING PATTERN INSIGHTS ====================

export async function generateSpendingPatternInsights(
  userId: string,
  transactions: TransactionData[],
  categorySpending: CategorySpending[]
): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  // 1. Category spending increase/decrease
  for (const category of categorySpending) {
    const currentMonthSpending = transactions
      .filter(t => t.category_id === category.category_id && new Date(t.date) >= lastMonth)
      .reduce((sum, t) => sum + t.amount, 0);

    const previousMonthSpending = transactions
      .filter(t => 
        t.category_id === category.category_id && 
        new Date(t.date) >= twoMonthsAgo && 
        new Date(t.date) < lastMonth
      )
      .reduce((sum, t) => sum + t.amount, 0);

    if (previousMonthSpending > 0) {
      const percentChange = ((currentMonthSpending - previousMonthSpending) / previousMonthSpending) * 100;

      if (Math.abs(percentChange) >= 25) {
        insights.push({
          id: `spending-change-${category.category_id}`,
          type: 'spending_pattern',
          severity: percentChange > 0 ? 'warning' : 'positive',
          priority: Math.abs(percentChange) >= 50 ? 'high' : 'medium',
          title: `${category.category_name} Spending ${percentChange > 0 ? 'Increased' : 'Decreased'}`,
          description: `Your ${category.category_name.toLowerCase()} spending ${percentChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(percentChange).toFixed(0)}% this month (${formatCurrency(currentMonthSpending)} vs ${formatCurrency(previousMonthSpending)})`,
          value: percentChange,
          metadata: {
            categoryId: category.category_id,
            categoryName: category.category_name,
            currentAmount: currentMonthSpending,
            previousAmount: previousMonthSpending,
          },
          actionable: true,
          actions: [
            {
              label: 'View Transactions',
              action: 'view_category',
              params: { categoryId: category.category_id },
            },
            {
              label: 'View Analytics',
              action: 'view_analytics',
              params: { tab: 'categories' },
            },
          ],
          createdAt: now,
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });
      }
    }
  }

  // 2. Weekend vs weekday spending patterns
  const weekendSpending = transactions
    .filter(t => {
      const date = new Date(t.date);
      return date.getDay() === 0 || date.getDay() === 6;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const weekdaySpending = transactions
    .filter(t => {
      const date = new Date(t.date);
      return date.getDay() !== 0 && date.getDay() !== 6;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const weekendDays = Math.floor(transactions.length / 7) * 2 || 1;
  const weekdayDays = Math.floor(transactions.length / 7) * 5 || 1;
  const avgWeekendSpending = weekendSpending / weekendDays;
  const avgWeekdaySpending = weekdaySpending / weekdayDays;

  if (avgWeekendSpending > avgWeekdaySpending * 1.3) {
    insights.push({
      id: 'weekend-spending-pattern',
      type: 'spending_pattern',
      severity: 'neutral',
      priority: 'low',
      title: 'Weekend Spending Pattern Detected',
      description: `You typically spend ${((avgWeekendSpending / avgWeekdaySpending - 1) * 100).toFixed(0)}% more on weekends (${formatCurrency(avgWeekendSpending)}/day) compared to weekdays (${formatCurrency(avgWeekdaySpending)}/day)`,
      value: avgWeekendSpending - avgWeekdaySpending,
      metadata: {
        avgWeekendSpending,
        avgWeekdaySpending,
      },
      actionable: true,
      actions: [
        {
          label: 'View Spending Patterns',
          action: 'view_analytics',
          params: { tab: 'patterns' },
        },
      ],
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
  }

  // 3. Small recurring expenses (e.g., coffee runs)
  const merchantFrequency = transactions.reduce((acc, t) => {
    if (t.merchant && t.amount < 20 && t.amount > 2) {
      acc[t.merchant] = (acc[t.merchant] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  for (const [merchant, count] of Object.entries(merchantFrequency)) {
    if (count >= 10) {
      const merchantTotal = transactions
        .filter(t => t.merchant === merchant)
        .reduce((sum, t) => sum + t.amount, 0);

      const monthlyEstimate = (merchantTotal / transactions.length) * 30;

      if (monthlyEstimate >= 50) {
        insights.push({
          id: `recurring-expense-${merchant}`,
          type: 'spending_pattern',
          severity: 'neutral',
          priority: 'medium',
          title: `Frequent Small Purchases at ${merchant}`,
          description: `Your purchases at ${merchant} add up to approximately ${formatCurrency(monthlyEstimate)}/month (${count} transactions)`,
          value: monthlyEstimate,
          metadata: {
            merchant,
            count,
            total: merchantTotal,
          },
          actionable: true,
          actions: [
            {
              label: 'View Merchant',
              action: 'view_merchant',
              params: { merchant },
            },
            {
              label: 'Create Budget',
              action: 'create_budget',
              params: { suggestedAmount: monthlyEstimate },
            },
          ],
          createdAt: now,
          expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days
        });
      }
    }
  }

  return insights;
}

// ==================== SAVING OPPORTUNITY INSIGHTS ====================

export async function generateSavingOpportunityInsights(
  userId: string,
  transactions: TransactionData[],
  categorySpending: CategorySpending[]
): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date();

  // 1. High spending categories with reduction potential
  const sortedCategories = [...categorySpending].sort((a, b) => b.total - a.total);
  
  for (const category of sortedCategories.slice(0, 3)) {
    const potentialSavings = category.total * 0.15; // Assume 15% reduction potential

    if (potentialSavings >= 50) {
      insights.push({
        id: `saving-opportunity-${category.category_id}`,
        type: 'saving_opportunity',
        severity: 'positive',
        priority: potentialSavings >= 200 ? 'high' : 'medium',
        title: `Potential Savings in ${category.category_name}`,
        description: `You could save approximately ${formatCurrency(potentialSavings)}/month by reducing ${category.category_name.toLowerCase()} spending by 15%`,
        value: potentialSavings,
        metadata: {
          categoryId: category.category_id,
          categoryName: category.category_name,
          currentSpending: category.total,
          targetSpending: category.total * 0.85,
        },
        actionable: true,
        actions: [
          {
            label: 'View Category',
            action: 'view_category',
            params: { categoryId: category.category_id },
          },
          {
            label: 'Set Budget',
            action: 'create_budget',
            params: { categoryId: category.category_id, amount: category.total * 0.85 },
          },
        ],
        createdAt: now,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      });
    }
  }

  // 2. Merchant comparison opportunities
  const merchantsByCategory = transactions.reduce((acc, t) => {
    if (t.merchant && t.category_id) {
      if (!acc[t.category_id]) acc[t.category_id] = {};
      if (!acc[t.category_id][t.merchant]) {
        acc[t.category_id][t.merchant] = { total: 0, count: 0 };
      }
      acc[t.category_id][t.merchant].total += t.amount;
      acc[t.category_id][t.merchant].count += 1;
    }
    return acc;
  }, {} as Record<string, Record<string, { total: number; count: number }>>);

  for (const [categoryId, merchants] of Object.entries(merchantsByCategory)) {
    const merchantList = Object.entries(merchants)
      .map(([name, data]) => ({ name, ...data, avg: data.total / data.count }))
      .sort((a, b) => b.total - a.total);

    if (merchantList.length >= 2) {
      const [expensive, cheaper] = merchantList;
      const priceDiff = expensive.avg - cheaper.avg;
      const potentialSavings = priceDiff * expensive.count;

      if (potentialSavings >= 30 && priceDiff / expensive.avg >= 0.2) {
        const category = categorySpending.find(c => c.category_id === categoryId);
        insights.push({
          id: `merchant-comparison-${categoryId}`,
          type: 'saving_opportunity',
          severity: 'positive',
          priority: 'medium',
          title: 'Merchant Savings Opportunity',
          description: `Shopping at ${cheaper.name} instead of ${expensive.name} could save you ${formatCurrency(potentialSavings)}/month in ${category?.category_name || 'this category'}`,
          value: potentialSavings,
          metadata: {
            categoryId,
            expensiveMerchant: expensive.name,
            cheaperMerchant: cheaper.name,
            avgExpensive: expensive.avg,
            avgCheaper: cheaper.avg,
          },
          actionable: true,
          actions: [
            {
              label: 'Compare Merchants',
              action: 'view_analytics',
              params: { tab: 'merchants' },
            },
          ],
          createdAt: now,
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        });
      }
    }
  }

  // 3. Unused subscriptions detection (recurring small charges with no activity)
  const recurringTransactions = findRecurringTransactions(transactions);
  const suspiciousSubscriptions = recurringTransactions.filter(r => 
    r.amount < 50 && 
    r.frequency >= 0.9 && 
    r.lastTransaction && 
    new Date().getTime() - new Date(r.lastTransaction).getTime() > 60 * 24 * 60 * 60 * 1000 // 60 days
  );

  for (const subscription of suspiciousSubscriptions) {
    insights.push({
      id: `unused-subscription-${subscription.merchant}`,
      type: 'saving_opportunity',
      severity: 'warning',
      priority: 'high',
      title: 'Potential Unused Subscription',
      description: `${subscription.merchant} charges ${formatCurrency(subscription.amount)}/month but hasn't been used in 60+ days. Consider canceling to save ${formatCurrency(subscription.amount * 12)}/year`,
      value: subscription.amount * 12,
      metadata: {
        merchant: subscription.merchant,
        amount: subscription.amount,
        lastTransaction: subscription.lastTransaction,
      },
      actionable: true,
      actions: [
        {
          label: 'View Transactions',
          action: 'view_merchant',
          params: { merchant: subscription.merchant },
        },
      ],
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });
  }

  return insights;
}

// ==================== BUDGET RECOMMENDATION INSIGHTS ====================

export async function generateBudgetRecommendationInsights(
  userId: string,
  budgets: BudgetData[],
  categorySpending: CategorySpending[]
): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date();

  for (const budget of budgets) {
    const utilization = budget.spent / budget.amount;
    const category = categorySpending.find(c => c.category_id === budget.category_id);

    // 1. Budget too low (consistently over budget)
    if (utilization >= 1.2) {
      insights.push({
        id: `budget-too-low-${budget.id}`,
        type: 'budget_recommendation',
        severity: 'warning',
        priority: 'high',
        title: `${category?.category_name} Budget May Be Too Low`,
        description: `You're consistently over budget in ${category?.category_name}. Consider increasing from ${formatCurrency(budget.amount)} to ${formatCurrency(budget.spent * 1.1)}`,
        value: budget.spent * 1.1 - budget.amount,
        metadata: {
          budgetId: budget.id,
          categoryId: budget.category_id,
          currentBudget: budget.amount,
          suggestedBudget: budget.spent * 1.1,
          utilization,
        },
        actionable: true,
        actions: [
          {
            label: 'Adjust Budget',
            action: 'adjust_budget',
            params: { budgetId: budget.id, amount: budget.spent * 1.1 },
          },
          {
            label: 'View Budget',
            action: 'view_category',
            params: { categoryId: budget.category_id },
          },
        ],
        createdAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      });
    }

    // 2. Budget too high (consistently under budget)
    if (utilization <= 0.5 && budget.amount >= 100) {
      const reallocationAmount = budget.amount - budget.spent;
      insights.push({
        id: `budget-too-high-${budget.id}`,
        type: 'budget_recommendation',
        severity: 'neutral',
        priority: 'medium',
        title: `${category?.category_name} Budget Underutilized`,
        description: `You're consistently under budget in ${category?.category_name}. Consider reallocating ${formatCurrency(reallocationAmount)} to other categories`,
        value: reallocationAmount,
        metadata: {
          budgetId: budget.id,
          categoryId: budget.category_id,
          currentBudget: budget.amount,
          suggestedBudget: budget.spent * 1.2,
          utilization,
        },
        actionable: true,
        actions: [
          {
            label: 'Adjust Budget',
            action: 'adjust_budget',
            params: { budgetId: budget.id, amount: budget.spent * 1.2 },
          },
          {
            label: 'View All Budgets',
            action: 'view_analytics',
            params: { tab: 'overview' },
          },
        ],
        createdAt: now,
        expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      });
    }
  }

  // 3. Missing budgets for high-spending categories
  const categoriesWithoutBudgets = categorySpending.filter(
    cs => !budgets.some(b => b.category_id === cs.category_id) && cs.total >= 200
  );

  for (const category of categoriesWithoutBudgets) {
    insights.push({
      id: `missing-budget-${category.category_id}`,
      type: 'budget_recommendation',
      severity: 'neutral',
      priority: 'medium',
      title: `Consider Creating Budget for ${category.category_name}`,
      description: `You spent ${formatCurrency(category.total)} on ${category.category_name.toLowerCase()} but don't have a budget set. Creating a budget helps track spending`,
      value: category.total,
      metadata: {
        categoryId: category.category_id,
        categoryName: category.category_name,
        suggestedBudget: category.total * 1.1,
      },
      actionable: true,
      actions: [
        {
          label: 'Create Budget',
          action: 'create_budget',
          params: { categoryId: category.category_id, amount: category.total * 1.1 },
        },
      ],
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });
  }

  return insights;
}

// ==================== ANOMALY DETECTION INSIGHTS ====================

export async function generateAnomalyInsights(
  userId: string,
  transactions: TransactionData[]
): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date();

  // 1. Unusual large expenses
  const avgExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0) / transactions.filter(t => t.type === 'expense').length;

  const largeExpenses = transactions.filter(
    t => t.type === 'expense' && t.amount > avgExpense * 3 && t.amount > 200
  );

  for (const expense of largeExpenses.slice(0, 3)) {
    const percentAboveAvg = ((expense.amount / avgExpense) - 1) * 100;
    const merchantText = expense.merchant ? ` at ${expense.merchant}` : '';
    
    insights.push({
      id: `large-expense-${expense.id}`,
      type: 'anomaly',
      severity: 'warning',
      priority: 'high',
      title: 'Unusual Large Expense Detected',
      description: `A large expense of ${formatCurrency(expense.amount)} was detected${merchantText} on ${new Date(expense.date).toLocaleDateString()}. This is ${percentAboveAvg.toFixed(0)}% above your average`,
      value: expense.amount,
      metadata: {
        transactionId: expense.id,
        amount: expense.amount,
        date: expense.date,
        merchant: expense.merchant,
        avgExpense,
      },
      actionable: true,
      actions: [
        {
          label: 'View Transaction',
          action: 'view_transactions',
          params: { transactionId: expense.id },
        },
      ],
      createdAt: now,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  // 2. Spending spikes
  const dailySpending = transactions.reduce((acc, t) => {
    const date = t.date.split('T')[0];
    if (t.type === 'expense') {
      acc[date] = (acc[date] || 0) + t.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const avgDailySpending = Object.values(dailySpending).reduce((sum, val) => sum + val, 0) / Object.keys(dailySpending).length;

  for (const [date, amount] of Object.entries(dailySpending)) {
    if (amount > avgDailySpending * 2.5 && amount > 300) {
      const percentAboveAvg = ((amount / avgDailySpending) - 1) * 100;
      
      insights.push({
        id: `spending-spike-${date}`,
        type: 'anomaly',
        severity: 'warning',
        priority: 'medium',
        title: 'Spending Spike Detected',
        description: `You spent ${formatCurrency(amount)} on ${new Date(date).toLocaleDateString()}, which is ${percentAboveAvg.toFixed(0)}% above your daily average`,
        value: amount,
        metadata: {
          date,
          amount,
          avgDailySpending,
        },
        actionable: true,
        actions: [
          {
            label: 'View Day',
            action: 'view_transactions',
            params: { date },
          },
        ],
        createdAt: now,
        expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      });
      break; // Only show one spike
    }
  }

  // 3. Missing recurring transactions
  const recurring = findRecurringTransactions(transactions);
  const now_ms = now.getTime();

  for (const recurrence of recurring) {
    if (recurrence.lastTransaction) {
      const daysSinceLastTransaction = (now_ms - new Date(recurrence.lastTransaction).getTime()) / (1000 * 60 * 60 * 24);
      const expectedDays = 30; // Assume monthly

      if (daysSinceLastTransaction > expectedDays + 5) {
        const merchantName = recurrence.merchant;
        const amountText = formatCurrency(recurrence.amount);
        
        insights.push({
          id: `missing-recurring-${recurrence.merchant}`,
          type: 'anomaly',
          severity: 'neutral',
          priority: 'low',
          title: 'Expected Transaction Not Found',
          description: `Your usual ${merchantName} transaction (${amountText}) has not appeared this month`,
          value: recurrence.amount,
          metadata: {
            merchant: recurrence.merchant,
            amount: recurrence.amount,
            lastTransaction: recurrence.lastTransaction,
            daysSince: Math.floor(daysSinceLastTransaction),
          },
          actionable: false,
          createdAt: now,
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        });
      }
    }
  }

  return insights;
}

// ==================== GOAL TRACKING INSIGHTS ====================

export async function generateGoalTrackingInsights(
  userId: string,
  savingsGoal: number,
  currentSavings: number,
  monthlyIncome: number,
  monthlyExpenses: number
): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date();
  const monthlySavings = monthlyIncome - monthlyExpenses;

  // 1. On track / off track
  if (savingsGoal > 0) {
    const progressPercent = (currentSavings / savingsGoal) * 100;

    if (progressPercent >= 80) {
      insights.push({
        id: 'goal-on-track',
        type: 'goal_tracking',
        severity: 'positive',
        priority: 'high',
        title: 'Great Progress on Savings Goal!',
        description: `You're ${progressPercent.toFixed(0)}% of the way to your savings goal of ${formatCurrency(savingsGoal)}. Keep up the great work!`,
        value: currentSavings,
        metadata: {
          goal: savingsGoal,
          current: currentSavings,
          remaining: savingsGoal - currentSavings,
          progressPercent,
        },
        actionable: false,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      });
    } else if (progressPercent < 50) {
      const monthsToGoal = Math.ceil((savingsGoal - currentSavings) / monthlySavings);
      const neededMonthlySavings = (savingsGoal - currentSavings) / 6; // Assume 6 month target

      insights.push({
        id: 'goal-off-track',
        type: 'goal_tracking',
        severity: 'warning',
        priority: 'high',
        title: 'Savings Goal Needs Attention',
        description: `You're ${progressPercent.toFixed(0)}% toward your goal. To reach ${formatCurrency(savingsGoal)} in 6 months, increase monthly savings to ${formatCurrency(neededMonthlySavings)}`,
        value: neededMonthlySavings - monthlySavings,
        metadata: {
          goal: savingsGoal,
          current: currentSavings,
          currentMonthlySavings: monthlySavings,
          neededMonthlySavings,
          monthsToGoal,
        },
        actionable: true,
        actions: [
          {
            label: 'View Savings Tips',
            action: 'view_analytics',
            params: { tab: 'overview' },
          },
          {
            label: 'Adjust Goal',
            action: 'set_goal',
            params: { amount: currentSavings + monthlySavings * 6 },
          },
        ],
        createdAt: now,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      });
    }
  }

  // 2. Savings rate comparison
  const savingsRate = (monthlySavings / monthlyIncome) * 100;
  const recommendedSavingsRate = 20;

  if (savingsRate > recommendedSavingsRate) {
    insights.push({
      id: 'savings-rate-excellent',
      type: 'goal_tracking',
      severity: 'positive',
      priority: 'medium',
      title: 'Excellent Savings Rate!',
      description: `You're saving ${savingsRate.toFixed(0)}% of your income, which is above the recommended ${recommendedSavingsRate}%. You're building wealth effectively!`,
      value: savingsRate,
      metadata: {
        savingsRate,
        monthlySavings,
        monthlyIncome,
      },
      actionable: false,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });
  } else if (savingsRate < 10) {
    insights.push({
      id: 'savings-rate-low',
      type: 'goal_tracking',
      severity: 'warning',
      priority: 'high',
      title: 'Low Savings Rate',
      description: `You're only saving ${savingsRate.toFixed(0)}% of your income. Try to reach at least ${recommendedSavingsRate}% by reducing expenses or increasing income`,
      value: savingsRate,
      metadata: {
        savingsRate,
        monthlySavings,
        monthlyIncome,
        targetSavings: monthlyIncome * (recommendedSavingsRate / 100),
      },
      actionable: true,
      actions: [
        {
          label: 'View Saving Opportunities',
          action: 'view_analytics',
          params: { tab: 'overview' },
        },
      ],
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });
  }

  // 3. Savings rate milestone
  if (savingsRate >= recommendedSavingsRate && savingsRate < recommendedSavingsRate + 5) {
    insights.push({
      id: 'savings-rate-milestone',
      type: 'goal_tracking',
      severity: 'positive',
      priority: 'medium',
      title: 'Savings Rate Milestone Reached!',
      description: `Congratulations! You've reached the recommended ${recommendedSavingsRate}% savings rate with ${savingsRate.toFixed(0)}% this month`,
      value: savingsRate,
      metadata: {
        savingsRate,
        monthlySavings,
        monthlyIncome,
      },
      actionable: false,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  return insights;
}

// ==================== TREND PREDICTION INSIGHTS ====================

export async function generateTrendPredictionInsights(
  userId: string,
  monthlyData: Array<{ month: string; income: number; expenses: number }>,
  savingsGoal?: number,
  currentSavings?: number
): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date();

  if (monthlyData.length < 3) {
    return insights; // Need at least 3 months for trends
  }

  // 1. Expense trend prediction
  const expenseTrend = calculateLinearTrend(monthlyData.map(d => d.expenses));
  const nextMonthExpenses = expenseTrend.predict(monthlyData.length);

  insights.push({
    id: 'expense-prediction',
    type: 'trend_prediction',
    severity: expenseTrend.slope > 0 ? 'warning' : 'positive',
    priority: 'medium',
    title: 'Next Month Expense Projection',
    description: `Based on your spending trends, you're projected to spend ${formatCurrency(nextMonthExpenses)} next month${expenseTrend.slope > 0 ? ', an increase from recent months' : ''}`,
    value: nextMonthExpenses,
    metadata: {
      projection: nextMonthExpenses,
      trend: expenseTrend.slope > 0 ? 'increasing' : 'decreasing',
      confidence: expenseTrend.r2,
    },
    actionable: true,
    actions: [
      {
        label: 'View Trends',
        action: 'view_analytics',
        params: { tab: 'time-series' },
      },
    ],
    createdAt: now,
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  });

  // 2. Income trend prediction
  const incomeTrend = calculateLinearTrend(monthlyData.map(d => d.income));
  const nextMonthIncome = incomeTrend.predict(monthlyData.length);

  insights.push({
    id: 'income-prediction',
    type: 'trend_prediction',
    severity: incomeTrend.slope > 0 ? 'positive' : 'warning',
    priority: 'medium',
    title: 'Next Month Income Projection',
    description: `Your projected income for next month is ${formatCurrency(nextMonthIncome)} based on recent trends`,
    value: nextMonthIncome,
    metadata: {
      projection: nextMonthIncome,
      trend: incomeTrend.slope > 0 ? 'increasing' : 'decreasing',
      confidence: incomeTrend.r2,
    },
    actionable: false,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  });

  // 3. Calculate average monthly savings from trend
  const savingsTrend = monthlyData.map(d => d.income - d.expenses);
  const avgMonthlySavings = savingsTrend.length > 0 
    ? savingsTrend.reduce((sum, val) => sum + val, 0) / savingsTrend.length 
    : 0;

  // Goal achievement prediction (only if goal exists)
  if (avgMonthlySavings > 0 && savingsGoal && currentSavings !== undefined && savingsGoal > currentSavings) {
    const monthsToGoal = Math.ceil((savingsGoal - currentSavings) / avgMonthlySavings);
    const targetDate = new Date(now);
    targetDate.setMonth(targetDate.getMonth() + monthsToGoal);

    insights.push({
      id: 'goal-achievement-prediction',
      type: 'trend_prediction',
      severity: 'positive',
      priority: 'high',
      title: 'Savings Goal Timeline',
      description: `At your current savings rate of ${formatCurrency(avgMonthlySavings)}/month, you'll reach your goal of ${formatCurrency(savingsGoal)} by ${targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      value: monthsToGoal,
      metadata: {
        goal: savingsGoal,
        current: currentSavings,
        monthlySavings: avgMonthlySavings,
        monthsToGoal,
        targetDate: targetDate.toISOString(),
      },
      actionable: false,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });
  }

  return insights;
}

// ==================== MAIN INSIGHT GENERATION ====================

export async function generateAllInsights(userId: string): Promise<Insight[]> {
  const supabase = createClient();
  
  // Fetch all required data
  const [transactionsRes, categoriesRes, budgetsRes, goalsRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, amount, date, category_id, merchant_name, type')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: false }),
    
    supabase
      .from('categories')
      .select('id, name, type'),
    
    supabase
      .from('budgets')
      .select('id, category_id, amount, period')
      .eq('user_id', userId),
    
    supabase
      .from('financial_goals')
      .select('id, target_amount, current_amount, target_date')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const transactions = ((transactionsRes.data || []) as any[]).map(t => ({
    ...t,
    merchant: t.merchant_name,
  })) as TransactionData[];
  
  // Build category lookup
  const categoryLookup = new Map();
  (categoriesRes.data || []).forEach((cat: any) => {
    categoryLookup.set(cat.id, cat);
  });
  
  // Calculate category spending from transactions
  const categorySpendingMap = new Map<string, CategorySpending>();
  transactions.forEach(t => {
    if (t.category_id && t.type === 'expense') {
      const category = categoryLookup.get(t.category_id);
      if (category) {
        const key = t.category_id;
        if (categorySpendingMap.has(key)) {
          const existing = categorySpendingMap.get(key)!;
          existing.total += t.amount;
          existing.count += 1;
          existing.avg_amount = existing.total / existing.count;
        } else {
          categorySpendingMap.set(key, {
            category_id: t.category_id,
            category_name: category.name,
            total: t.amount,
            count: 1,
            avg_amount: t.amount,
          });
        }
      }
    }
  });
  
  const categorySpending = Array.from(categorySpendingMap.values());
  
  // Calculate budget spent amounts from transactions
  const budgetSpentMap = new Map<string, number>();
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  transactions.forEach(t => {
    if (t.type === 'expense' && t.category_id && new Date(t.date) >= currentMonthStart) {
      const spent = budgetSpentMap.get(t.category_id) || 0;
      budgetSpentMap.set(t.category_id, spent + t.amount);
    }
  });
  
  const budgets = ((budgetsRes.data as any[]) || []).map((b: any) => {
    const spentAmount = budgetSpentMap.get(b.category_id) || 0;
    return {
      id: b.id,
      category_id: b.category_id,
      amount: b.amount,
      spent: spentAmount,
      remaining: b.amount - spentAmount,
    } as BudgetData;
  });
  
  // Calculate monthly data from transactions
  const monthlyDataMap = new Map<string, { income: number; expenses: number }>();
  transactions.forEach(t => {
    const monthKey = t.date.substring(0, 7); // YYYY-MM
    if (!monthlyDataMap.has(monthKey)) {
      monthlyDataMap.set(monthKey, { income: 0, expenses: 0 });
    }
    const monthData = monthlyDataMap.get(monthKey)!;
    if (t.type === 'income') monthData.income += t.amount;
    if (t.type === 'expense') monthData.expenses += t.amount;
  });
  
  const monthlyData = Array.from(monthlyDataMap.entries())
    .map(([month, data]) => ({ month: `${month}-01`, income: data.income, expenses: data.expenses }))
    .sort((a, b) => a.month.localeCompare(b.month));
  
  // Get goal data
  const activeGoal = goalsRes.data?.[0];
  const savingsGoal = activeGoal?.target_amount || 0;
  const currentSavings = activeGoal?.current_amount || 0;
  
  // Calculate current month income and expenses
  const currentMonthTransactions = transactions.filter(t => new Date(t.date) >= currentMonthStart);
  const monthlyIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Generate all insight types
  const [
    spendingPatterns,
    savingOpportunities,
    budgetRecommendations,
    anomalies,
    goalTracking,
    trendPredictions,
  ] = await Promise.all([
    generateSpendingPatternInsights(userId, transactions, categorySpending),
    generateSavingOpportunityInsights(userId, transactions, categorySpending),
    generateBudgetRecommendationInsights(userId, budgets, categorySpending),
    generateAnomalyInsights(userId, transactions),
    generateGoalTrackingInsights(userId, savingsGoal, currentSavings, monthlyIncome, monthlyExpenses),
    generateTrendPredictionInsights(userId, monthlyData, savingsGoal, currentSavings),
  ]);

  // Combine and sort by priority
  const allInsights = [
    ...spendingPatterns,
    ...savingOpportunities,
    ...budgetRecommendations,
    ...anomalies,
    ...goalTracking,
    ...trendPredictions,
  ];

  // Sort by priority and severity
  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  allInsights.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return allInsights;
}

// ==================== HELPER FUNCTIONS ====================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface RecurringTransaction {
  merchant: string;
  amount: number;
  frequency: number;
  lastTransaction?: string;
}

function findRecurringTransactions(transactions: TransactionData[]): RecurringTransaction[] {
  const merchantGroups = transactions.reduce((acc, t) => {
    if (t.merchant) {
      if (!acc[t.merchant]) acc[t.merchant] = [];
      acc[t.merchant].push(t);
    }
    return acc;
  }, {} as Record<string, TransactionData[]>);

  const recurring: RecurringTransaction[] = [];

  for (const [merchant, txns] of Object.entries(merchantGroups)) {
    if (txns.length >= 3) {
      const amounts = txns.map(t => t.amount);
      const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      const variance = amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);

      // Low variance indicates recurring pattern
      if (stdDev / avgAmount < 0.15) {
        recurring.push({
          merchant,
          amount: avgAmount,
          frequency: txns.length / 3, // transactions per month (assuming 3 month window)
          lastTransaction: txns[0].date,
        });
      }
    }
  }

  return recurring;
}

function calculateLinearTrend(values: number[]): { slope: number; intercept: number; r2: number; predict: (x: number) => number } {
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = values.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
  const sumY2 = values.reduce((sum, val) => sum + val * val, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R²
  const yMean = sumY / n;
  const ssTotal = values.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
  const ssResidual = values.reduce((sum, val, i) => {
    const predicted = slope * i + intercept;
    return sum + Math.pow(val - predicted, 2);
  }, 0);
  const r2 = 1 - (ssResidual / ssTotal);

  return {
    slope,
    intercept,
    r2,
    predict: (xVal: number) => slope * xVal + intercept,
  };
}
