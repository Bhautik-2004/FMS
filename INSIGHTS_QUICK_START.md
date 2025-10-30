# Insights System Quick Start Guide

## Setup (5 minutes)

### 1. Run Database Migration

```bash
# Apply the insights migration
psql -d your_database < supabase/migrations/20250108000000_create_insights.sql

# Or via Supabase CLI
supabase db push
```

### 2. Verify Database Functions

```sql
-- Test that functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%insight%';

-- Should return:
-- get_active_insights
-- dismiss_insight
-- snooze_insight
-- mark_insight_helpful
-- record_insight_action
-- cleanup_expired_insights
-- get_insight_analytics
```

### 3. Generate First Insights

```typescript
// Via API
const response = await fetch('/api/insights', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ regenerate: false }),
});

// Or via function call
import { generateAllInsights } from '@/lib/analytics/insights';
const insights = await generateAllInsights(userId);
```

## Usage Examples

### Basic Display (Dashboard Widget)

```typescript
import { DashboardInsights } from '@/components/dashboard/insights-widget';

export function DashboardPage() {
  return (
    <div className="grid gap-6">
      <DashboardInsights />
      {/* Other dashboard content */}
    </div>
  );
}
```

### Full Insights Page

Already created at `/insights` route - just navigate there!

```typescript
router.push('/insights');
```

### Custom Implementation

```typescript
'use client';

import { useInsights } from '@/hooks/use-insights';
import { InsightsList } from '@/components/analytics';

export function MyComponent() {
  const { insights, loading, dismissInsight } = useInsights();

  if (loading) return <div>Loading...</div>;

  return (
    <InsightsList
      insights={insights}
      onDismiss={dismissInsight}
      compact={true}
      limit={5}
    />
  );
}
```

### Priority Insights Only

```typescript
const { insights } = useInsights();
const priorityInsights = insights.filter(
  i => i.priority === 'critical' || i.priority === 'high'
);
```

## API Usage

### Fetch Insights

```bash
curl -X GET http://localhost:3000/api/insights \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Generate New Insights

```bash
curl -X POST http://localhost:3000/api/insights \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"regenerate": false}'
```

### Dismiss Insight

```bash
curl -X POST http://localhost:3000/api/insights/INSIGHT_ID/dismiss \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Snooze Insight

```bash
curl -X POST http://localhost:3000/api/insights/INSIGHT_ID/snooze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'
```

### Mark Helpful

```bash
curl -X POST http://localhost:3000/api/insights/INSIGHT_ID/feedback \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"helpful": true}'
```

## Customization

### Change Thresholds

Edit `src/lib/analytics/insights.ts`:

```typescript
// Example: Change spending increase threshold from 25% to 30%
if (Math.abs(percentChange) >= 30) {  // Was 25
  // Generate insight
}

// Example: Change weekend spending threshold from 30% to 40%
if (avgWeekendSpending > avgWeekdaySpending * 1.4) {  // Was 1.3
  // Generate insight
}
```

### Add Custom Insight Type

1. Update type definition:
```typescript
export type InsightType = 
  | 'spending_pattern' 
  | 'saving_opportunity'
  | 'your_custom_type';  // Add here
```

2. Create generator function:
```typescript
export async function generateCustomInsights(
  userId: string,
  data: YourData[]
): Promise<Insight[]> {
  const insights: Insight[] = [];
  
  // Your logic here
  insights.push({
    id: 'custom-1',
    type: 'your_custom_type',
    severity: 'neutral',
    priority: 'medium',
    title: 'Custom Insight',
    description: 'Description here',
    actionable: true,
    actions: [],
    createdAt: new Date(),
  });
  
  return insights;
}
```

3. Add to main generator:
```typescript
export async function generateAllInsights(userId: string): Promise<Insight[]> {
  const [
    // ... existing generators
    customInsights,
  ] = await Promise.all([
    // ... existing calls
    generateCustomInsights(userId, data),
  ]);

  return [
    // ... existing insights
    ...customInsights,
  ];
}
```

