# Intelligent Insights System Documentation

## Overview

The Intelligent Insights System automatically analyzes your financial data to provide personalized recommendations, detect patterns, identify savings opportunities, and predict future trends.

## Features

### 1. Spending Pattern Insights

Automatically detects and reports on your spending behaviors:

- **Category Spending Changes**: Alerts when spending in a category increases or decreases by 25%+
  - Example: "Your grocery spending increased 35% this month ($1,800 vs $1,333)"
  - Severity: Warning (increase) or Positive (decrease)
  - Priority: High if change > 50%, Medium otherwise

- **Weekend vs Weekday Patterns**: Identifies if you spend significantly more on weekends
  - Example: "You typically spend 45% more on weekends ($120/day vs $83/day)"
  - Severity: Neutral
  - Priority: Low

- **Small Recurring Expenses**: Finds frequent small purchases that add up
  - Example: "Your morning coffee runs at Starbucks add up to $120/month (24 transactions)"
  - Severity: Neutral
  - Priority: Medium
  - Actions: View merchant, Create budget

### 2. Saving Opportunity Insights

Identifies ways to save money:

- **High Spending Categories**: Suggests reducing spending in top categories
  - Example: "You could save $50/month by reducing dining out by 15%"
  - Severity: Positive
  - Priority: High if savings > $200, Medium otherwise
  - Actions: View category, Set budget

- **Merchant Comparison**: Finds cheaper alternatives for same category
  - Example: "Shopping at Trader Joe's instead of Whole Foods could save you $85/month"
  - Severity: Positive
  - Priority: Medium
  - Actions: Compare merchants

- **Unused Subscriptions**: Detects recurring charges with no recent activity
  - Example: "Netflix charges $15/month but hasn't been used in 60+ days"
  - Severity: Warning
  - Priority: High
  - Potential savings: Annual amount ($180/year)
  - Actions: View transactions

### 3. Budget Recommendation Insights

Provides intelligent budget guidance:

- **Budget Too Low**: Alerts when consistently over budget (>120% utilization)
  - Example: "Your Groceries budget may be too low. Consider increasing from $400 to $440"
  - Severity: Warning
  - Priority: High
  - Actions: Adjust budget, View category

- **Budget Too High**: Identifies underutilized budgets (<50% utilization)
  - Example: "Entertainment budget underutilized. Consider reallocating $150 to other categories"
  - Severity: Neutral
  - Priority: Medium
  - Actions: Adjust budget, View all budgets

- **Missing Budgets**: Suggests creating budgets for high-spending categories
  - Example: "You spent $620 on Transportation but don't have a budget set"
  - Severity: Neutral
  - Priority: Medium
  - Actions: Create budget

### 4. Anomaly Detection Insights

Identifies unusual financial activity:

- **Unusual Large Expenses**: Detects expenses significantly above average
  - Example: "Unusual large expense of $850 detected at Best Buy (250% above average)"
  - Severity: Warning
  - Priority: High
  - Actions: View transaction

- **Spending Spikes**: Flags days with exceptionally high spending
  - Example: "You spent $1,200 on Dec 15th, which is 180% above your daily average"
  - Severity: Warning
  - Priority: Medium
  - Actions: View day

- **Missing Recurring Transactions**: Alerts when expected transactions don't appear
  - Example: "Your usual Netflix payment ($15) hasn't appeared this month"
  - Severity: Neutral
  - Priority: Low
  - Non-actionable (informational only)

### 5. Goal Tracking Insights

Monitors progress toward financial goals:

- **On Track Alerts**: Celebrates good progress
  - Example: "Great progress! You're 85% of the way to your $10,000 savings goal"
  - Severity: Positive
  - Priority: High
  - Shows: Current amount, remaining amount, progress percentage

- **Off Track Warnings**: Provides adjustment recommendations
  - Example: "To reach $10,000 in 6 months, increase monthly savings to $1,167"
  - Severity: Warning
  - Priority: High
  - Actions: View savings tips, Adjust goal

- **Savings Rate Analysis**: Compares your rate to recommended levels
  - Example: "Excellent! You're saving 25% of income (recommended: 20%)"
  - Severity: Positive
  - Priority: Medium

- **Month-over-Month Improvement**: Tracks savings improvements
  - Example: "You saved 18% more this month ($590 vs $500)"
  - Severity: Positive
  - Priority: Medium

### 6. Trend Prediction Insights

Uses historical data to predict future financial outcomes:

