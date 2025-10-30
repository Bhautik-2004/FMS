# Intelligent Insights System 🧠💡

> AI-powered financial recommendations that help users make smarter money decisions

## What It Does

The Insights System analyzes your financial data and provides **personalized, actionable recommendations** across 6 categories:

1. **💳 Spending Patterns** - "Your grocery spending increased 35% this month"
2. **💰 Saving Opportunities** - "Save $120/month by reducing coffee shop visits"
3. **🎯 Budget Recommendations** - "Your entertainment budget might be too low"
4. **🚨 Anomaly Detection** - "Unusual $850 expense detected at Best Buy"
5. **📈 Goal Tracking** - "You're 85% to your $10,000 savings goal!"
6. **🔮 Trend Predictions** - "Projected expenses next month: $3,850"

## Quick Start

### 1. Run Database Migration (2 min)

```bash
cd supabase/migrations
psql -d your_database < 20250108000000_create_insights.sql

# Or via Supabase CLI
supabase db push
```

### 2. Add to Dashboard (1 min)

```typescript
import { DashboardInsights } from '@/components/dashboard/insights-widget';

export function Dashboard() {
  return (
    <div className="grid gap-6">
      <DashboardInsights />
      {/* Other dashboard content */}
    </div>
  );
}
```

### 3. Generate First Insights (30 sec)

```typescript
// Via API
await fetch('/api/insights', {
  method: 'POST',
  body: JSON.stringify({ regenerate: false }),
});

// Or via hook
const { generateInsights } = useInsights();
await generateInsights();
```

### 4. View Insights

Navigate to `/insights` or see them in your dashboard widget!

## Features

### ✨ Smart Insights
- 19 different insight types
- Automatic pattern detection
- Statistical analysis
- Trend prediction
- Anomaly alerts

### 🎨 Beautiful UI
- Color-coded severity (positive, warning, negative, neutral)
- Priority badges (critical, high, medium, low)
- Action buttons for quick navigation
- Dismiss/snooze functionality
- Helpful/not helpful feedback

### 🔧 Developer-Friendly
- TypeScript throughout
- React hooks
- REST API
- Comprehensive docs
- Easy customization

### 🔒 Secure & Private
- Row Level Security
- User-specific data only
- No cross-user sharing
- Encrypted at rest

### 📊 Analytics Ready
- Full event tracking
- User interaction logging
- Performance metrics
- ML improvement pipeline

## Example Insights

### Spending Pattern
> **Your Dining spending increased 42% this month**
> 
> You spent $840 on dining this month compared to $590 last month.
> 
> 🔴 Warning • 🎯 High Priority
> 
> Actions: [View Transactions] [View Analytics]

### Saving Opportunity
> **Unused subscription detected: Netflix**
> 
> Netflix charges $15/month but hasn't been used in 60+ days. Cancel to save $180/year.
> 
> 🟡 Warning • 🎯 High Priority
> 
> Actions: [View Transactions]

### Goal Tracking
> **Great progress on savings goal!**
> 
> You're 85% of the way to your $10,000 goal. Keep it up!
> 
> 🟢 Positive • 🎯 High Priority

## API Reference

```typescript
// Fetch active insights
GET /api/insights

// Generate new insights
POST /api/insights
Body: { regenerate: boolean }

// Dismiss insight
POST /api/insights/[id]/dismiss

// Snooze insight (1 day or 1 week)
POST /api/insights/[id]/snooze
Body: { days: number }

// Mark helpful/not helpful
POST /api/insights/[id]/feedback
Body: { helpful: boolean }

// Record action taken
POST /api/insights/[id]/action
Body: { actionType: string, actionData?: object }

// Get analytics
GET /api/insights/analytics?days=30
```

## Component Usage

### Full Page

```typescript
import { InsightsPageClient } from '@/components/analytics/insights-page-client';

<InsightsPageClient />
```

### Dashboard Widget

```typescript
import { InsightsSummary } from '@/components/analytics';

<InsightsSummary 
  insights={insights} 
  onViewAll={() => router.push('/insights')} 
/>
```

### Custom List

```typescript
import { InsightsList } from '@/components/analytics';

<InsightsList
  insights={insights}
  onDismiss={dismissInsight}
  onSnooze={snoozeInsight}
  onMarkHelpful={markHelpful}
  compact={false}
  limit={10}
/>
```

### React Hook

```typescript
import { useInsights } from '@/hooks/use-insights';

function MyComponent() {
  const {
    insights,          // Array of insights
    loading,           // Loading state
    error,             // Error message
    fetchInsights,     // Refresh insights
    generateInsights,  // Generate new insights
    dismissInsight,    // Dismiss insight by ID
    snoozeInsight,     // Snooze insight by ID
    markHelpful,       // Mark helpful/not helpful
    recordAction,      // Track user action
  } = useInsights({
    autoFetch: true,          // Auto-fetch on mount
    refreshInterval: 300000,  // Refresh every 5 min
  });

  return <InsightsList insights={insights} onDismiss={dismissInsight} />;
}
```

## Customization

### Change Thresholds

