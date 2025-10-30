import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/goals - List all goals with summary
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all goals
    const { data: goals, error: goalsError } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (goalsError) {

      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
    }

    // Fetch summary
    const { data: summary, error: summaryError } = await supabase
      .rpc('get_user_goals_summary', { p_user_id: user.id });

    if (summaryError) {

      return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
    }

    // RPC functions return arrays, so we need to extract the first element
    const summaryData = summary && summary.length > 0 ? summary[0] : null;

    return NextResponse.json({ goals, summary: summaryData });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/goals - Create a new goal
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      goal_type,
      target_amount,
      current_amount = 0,
      start_date,
      target_date,
      category_id,
      account_id,
      icon = 'target',
      color = '#3b82f6',
      priority = 2,
      create_milestones = true,
    } = body;

    // Validate required fields
    if (!name || !goal_type || !target_amount || !start_date || !target_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the goal
    const { data: goal, error: goalError } = await supabase
      .from('financial_goals')
      .insert({
        user_id: user.id,
        name,
        goal_type,
        target_amount,
        current_amount,
        start_date,
        target_date,
        category_id,
        account_id,
        icon,
        color,
        priority,
      })
      .select()
      .single();

    if (goalError) {

      return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
    }

    // Create standard milestones if requested
    if (create_milestones) {
      const { error: milestonesError } = await supabase
        .rpc('create_standard_milestones', { p_goal_id: goal.id });

      if (milestonesError) {

        // Don't fail the request if milestones creation fails
      }
    }

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
