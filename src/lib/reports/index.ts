// =============================================
// MAIN REPORT GENERATOR
// =============================================

import { ReportType, ReportFormat, ReportParameters, ReportData } from '@/lib/types/reports';
import {
  generateIncomeStatementReport,
  generateBalanceSheetReport,
  generateCashFlowReport,
  generateBudgetPerformanceReport,
  generateBudgetVarianceReport,
  generateTransactionDetailReport,
  generateMerchantAnalysisReport,
} from './report-generators';

export * from './generators';
export * from './report-generators';

// =============================================
// MAIN GENERATION FUNCTION
// =============================================

export function generateReport(
  reportType: ReportType,
  reportFormat: ReportFormat,
  data: ReportData,
  parameters: ReportParameters
): Blob {
  switch (reportType) {
    case 'income_statement':
      return generateIncomeStatementReport(
        data as any,
        reportFormat,
        parameters as { startDate: string; endDate: string }
      );

    case 'balance_sheet':
      return generateBalanceSheetReport(
        data as any,
        reportFormat,
        parameters as { asOfDate: string }
      );

    case 'cash_flow':
      return generateCashFlowReport(
        data as any,
        reportFormat,
        parameters as { startDate: string; endDate: string }
      );

    case 'budget_performance':
      return generateBudgetPerformanceReport(
        data as any,
        reportFormat,
        parameters as { startDate: string; endDate: string }
      );

    case 'budget_variance':
      return generateBudgetVarianceReport(
        data as any,
        reportFormat,
        parameters as { startDate: string; endDate: string }
      );

    case 'transaction_detail':
      return generateTransactionDetailReport(
        data as any,
        reportFormat,
        parameters as { startDate: string; endDate: string }
      );

    case 'merchant_analysis':
      return generateMerchantAnalysisReport(
        data as any,
        reportFormat,
        parameters as { startDate: string; endDate: string }
      );

    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }
}

// =============================================
// DOWNLOAD HELPER
// =============================================

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
