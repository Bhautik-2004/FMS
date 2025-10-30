// =============================================
// SPECIFIC REPORT GENERATORS
// =============================================

import {
  PDFReportGenerator,
  CSVReportGenerator,
  XLSXReportGenerator,
  formatCurrency,
  formatDate,
  formatPercentage,
} from './generators';
import {
  ReportFormat,
  IncomeStatementData,
  BalanceSheetData,
  CashFlowData,
  BudgetPerformanceData,
  BudgetVarianceData,
  TransactionDetailData,
  MerchantAnalysisData,
} from '@/lib/types/reports';

// =============================================
// INCOME STATEMENT REPORT
// =============================================

export function generateIncomeStatementReport(
  data: IncomeStatementData[],
  format: ReportFormat,
  parameters: { startDate: string; endDate: string; currency?: string }
): Blob {
  const title = 'Income Statement (Profit & Loss)';
  const subtitle = `Period: ${formatDate(parameters.startDate)} - ${formatDate(parameters.endDate)}`;
  const currency = parameters.currency || 'USD';

  if (format === 'pdf') {
    const pdf = new PDFReportGenerator({ title, subtitle, orientation: 'portrait' });

    // Group data by section
    const incomeItems = data.filter(d => d.section === 'INCOME');
    const expenseItems = data.filter(d => d.section === 'EXPENSES');
    const totalIncome = data.find(d => d.section === 'INCOME_TOTAL');
    const totalExpenses = data.find(d => d.section === 'EXPENSES_TOTAL');
    const netIncome = data.find(d => d.section === 'NET_INCOME');

    // Income Section
    pdf.addSection('Income');
    pdf.addTable(
      ['Category', 'Amount', '% of Income'],
      incomeItems.map(item => [
        item.category,
        formatCurrency(item.amount, currency),
        formatPercentage(item.percentage),
      ]),
      {
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        footerRows: totalIncome
          ? [['Total Income', formatCurrency(totalIncome.amount, currency), '100.00%']]
          : undefined,
      }
    );

    // Expenses Section
    pdf.addSection('Expenses');
    pdf.addTable(
      ['Category', 'Amount', '% of Expenses'],
      expenseItems.map(item => [
        item.category,
        formatCurrency(item.amount, currency),
        formatPercentage(item.percentage),
      ]),
      {
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        footerRows: totalExpenses
          ? [['Total Expenses', formatCurrency(totalExpenses.amount, currency), '100.00%']]
          : undefined,
      }
    );

    // Net Income
    if (netIncome) {
      pdf.addText('', { bold: true, fontSize: 12 });
      pdf.addText(
        `Net Income: ${formatCurrency(netIncome.amount, currency)} (${formatPercentage(netIncome.percentage)} of income)`,
        { bold: true, fontSize: 12 }
      );
    }

    return pdf.getBlob();
  } else if (format === 'csv') {
    const csv = new CSVReportGenerator();
    csv.addSection(title);
    csv.addSection(subtitle);
    csv.addData(
      data.map(item => ({
        Section: item.section,
        Category: item.category,
        Amount: item.amount,
        Percentage: item.percentage,
      }))
    );
    return csv.getBlob();
  } else {
    // XLSX
    const xlsx = new XLSXReportGenerator();
    xlsx.addRow([title]);
    xlsx.addRow([subtitle]);
    xlsx.addEmptyRow();
    xlsx.addHeaderRow(['Section', 'Category', 'Amount', 'Percentage']);
    xlsx.addDataRows(
      data.map(item => [item.section, item.category, item.amount, item.percentage])
    );
    return xlsx.getBlob();
  }
}

// =============================================
// BALANCE SHEET REPORT
// =============================================

