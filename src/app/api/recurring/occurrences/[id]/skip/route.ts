// =====================================================
// API Route: Skip Pending Recurring Occurrence
// =====================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const { reason } = body;

    const { data: success, error } = await supabase.rpc(
      'skip_recurring_occurrence',
      {
        p_user_id: user.id,
        p_occurrence_id: params.id,
        p_reason: reason || null,
      }
    ) as { data: boolean | null; error: any };

    if (error) {
      console.error('Error skipping occurrence:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Occurrence not found or already processed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/recurring/occurrences/[id]/skip:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
