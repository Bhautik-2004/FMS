import { createClient } from '@/lib/supabase/server';
import { generateAllInsights } from '@/lib/analytics/insights';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/insights - Get all active insights for the current user
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active insights from database
    const { data: insights, error } = await supabase.rpc('get_active_insights', {
      p_user_id: user.id,
    });

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ insights: insights || [] });
  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/insights - Generate new insights
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { regenerate = false } = body;

    // Check if insights were recently generated (within last 24 hours)
    if (!regenerate) {
      const { data: recentInsights, error: checkError } = await supabase
        .from('insights')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (!checkError && recentInsights && recentInsights.length > 0) {
        return NextResponse.json({
          message: 'Insights already generated recently',
          regenerate: false,
        });
      }
    }

    // Generate insights
    const newInsights = await generateAllInsights(user.id);

    // Store insights in database
    const insightsToInsert = newInsights.map((insight) => ({
      user_id: user.id,
      type: insight.type,
      severity: insight.severity,
      priority: insight.priority,
      title: insight.title,
      description: insight.description,
      value: insight.value,
      metadata: insight.metadata || {},
      actionable: insight.actionable,
      actions: insight.actions || [],
      expires_at: insight.expiresAt?.toISOString(),
    }));

    const { data, error: insertError } = await supabase
      .from('insights')
      .insert(insightsToInsert as any)
      .select();

    if (insertError) {

      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Insights generated successfully',
      count: data?.length || 0,
      insights: data,
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
