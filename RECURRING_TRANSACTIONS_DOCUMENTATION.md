# Recurring Transactions System

## Overview

The Recurring Transactions system provides a comprehensive solution for automating repetitive financial transactions. It includes database tables, PostgreSQL functions, API routes, Supabase Edge Functions, and React hooks for complete functionality.

## Features

✅ **Flexible Scheduling**
- Daily, weekly, biweekly, monthly, quarterly, yearly, and custom frequencies
- Specify day of month or day of week
- Set start dates, end dates, and occurrence limits
- Automatic calculation of next occurrence dates

✅ **Approval Workflows**
- Auto-approve or manual approval options
- Modify amounts before approving
- Skip individual occurrences with reasons
- Track variance between expected and actual amounts

✅ **Notifications**
- Configurable notification timing (days before due date)
- Email notifications for pending approvals
- Enable/disable per recurring transaction

✅ **Tracking & History**
- Complete history of all occurrences
- Status tracking (pending, generated, skipped, modified)
- Amount variance tracking
- Transaction linkage

✅ **Automated Generation**
- Daily cron job via Supabase Edge Function
- Automatic transaction creation for auto-approved items
- Pending occurrence creation for manual approval items
- Automatic deactivation when limits reached

---

## Database Schema

### `recurring_transactions` Table

Stores recurring transaction templates and schedules.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to profiles |
| `template_transaction_id` | UUID | Optional reference to template transaction |
| `frequency` | ENUM | daily, weekly, biweekly, monthly, quarterly, yearly, custom |
| `interval` | INTEGER | Multiplier for frequency (e.g., every 2 weeks) |
| `day_of_month` | INTEGER | For monthly/quarterly/yearly (1-31) |
| `day_of_week` | INTEGER | For weekly/biweekly (0-6, 0=Sunday) |
| `start_date` | DATE | When recurring starts |
| `end_date` | DATE | When recurring ends (nullable) |
| `occurrence_count` | INTEGER | Max number of occurrences (nullable) |
| `next_occurrence_date` | DATE | Next scheduled occurrence |
| `last_generated_date` | DATE | Last time a transaction was generated |
| `template_data` | JSONB | Transaction template (amount, category, etc.) |
| `is_active` | BOOLEAN | Whether recurring is active |
| `auto_approve` | BOOLEAN | Auto-generate transactions |
| `notification_enabled` | BOOLEAN | Send notifications |
| `notification_days_before` | INTEGER | Days before occurrence to notify |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_recurring_transactions_user_id` - User lookup
- `idx_recurring_transactions_next_occurrence` - Active recurring lookup
- `idx_recurring_transactions_template` - Template linkage
- `idx_recurring_transactions_active` - Active user recurring

---

### `recurring_occurrences` Table

Tracks individual occurrences of recurring transactions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `recurring_id` | UUID | Foreign key to recurring_transactions |
| `generated_transaction_id` | UUID | Link to created transaction (nullable) |
| `expected_date` | DATE | When occurrence was expected |
| `actual_date` | DATE | When transaction was actually created |
| `status` | ENUM | pending, generated, skipped, modified |
| `amount_variance` | DECIMAL | Difference from template amount |
| `notes` | TEXT | Additional notes (e.g., skip reason) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_recurring_occurrences_recurring_id` - Recurring lookup
- `idx_recurring_occurrences_transaction_id` - Transaction linkage
- `idx_recurring_occurrences_status` - Status filtering
- `idx_recurring_occurrences_expected_date` - Date sorting

---

## PostgreSQL Functions

### `calculate_next_occurrence_date()`

Calculates the next occurrence date based on frequency settings.

```sql
SELECT calculate_next_occurrence_date(
  p_current_date := '2025-01-15',
  p_frequency := 'monthly',
  p_interval := 1,
  p_day_of_month := 15,
  p_day_of_week := NULL
);
-- Returns: '2025-02-15'
```

**Parameters:**
- `p_current_date` - Starting date
- `p_frequency` - Frequency type (daily, weekly, etc.)
- `p_interval` - Interval multiplier
- `p_day_of_month` - Optional day of month (1-31)
- `p_day_of_week` - Optional day of week (0-6)

**Returns:** `DATE` - Next occurrence date

