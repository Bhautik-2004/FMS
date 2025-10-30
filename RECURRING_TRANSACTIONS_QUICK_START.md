# Recurring Transactions - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Run Database Migration

```bash
# Option 1: Using Supabase CLI
supabase db push

# Option 2: Using psql
psql -d your_database -f supabase/migrations/20250109000000_create_recurring_transactions.sql
```

This creates:
- ✅ `recurring_transactions` table
- ✅ `recurring_occurrences` table
- ✅ 7 PostgreSQL functions
- ✅ Row Level Security policies
- ✅ Indexes for performance

---

### Step 2: Deploy Edge Function

```bash
# Navigate to functions directory
cd supabase/functions

# Deploy the cron function
supabase functions deploy generate-recurring-transactions

# Set the cron secret
supabase secrets set CRON_SECRET=$(openssl rand -base64 32)
```

---

### Step 3: Schedule Daily Cron Job

Run this SQL in Supabase SQL Editor:

```sql
-- Install pg_cron extension (if not already installed)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily generation at 2 AM UTC
SELECT cron.schedule(
  'generate-recurring-transactions-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-recurring-transactions',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
```

**Replace:**
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_CRON_SECRET` with the secret from Step 2

---

### Step 4: Test the System

Create a test recurring transaction using the React hook:

```typescript
import { useRecurringTransactions } from '@/hooks/use-recurring-transactions';

function TestComponent() {
  const { createRecurring } = useRecurringTransactions();

  const createTest = async () => {
    await createRecurring({
      frequency: 'daily',
      interval: 1,
      start_date: new Date().toISOString().split('T')[0],
      template_data: {
        amount: 10.00,
        merchant: 'Test Recurring',
        category_id: 'your-category-id',
        account_id: 'your-account-id',
        description: 'Test daily recurring',
        type: 'expense',
      },
      auto_approve: true,
    });
    
    console.log('✅ Test recurring created!');
  };

  return <button onClick={createTest}>Create Test Recurring</button>;
}
```

---

### Step 5: Trigger Cron Job Manually (Testing)

```bash
# Get your cron secret
supabase secrets list

# Trigger the function
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-recurring-transactions' \
  -H 'Authorization: Bearer YOUR_CRON_SECRET' \
  -H 'Content-Type: application/json'
```

Check your `transactions` table - you should see a new transaction created!

---

## 📋 Common Use Cases

### 1. Monthly Rent (Auto-Approved)

```typescript
createRecurring({
  frequency: 'monthly',
  interval: 1,
  day_of_month: 1,  // 1st of each month
  start_date: '2025-01-01',
  template_data: {
    amount: 1200.00,
    merchant: 'Landlord',
    category_id: 'rent-category-id',
    account_id: 'checking-account-id',
    description: 'Monthly rent',
    type: 'expense',
  },
  auto_approve: true,  // Automatically create transactions
});
```

---

### 2. Weekly Subscription (Manual Approval)

```typescript
createRecurring({
  frequency: 'weekly',
  interval: 1,
  day_of_week: 1,  // Monday (0=Sunday, 1=Monday, ..., 6=Saturday)
  start_date: '2025-01-06',
  template_data: {
    amount: 9.99,
    merchant: 'Streaming Service',
    category_id: 'entertainment-category-id',
    account_id: 'credit-card-id',
    description: 'Weekly subscription',
    type: 'expense',
  },
  auto_approve: false,  // Requires manual approval
  notification_enabled: true,
  notification_days_before: 2,  // Notify 2 days before
});
```

---

### 3. Biweekly Paycheck

```typescript
createRecurring({
  frequency: 'biweekly',
  interval: 1,
  day_of_week: 5,  // Friday
  start_date: '2025-01-10',
  template_data: {
    amount: 2500.00,
    merchant: 'Employer Inc.',
    category_id: 'salary-category-id',
    account_id: 'checking-account-id',
    description: 'Biweekly salary',
    type: 'income',
  },
  auto_approve: true,
});
```

---

### 4. Annual Membership (with End Date)

```typescript
createRecurring({
  frequency: 'yearly',
  interval: 1,
  start_date: '2025-01-15',
  end_date: '2030-01-15',  // 5-year membership
  template_data: {
    amount: 199.99,
    merchant: 'Gym Membership',
    category_id: 'health-category-id',
    account_id: 'credit-card-id',
    description: 'Annual gym membership',
    type: 'expense',
  },
  auto_approve: false,
  notification_enabled: true,
  notification_days_before: 14,  // 2 weeks notice
});
```

---

### 5. Custom Frequency (Every 45 Days)

```typescript
createRecurring({
  frequency: 'custom',
  interval: 45,  // Days
  start_date: '2025-01-01',
  template_data: {
    amount: 50.00,
    merchant: 'Custom Payment',
    category_id: 'other-category-id',
    account_id: 'checking-account-id',
    description: 'Payment every 45 days',
    type: 'expense',
  },
  auto_approve: true,
});
```

---

## 🎯 Managing Recurring Transactions

### Fetch All Recurring

```typescript
const { recurring, loading, error } = useRecurringTransactions();

// recurring is automatically fetched on mount
console.log(recurring);
```

---

### Update Recurring

```typescript
const { updateRecurring } = useRecurringTransactions();

// Pause a recurring transaction
await updateRecurring('recurring-id', {
  is_active: false,
});

// Change notification settings
await updateRecurring('recurring-id', {
  notification_days_before: 7,
});

