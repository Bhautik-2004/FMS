# Analytics Dashboard Documentation

## Overview

The Analytics Dashboard provides comprehensive financial insights with interactive visualizations, pattern detection, and custom reporting capabilities.

## Features

### 1. Financial Health Score

**Location:** Overview Tab

**Features:**
- Overall score (0-100) with letter grade (A+ to F)
- Component breakdown:
  - Savings Score (0-30 points)
  - Spending Score (0-25 points)
  - Budget Score (0-25 points)
  - Consistency Score (0-10 points)
  - Trend Score (0-10 points)
- Strengths and weaknesses identification
- Actionable recommendations

**API Integration:**
```typescript
// Call the financial health score function
const { data, error } = await supabase.rpc('calculate_financial_health_score', {
  p_user_id: userId
});
```

### 2. Time Series Analysis

**Location:** Time Series Tab

**Features:**
- Income vs Expenses visualization (Line, Area, Bar charts)
- Time period selector (1M, 3M, 6M, 1Y, All)
- Interactive zoom and brush
- 3-month moving averages overlay
- Cumulative savings chart
- Summary statistics cards

**Chart Types:**
- **Line Chart:** Detailed trend visualization
- **Area Chart:** Filled visualization with gradients
- **Bar Chart:** Month-by-month comparison

**API Integration:**
```typescript
// Get monthly summary data
const { data: monthlyData } = await supabase
  .from('monthly_summary')
  .select('*')
  .eq('user_id', userId)
  .gte('month', startDate)
  .lte('month', endDate)
  .order('month', { ascending: true });
```

### 3. Category Analytics

**Location:** Categories Tab

**Features:**
- Category spending distribution (Pie, Donut, Treemap)
- Subcategory drill-down
- Year-over-year comparison
- Month-over-month growth rates
- Category trends over time
- Percentage of total spending

**API Integration:**
```typescript
// Get category spending data
const { data: categoryData } = await supabase
  .from('category_spending')
  .select('*')
  .eq('user_id', userId)
  .gte('month', startDate)
  .order('total_amount', { ascending: false });
```

### 4. Spending Patterns

**Location:** Patterns Tab

**Features:**
- Heatmap of spending by day of week and hour
- Monthly spending cycle visualization
- Seasonal patterns detection
- Day of month spending distribution
- Peak spending identification

**API Integration:**
```typescript
// Get transactions for pattern analysis
const { data: transactions } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId)
  .eq('type', 'expense')
  .gte('date', startDate);
```

### 5. Merchant Analytics

**Location:** Merchants Tab

**Features:**
- Top merchants by spending
- Merchant frequency analysis
- Average transaction by merchant
- Merchant category mapping
- Active vs inactive merchants
- Account distribution per merchant

**API Integration:**
```typescript
// Get merchant analytics
const { data: merchants } = await supabase
  .from('merchant_analytics')
  .select('*')
  .eq('user_id', userId)
  .order('total_spent', { ascending: false })
  .limit(20);
```

### 6. Account Analytics

**Location:** Accounts Tab

**Features:**
- Account balance trends
- Cash flow analysis per account
- Account utilization rates
- Account performance comparison
- Net worth tracking
- Account-level income/expense breakdown

**API Integration:**
```typescript
// Get account data
const { data: accounts } = await supabase
  .from('accounts')
  .select('*')
  .eq('user_id', userId)
  .eq('is_active', true);
```

### 7. Custom Reports

**Location:** Reports Tab

**Features:**
- Report builder with filters
- Save custom report configurations
- Schedule automated reports (email/PDF)
- Export to PDF/Excel/CSV
- Report templates
- Share reports

## Time Period Selector

All analytics support flexible time periods:
- **1M:** Last 30 days
- **3M:** Last 90 days
- **6M:** Last 180 days
- **1Y:** Last 365 days
- **ALL:** All available data

## Export Functionality

### Supported Formats

