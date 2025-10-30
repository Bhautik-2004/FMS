import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/goals/[id]/milestones - List milestones
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify goal ownership
    const { data: goal, error: goalError } = await supabase
      .from('financial_goals')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (goalError) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Fetch milestones
    const { data: milestones, error: milestonesError } = await supabase
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', id)
      .order('target_amount', { ascending: true });

    if (milestonesError) {
      console.error('Error fetching milestones:', milestonesError);
      return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 });
    }

    return NextResponse.json({ milestones: milestones || [] });
  } catch (error) {
    console.error('Error in GET /api/goals/[id]/milestones:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/goals/[id]/milestones - Add milestone
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify goal ownership
    const { data: goal, error: goalError } = await supabase
      .from('financial_goals')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (goalError) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, target_amount } = body;

    // Validate required fields
    if (!name || !target_amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create milestone
    const { data: milestone, error: milestoneError } = await supabase
      .from('goal_milestones')
      .insert({
        goal_id: id,
        name,
        target_amount,
      })
      .select()
      .single();

    if (milestoneError) {
      console.error('Error creating milestone:', milestoneError);
      return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 });
    }

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/goals/[id]/milestones:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
