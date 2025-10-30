import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/insights/[id]/feedback - Mark insight as helpful or not
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { helpful } = body;

    if (typeof helpful !== 'boolean') {
      return NextResponse.json(
        { error: 'helpful must be a boolean' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('mark_insight_helpful', {
      p_insight_id: params.id,
      p_user_id: user.id,
      p_helpful: helpful,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, helpful });
  } catch (error) {
    console.error('Error marking insight feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