---

### `generate_pending_recurring_transactions()`

Generates transactions for all due recurring schedules. Called by cron job.

```sql
SELECT * FROM generate_pending_recurring_transactions(
  p_up_to_date := CURRENT_DATE,
  p_days_ahead := 0
);
```

**Parameters:**
- `p_up_to_date` - Generate up to this date (default: today)
- `p_days_ahead` - Generate this many days ahead (default: 0)

**Returns:** Table with:
- `recurring_id` - ID of recurring transaction
- `transaction_id` - ID of generated transaction (if auto-approved)
- `expected_date` - Date of occurrence
- `status` - 'generated', 'pending', or 'error'
- `message` - Status message

**Behavior:**
- Creates transactions for auto-approved recurring
- Creates pending occurrences for manual approval
- Updates next_occurrence_date
- Deactivates recurring when limits reached
- Handles errors gracefully

---

### `get_upcoming_recurring_transactions()`

Gets upcoming recurring transactions for a user.

```sql
SELECT * FROM get_upcoming_recurring_transactions(
  p_user_id := 'user-uuid',
  p_days_ahead := 30
);
```

**Parameters:**
- `p_user_id` - User UUID
- `p_days_ahead` - Look ahead this many days (default: 30)

**Returns:** Table with upcoming recurring transactions

---

### `get_recurring_transaction_history()`

Gets complete history of occurrences for a recurring transaction.

```sql
SELECT * FROM get_recurring_transaction_history(
  p_user_id := 'user-uuid',
  p_recurring_id := 'recurring-uuid'
);
```

**Parameters:**
- `p_user_id` - User UUID
- `p_recurring_id` - Recurring transaction UUID

**Returns:** Table with occurrence history

---

### `approve_recurring_occurrence()`

Approves a pending occurrence and creates the transaction.

```sql
SELECT approve_recurring_occurrence(
  p_user_id := 'user-uuid',
  p_occurrence_id := 'occurrence-uuid',
  p_actual_amount := 99.99,  -- Optional: override amount
  p_actual_date := '2025-01-15'  -- Optional: override date
);
```

**Parameters:**
- `p_user_id` - User UUID
- `p_occurrence_id` - Occurrence UUID
- `p_actual_amount` - Optional actual amount (overrides template)
- `p_actual_date` - Optional actual date (overrides expected)

**Returns:** `UUID` - ID of created transaction

---

### `skip_recurring_occurrence()`

Skips a pending occurrence.

```sql
SELECT skip_recurring_occurrence(
  p_user_id := 'user-uuid',
  p_occurrence_id := 'occurrence-uuid',
  p_reason := 'Already paid manually'
);
```

**Parameters:**
- `p_user_id` - User UUID
- `p_occurrence_id` - Occurrence UUID
- `p_reason` - Optional reason for skipping

**Returns:** `BOOLEAN` - Success status

---

### `get_pending_notifications()`

Gets pending occurrences that need notifications.

```sql
SELECT * FROM get_pending_notifications(
  p_date := CURRENT_DATE
);
```

**Parameters:**
- `p_date` - Reference date (default: today)

**Returns:** Table with notifications to send

---

## API Routes

### `GET /api/recurring`

Fetch all recurring transactions for the authenticated user.

**Query Parameters:**
- `days_ahead` (optional) - Number of days to look ahead (default: 30)
- `include_inactive` (optional) - Include inactive recurring (default: false)

**Response:**
```json
{
  "recurring": [
    {
      "id": "uuid",
      "frequency": "monthly",
      "next_occurrence_date": "2025-01-15",
      "template_data": {
        "amount": 1200.00,
        "merchant": "Landlord",
        "category_id": "uuid",
        "account_id": "uuid",
        "description": "Monthly rent",
        "type": "expense"
      },
      "is_active": true,
      "auto_approve": true
    }
  ]
}
```

---

### `POST /api/recurring`

Create a new recurring transaction.

**Request Body:**
```json
{
  "frequency": "monthly",
  "interval": 1,
  "day_of_month": 15,
  "start_date": "2025-01-15",
  "template_data": {
    "amount": 1200.00,
    "merchant": "Landlord",
    "category_id": "uuid",
    "account_id": "uuid",
    "description": "Monthly rent",
    "type": "expense"
  },
  "auto_approve": true,
  "notification_enabled": true,
  "notification_days_before": 2
}
```

