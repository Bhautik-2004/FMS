// =============================================
// REPORTS SYSTEM TYPES
// =============================================

export type ReportType =
  | 'income_statement'
  | 'balance_sheet'
  | 'cash_flow'
  | 'budget_performance'
  | 'budget_variance'
  | 'transaction_detail'
  | 'merchant_analysis';

export type ReportFormat = 'pdf' | 'csv' | 'xlsx';

export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

export type ReportCategory = 'financial' | 'budget' | 'transaction';

// =============================================
// REPORT METADATA
// =============================================

export interface ReportMetadata {
  title: string;
  description: string;
  category: ReportCategory;
  icon: string;
  supportedFormats: ReportFormat[];
  defaultFormat: ReportFormat;
  requiresDateRange: boolean;
  supportsFilters: boolean;
}

export const REPORT_METADATA: Record<ReportType, ReportMetadata> = {
  income_statement: {
    title: 'Income Statement (P&L)',
    description: 'Profit and loss statement showing income and expenses',
    category: 'financial',
    icon: 'TrendingUp',
    supportedFormats: ['pdf', 'csv', 'xlsx'],
    defaultFormat: 'pdf',
    requiresDateRange: true,
    supportsFilters: false,
  },
  balance_sheet: {
    title: 'Balance Sheet',
    description: 'Statement of financial position showing assets and liabilities',
    category: 'financial',
    icon: 'Scale',
    supportedFormats: ['pdf', 'csv', 'xlsx'],
    defaultFormat: 'pdf',
    requiresDateRange: false,
    supportsFilters: false,
  },
  cash_flow: {
    title: 'Cash Flow Statement',
    description: 'Statement of cash flows from operating, investing, and financing activities',
    category: 'financial',
    icon: 'Waves',
    supportedFormats: ['pdf', 'csv', 'xlsx'],
    defaultFormat: 'pdf',
    requiresDateRange: true,
    supportsFilters: false,
  },
  budget_performance: {
    title: 'Budget Performance',
    description: 'Detailed budget vs actual spending comparison',
    category: 'budget',
    icon: 'Target',
    supportedFormats: ['pdf', 'csv', 'xlsx'],
    defaultFormat: 'pdf',
    requiresDateRange: true,
    supportsFilters: false,
  },
  budget_variance: {
    title: 'Budget Variance Analysis',
    description: 'Analysis of budget variances and trends',
    category: 'budget',
    icon: 'TrendingDown',
    supportedFormats: ['pdf', 'csv', 'xlsx'],
    defaultFormat: 'pdf',
    requiresDateRange: true,
    supportsFilters: false,
  },
  transaction_detail: {
    title: 'Transaction Detail',
    description: 'Detailed list of all transactions with filters',
    category: 'transaction',
    icon: 'List',
    supportedFormats: ['pdf', 'csv', 'xlsx'],
    defaultFormat: 'xlsx',
    requiresDateRange: true,
    supportsFilters: true,
  },
  merchant_analysis: {
    title: 'Merchant Analysis',
    description: 'Spending analysis by merchant with frequency and patterns',
    category: 'transaction',
    icon: 'Store',
    supportedFormats: ['pdf', 'csv', 'xlsx'],
    defaultFormat: 'pdf',
    requiresDateRange: true,
    supportsFilters: false,
  },
};

// =============================================
// REPORT PARAMETERS
// =============================================

export interface BaseReportParameters {
  startDate?: string;
  endDate?: string;
  asOfDate?: string;
  currency?: string;
}

export interface TransactionReportParameters extends BaseReportParameters {
  accountIds?: string[];
  categoryIds?: string[];
  transactionType?: 'income' | 'expense' | 'transfer';
}

export interface MerchantReportParameters extends BaseReportParameters {
  limit?: number;
}

export type ReportParameters =
  | BaseReportParameters
  | TransactionReportParameters
  | MerchantReportParameters;

// =============================================
// REPORT TEMPLATE
// =============================================