export function generateBalanceSheetReport(
  data: BalanceSheetData[],
  format: ReportFormat,
  parameters: { asOfDate: string; currency?: string }
): Blob {
  const currency = parameters.currency || 'USD';
  const title = 'Balance Sheet';
  const subtitle = `As of: ${formatDate(parameters.asOfDate)}`;

  if (format === 'pdf') {
    const pdf = new PDFReportGenerator({ title, subtitle });

    const assets = data.filter(d => d.section === 'ASSETS');
    const liabilities = data.filter(d => d.section === 'LIABILITIES');
    const totalAssets = data.find(d => d.section === 'ASSETS_TOTAL');
    const totalLiabilities = data.find(d => d.section === 'LIABILITIES_TOTAL');
    const netWorth = data.find(d => d.section === 'NET_WORTH');

    pdf.addSection('Assets');
    pdf.addTable(
      ['Account', 'Amount', '% of Assets'],
      assets.map(item => [
        item.item,
        formatCurrency(item.amount, currency),
        formatPercentage(item.percentage),
      ]),
      {
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        footerRows: totalAssets
          ? [['Total Assets', formatCurrency(totalAssets.amount, currency), '100.00%']]
          : undefined,
      }
    );

    pdf.addSection('Liabilities');
    if (liabilities.length > 0) {
      pdf.addTable(
        ['Account', 'Amount', '% of Liabilities'],
        liabilities.map(item => [
          item.item,
          formatCurrency(item.amount, currency),
          formatPercentage(item.percentage),
        ]),
        {
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
          footerRows: totalLiabilities
            ? [['Total Liabilities', formatCurrency(totalLiabilities.amount, currency), '100.00%']]
            : undefined,
        }
      );
    } else {
      pdf.addText('No liabilities recorded');
    }

    if (netWorth) {
      pdf.addText('', { bold: true, fontSize: 12 });
      pdf.addText(`Net Worth: ${formatCurrency(netWorth.amount, currency)}`, {
        bold: true,
        fontSize: 12,
      });
    }

    return pdf.getBlob();
  } else if (format === 'csv') {
    const csv = new CSVReportGenerator();
    csv.addSection(title);
    csv.addSection(subtitle);
    csv.addData(
      data.map(item => ({
        Section: item.section,
        Item: item.item,
        Amount: item.amount,
        Percentage: item.percentage,
      }))
    );
    return csv.getBlob();
  } else {
    const xlsx = new XLSXReportGenerator();
    xlsx.addRow([title]);
    xlsx.addRow([subtitle]);
    xlsx.addEmptyRow();
    xlsx.addHeaderRow(['Section', 'Item', 'Amount', 'Percentage']);
    xlsx.addDataRows(
      data.map(item => [item.section, item.item, item.amount, item.percentage])
    );
    return xlsx.getBlob();
  }
}

// =============================================
// CASH FLOW REPORT
// =============================================