**Response:**
```json
{
  "recurring": { /* created recurring transaction */ }
}
```

---

### `PATCH /api/recurring/[id]`

Update a recurring transaction.

**Request Body:** (partial update)
```json
{
  "is_active": false,
  "notification_days_before": 5
}
```

---

### `DELETE /api/recurring/[id]`

Delete a recurring transaction and all associated occurrences.

**Response:**
```json
{
  "success": true
}
```

---

### `POST /api/recurring/occurrences/[id]/approve`

Approve a pending occurrence.

**Request Body:**
```json
{
  "actual_amount": 1250.00,  // Optional: override amount
  "actual_date": "2025-01-16"  // Optional: override date
}
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "uuid"
}
```

---

### `POST /api/recurring/occurrences/[id]/skip`

Skip a pending occurrence.

**Request Body:**
```json
{
  "reason": "Already paid manually"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## React Hook

### `useRecurringTransactions()`

React hook for managing recurring transactions.

```typescript
import { useRecurringTransactions } from '@/hooks/use-recurring-transactions';

function MyComponent() {
  const {
    recurring,
    loading,
    error,
    fetchRecurring,
    createRecurring,
    updateRecurring,
    deleteRecurring,
    approveOccurrence,
    skipOccurrence,
  } = useRecurringTransactions();

  // Create new recurring
  const handleCreate = async () => {
    await createRecurring({
      frequency: 'monthly',
      interval: 1,
      day_of_month: 1,
      start_date: '2025-01-01',
      template_data: {
        amount: 100.00,
        merchant: 'Netflix',
        category_id: 'category-uuid',
        account_id: 'account-uuid',
        description: 'Monthly subscription',
        type: 'expense',
      },
      auto_approve: true,
    });
  };

  // Approve occurrence
  const handleApprove = async (occurrenceId: string) => {
    const transactionId = await approveOccurrence(occurrenceId);
    console.log('Transaction created:', transactionId);
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {recurring.map(r => (
        <div key={r.id}>{r.template_data.merchant}</div>
      ))}
    </div>
  );
}
```

---

## Supabase Edge Function

### `generate-recurring-transactions`

Daily cron job that generates due recurring transactions.

**Deploy:**
```bash
supabase functions deploy generate-recurring-transactions
```

**Set Secrets:**
```bash
supabase secrets set CRON_SECRET=your-secret-key
```

**Schedule Cron:**
```sql
SELECT cron.schedule(
  'generate-recurring-transactions-daily',
  '0 2 * * *',  -- 2 AM UTC
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/generate-recurring-transactions',
    headers:='{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
  );
  $$
);
```

**Test Manually:**
```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/generate-recurring-transactions' \
  -H 'Authorization: Bearer YOUR_CRON_SECRET'
```

---

## Setup Instructions

### 1. Run Database Migration

```bash
# Using Supabase CLI
supabase db push

