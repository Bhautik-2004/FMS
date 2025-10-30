import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the database function to calculate financial health score
    const { data, error } = await supabase.rpc('calculate_financial_health_score' as any, {
      p_user_id: user.id,
    });

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // The function returns a single row with all scores
    const healthScore = data && data.length > 0 ? data[0] : null;

    return NextResponse.json({
      healthScore,
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
