# Real-Time Budget Tracking Components

This document describes the real-time budget tracking components that provide live updates when transactions are added or modified.

## Components Overview

### 1. BudgetProgress.tsx
Real-time progress visualization with animated updates.

**Features:**
- Color-coded status indicators (green < 70%, yellow 70-90%, red > 90%)
- Animated progress bars that pulse when updated
- Spending velocity indicator (comparing actual vs expected pace)
- Days remaining in budget period
- Category-level breakdown (optional)
- Compact and full view modes

**Props:**
```typescript
interface BudgetProgressProps {
  budget: {
    id: string;
    name: string;
    period_type: string;
    start_date: string;
    end_date: string;
    total_amount: number;
    total_allocated: number;
    total_spent: number;
    spent_percentage: number;
    category_count: number;
  };
  categories?: Array<{
    category_id: string;
    category_name: string;
    category_icon?: string;
    category_color?: string;
    allocated_amount: number;
    spent_amount: number;
    spent_percentage: number;
    status: 'good' | 'on_track' | 'warning' | 'exceeded';
  }>;
  showCategories?: boolean;
  compact?: boolean;
}
```

**Usage:**
```tsx
import { BudgetProgress } from '@/components/budgets';

// Compact mode
<BudgetProgress budget={budgetData} compact />

// Full mode with categories
<BudgetProgress 
  budget={budgetData} 
  categories={categoryData}
  showCategories 
/>
```

**Visual Features:**
- 🟢 Green: < 70% spent (On Track)
- 🟡 Yellow: 70-90% spent (Warning)
- 🔴 Red: > 90% spent (Critical)
- 🔴 Red: 100%+ spent (Over Budget)

**Spending Velocity:**
- Compares actual spending to expected spending based on time elapsed
- Shows if you're over-pacing or under-pacing
- Alerts when significantly over expected pace

---

### 2. BudgetAlerts.tsx
Alert notification system for budget events.

**Features:**
- Multiple alert types:
  - 🔴 **Exceeded**: Budget or category exceeded 100%
  - 🟠 **Threshold**: Reached alert threshold (default 80%)
  - 🟡 **Approaching**: Approaching threshold (70% of threshold)
  - 🔵 **Unusual Pattern**: Unusual spending patterns detected
- Severity levels: Critical, High, Medium, Low
- Alert actions:
  - Dismiss alert
  - View details
  - Adjust budget
  - Mark as read
- Notification preferences:
  - Enable/disable alert types
  - Push notifications
  - Email notifications
- Compact and full view modes

**Props:**
```typescript
interface BudgetAlertsProps {
  alerts: BudgetAlert[];
  showSettings?: boolean;
  compact?: boolean;
}

interface BudgetAlert {
  id: string;
  budget_id: string;
  category_id?: string;
  alert_type: 'threshold' | 'exceeded' | 'approaching' | 'unusual_pattern';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_read: boolean;
  created_at: string;
  budget: {
    name: string;
    period_type: string;
  };
  category?: {
    name: string;
    icon?: string;
    color?: string;
  };
  metadata?: {
    spent_amount?: number;
    allocated_amount?: number;
    spent_percentage?: number;
    pattern_details?: string;
  };
}
```

**Usage:**
```tsx
import { BudgetAlerts } from '@/components/budgets';

// Compact mode
<BudgetAlerts alerts={alertData} compact />

// Full mode with settings
<BudgetAlerts alerts={alertData} showSettings />
```

**Alert Types:**
1. **Threshold Alert**: Triggered when spending reaches alert_threshold (default 80%)
2. **Exceeded Alert**: Triggered when spending exceeds 100% of budget
3. **Approaching Alert**: Triggered at 70% of alert_threshold (56% if threshold is 80%)
4. **Unusual Pattern**: Triggered for spending anomalies (future enhancement)

---

### 3. BudgetDashboardWidget.tsx
Comprehensive dashboard widget with real-time updates via Supabase Realtime.