export interface ReportTemplate {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  reportType: ReportType;
  defaultParameters: ReportParameters;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportTemplateInput {
  name: string;
  description?: string;
  reportType: ReportType;
  defaultParameters: ReportParameters;
  isFavorite?: boolean;
}

export interface UpdateReportTemplateInput {
  name?: string;
  description?: string;
  defaultParameters?: ReportParameters;
  isFavorite?: boolean;
}

// =============================================
// GENERATED REPORT
// =============================================

export interface GeneratedReport {
  id: string;
  userId: string;
  templateId: string | null;
  reportType: ReportType;
  reportFormat: ReportFormat;
  parameters: ReportParameters;
  title: string;
  description: string | null;
  status: ReportStatus;
  generatedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  recordCount: number | null;
  fileSizeBytes: number | null;
  generationTimeMs: number | null;
}

export interface GenerateReportInput {
  reportType: ReportType;
  reportFormat: ReportFormat;
  parameters: ReportParameters;
  title?: string;
  description?: string;
  templateId?: string;
}

// =============================================
// REPORT DATA TYPES
// =============================================

export interface IncomeStatementData {
  category: string;
  section: 'INCOME' | 'INCOME_TOTAL' | 'EXPENSES' | 'EXPENSES_TOTAL' | 'NET_INCOME';
  amount: number;
  percentage: number;
  sortOrder: number;
}

export interface BalanceSheetData {
  item: string;
  section: 'ASSETS' | 'ASSETS_TOTAL' | 'LIABILITIES' | 'LIABILITIES_TOTAL' | 'NET_WORTH';
  amount: number;
  percentage: number;
  sortOrder: number;
}

export interface CashFlowData {
  item: string;
  section: 'OPERATING' | 'OPERATING_TOTAL' | 'INVESTING' | 'BALANCE' | 'BALANCE_END';
  amount: number;
  sortOrder: number;
}

export interface BudgetPerformanceData {
  budgetName: string;
  categoryName: string;
  allocated: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  status: 'On Track' | 'Warning' | 'Over Budget';
  periodStart: string;
  periodEnd: string;
}

export interface BudgetVarianceData {
  budgetName: string;
  categoryName: string;
  allocated: number;
  actual: number;
  variance: number;
  variancePercentage: number;
  favorable: boolean;
  period: string;
}

export interface TransactionDetailData {
  date: string;
  description: string;
  category: string;
  account: string;
  type: string;
  amount: number;
  balanceImpact: number;
  tags: string[] | null;
  merchant: string | null;
  notes: string | null;
}

export interface MerchantAnalysisData {
  merchant: string;
  transactionCount: number;
  totalSpent: number;
  averageTransaction: number;
  firstTransaction: string;
  lastTransaction: string;
  categories: string[] | null;
  frequencyDays: number;
}

export type ReportData =
  | IncomeStatementData[]
  | BalanceSheetData[]
  | CashFlowData[]
  | BudgetPerformanceData[]
  | BudgetVarianceData[]
  | TransactionDetailData[]
  | MerchantAnalysisData[];

// =============================================
// REPORT GENERATION RESULT
// =============================================

export interface ReportGenerationResult {
  success: boolean;
  reportId?: string;
  fileBlob?: Blob;
  fileName?: string;
  mimeType?: string;
  recordCount?: number;
  generationTimeMs?: number;
  error?: string;
}

// =============================================
// HELPER FUNCTIONS
// =============================================

export function getReportCategoryLabel(category: ReportCategory): string {
  switch (category) {
    case 'financial':
      return 'Financial Statements';
    case 'budget':
      return 'Budget Reports';
    case 'transaction':
      return 'Transaction Reports';
  }
}

export function getMimeType(format: ReportFormat): string {
  switch (format) {
    case 'pdf':
      return 'application/pdf';
    case 'csv':
      return 'text/csv';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
}

export function getFileExtension(format: ReportFormat): string {
  return format;
}

export function generateFileName(
  reportType: ReportType,
  format: ReportFormat,
  date: Date = new Date()
): string {
  const metadata = REPORT_METADATA[reportType];
  const timestamp = date.toISOString().split('T')[0];
  const safeName = metadata.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `${safeName}-${timestamp}.${format}`;
}