// Enable auto-approval
await updateRecurring('recurring-id', {
  auto_approve: true,
});
```

---

### Delete Recurring

```typescript
const { deleteRecurring } = useRecurringTransactions();

await deleteRecurring('recurring-id');
// This deletes the recurring transaction and all associated occurrences
```

---

## ✅ Managing Pending Occurrences

### Approve with Default Amount

```typescript
const { approveOccurrence } = useRecurringTransactions();

const transactionId = await approveOccurrence('occurrence-id');
console.log('Transaction created:', transactionId);
```

---

### Approve with Custom Amount

```typescript
const { approveOccurrence } = useRecurringTransactions();

// Override the template amount
const transactionId = await approveOccurrence(
  'occurrence-id',
  125.50,  // actual amount
  '2025-01-16'  // actual date
);
```

---

### Skip an Occurrence

```typescript
const { skipOccurrence } = useRecurringTransactions();

await skipOccurrence(
  'occurrence-id',
  'Already paid manually'  // optional reason
);
```

---

## 🔍 Querying Data

### Get Upcoming Recurring (SQL)

```sql
-- Get next 30 days of recurring for a user
SELECT * FROM get_upcoming_recurring_transactions(
  p_user_id := 'user-uuid',
  p_days_ahead := 30
);
```

---

### Get Occurrence History (SQL)

```sql
-- Get complete history for a recurring transaction
SELECT * FROM get_recurring_transaction_history(
  p_user_id := 'user-uuid',
  p_recurring_id := 'recurring-uuid'
);
```

---

### Get Pending Notifications (SQL)

```sql
-- Get all occurrences needing notification today
SELECT * FROM get_pending_notifications(CURRENT_DATE);
```

---

## 🐛 Troubleshooting

### Check if Cron Job is Running

```sql
-- View scheduled jobs
SELECT * FROM cron.job;

-- View recent job runs
SELECT * FROM cron.job_run_details 
WHERE jobid = (
  SELECT jobid FROM cron.job 
  WHERE jobname = 'generate-recurring-transactions-daily'
)
ORDER BY start_time DESC
LIMIT 10;
```

---

### Test Edge Function Manually

```bash
# Test the function endpoint
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-recurring-transactions' \
  -H 'Authorization: Bearer YOUR_CRON_SECRET' \
  -H 'Content-Type: application/json' \
  -d '{}'

# View function logs
supabase functions logs generate-recurring-transactions
```

---

### Check for Pending Generation

```sql
-- Find recurring transactions that should generate today
SELECT 
  id,
  next_occurrence_date,
  last_generated_date,
  template_data->>'merchant' as merchant,
  template_data->>'amount' as amount,
  is_active
FROM recurring_transactions
WHERE is_active = TRUE
  AND next_occurrence_date <= CURRENT_DATE;
```

---

### Force Generate Now (SQL)

```sql
-- Manually trigger generation
SELECT * FROM generate_pending_recurring_transactions(
  p_up_to_date := CURRENT_DATE,
  p_days_ahead := 0
);
```

---

## 📧 Email Notifications Setup

The edge function includes a placeholder for email notifications. To enable:

### Option 1: SendGrid

```typescript
// In supabase/functions/generate-recurring-transactions/index.ts
// Add SendGrid API call

const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    personalizations: [{
      to: [{ email: notification.user_email }],
      subject: 'Recurring Transaction Due',
    }],
    from: { email: 'noreply@yourapp.com' },
    content: [{
      type: 'text/html',
      value: formatNotificationMessage(notification),
    }],
  }),
});
```

Then set the secret:
```bash
supabase secrets set SENDGRID_API_KEY=your-api-key
```

---

### Option 2: Resend

```typescript
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'noreply@yourapp.com',
    to: notification.user_email,
    subject: 'Recurring Transaction Due',
    html: formatNotificationMessage(notification),
  }),
});
```

---

## 🎨 Example React Component

```typescript
'use client';

import { useRecurringTransactions } from '@/hooks/use-recurring-transactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function RecurringTransactionsList() {
  const { 
    recurring, 
    loading, 
    error, 
    updateRecurring, 
    deleteRecurring 
  } = useRecurringTransactions();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Recurring Transactions</h2>
      
      {recurring.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <CardTitle>{item.template_data.merchant}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Amount: ${item.template_data.amount.toFixed(2)}</p>
              <p>Frequency: {item.frequency}</p>
              <p>Next: {item.next_occurrence_date}</p>
              <p>Status: {item.is_active ? 'Active' : 'Paused'}</p>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => updateRecurring(item.id, { 
                    is_active: !item.is_active 
                  })}
                >
                  {item.is_active ? 'Pause' : 'Resume'}
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Delete this recurring transaction?')) {
                      deleteRecurring(item.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## ✨ Next Steps

1. **Create UI Components** - Build forms for creating/editing recurring
2. **Add Pending Approvals Page** - Show occurrences awaiting approval
3. **Setup Email Service** - Configure SendGrid or Resend
4. **Add Dashboard Widget** - Show upcoming recurring on dashboard
5. **Create Calendar View** - Visualize recurring schedule
6. **Add Bulk Actions** - Pause/resume multiple recurring at once

---

## 📚 Full Documentation

See `RECURRING_TRANSACTIONS_DOCUMENTATION.md` for:
- Complete API reference
- All database functions
- Security details
- Advanced examples
- Troubleshooting guide

---

## 🆘 Need Help?

1. Check the full documentation
2. Review the example SQL queries
3. Test the edge function manually
4. Check Supabase logs
5. Verify RLS policies are working

---

**That's it! Your recurring transactions system is ready to use!** 🎉