# Or run SQL directly
psql -d your_database -f supabase/migrations/20250109000000_create_recurring_transactions.sql
```

### 2. Deploy Edge Function

```bash
cd supabase/functions
supabase functions deploy generate-recurring-transactions
```

### 3. Set Environment Variables

```bash
supabase secrets set CRON_SECRET=your-secure-random-string
```

### 4. Schedule Cron Job

In Supabase Dashboard or via SQL:
```sql
SELECT cron.schedule(
  'generate-recurring-transactions-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url:='https://your-project-ref.supabase.co/functions/v1/generate-recurring-transactions',
    headers:='{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
```

### 5. Test the System

```typescript
// Create a test recurring transaction
const { createRecurring } = useRecurringTransactions();

await createRecurring({
  frequency: 'daily',
  interval: 1,
  start_date: new Date().toISOString().split('T')[0],
  template_data: {
    amount: 5.00,
    merchant: 'Test Merchant',
    category_id: 'your-category-id',
    account_id: 'your-account-id',
    description: 'Test recurring',
    type: 'expense',
  },
  auto_approve: true,
});

// Wait for cron job to run (or trigger manually)
// Check transactions table for new entry
```

---

## Usage Examples

### Monthly Rent Payment

```typescript
createRecurring({
  frequency: 'monthly',
  interval: 1,
  day_of_month: 1,
  start_date: '2025-01-01',
  template_data: {
    amount: 1200.00,
    merchant: 'Landlord',
    category_id: 'housing-category-id',
    account_id: 'checking-account-id',
    description: 'Monthly rent payment',
    type: 'expense',
  },
  auto_approve: true,
  notification_enabled: false,
});
```

### Weekly Allowance (Manual Approval)

```typescript
createRecurring({
  frequency: 'weekly',
  interval: 1,
  day_of_week: 5,  // Friday
  start_date: '2025-01-03',
  end_date: '2025-12-31',
  template_data: {
    amount: 50.00,
    merchant: 'Allowance',
    category_id: 'income-category-id',
    account_id: 'checking-account-id',
    description: 'Weekly allowance',
    type: 'income',
  },
  auto_approve: false,  // Requires manual approval
  notification_enabled: true,
  notification_days_before: 1,
});
```

### Biweekly Paycheck

```typescript
createRecurring({
  frequency: 'biweekly',
  interval: 1,
  day_of_week: 5,  // Friday
  start_date: '2025-01-10',
  template_data: {
    amount: 2500.00,
    merchant: 'Employer',
    category_id: 'salary-category-id',
    account_id: 'checking-account-id',
    description: 'Biweekly paycheck',
    type: 'income',
  },
  auto_approve: true,
});
```

### Annual Subscription

```typescript
createRecurring({
  frequency: 'yearly',
  interval: 1,
  start_date: '2025-03-15',
  template_data: {
    amount: 99.99,
    merchant: 'Software Company',
    category_id: 'subscriptions-category-id',
    account_id: 'credit-card-id',
    description: 'Annual software license',
    type: 'expense',
  },
  auto_approve: false,
  notification_enabled: true,
  notification_days_before: 7,  // Notify 1 week before
});
```

---

## Security

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure users can only:
- View their own recurring transactions and occurrences
- Create recurring transactions for themselves
- Update/delete only their own recurring transactions
- Approve/skip only their own occurrences

### Function Security

All functions use `SECURITY DEFINER` with built-in user verification to ensure:
- Users can only operate on their own data
- Service role functions (cron) can access all users' data
- Proper error handling prevents information leakage

---

## Troubleshooting

### Cron Job Not Running

1. Check cron schedule:
```sql
SELECT * FROM cron.job WHERE jobname = 'generate-recurring-transactions-daily';
```

2. Check cron logs:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'generate-recurring-transactions-daily')
ORDER BY start_time DESC
LIMIT 10;
```

3. Test edge function manually:
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/generate-recurring-transactions' \
  -H 'Authorization: Bearer YOUR_CRON_SECRET'
```

### Transactions Not Generated

1. Check recurring is active:
```sql
SELECT * FROM recurring_transactions WHERE is_active = TRUE;
```

2. Check next_occurrence_date is in the past:
```sql
SELECT * FROM recurring_transactions 
WHERE is_active = TRUE 
AND next_occurrence_date <= CURRENT_DATE;
```

3. Check for errors in occurrences:
```sql
SELECT * FROM recurring_occurrences WHERE status = 'error';
```

### Notifications Not Sending

1. Verify notification settings:
```sql
SELECT * FROM recurring_transactions 
WHERE notification_enabled = TRUE;
```

2. Check pending notifications:
```sql
SELECT * FROM get_pending_notifications(CURRENT_DATE);
```

3. Configure email service in edge function (SendGrid, etc.)

---

## Future Enhancements

- [ ] Web UI for managing recurring transactions
- [ ] Email template customization
- [ ] Push notification support
- [ ] SMS notification option
- [ ] Bulk operations (pause all, delete all)
- [ ] Import from bank recurring transactions
- [ ] Machine learning for anomaly detection
- [ ] Split transactions support
- [ ] Multi-currency support
- [ ] Recurring transaction templates library

---

## Contributing

When adding features:
1. Update database migration
2. Add/update API routes
3. Update React hook
4. Add tests
5. Update documentation

---

## License

MIT License - see LICENSE file for details
