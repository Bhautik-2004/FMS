# Budget Real-Time Components - Quick Start Guide

## 🚀 Quick Integration

### Step 1: Ensure Budget Migration is Run

The budget tables must exist in your database. Run the migration:

```sql
-- Copy and run in Supabase SQL Editor:
-- File: supabase/migrations/20250106000000_create_budgets.sql
```

### Step 2: Add Budget Widget to Dashboard

**Option A: Server Component (Recommended)**

```tsx
// src/app/(dashboard)/dashboard/page.tsx
import { BudgetDashboardWidgetServer } from '@/components/budgets';

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1>Dashboard</h1>
      
      {/* Budget Widget with Real-Time Updates */}
      <BudgetDashboardWidgetServer />
      
      {/* Other content */}
    </div>
  );
}
```

**Option B: Client Component (Custom Data)**

```tsx
// Your page or component
'use client';
import { BudgetDashboardWidget } from '@/components/budgets';

export function MyDashboard({ budgets, alerts }: Props) {
  return (
    <BudgetDashboardWidget
      budgets={budgets}
      alerts={alerts}
      showAlerts={true}
      showQuickActions={true}
    />
  );
}
```

### Step 3: Test Real-Time Updates

1. Open your dashboard with the budget widget
2. In another tab, add a transaction: `/transactions/add`
3. Watch the budget widget update automatically! ✨

---

## 📊 Component Examples

### 1. Show Budget Progress

```tsx
import { BudgetProgress } from '@/components/budgets';

<BudgetProgress 
  budget={budgetData} 
  compact // Optional: compact mode
/>
```

### 2. Show Budget Alerts

```tsx
import { BudgetAlerts } from '@/components/budgets';

<BudgetAlerts 
  alerts={alertData}
  compact
  showSettings
/>
```

### 3. Full Dashboard Widget

```tsx
import { BudgetDashboardWidget } from '@/components/budgets';

<BudgetDashboardWidget
  budgets={budgets}
  alerts={alerts}
  showAlerts={true}
  showQuickActions={true}
/>
```

---

## 🎨 Visual Features

### Color Coding
- 🟢 **Green** (< 70%): On track, healthy spending
- 🟡 **Yellow** (70-90%): Warning, approaching limit
- 🔴 **Red** (90-99%): Critical, near limit
- 🔴 **Red** (100%+): Over budget

### Animations
- Progress bars pulse when updated
- Smooth transitions on value changes
- Visual feedback for real-time updates

### Status Badges
- **Excellent** (80-100): 🟢 All budgets healthy
- **Good** (60-79): 🟡 Minor concerns
- **Needs Attention** (40-59): 🟠 Action required
- **Critical** (0-39): 🔴 Immediate attention

---

## 🔔 Alert Types

### 1. Approaching (70% of threshold)
```
"Groceries spending approaching limit"
Severity: Medium
Action: Review spending
```

### 2. Threshold (80% default)
```
"Groceries has reached 80% of budget"
Severity: High
Action: Consider adjustments
```

### 3. Exceeded (100%+)
```
"Groceries budget exceeded by $125"
Severity: Critical
Action: Immediate review
```

### 4. Unusual Pattern (Future)
```
"Unusual spending pattern detected in Entertainment"
Severity: Low
Action: Review transactions
```

---

## ⚡ Real-Time Features

### Automatic Updates
The `BudgetDashboardWidget` automatically subscribes to:

1. **Transaction Changes**
   - New transaction added → Budget updates
   - Transaction edited → Budget recalculates
   - Transaction deleted → Budget adjusts

2. **Alert Changes**
   - New alert created → Alert panel updates
   - Alert dismissed → Alert count updates

3. **Toast Notifications**
   - Subtle notification on update
   - No disruptive pop-ups

### Manual Refresh
Click the refresh button (🔄) to force update:
```tsx
<Button onClick={handleRefresh}>
  <RefreshCw className="h-4 w-4" />
</Button>
```

---

## 🎯 Common Use Cases