export function generateCashFlowReport(
  data: CashFlowData[],
  format: ReportFormat,
  parameters: { startDate: string; endDate: string; currency?: string }
): Blob {
  const currency = parameters.currency || 'USD';
  const title = 'Cash Flow Statement';
  const subtitle = `Period: ${formatDate(parameters.startDate)} - ${formatDate(parameters.endDate)}`;

  if (format === 'pdf') {
    const pdf = new PDFReportGenerator({ title, subtitle });

    const operating = data.filter(d => d.section === 'OPERATING');
    const operatingTotal = data.find(d => d.section === 'OPERATING_TOTAL');
    const investing = data.filter(d => d.section === 'INVESTING');
    const beginBalance = data.find(d => d.section === 'BALANCE');
    const endBalance = data.find(d => d.section === 'BALANCE_END');

    pdf.addSection('Operating Activities');
    pdf.addTable(
      ['Item', 'Amount'],
      operating.map(item => [item.item, formatCurrency(item.amount, currency)]),
      {
        columnStyles: { 1: { halign: 'right' } },
        footerRows: operatingTotal
          ? [['Net Operating Cash Flow', formatCurrency(operatingTotal.amount, currency)]]
          : undefined,
      }
    );

    if (investing.length > 0) {
      pdf.addSection('Investing Activities');
      pdf.addTable(
        ['Item', 'Amount'],
        investing.map(item => [item.item, formatCurrency(item.amount, currency)]),
        { columnStyles: { 1: { halign: 'right' } } }
      );
    }

    pdf.addSection('Cash Balance');
    const balanceRows: [string, string][] = [];
    if (beginBalance) {
      balanceRows.push(['Beginning Balance', formatCurrency(beginBalance.amount, currency)]);
    }
    if (endBalance) {
      balanceRows.push(['Ending Balance', formatCurrency(endBalance.amount, currency)]);
    }
    if (beginBalance && endBalance) {
      balanceRows.push([
        'Net Change',
        formatCurrency(endBalance.amount - beginBalance.amount, currency),
      ]);
    }
    pdf.addTable(['', 'Amount'], balanceRows, {
      columnStyles: { 1: { halign: 'right' } },
    });

    return pdf.getBlob();
  } else if (format === 'csv') {
    const csv = new CSVReportGenerator();
    csv.addSection(title);
    csv.addSection(subtitle);
    csv.addData(
      data.map(item => ({
        Section: item.section,
        Item: item.item,
        Amount: item.amount,
      }))
    );
    return csv.getBlob();
  } else {
    const xlsx = new XLSXReportGenerator();
    xlsx.addRow([title]);
    xlsx.addRow([subtitle]);
    xlsx.addEmptyRow();
    xlsx.addHeaderRow(['Section', 'Item', 'Amount']);
    xlsx.addDataRows(data.map(item => [item.section, item.item, item.amount]));
    return xlsx.getBlob();
  }
}

// =============================================
// BUDGET PERFORMANCE REPORT
// =============================================

export function generateBudgetPerformanceReport(
  data: BudgetPerformanceData[],
  format: ReportFormat,
  parameters: { startDate: string; endDate: string; currency?: string }
): Blob {
  const currency = parameters.currency || 'USD';
  const title = 'Budget Performance Report';
  const subtitle = `Period: ${formatDate(parameters.startDate)} - ${formatDate(parameters.endDate)}`;

  if (format === 'pdf') {
    const pdf = new PDFReportGenerator({ title, subtitle, orientation: 'landscape' });

    // Group by budget
    const budgets = Array.from(new Set(data.map(d => d.budgetName)));

    budgets.forEach((budgetName, index) => {
      if (index > 0) pdf.addPageBreak();
      
      const budgetData = data.filter(d => d.budgetName === budgetName);
      const firstItem = budgetData[0];

      pdf.addSection(`${budgetName} (${formatDate(firstItem.periodStart)} - ${formatDate(firstItem.periodEnd)})`);
      
      pdf.addTable(
        ['Category', 'Allocated', 'Spent', 'Remaining', '% Used', 'Status'],
        budgetData.map(item => [
          item.categoryName,
          formatCurrency(item.allocated, currency),
          formatCurrency(item.spent, currency),
          formatCurrency(item.remaining, currency),
          formatPercentage(item.percentageUsed),
          item.status,
        ]),
        {
          columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'center' },
          },
        }
      );
    });

    return pdf.getBlob();
  } else if (format === 'csv') {
    const csv = new CSVReportGenerator();
    csv.addSection(title);
    csv.addSection(subtitle);
    csv.addData(
      data.map(item => ({
        Budget: item.budgetName,
        Category: item.categoryName,
        Allocated: item.allocated,
        Spent: item.spent,
        Remaining: item.remaining,
        'Percentage Used': item.percentageUsed,
        Status: item.status,
        'Period Start': item.periodStart,
        'Period End': item.periodEnd,
      }))
    );
    return csv.getBlob();
  } else {
    const xlsx = new XLSXReportGenerator();
    xlsx.addRow([title]);
    xlsx.addRow([subtitle]);
    xlsx.addEmptyRow();
    xlsx.addHeaderRow([
      'Budget',
      'Category',
      'Allocated',
      'Spent',
      'Remaining',
      '% Used',
      'Status',
      'Period Start',
      'Period End',
    ]);
    xlsx.addDataRows(
      data.map(item => [
        item.budgetName,
        item.categoryName,
        item.allocated,
        item.spent,
        item.remaining,
        item.percentageUsed,
        item.status,
        item.periodStart,
        item.periodEnd,
      ])
    );
    return xlsx.getBlob();
  }
}