- **Expense Projections**: Predicts next month's spending
  - Example: "Based on trends, you're projected to spend $3,850 next month"
  - Severity: Warning (increasing) or Positive (decreasing)
  - Priority: Medium
  - Shows: Projection, trend direction, confidence level
  - Actions: View trends

- **Income Projections**: Forecasts upcoming income
  - Example: "Your projected income for next month is $5,200 based on recent trends"
  - Severity: Positive (increasing) or Warning (decreasing)
  - Priority: Medium

- **Goal Achievement Timeline**: Calculates when you'll reach goals
  - Example: "At $450/month savings, you'll reach $10,000 by August 2026"
  - Severity: Positive
  - Priority: High
  - Shows: Months to goal, target date

## Technical Implementation

### Database Schema

```sql
-- Main insights table
CREATE TABLE insights (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    type TEXT, -- spending_pattern, saving_opportunity, etc.
    severity TEXT, -- positive, negative, neutral, warning
    priority TEXT, -- low, medium, high, critical
    title TEXT,
    description TEXT,
    value DECIMAL,
    metadata JSONB,
    actionable BOOLEAN,
    actions JSONB,
    dismissed BOOLEAN,
    snoozed_until TIMESTAMPTZ,
    helpful BOOLEAN,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- Event tracking for ML
CREATE TABLE insight_history (
    id UUID PRIMARY KEY,
    insight_id UUID REFERENCES insights,
    user_id UUID REFERENCES auth.users,
    event_type TEXT, -- generated, viewed, dismissed, action_taken, etc.
    event_data JSONB,
    created_at TIMESTAMPTZ
);
```

### API Endpoints

#### Get Active Insights
```typescript
GET /api/insights
Response: { insights: Insight[] }
```

#### Generate New Insights
```typescript
POST /api/insights
Body: { regenerate?: boolean }
Response: { message: string, count: number, insights: Insight[] }
```

#### Dismiss Insight
```typescript
POST /api/insights/[id]/dismiss
Response: { success: boolean }
```

#### Snooze Insight
```typescript
POST /api/insights/[id]/snooze
Body: { days: number }
Response: { success: boolean, snoozedDays: number }
```

#### Mark Helpful/Not Helpful
```typescript
POST /api/insights/[id]/feedback
Body: { helpful: boolean }
Response: { success: boolean, helpful: boolean }
```

#### Record Action
```typescript
POST /api/insights/[id]/action
Body: { actionType: string, actionData?: object }
Response: { success: boolean }
```

#### Get Analytics
```typescript
GET /api/insights/analytics?days=30
Response: {
  analytics: {
    total_generated: number,
    total_dismissed: number,
    actions_taken: number,
    most_helpful_type: string,
    ...
  }
}
```

### React Hook

```typescript
import { useInsights } from '@/hooks/use-insights';

function MyComponent() {
  const {
    insights,
    loading,
    error,
    fetchInsights,
    generateInsights,
    dismissInsight,
    snoozeInsight,
    markHelpful,
    recordAction,
  } = useInsights();

  return (
    <InsightsList
      insights={insights}
      onDismiss={dismissInsight}
      onSnooze={snoozeInsight}
      onMarkHelpful={markHelpful}
    />
  );
}
```

### Components

#### InsightsCard
Displays a single insight with actions.

```typescript
<InsightsCard
  insight={insight}
  onDismiss={(id) => dismissInsight(id)}
  onSnooze={(id, days) => snoozeInsight(id, days)}
  onMarkHelpful={(id, helpful) => markHelpful(id, helpful)}
  compact={false} // or true for minimal view
/>
```

#### InsightsList
Displays multiple insights in a list.

```typescript
<InsightsList
  insights={insights}
  onDismiss={handleDismiss}
  onSnooze={handleSnooze}
  onMarkHelpful={handleMarkHelpful}
  compact={false}
  limit={5} // optional
/>
```

#### InsightsSummary
Dashboard widget showing overview and priority insights.

```typescript
<InsightsSummary
  insights={insights}
  onViewAll={() => router.push('/insights')}
/>
```

## Insight Generation

### Automatic Scheduling

Insights are automatically generated:
- **Daily**: After midnight, analyze previous day
- **Weekly**: Every Monday for weekly patterns
- **Monthly**: 1st of month for monthly analysis
- **On-demand**: Via API or user request

### Generation Logic

```typescript
// Generate all insights for a user
const insights = await generateAllInsights(userId);

// Individual generators
const spendingPatterns = await generateSpendingPatternInsights(userId, transactions, categories);
const savingOpportunities = await generateSavingOpportunityInsights(userId, transactions, categories);
const budgetRecommendations = await generateBudgetRecommendationInsights(userId, budgets, categories);
const anomalies = await generateAnomalyInsights(userId, transactions);
const goalTracking = await generateGoalTrackingInsights(userId, goal, current, income, expenses);
const predictions = await generateTrendPredictionInsights(userId, monthlyData);
```

