import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/goals/[id]/projection - Get completion date projection
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

    // Get method from query params (default to current_rate)
    const { searchParams } = new URL(request.url);
    const method = searchParams.get('method') || 'current_rate';

    // Call RPC function with correct parameter name
    const { data, error } = await supabase
      .rpc('project_goal_completion_date', { 
        p_goal_id: id,
        p_projection_method: method 
      });

    if (error) {
      console.error('Error projecting completion:', error);
      return NextResponse.json({ error: 'Failed to project completion' }, { status: 500 });
    }

    return NextResponse.json({ projection: data[0] || null });
  } catch (error) {
    console.error('Error in GET /api/goals/[id]/projection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