// =============================================
// BUDGET VARIANCE REPORT
// =============================================

export function generateBudgetVarianceReport(
  data: BudgetVarianceData[],
  format: ReportFormat,
  parameters: { startDate: string; endDate: string; currency?: string }
): Blob {
  const currency = parameters.currency || 'USD';
  const title = 'Budget Variance Analysis';
  const subtitle = `Period: ${formatDate(parameters.startDate)} - ${formatDate(parameters.endDate)}`;

  if (format === 'pdf') {
    const pdf = new PDFReportGenerator({ title, subtitle, orientation: 'landscape' });

    pdf.addTable(
      ['Budget', 'Category', 'Allocated', 'Actual', 'Variance', 'Variance %', 'Status'],
      data.map(item => [
        item.budgetName,
        item.categoryName,
        formatCurrency(item.allocated, currency),
        formatCurrency(item.actual, currency),
        formatCurrency(item.variance, currency),
        formatPercentage(item.variancePercentage),
        item.favorable ? '✓ Favorable' : '✗ Unfavorable',
      ]),
      {
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'center' },
        },
      }
    );

    return pdf.getBlob();
  } else if (format === 'csv') {
    const csv = new CSVReportGenerator();
    csv.addSection(title);
    csv.addSection(subtitle);
    csv.addData(
      data.map(item => ({
        Budget: item.budgetName,
        Category: item.categoryName,
        Period: item.period,
        Allocated: item.allocated,
        Actual: item.actual,
        Variance: item.variance,
        'Variance %': item.variancePercentage,
        Favorable: item.favorable ? 'Yes' : 'No',
      }))
    );
    return csv.getBlob();
  } else {
    const xlsx = new XLSXReportGenerator();
    xlsx.addRow([title]);
    xlsx.addRow([subtitle]);
    xlsx.addEmptyRow();
    xlsx.addHeaderRow([
      'Budget',
      'Category',
      'Period',
      'Allocated',
      'Actual',
      'Variance',
      'Variance %',
      'Favorable',
    ]);
    xlsx.addDataRows(
      data.map(item => [
        item.budgetName,
        item.categoryName,
        item.period,
        item.allocated,
        item.actual,
        item.variance,
        item.variancePercentage,
        item.favorable ? 'Yes' : 'No',
      ])
    );
    return xlsx.getBlob();
  }
}

// =============================================
// TRANSACTION DETAIL REPORT
// =============================================