### Data Requirements

Minimum data needed for insights:
- **Spending Patterns**: 2+ months of transactions
- **Saving Opportunities**: 1+ month of transactions, 3+ transactions per merchant
- **Budget Recommendations**: Active budgets with spending data
- **Anomalies**: 2+ weeks of transactions
- **Goal Tracking**: Defined savings goal + 1+ month data
- **Predictions**: 3+ months of historical data

## User Interface

### Insight Display

Each insight shows:
1. **Icon**: Based on insight type
2. **Title**: Clear, actionable headline
3. **Priority Badge**: Critical, High, Medium, Low
4. **Description**: Detailed explanation with numbers
5. **Value**: Financial impact (if applicable)
6. **Actions**: Quick action buttons
7. **Controls**: Dismiss, Snooze (1 day/1 week)
8. **Feedback**: Helpful/Not Helpful buttons
9. **Expiration**: When insight expires

### Color Coding

- **Positive** (Green): Good news, achievements, savings
- **Warning** (Amber): Attention needed, potential issues
- **Negative** (Red): Critical issues, overspending
- **Neutral** (Blue): Informational, patterns

### Action Types

1. **Create Budget**: Navigate to budget creation with pre-filled data
2. **View Transactions**: Filter transactions by criteria
3. **View Category**: Show category detail page
4. **View Merchant**: Filter by merchant
5. **Adjust Budget**: Open budget editor
6. **Set Goal**: Open goal setting modal
7. **View Analytics**: Navigate to specific analytics tab

## Machine Learning Integration

### Data Collection

Every insight interaction is tracked:
- Generation timestamp
- View events
- Dismissal/snooze events
- Action taken events
- Helpful/not helpful feedback

### Future ML Enhancements

1. **Personalized Thresholds**: Learn user-specific patterns
2. **Timing Optimization**: Send insights when most likely to act
3. **Content Personalization**: Adjust language and examples
4. **Priority Ranking**: ML-based priority instead of rule-based
5. **Predictive Accuracy**: Improve forecasts with user data
6. **Anomaly Detection**: Neural network for unusual patterns

## Testing

### Unit Tests

```typescript
describe('Insight Generators', () => {
  it('should generate spending pattern insights', async () => {
    const insights = await generateSpendingPatternInsights(userId, transactions, categories);
    expect(insights).toHaveLength(3);
    expect(insights[0].type).toBe('spending_pattern');
  });

  it('should detect unused subscriptions', async () => {
    const insights = await generateSavingOpportunityInsights(userId, transactions, categories);
    const subscription = insights.find(i => i.title.includes('Unused'));
    expect(subscription).toBeDefined();
  });
});
```

### Integration Tests

```typescript
describe('Insights API', () => {
  it('should fetch active insights', async () => {
    const response = await fetch('/api/insights');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.insights).toBeInstanceOf(Array);
  });

  it('should dismiss insight', async () => {
    const response = await fetch(`/api/insights/${insightId}/dismiss`, {
      method: 'POST',
    });
    expect(response.status).toBe(200);
  });
});
```

## Performance Considerations

1. **Caching**: Insights cached for 24 hours
2. **Incremental Generation**: Only analyze new data
3. **Materialized Views**: Use pre-aggregated analytics data
4. **Batch Processing**: Generate multiple users in background
5. **Rate Limiting**: Prevent excessive regeneration requests

## Privacy & Security

- All insights are user-specific (RLS enforced)
- No cross-user data sharing
- Insights automatically expire
- User can delete all insights
- Feedback data anonymized for ML

## Roadmap

### Phase 1 (Current)
- ✅ Core insight generators
- ✅ Database schema
- ✅ API endpoints
- ✅ React components
- ✅ Basic UI

### Phase 2 (Next)
- 🔄 Automated scheduling (cron jobs)
- 🔄 Email/push notifications
- 🔄 Insight preferences
- 🔄 Custom thresholds

### Phase 3 (Future)
- ⏳ ML-based personalization
- ⏳ Predictive analytics
- ⏳ Natural language generation
- ⏳ Voice-based insights

## Support

For issues or questions:
- Check [Analytics Documentation](./ANALYTICS_DOCUMENTATION.md)
- Review [API Reference](./API_REFERENCE.md)
- Contact support team