### Custom Styling

Override insight card colors:

```css
/* In your global CSS or component */
.insight-card-positive {
  @apply bg-green-50 dark:bg-green-950 border-green-200;
}

.insight-card-warning {
  @apply bg-amber-50 dark:bg-amber-950 border-amber-200;
}
```

## Scheduling (Optional)

### Set Up Cron Job (Node.js)

```typescript
// lib/cron/insights.ts
import cron from 'node-cron';
import { createClient } from '@/lib/supabase/admin';
import { generateAllInsights } from '@/lib/analytics/insights';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Generating insights for all users...');
  
  const supabase = createClient();
  const { data: users } = await supabase
    .from('user_profiles')
    .select('user_id');
  
  for (const user of users || []) {
    try {
      await generateAllInsights(user.user_id);
      console.log(`Generated insights for user ${user.user_id}`);
    } catch (error) {
      console.error(`Failed for user ${user.user_id}:`, error);
    }
  }
});
```

### Set Up with Vercel Cron

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/insights",
    "schedule": "0 2 * * *"
  }]
}
```

```typescript
// app/api/cron/insights/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Generate insights for all users
  // ... implementation
  
  return Response.json({ success: true });
}
```

## Testing

### Test Data Setup

```sql
-- Insert test transactions
INSERT INTO transactions (user_id, amount, date, type, category_id, merchant)
VALUES 
  (your_user_id, 150, now() - interval '1 day', 'expense', category_id, 'Starbucks'),
  (your_user_id, 1500, now() - interval '2 days', 'expense', category_id, 'Best Buy'),
  -- Add more...
```

### Manual Testing

```typescript
// In your browser console or test file
const testInsights = async () => {
  // Generate insights
  const response = await fetch('/api/insights', {
    method: 'POST',
    body: JSON.stringify({ regenerate: true }),
  });
  
  const data = await response.json();
  console.log('Generated insights:', data);
  
  // Fetch insights
  const getResponse = await fetch('/api/insights');
  const insights = await getResponse.json();
  console.log('Fetched insights:', insights);
};

testInsights();
```

## Troubleshooting

### No Insights Generated

**Cause**: Not enough data

**Solution**: Ensure you have:
- At least 2 months of transactions
- At least 10 transactions per month
- Multiple categories with spending
- Some budgets created

### Insights Not Showing

**Check**:
1. User is authenticated
2. RLS policies are correct
3. Insights haven't expired
4. Insights aren't dismissed/snoozed

```sql
-- Check active insights
SELECT * FROM insights 
WHERE user_id = 'your_user_id'
  AND dismissed = false
  AND (expires_at IS NULL OR expires_at > now());
```

### API Errors

**Check**:
1. Database functions exist
2. Supabase client initialized correctly
3. User has proper permissions
4. Check server logs for details

```typescript
// Enable debug logging
console.log('Generating insights for user:', userId);
console.log('Transaction count:', transactions.length);
```

## Performance Tips

1. **Cache Results**: Insights don't change often
```typescript
const { insights } = useInsights({
  autoFetch: true,
  refreshInterval: 5 * 60 * 1000, // 5 minutes
});
```

2. **Limit Display**: Show only top priorities
```typescript
<InsightsList insights={insights} limit={10} />
```

3. **Batch Operations**: Generate for multiple users in background

4. **Use Materialized Views**: Ensure analytics views are refreshed
```sql
SELECT refresh_analytics_views();
```

## Next Steps

1. ✅ Set up database and verify functions
2. ✅ Generate first insights
3. ✅ Add to dashboard
4. ⏭️ Set up automated scheduling
5. ⏭️ Customize thresholds for your use case
6. ⏭️ Add email notifications
7. ⏭️ Implement ML improvements

## Support

- 📖 [Full Documentation](./INSIGHTS_DOCUMENTATION.md)
- 🔧 [Analytics Setup](./ANALYTICS_DOCUMENTATION.md)
- 💬 [Open an Issue](https://github.com/your-repo/issues)