export function generateTransactionDetailReport(
  data: TransactionDetailData[],
  format: ReportFormat,
  parameters: { startDate: string; endDate: string; currency?: string }
): Blob {
  const currency = parameters.currency || 'USD';
  const title = 'Transaction Detail Report';
  const subtitle = `Period: ${formatDate(parameters.startDate)} - ${formatDate(parameters.endDate)}`;

  if (format === 'pdf') {
    const pdf = new PDFReportGenerator({ title, subtitle, orientation: 'landscape' });

    pdf.addTable(
      ['Date', 'Description', 'Category', 'Account', 'Type', 'Amount'],
      data.map(item => [
        formatDate(item.date),
        item.description.substring(0, 30),
        item.category,
        item.account,
        item.type,
        formatCurrency(item.amount, currency),
      ]),
      {
        columnStyles: {
          0: { halign: 'left', cellWidth: 25 },
          1: { halign: 'left', cellWidth: 50 },
          5: { halign: 'right' },
        },
      }
    );

    return pdf.getBlob();
  } else if (format === 'csv') {
    const csv = new CSVReportGenerator();
    csv.addSection(title);
    csv.addSection(subtitle);
    csv.addData(
      data.map(item => ({
        Date: item.date,
        Description: item.description,
        Category: item.category,
        Account: item.account,
        Type: item.type,
        Amount: item.amount,
        'Balance Impact': item.balanceImpact,
        Merchant: item.merchant || '',
        Tags: (item.tags || []).join(', '),
        Notes: item.notes || '',
      }))
    );
    return csv.getBlob();
  } else {
    const xlsx = new XLSXReportGenerator();
    xlsx.addRow([title]);
    xlsx.addRow([subtitle]);
    xlsx.addEmptyRow();
    xlsx.addHeaderRow([
      'Date',
      'Description',
      'Category',
      'Account',
      'Type',
      'Amount',
      'Balance Impact',
      'Merchant',
      'Tags',
      'Notes',
    ]);
    xlsx.addDataRows(
      data.map(item => [
        item.date,
        item.description,
        item.category,
        item.account,
        item.type,
        item.amount,
        item.balanceImpact,
        item.merchant || '',
        (item.tags || []).join(', '),
        item.notes || '',
      ])
    );
    return xlsx.getBlob();
  }
}

// =============================================
// MERCHANT ANALYSIS REPORT
// =============================================

export function generateMerchantAnalysisReport(
  data: MerchantAnalysisData[],
  format: ReportFormat,
  parameters: { startDate: string; endDate: string; currency?: string }
): Blob {
  const currency = parameters.currency || 'USD';
  const title = 'Merchant Analysis Report';
  const subtitle = `Period: ${formatDate(parameters.startDate)} - ${formatDate(parameters.endDate)}`;

  if (format === 'pdf') {
    const pdf = new PDFReportGenerator({ title, subtitle, orientation: 'landscape' });

    pdf.addTable(
      ['Merchant', 'Transactions', 'Total Spent', 'Avg Transaction', 'Categories', 'Frequency (days)'],
      data.map(item => [
        item.merchant,
        item.transactionCount.toString(),
        formatCurrency(item.totalSpent, currency),
        formatCurrency(item.averageTransaction, currency),
        (item.categories || []).join(', ').substring(0, 30),
        item.frequencyDays.toFixed(1),
      ]),
      {
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          5: { halign: 'center' },
        },
      }
    );

    return pdf.getBlob();
  } else if (format === 'csv') {
    const csv = new CSVReportGenerator();
    csv.addSection(title);
    csv.addSection(subtitle);
    csv.addData(
      data.map(item => ({
        Merchant: item.merchant,
        'Transaction Count': item.transactionCount,
        'Total Spent': item.totalSpent,
        'Average Transaction': item.averageTransaction,
        'First Transaction': item.firstTransaction,
        'Last Transaction': item.lastTransaction,
        Categories: (item.categories || []).join(', '),
        'Frequency (days)': item.frequencyDays,
      }))
    );
    return csv.getBlob();
  } else {
    const xlsx = new XLSXReportGenerator();
    xlsx.addRow([title]);
    xlsx.addRow([subtitle]);
    xlsx.addEmptyRow();
    xlsx.addHeaderRow([
      'Merchant',
      'Transaction Count',
      'Total Spent',
      'Average Transaction',
      'First Transaction',
      'Last Transaction',
      'Categories',
      'Frequency (days)',
    ]);
    xlsx.addDataRows(
      data.map(item => [
        item.merchant,
        item.transactionCount,
        item.totalSpent,
        item.averageTransaction,
        item.firstTransaction,
        item.lastTransaction,
        (item.categories || []).join(', '),
        item.frequencyDays,
      ])
    );
    return xlsx.getBlob();
  }
}
