import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/goals/[id]/suggestions - Get contribution suggestions
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

    // Call RPC function
    const { data, error } = await supabase
      .rpc('suggest_monthly_contribution', { p_goal_id: id });

    if (error) {
      console.error('Error getting suggestions:', error);
      return NextResponse.json({ error: 'Failed to get suggestions' }, { status: 500 });
    }

    return NextResponse.json({ suggestions: data[0] || null });
  } catch (error) {
    console.error('Error in GET /api/goals/[id]/suggestions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
