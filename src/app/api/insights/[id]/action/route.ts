import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/insights/[id]/action - Record an action taken on an insight
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
    const { actionType, actionData = {} } = body;

    if (!actionType) {
      return NextResponse.json(
        { error: 'actionType is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('record_insight_action', {
      p_insight_id: params.id,
      p_user_id: user.id,
      p_action_type: actionType,
      p_action_data: actionData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording insight action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