Edit `src/lib/analytics/insights.ts`:

```typescript
// Change spending increase threshold from 25% to 30%
if (Math.abs(percentChange) >= 30) {  // Was 25
  // Generate insight
}
```

### Add Custom Insight Type

```typescript
// 1. Update type
export type InsightType = 
  | 'spending_pattern' 
  | 'your_custom_type';

// 2. Create generator
export async function generateCustomInsights(
  userId: string
): Promise<Insight[]> {
  // Your logic here
  return insights;
}

// 3. Add to main generator
export async function generateAllInsights(userId: string) {
  const [
    // ... existing
    customInsights,
  ] = await Promise.all([
    // ... existing
    generateCustomInsights(userId),
  ]);

  return [...allExisting, ...customInsights];
}
```

## Scheduling (Optional)

### Vercel Cron

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/insights",
    "schedule": "0 2 * * *"  // Daily at 2 AM
  }]
}
```

### Node Cron

```typescript
import cron from 'node-cron';

cron.schedule('0 2 * * *', async () => {
  // Generate insights for all users
});
```

## Data Requirements

For best results, ensure you have:
- ✅ At least 2 months of transactions
- ✅ 10+ transactions per month
- ✅ Multiple spending categories
- ✅ (Optional) Active budgets
- ✅ (Optional) Savings goal set

## Documentation

- 📖 **[Full Documentation](./INSIGHTS_DOCUMENTATION.md)** - Complete guide with all features
- 🚀 **[Quick Start Guide](./INSIGHTS_QUICK_START.md)** - Get started in 5 minutes
- 📋 **[Implementation Summary](./INSIGHTS_IMPLEMENTATION_SUMMARY.md)** - What was built
- 📊 **[Analytics Features](./ANALYTICS_FEATURES.md)** - Analytics system overview

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  User Interface                  │
│  ┌──────────────┐  ┌────────────────────────┐  │
│  │   Dashboard  │  │   Insights Page        │  │
│  │   Widget     │  │   (Full Interface)     │  │
│  └──────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│              React Hooks & State                 │
│         useInsights() • useInsightAnalytics()    │
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│                 API Routes                       │
│  /api/insights  •  /api/insights/[id]/*         │
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│           Insight Generation Engine              │
│  • Spending Patterns  • Saving Opportunities    │
│  • Budget Recommendations  • Anomaly Detection  │
│  • Goal Tracking  • Trend Predictions           │
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│              Database Layer                      │
│  Tables: insights, insight_history               │
│  Functions: 7 database functions                 │
│  Views: materialized analytics views             │
└─────────────────────────────────────────────────┘
```

## Performance

- ⚡ **Fast Queries**: Indexed database queries
- 💾 **Caching**: Client-side insight caching
- 🔄 **Incremental**: Only analyze new data
- 📊 **Materialized Views**: Pre-aggregated analytics
- 🎯 **Optimized**: Batch processing support

## Security

- 🔐 **RLS Enabled**: Row-level security on all tables
- 👤 **User Isolation**: Each user sees only their insights
- 🔒 **Authentication**: All API routes protected
- 📝 **Audit Trail**: Full event logging
- 🛡️ **No PII Leakage**: Privacy-first design

## Testing

```typescript
// Test insight generation
describe('Insights', () => {
  it('should generate spending pattern insights', async () => {
    const insights = await generateSpendingPatternInsights(
      userId, 
      transactions,
      categories
    );
    expect(insights.length).toBeGreaterThan(0);
  });

  it('should detect unused subscriptions', async () => {
    const insights = await generateSavingOpportunityInsights(
      userId,
      transactions,
      categories
    );
    const subscription = insights.find(i => 
      i.title.includes('Unused')
    );
    expect(subscription).toBeDefined();
  });
});
```

## Troubleshooting

### No insights generated?
- Ensure you have 2+ months of transaction data
- Check that user is authenticated
- Verify database functions exist

### Insights not showing?
- Check if insights are dismissed or expired
- Verify RLS policies are correct
- Check browser console for errors

### API errors?
- Run database migration first
- Check Supabase connection
- Verify authentication token

## Roadmap

### Phase 1 ✅ (Current)
- Core insight generators
- Database schema
- API routes
- React components
- Documentation

### Phase 2 🔄 (Next)
- Automated scheduling
- Email notifications
- Custom thresholds
- User preferences

### Phase 3 ⏳ (Future)
- ML-based personalization
- Predictive analytics
- Natural language generation
- Voice-based insights

## Contributing

Have ideas for new insight types? Found a bug? Contributions welcome!

1. Fork the repo
2. Create your feature branch
3. Add tests
4. Submit a pull request

## License

Copyright © 2024 FMS Financial Dashboard

## Support

- 📖 [Read the docs](./INSIGHTS_DOCUMENTATION.md)
- 💬 [Open an issue](https://github.com/your-repo/issues)
- 📧 [Contact support](mailto:support@example.com)

---

**Built with ❤️ using Next.js, TypeScript, Supabase, and AI**

⭐ Star this repo if you found it helpful!