**Features:**
- Overall budget health score (0-100)
- Summary statistics:
  - Total allocated
  - Total spent
  - Total remaining
  - Spending velocity
- Real-time updates via Supabase subscriptions
- Active budget previews (compact mode)
- Budget status counts (good/warning/critical)
- Quick actions:
  - Create budget
  - Add transaction
  - Adjust budgets
- Manual refresh button
- Integrated alerts section

**Props:**
```typescript
interface BudgetDashboardWidgetProps {
  budgets?: BudgetSummary[];
  alerts?: any[];
  showAlerts?: boolean;
  showQuickActions?: boolean;
}
```

**Usage:**

**Client Component:**
```tsx
import { BudgetDashboardWidget } from '@/components/budgets';

<BudgetDashboardWidget
  budgets={budgetData}
  alerts={alertData}
  showAlerts={true}
  showQuickActions={true}
/>
```

**Server Component (Recommended):**
```tsx
import { BudgetDashboardWidgetServer } from '@/components/budgets/BudgetDashboardWidgetServer';

// In your page.tsx
export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Other dashboard content */}
      
      {/* Budget Widget - Automatically fetches data */}
      <BudgetDashboardWidgetServer />
      
      {/* Other dashboard content */}
    </div>
  );
}
```

**Health Score Calculation:**
- Starts at 100 for each budget
- Penalties:
  - -50 points: Exceeded (≥100%)
  - -30 points: Critical (90-99%)
  - -15 points: Warning (70-89%)
  - -10 points per over-budget category
- Average across all budgets

**Health Score Ratings:**
- 80-100: 🟢 Excellent
- 60-79: 🟡 Good
- 40-59: 🟠 Needs Attention
- 0-39: 🔴 Critical

---

## Real-Time Subscription Implementation

The `BudgetDashboardWidget` automatically subscribes to Supabase Realtime for instant updates.

### How It Works

1. **Subscribes to transactions table**
   - Listens for INSERT, UPDATE, DELETE events
   - Filters by current user_id
   - Triggers budget refresh on changes

2. **Subscribes to budget_alerts table**
   - Listens for new alerts
   - Refreshes alert list
   - Shows toast notification

3. **Automatic Updates**
   - When a transaction is added: Budget spent amounts update
   - When a transaction is deleted: Budget recalculates
   - When alerts are created: Alert panel updates
   - All happens without page refresh

### Code Example

