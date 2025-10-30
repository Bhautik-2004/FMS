import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const reportType = searchParams.get('reportType');
    const status = searchParams.get('status');

    // Build query
    let query = (supabase.from as any)('generated_reports')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (reportType) {
      query = query.eq('report_type', reportType);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {

      return NextResponse.json(
        { error: 'Failed to fetch report history' },
        { status: 500 }
      );
    }

    // Transform snake_case to camelCase
    const transformedReports = (data || []).map((report: any) => ({
      id: report.id,
      userId: report.user_id,
      templateId: report.template_id,
      reportType: report.report_type,
      reportFormat: report.report_format,
      parameters: report.parameters,
      title: report.title,
      description: report.description,
      status: report.status,
      generatedAt: report.generated_at,
      completedAt: report.completed_at,
      errorMessage: report.error_message,
      recordCount: report.record_count,
      fileSizeBytes: report.file_size_bytes,
      generationTimeMs: report.generation_time_ms,
    }));

    return NextResponse.json({
      reports: transformedReports,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Delete a report record
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const reportId = searchParams.get('id');

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID required' }, { status: 400 });
    }

    const { error } = await (supabase.from as any)('generated_reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', user.id);

    if (error) {

      return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
