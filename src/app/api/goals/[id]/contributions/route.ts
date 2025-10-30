import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/goals/[id]/contributions - List contributions
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

    // Fetch contributions
    const { data: contributions, error: contributionsError } = await supabase
      .from('goal_contributions')
      .select('*')
      .eq('goal_id', id)
      .order('date', { ascending: false });

    if (contributionsError) {
      console.error('Error fetching contributions:', contributionsError);
      return NextResponse.json({ error: 'Failed to fetch contributions' }, { status: 500 });
    }

    return NextResponse.json({ contributions: contributions || [] });
  } catch (error) {
    console.error('Error in GET /api/goals/[id]/contributions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/goals/[id]/contributions - Add contribution
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
    const { amount, type, date, notes, transaction_id } = body;

    // Validate required fields
    if (!amount || !type || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create contribution
    const { data: contribution, error: contributionError } = await supabase
      .from('goal_contributions')
      .insert({
        goal_id: id,
        amount,
        type,
        date,
        notes,
        transaction_id,
      })
      .select()
      .single();

    if (contributionError) {
      console.error('Error creating contribution:', contributionError);
      return NextResponse.json({ error: 'Failed to create contribution' }, { status: 500 });
    }

    return NextResponse.json(contribution, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/goals/[id]/contributions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