```typescript
// Automatic subscription setup in BudgetDashboardWidget
useEffect(() => {
  const channel = supabase
    .channel('budget-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${user.id}`,
      },
      async (payload) => {
        console.log('Transaction change detected:', payload);
        await refreshBudgets();
        toast.info('Budgets updated');
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'budget_alerts',
        filter: `user_id=eq.${user.id}`,
      },
      async (payload) => {
        await refreshAlerts();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## Integration Examples

### Example 1: Add to Main Dashboard

```tsx
// src/app/(dashboard)/dashboard/page.tsx
import { BudgetDashboardWidgetServer } from '@/components/budgets/BudgetDashboardWidgetServer';
import { StatCard } from '@/components/dashboard/stat-card';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Your stat cards */}
      </div>

      {/* Budget Widget - Real-time updates */}
      <BudgetDashboardWidgetServer />

      {/* Other content */}
      <RecentTransactions />
    </div>
  );
}
```

### Example 2: Budget Progress in Sidebar

```tsx
// In sidebar or widget area
import { BudgetProgress } from '@/components/budgets';

{activeBudgets.map(budget => (
  <BudgetProgress 
    key={budget.id}
    budget={budget}
    compact
  />
))}
```

### Example 3: Alerts in Top Navigation

```tsx
// In top navigation
import { BudgetAlerts } from '@/components/budgets';

<Popover>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0">
          {unreadCount}
        </Badge>
      )}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-96">
    <BudgetAlerts alerts={alerts} compact />
  </PopoverContent>
</Popover>
```

---

## Database Requirements

These components require the budget migration to be run:
- File: `supabase/migrations/20250106000000_create_budgets.sql`
- Tables: `budgets`, `budget_categories`, `budget_alerts`
- Views: `budget_summary`, `budget_category_performance`
- Functions: Automatic spent tracking, alert generation

### Required Supabase Setup

1. **Run Migration:**
   ```bash
   # Local Supabase
   npx supabase migration up

   # Or copy SQL to Supabase Dashboard SQL Editor
   ```

2. **Enable Realtime:**
   Realtime is enabled by default for the `transactions` and `budget_alerts` tables.

3. **RLS Policies:**
   All tables have Row Level Security enabled to ensure users only see their own data.

---

## Performance Considerations

### Optimizations Implemented

1. **Materialized Views:**
   - `budget_summary` aggregates data for fast queries
   - Refresh triggered automatically by triggers

2. **Indexed Queries:**
   - All foreign keys indexed
   - User_id + date range indexes for transaction queries

3. **Selective Subscriptions:**
   - Only subscribes to current user's changes
   - Unsubscribes on component unmount

4. **Debounced Refresh:**
   - Multiple rapid changes trigger single refresh
   - Prevents excessive API calls

5. **Conditional Rendering:**
   - Doesn't render if tables don't exist
   - Graceful fallback for missing data

---

## Troubleshooting

### Budget Widget Not Showing

**Issue:** Widget doesn't appear on dashboard

**Solutions:**
1. Check if budget migration has been run
2. Verify at least one active budget exists
3. Check browser console for errors
4. Ensure user is authenticated

### Real-Time Updates Not Working

**Issue:** Changes don't appear automatically

**Solutions:**
1. Verify Supabase Realtime is enabled for your project
2. Check browser console for subscription errors
3. Ensure RLS policies allow user access
4. Try manual refresh button

### Alerts Not Appearing

**Issue:** Budget alerts not showing

**Solutions:**
1. Check if spending exceeds thresholds
2. Verify alert generation trigger is working:
   ```sql
   SELECT * FROM budget_alerts WHERE user_id = 'your-user-id';
   ```
3. Ensure is_read = false for new alerts
4. Check alert preferences are enabled

---

## Future Enhancements

### Planned Features

1. **Smart Predictions:**
   - AI-powered spending forecasts
   - End-of-period projections
   - Anomaly detection improvements

2. **Advanced Patterns:**
   - Seasonal spending analysis
   - Day-of-week patterns
   - Category correlation detection

3. **Notifications:**
   - Browser push notifications
   - Email digest options
   - SMS alerts (via Twilio)

4. **Visualizations:**
   - Spending heatmaps
   - Trend charts
   - Comparison graphs

5. **Mobile App:**
   - React Native components
   - Mobile push notifications
   - Widget support

---

## API Reference

### BudgetProgress Component

```typescript
<BudgetProgress
  budget={BudgetSummary}           // Required: Budget data
  categories={CategoryArray}       // Optional: Category breakdown
  showCategories={boolean}         // Optional: Show category details
  compact={boolean}                // Optional: Compact display mode
/>
```

### BudgetAlerts Component

```typescript
<BudgetAlerts
  alerts={BudgetAlert[]}          // Required: Alert data
  showSettings={boolean}          // Optional: Show settings button
  compact={boolean}               // Optional: Compact display mode
/>
```

### BudgetDashboardWidget Component

```typescript
<BudgetDashboardWidget
  budgets={BudgetSummary[]}       // Optional: Budget data
  alerts={BudgetAlert[]}          // Optional: Alert data
  showAlerts={boolean}            // Optional: Show alerts section
  showQuickActions={boolean}      // Optional: Show action buttons
/>
```

---

## Support

For issues or questions:
1. Check the database migration has been run successfully
2. Verify Supabase Realtime is enabled
3. Check browser console for errors
4. Review RLS policies in Supabase dashboard

---

**Last Updated:** December 2024
**Version:** 1.0.0
