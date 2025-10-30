# Financial Goals System - Complete Documentation

## Overview

The Financial Goals System enables users to set, track, and achieve their financial objectives with automated progress monitoring, milestone tracking, and intelligent contribution suggestions.

## Database Schema

### Tables

#### 1. `financial_goals`
Stores user financial goals and targets.

**Columns:**
- `id` (UUID, PK) - Unique goal identifier
- `user_id` (UUID, FK → user_profiles) - Goal owner
- `name` (TEXT) - Goal name (e.g., "Emergency Fund", "Vacation")
- `goal_type` (goal_type enum) - Type of goal
  - `savings` - Save money for a target
  - `debt_payoff` - Pay off debt
  - `net_worth` - Reach net worth target
  - `investment` - Investment goal
- `target_amount` (DECIMAL) - Target amount to reach
- `current_amount` (DECIMAL) - Current progress amount
- `currency` (TEXT) - Currency code (default: USD)
- `start_date` (DATE) - When goal tracking begins
- `target_date` (DATE) - Target completion date
- `category_id` (UUID, FK → categories, nullable) - Linked category for auto-tracking
- `account_id` (UUID, FK → accounts, nullable) - Dedicated account
- `icon` (TEXT, nullable) - Icon identifier
- `color` (TEXT) - Color hex code (default: #3b82f6)
- `priority` (INTEGER) - Priority level (default: 1)
- `is_active` (BOOLEAN) - Goal status (default: TRUE)
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp
- `completed_at` (TIMESTAMPTZ, nullable) - Completion timestamp

**Indexes:**
- `idx_financial_goals_user_id` - User lookup
- `idx_financial_goals_type` - Type filtering
- `idx_financial_goals_active` - Active goals by user
- `idx_financial_goals_target_date` - Deadline sorting
- `idx_financial_goals_category` - Category linkage
- `idx_financial_goals_account` - Account linkage

#### 2. `goal_contributions`
Tracks individual contributions toward goals.

**Columns:**
- `id` (UUID, PK) - Unique contribution identifier
- `goal_id` (UUID, FK → financial_goals) - Associated goal
- `transaction_id` (UUID, FK → transactions, nullable) - Linked transaction
- `amount` (DECIMAL) - Contribution amount (can be negative)
- `type` (contribution_type enum) - Contribution type
  - `manual` - Manually added
  - `automatic` - Auto-tracked from rules
  - `transaction` - Linked to specific transaction
- `date` (DATE) - Contribution date
- `notes` (TEXT, nullable) - Additional notes
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Indexes:**
- `idx_goal_contributions_goal_id` - Goal lookup
- `idx_goal_contributions_transaction_id` - Transaction linkage
- `idx_goal_contributions_date` - Date sorting
- `idx_goal_contributions_type` - Type filtering

**Triggers:**
- Automatically updates goal `current_amount` on INSERT/UPDATE/DELETE
- Automatically sets `completed_at` when target is reached
- Automatically checks and updates milestones

#### 3. `goal_milestones`
Tracks milestone achievements for goals.

**Columns:**
- `id` (UUID, PK) - Unique milestone identifier
- `goal_id` (UUID, FK → financial_goals) - Associated goal
- `name` (TEXT) - Milestone name (e.g., "25% Complete")
- `target_amount` (DECIMAL) - Amount to reach milestone
- `is_achieved` (BOOLEAN) - Achievement status
- `achieved_date` (DATE, nullable) - When achieved
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Indexes:**
- `idx_goal_milestones_goal_id` - Goal lookup
- `idx_goal_milestones_achieved` - Achievement filtering

## Database Functions

### 1. `calculate_goal_progress(p_goal_id UUID)`

Calculates comprehensive progress metrics for a goal.

**Parameters:**
- `p_goal_id` - Goal ID to calculate

**Returns:**
```sql
TABLE (
  goal_id UUID,
  target_amount DECIMAL,
  current_amount DECIMAL,
  progress_percentage DECIMAL,
  remaining_amount DECIMAL,
  is_completed BOOLEAN,
  days_remaining INTEGER,
  days_elapsed INTEGER,
  total_days INTEGER,
  average_daily_progress DECIMAL,
  on_track BOOLEAN
)
```

**Example Usage:**
```sql
SELECT * FROM calculate_goal_progress('goal-uuid-here');
```

### 2. `project_goal_completion_date(p_goal_id UUID, p_projection_method TEXT)`

Projects when a goal will be completed based on contribution patterns.

**Parameters:**
- `p_goal_id` - Goal ID to project
- `p_projection_method` - Projection method (default: 'current_rate')
  - `'current_rate'` - Uses overall average contribution rate
  - `'recent_rate'` - Uses last 30 days average
  - `'target_based'` - Uses target date requirement

**Returns:**
```sql
TABLE (
  projected_date DATE,
  days_until_completion INTEGER,
  confidence_level TEXT, -- 'high', 'medium', 'low'
  based_on TEXT -- 'overall_average', 'recent_30_days', 'target_date', etc.
)
```

**Example Usage:**
```sql
SELECT * FROM project_goal_completion_date('goal-uuid-here', 'current_rate');
```

### 3. `suggest_monthly_contribution(p_goal_id UUID)`

Suggests required and recommended monthly contributions to meet goal.

**Parameters:**
- `p_goal_id` - Goal ID for suggestions

**Returns:**
```sql
TABLE (
  required_monthly DECIMAL, -- Minimum to meet target date
  recommended_monthly DECIMAL, -- Required + 10% buffer
  current_monthly_avg DECIMAL, -- Current 90-day average
  months_remaining DECIMAL, -- Time left in months
  suggested_adjustment DECIMAL, -- Difference from current
  is_achievable BOOLEAN, -- Whether goal is realistic
  notes TEXT -- Actionable advice
)
```

**Example Usage:**
```sql
SELECT * FROM suggest_monthly_contribution('goal-uuid-here');
```

### 4. `get_user_goals_summary(p_user_id UUID)`

Returns aggregate summary of all user goals.

**Parameters:**
- `p_user_id` - User ID

**Returns:**
```sql
TABLE (
  total_goals INTEGER,
  active_goals INTEGER,
  completed_goals INTEGER,
  total_target_amount DECIMAL,
  total_current_amount DECIMAL,
  overall_progress DECIMAL,
  on_track_goals INTEGER,
  behind_schedule_goals INTEGER,
  total_contributions_30d DECIMAL
)
```

**Example Usage:**
```sql
SELECT * FROM get_user_goals_summary(auth.uid());
```

### 5. `create_standard_milestones(p_goal_id UUID)`

Automatically creates 25%, 50%, 75%, and 100% milestones for a goal.

**Parameters:**
- `p_goal_id` - Goal ID

**Returns:** VOID

**Example Usage:**
```sql
SELECT create_standard_milestones('new-goal-uuid');
```

## Row Level Security (RLS)

All tables have RLS enabled with policies:

**financial_goals:**
- Users can SELECT/INSERT/UPDATE/DELETE their own goals only

**goal_contributions:**
- Users can SELECT/INSERT/UPDATE/DELETE contributions for their goals only

**goal_milestones:**
- Users can SELECT/INSERT/UPDATE/DELETE milestones for their goals only

## Enums

### `goal_type`
```sql
'savings' | 'debt_payoff' | 'net_worth' | 'investment'
```

### `contribution_type`
```sql
'manual' | 'automatic' | 'transaction'
```

## API Implementation Guide

### Create a Goal

```typescript
const { data, error } = await supabase
  .from('financial_goals')
  .insert({
    name: 'Emergency Fund',
    goal_type: 'savings',
    target_amount: 10000,
    target_date: '2025-12-31',
    icon: 'shield',
    color: '#10b981',
    priority: 1
  })
  .select()
  .single();

// Optionally create standard milestones
if (data) {
  await supabase.rpc('create_standard_milestones', {
    p_goal_id: data.id
  });
}
```

### Add a Contribution

```typescript
const { data, error } = await supabase
  .from('goal_contributions')
  .insert({
    goal_id: 'goal-uuid',
    amount: 500,
    type: 'manual',
    notes: 'Monthly contribution'
  })
  .select()
  .single();

// current_amount is automatically updated via trigger
```

### Get Goal Progress

```typescript
const { data, error } = await supabase
  .rpc('calculate_goal_progress', {
    p_goal_id: 'goal-uuid'
  });

console.log(data[0].progress_percentage); // e.g., 45.50
console.log(data[0].on_track); // true/false
```

### Get Contribution Suggestions

```typescript
const { data, error } = await supabase
  .rpc('suggest_monthly_contribution', {
    p_goal_id: 'goal-uuid'
  });

console.log(data[0].recommended_monthly); // e.g., 550.00
console.log(data[0].notes); // Actionable advice
```

### Project Completion Date

```typescript
const { data, error } = await supabase
  .rpc('project_goal_completion_date', {
    p_goal_id: 'goal-uuid',
    p_projection_method: 'current_rate'
  });

console.log(data[0].projected_date); // e.g., '2026-03-15'
console.log(data[0].confidence_level); // 'high', 'medium', 'low'
```

### Get User Summary

```typescript
const { data: { user } } = await supabase.auth.getUser();

const { data, error } = await supabase
  .rpc('get_user_goals_summary', {
    p_user_id: user.id
  });

console.log(data[0].active_goals); // e.g., 5
console.log(data[0].overall_progress); // e.g., 62.5
```

## Features to Implement

### 1. Goals List Page
- Display all active goals with progress bars
- Show milestone achievements
- Sort by priority, deadline, or progress
- Filter by goal type
- Quick actions (add contribution, view details, edit, delete)

### 2. Goal Detail Page
- Comprehensive progress visualization (charts)
- Contribution history with timeline
- Milestone tracking with achievements
- Projection charts (current rate vs required rate)
- Edit goal details
- Add/edit contributions

### 3. Add/Edit Goal Dialog
- Form with all goal fields
- Date pickers for start/target dates
- Icon and color selector
- Option to auto-create milestones
- Link to category/account

### 4. Add Contribution Dialog
- Amount input
- Type selector (manual/automatic/transaction)
- Date picker
- Notes field
- Option to link to transaction

### 5. Goals Dashboard Widget
- Summary stats (active goals, overall progress)
- Goals requiring attention (behind schedule)
- Recent contributions
- Suggested actions

### 6. Automatic Tracking
- Link goals to categories
- Auto-create contributions when matching transactions occur
- Notify when milestones are reached
- Alert when falling behind schedule

## Next Steps

1. **Run the migration:**
   ```bash
   # With Supabase CLI
   supabase migration up
   
   # Or apply manually through Supabase Dashboard
   ```

2. **Update types:**
   ```bash
   npx supabase gen types typescript --local > src/lib/supabase/types.ts
   ```

3. **Create API routes:**
   - `POST /api/goals` - Create goal
   - `GET /api/goals` - List goals
   - `GET /api/goals/[id]` - Get goal details
   - `PATCH /api/goals/[id]` - Update goal
   - `DELETE /api/goals/[id]` - Delete goal
   - `POST /api/goals/[id]/contributions` - Add contribution
   - `GET /api/goals/[id]/progress` - Get progress
   - `GET /api/goals/[id]/projection` - Get projection
   - `GET /api/goals/[id]/suggestions` - Get suggestions
   - `GET /api/goals/summary` - Get user summary

4. **Create React components:**
   - `GoalsPageClient` - Main goals page
   - `GoalsList` - Goals list with filters
   - `GoalCard` - Individual goal card
   - `GoalDetailView` - Detailed goal view
   - `AddGoalDialog` - Create/edit goal form
   - `AddContributionDialog` - Add contribution form
   - `GoalProgressChart` - Progress visualization
   - `GoalMilestones` - Milestone tracker
   - `GoalsDashboard` - Dashboard widget

5. **Add to navigation:**
   ```typescript
   {
     name: 'Goals',
     href: '/goals',
     icon: Target,
   }
   ```

## Example Queries

### Get goals with progress
```sql
SELECT 
  fg.*,
  p.progress_percentage,
  p.on_track,
  p.days_remaining
FROM financial_goals fg
CROSS JOIN LATERAL calculate_goal_progress(fg.id) p
WHERE fg.user_id = auth.uid()
  AND fg.is_active = TRUE
ORDER BY fg.priority ASC, fg.target_date ASC;
```

### Get contribution history
```sql
SELECT 
  gc.*,
  t.merchant_name,
  t.description
FROM goal_contributions gc
LEFT JOIN transactions t ON t.id = gc.transaction_id
WHERE gc.goal_id = 'goal-uuid'
ORDER BY gc.date DESC, gc.created_at DESC;
```

### Get milestones with achievements
```sql
SELECT *
FROM goal_milestones
WHERE goal_id = 'goal-uuid'
ORDER BY target_amount ASC;
```

## Migration File Location

`supabase/migrations/20250110000000_create_financial_goals.sql`

This comprehensive system provides everything needed to build a robust financial goals feature! 🎯