### Use Case 1: Sidebar Budget Widget
```tsx
// In your sidebar component
import { BudgetProgress } from '@/components/budgets';

<div className="space-y-2">
  <h3 className="text-sm font-medium">Active Budgets</h3>
  {budgets.map(budget => (
    <BudgetProgress 
      key={budget.id}
      budget={budget}
      compact
    />
  ))}
</div>
```

### Use Case 2: Alert Notification Badge
```tsx
import { BudgetAlerts } from '@/components/budgets';
import { Bell } from 'lucide-react';

<Popover>
  <PopoverTrigger>
    <Button variant="ghost" size="icon">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -right-1">
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

### Use Case 3: Budget Detail Page
```tsx
import { BudgetProgress } from '@/components/budgets';

<BudgetProgress 
  budget={budgetData}
  categories={categoryData}
  showCategories={true} // Show full breakdown
/>
```

---

## 🛠️ Troubleshooting

### Widget Not Showing
**Problem:** Budget widget doesn't appear

**Solutions:**
1. ✅ Run budget migration
2. ✅ Create at least one budget
3. ✅ Check user is authenticated
4. ✅ View browser console for errors

### No Real-Time Updates
**Problem:** Changes don't appear automatically

**Solutions:**
1. ✅ Verify Supabase Realtime is enabled
2. ✅ Check Supabase dashboard: Settings → API → Realtime
3. ✅ Ensure user has proper RLS access
4. ✅ Try manual refresh button

### Alerts Not Appearing
**Problem:** Expected alerts don't show

**Solutions:**
1. ✅ Check spending is actually over threshold
2. ✅ Verify alert generation trigger:
   ```sql
   SELECT * FROM budget_alerts 
   WHERE user_id = 'your-id' 
   ORDER BY created_at DESC;
   ```
3. ✅ Ensure `is_read = false`
4. ✅ Check alert preferences enabled

---

## 📱 Responsive Design

All components are fully responsive:

- **Desktop**: Full feature set
- **Tablet**: Optimized layout
- **Mobile**: Compact views, touch-friendly

```tsx
// Automatically adapts
<BudgetDashboardWidget />

// Force compact mode
<BudgetProgress compact />
<BudgetAlerts compact />
```

---

## 🎨 Customization

### Custom Colors
```tsx
// BudgetProgress uses category colors
budget={{
  ...data,
  category_color: '#10b981' // Custom green
}}
```

### Custom Thresholds
```tsx
// In budget creation
alert_threshold: 75 // Alert at 75% instead of 80%
```

### Custom Alert Messages
Alerts are generated by database triggers with customizable messages.

---

## 📊 Performance

### Optimized Features
- ✅ Materialized views for fast queries
- ✅ Indexed database columns
- ✅ Selective Realtime subscriptions
- ✅ Debounced refresh on rapid changes
- ✅ Component memoization

### Expected Performance
- Initial load: < 500ms
- Real-time update: < 100ms
- Widget refresh: < 200ms

---

## 🚀 Next Steps

1. **Add to Dashboard**
   ```tsx
   import { BudgetDashboardWidgetServer } from '@/components/budgets';
   ```

2. **Create First Budget**
   - Navigate to `/budgets/create`
   - Choose a template (50/30/20 recommended)
   - Set category allocations

3. **Add Transactions**
   - Go to `/transactions/add`
   - Watch budget update in real-time!

4. **Monitor Alerts**
   - Check notification badge
   - Review spending patterns
   - Adjust budgets as needed

---

## 📚 Full Documentation

For complete API reference and advanced usage:
- See: `BUDGET_REALTIME_COMPONENTS.md`
- Database: `BUDGET_DOCUMENTATION.md`
- Quick Start: This file

---

## 🆘 Need Help?

1. Check the troubleshooting section
2. Review browser console errors
3. Verify database migration ran successfully
4. Ensure Supabase Realtime is enabled
5. Check RLS policies allow user access

---

**Ready to go!** Your real-time budget tracking system is now set up. 🎉
