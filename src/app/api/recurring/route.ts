// =====================================================
// API Route: Recurring Transactions
// =====================================================
// GET: Fetch all recurring transactions for the user
// POST: Create a new recurring transaction
// =====================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('days_ahead') || '30');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    // Fetch recurring transactions
    let query = supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('next_occurrence_date', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: recurring, error } = await query;

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ recurring });
  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        });

      if (createError) {

        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
      }
    }

    const body = await request.json();
    const {
      template_transaction_id,
      frequency,
      interval = 1,
      day_of_month,
      day_of_week,
      start_date,
      end_date,
      occurrence_count,
      template_data,
      auto_approve = false,
      notification_enabled = true,
      notification_days_before = 1,
    } = body;

    // Validate required fields
    if (!frequency || !start_date || !template_data) {
      return NextResponse.json(
        { error: 'Missing required fields: frequency, start_date, template_data' },
        { status: 400 }
      );
    }

    // Calculate next occurrence date
    const { data: nextDate, error: calcError } = await supabase.rpc(
      'calculate_next_occurrence_date',
      {
        p_current_date: start_date,
        p_frequency: frequency,
        p_interval: interval,
        p_day_of_month: day_of_month || null,
        p_day_of_week: day_of_week || null,
      }
    ) as { data: string | null; error: any };

    if (calcError || !nextDate) {

      return NextResponse.json({ error: calcError?.message || 'Failed to calculate next occurrence' }, { status: 500 });
    }

    // Create recurring transaction
    const { data: recurring, error: insertError } = await supabase
      .from('recurring_transactions')
      .insert({
        user_id: user.id,
        template_transaction_id: template_transaction_id || null,
        frequency,
        interval,
        day_of_month: day_of_month || null,
        day_of_week: day_of_week || null,
        start_date,
        end_date: end_date || null,
        occurrence_count: occurrence_count || null,
        next_occurrence_date: nextDate,
        template_data,
        auto_approve,
        notification_enabled,
        notification_days_before,
      })
      .select()
      .single();

    if (insertError) {

      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ recurring }, { status: 201 });
  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