1. **PDF Export:**
   - Full page report with charts
   - Summary statistics
   - Formatted tables

2. **Excel Export:**
   - Multiple worksheets
   - Raw data + charts
   - Formulas for calculations

3. **CSV Export:**
   - Raw data export
   - Compatible with all spreadsheet software

### Implementation

```typescript
const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
  // Gather data
  const reportData = {
    healthScore,
    monthlyData,
    categoryData,
    // ... other data
  };

  // Call export API
  const response = await fetch('/api/analytics/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, data: reportData }),
  });

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financial-report-${Date.now()}.${format}`;
  a.click();
};
```

## Chart Customization

### Recharts Configuration

All charts use Recharts with consistent theming:

```typescript
// Color palette
const COLORS = {
  income: '#10b981',    // green
  expenses: '#ef4444',  // red
  savings: '#3b82f6',   // blue
  categories: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
};

// Responsive container
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={data}>
    {/* Chart configuration */}
  </LineChart>
</ResponsiveContainer>
```

### Custom Tooltips

```typescript
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-medium">{formatValue(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};
```

## Performance Optimization

### Materialized Views

All analytics use pre-aggregated materialized views for fast queries:

```sql
-- Refresh analytics data
SELECT refresh_analytics_views();

-- Schedule automatic refresh (pg_cron)
SELECT cron.schedule(
  'refresh-analytics-daily',
  '0 2 * * *',
  $$SELECT refresh_analytics_views();$$
);
```

### Client-Side Caching

```typescript
// Use React Query for caching
const { data, isLoading } = useQuery({
  queryKey: ['analytics', 'monthly-summary', userId, period],
  queryFn: () => fetchMonthlySummary(userId, period),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

## Responsive Design

All charts are fully responsive:
- Mobile: Single column layout, compact charts
- Tablet: 2-column layout
- Desktop: Multi-column with full-size charts

## Accessibility

- Keyboard navigation support
- Screen reader compatible
- High contrast mode support
- Focus indicators on all interactive elements

## Future Enhancements

### Planned Features
1. Predictive analytics (ML-based forecasting)
2. Goal tracking with progress visualization
3. Savings goals and recommendations
4. Financial advice based on patterns
5. Comparison with similar users (anonymous)
6. AI-powered insights and alerts
7. Integration with external data sources
8. Mobile app with offline support

### API Endpoints to Create

```typescript
// POST /api/analytics/export
// Export analytics data in various formats

// POST /api/analytics/reports
// Create custom report

// GET /api/analytics/reports
// List saved reports

// POST /api/analytics/reports/:id/schedule
// Schedule automated report

// GET /api/analytics/insights
// Get AI-generated insights
```

## Troubleshooting

### Common Issues

1. **Slow Chart Rendering:**
   - Reduce data points for large datasets
   - Use sampling for historical data
   - Enable virtualization for tables

2. **Missing Data:**
   - Ensure materialized views are refreshed
   - Check RLS policies
   - Verify date range filters

3. **Export Errors:**
   - Check browser compatibility
   - Verify data size limits
   - Review server logs for API errors

## Testing

### Unit Tests
```typescript
describe('FinancialHealthScore', () => {
  it('should calculate score correctly', () => {
    const score = calculateHealthScore(mockData);
    expect(score).toBe(78);
  });

  it('should assign correct grade', () => {
    expect(getGrade(78)).toBe('B');
  });
});
```

### Integration Tests
```typescript
describe('Analytics API', () => {
  it('should fetch monthly summary', async () => {
    const data = await fetchMonthlySummary(userId, '6M');
    expect(data).toHaveLength(6);
  });
});
```

## Support

For issues or questions:
- Check the [API Documentation](./ANALYTICS_DOCUMENTATION.md)
- Review [Supabase Setup](./SUPABASE_SETUP.md)
- File an issue on GitHub

## License

Copyright © 2024 FMS Financial Dashboard
