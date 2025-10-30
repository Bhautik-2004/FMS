import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ReportType, ReportFormat, ReportParameters, generateFileName } from '@/lib/types/reports';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      reportType,
      reportFormat,
      parameters,
      title,
      description,
      templateId,
    }: {
      reportType: ReportType;
      reportFormat: ReportFormat;
      parameters: ReportParameters;
      title?: string;
      description?: string;
      templateId?: string;
    } = body;

    // Validate required fields
    if (!reportType || !reportFormat || !parameters) {
      return NextResponse.json(
        { error: 'Missing required fields: reportType, reportFormat, parameters' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Call appropriate database function based on report type
    let reportData: any[] = [];
    let functionError: any = null;

    try {
      switch (reportType) {
        case 'income_statement':
          const { data: incomeData, error: incomeError } = await (supabase.rpc as any)(
            'generate_income_statement_data',
            {
              p_user_id: user.id,
              p_start_date: parameters.startDate,
              p_end_date: parameters.endDate,
            }
          );
          reportData = incomeData || [];
          functionError = incomeError;
          break;

        case 'balance_sheet':
          const { data: balanceData, error: balanceError } = await (supabase.rpc as any)(
            'generate_balance_sheet_data',
            {
              p_user_id: user.id,
              p_as_of_date: parameters.asOfDate || parameters.endDate,
            }
          );
          reportData = balanceData || [];
          functionError = balanceError;
          break;

        case 'cash_flow':
          const { data: cashFlowData, error: cashFlowError } = await (supabase.rpc as any)(
            'generate_cash_flow_data',
            {
              p_user_id: user.id,
              p_start_date: parameters.startDate,
              p_end_date: parameters.endDate,
            }
          );
          reportData = cashFlowData || [];
          functionError = cashFlowError;
          break;

        case 'budget_performance':
          const { data: budgetPerfData, error: budgetPerfError } = await (supabase.rpc as any)(
            'generate_budget_performance_data',
            {
              p_user_id: user.id,
              p_start_date: parameters.startDate,
              p_end_date: parameters.endDate,
            }
          );
          reportData = (budgetPerfData || []).map((row: any) => ({
            budgetName: row.budget_name,
            categoryName: row.category_name,
            allocated: row.allocated,
            spent: row.spent,
            remaining: row.remaining,
            percentageUsed: row.percentage_used,
            status: row.status,
            periodStart: row.period_start,
            periodEnd: row.period_end,
          }));
          functionError = budgetPerfError;
          break;

        case 'budget_variance':
          const { data: budgetVarData, error: budgetVarError } = await (supabase.rpc as any)(
            'generate_budget_variance_data',
            {
              p_user_id: user.id,
              p_start_date: parameters.startDate,
              p_end_date: parameters.endDate,
            }
          );
          reportData = (budgetVarData || []).map((row: any) => ({
            budgetName: row.budget_name,
            categoryName: row.category_name,
            allocated: row.allocated,
            actual: row.actual,
            variance: row.variance,
            variancePercentage: row.variance_percentage,
            favorable: row.favorable,
            period: row.period,
          }));
          functionError = budgetVarError;
          break;

        case 'transaction_detail':
          const { data: txnData, error: txnError } = await (supabase.rpc as any)(
            'generate_transaction_detail_data',
            {
              p_user_id: user.id,
              p_start_date: parameters.startDate,
              p_end_date: parameters.endDate,
              p_account_ids: (parameters as any).accountIds || null,
              p_category_ids: (parameters as any).categoryIds || null,
              p_transaction_type: (parameters as any).transactionType || null,
            }
          );
          reportData = (txnData || []).map((row: any) => ({
            date: row.date,
            description: row.description,
            category: row.category,
            account: row.account,
            type: row.type,
            amount: row.amount,
            balanceImpact: row.balance_impact,
            tags: row.tags,
            merchant: row.merchant,
            notes: row.notes,
          }));
          functionError = txnError;
          break;

        case 'merchant_analysis':
          const { data: merchantData, error: merchantError } = await (supabase.rpc as any)(
            'generate_merchant_analysis_data',
            {
              p_user_id: user.id,
              p_start_date: parameters.startDate,
              p_end_date: parameters.endDate,
              p_limit: (parameters as any).limit || 50,
            }
          );

          reportData = (merchantData || []).map((row: any) => {

            return {
              merchant: row.merchant || '',
              transactionCount: row.transaction_count || 0,
              totalSpent: row.total_spent || 0,
              averageTransaction: row.average_transaction || 0,
              firstTransaction: row.first_transaction || '',
              lastTransaction: row.last_transaction || '',
              categories: row.categories || [],
              frequencyDays: row.frequency_days || 0,
            };
          });
          functionError = merchantError;
          break;

        default:
          return NextResponse.json(
            { error: `Unsupported report type: ${reportType}` },
            { status: 400 }
          );
      }

      if (functionError) {
        throw functionError;
      }
    } catch (dbError: any) {
      
      // Record failed report generation
      await (supabase.from as any)('generated_reports').insert({
        user_id: user.id,
        template_id: templateId || null,
        report_type: reportType,
        report_format: reportFormat,
        parameters,
        title: title || `${reportType} report`,
        description: description || null,
        status: 'failed',
        error_message: dbError.message || 'Failed to fetch report data',
        generation_time_ms: Date.now() - startTime,
      });

      return NextResponse.json(
        { error: 'Failed to generate report data', details: dbError.message },
        { status: 500 }
      );
    }

    const generationTime = Date.now() - startTime;

    // Return data to client for generation
    // The client will handle the actual file generation using the report generators
    const response = {
      success: true,
      data: reportData,
      recordCount: reportData.length,
      generationTimeMs: generationTime,
      fileName: generateFileName(reportType, reportFormat),
    };

    // Record successful report generation in database
    await (supabase.from as any)('generated_reports').insert({
      user_id: user.id,
      template_id: templateId || null,
      report_type: reportType,
      report_format: reportFormat,
      parameters,
      title: title || `${reportType} report`,
      description: description || null,
      status: 'completed',
      completed_at: new Date().toISOString(),
      record_count: reportData.length,
      file_size_bytes: JSON.stringify(reportData).length, // Approximate size
      generation_time_ms: generationTime,
    });

    return NextResponse.json(response);
  } catch (error: any) {

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
