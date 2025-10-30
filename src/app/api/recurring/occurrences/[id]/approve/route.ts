// =====================================================
// API Route: Approve Pending Recurring Occurrence
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
    const { actual_amount, actual_date } = body;

    const { data: transactionId, error } = await supabase.rpc(
      'approve_recurring_occurrence',
      {
        p_user_id: user.id,
        p_occurrence_id: params.id,
        p_actual_amount: actual_amount || null,
        p_actual_date: actual_date || null,
      }
    ) as { data: string | null; error: any };

    if (error) {
      console.error('Error approving occurrence:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      transaction_id: transactionId 
    });
  } catch (error) {
    console.error('Error in POST /api/recurring/occurrences/[id]/approve:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
