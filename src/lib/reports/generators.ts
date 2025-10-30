// =============================================
// REPORT GENERATION UTILITIES - BASE
// =============================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  ReportFormat,
  ReportType,
  ReportData,
  getMimeType,
  REPORT_METADATA,
} from '@/lib/types/reports';

// =============================================
// PDF GENERATION
// =============================================

export interface PDFOptions {
  title: string;
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
  includeTimestamp?: boolean;
}

export class PDFReportGenerator {
  private doc: jsPDF;
  private yPosition: number = 20;

  constructor(options: PDFOptions) {
    this.doc = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Add title
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(options.title, 14, this.yPosition);
    this.yPosition += 8;

    // Add subtitle if provided
    if (options.subtitle) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(options.subtitle, 14, this.yPosition);
      this.yPosition += 6;
    }

    // Add timestamp
    if (options.includeTimestamp !== false) {
      this.doc.setFontSize(10);
      this.doc.setTextColor(128);
      this.doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        14,
        this.yPosition
      );
      this.yPosition += 10;
    }

    this.doc.setTextColor(0);
  }

  addSection(title: string) {
    this.yPosition += 5;
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, 14, this.yPosition);
    this.yPosition += 7;
  }

  addTable(headers: string[], rows: (string | number)[][], options?: {
    columnStyles?: any;
    footerRows?: (string | number)[][];
  }) {
    autoTable(this.doc, {
      startY: this.yPosition,
      head: [headers],
      body: rows,
      foot: options?.footerRows ? options.footerRows : undefined,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246], // Blue
        fontStyle: 'bold',
        fontSize: 10,
      },
      footStyles: {
        fillColor: [229, 231, 235], // Gray
        fontStyle: 'bold',
        textColor: [0, 0, 0], // Black text
        fontSize: 10,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: options?.columnStyles || {},
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore - autoTable extends jsPDF
    this.yPosition = this.doc.lastAutoTable.finalY + 10;
  }

  addText(text: string, options?: { bold?: boolean; fontSize?: number }) {
    if (options?.bold) {
      this.doc.setFont('helvetica', 'bold');
    } else {
      this.doc.setFont('helvetica', 'normal');
    }
    
    this.doc.setFontSize(options?.fontSize || 10);
    this.doc.text(text, 14, this.yPosition);
    this.yPosition += 6;
  }

  addPageBreak() {
    this.doc.addPage();
    this.yPosition = 20;
  }

  getBlob(): Blob {
    return this.doc.output('blob');
  }

  download(filename: string) {
    this.doc.save(filename);
  }
}

// =============================================
// CSV GENERATION
// =============================================

export class CSVReportGenerator {
  private sections: string[] = [];
  private data: any[] = [];

  addData(rows: any[]) {
    this.data.push(...rows);
  }

  addSection(title: string) {
    this.sections.push(title);
  }

  getBlob(): Blob {
    // Build CSV with sections as comments/headers
    let csvContent = '';
    
    // Add sections as header rows
    if (this.sections.length > 0) {
      this.sections.forEach(section => {
        csvContent += `"${section}"\n`;
      });
      csvContent += '\n';
    }
    
    // Add the actual data
    if (this.data.length > 0) {
      csvContent += Papa.unparse(this.data);
    }
    
    return new Blob([csvContent], { type: getMimeType('csv') });
  }

  download(filename: string) {
    const blob = this.getBlob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

// =============================================
// XLSX GENERATION
// =============================================

export class XLSXReportGenerator {
  private workbook: XLSX.WorkBook;
  private sheets: Map<string, any[][]> = new Map();
  private currentSheet: string = 'Sheet1';

  constructor() {
    this.workbook = XLSX.utils.book_new();
    this.sheets.set(this.currentSheet, []);
  }

  addSheet(name: string) {
    this.currentSheet = name;
    this.sheets.set(name, []);
  }

  addRow(row: any[]) {
    const sheet = this.sheets.get(this.currentSheet) || [];
    sheet.push(row);
    this.sheets.set(this.currentSheet, sheet);
  }

  addEmptyRow() {
    this.addRow([]);
  }

  addHeaderRow(headers: string[]) {
    this.addRow(headers);
  }

  addDataRows(rows: any[][]) {
    rows.forEach(row => this.addRow(row));
  }

  private finalize() {
    this.sheets.forEach((data, sheetName) => {
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      
      // Auto-size columns
      const colWidths: number[] = [];
      data.forEach(row => {
        row.forEach((cell, i) => {
          const cellLength = String(cell || '').length;
          colWidths[i] = Math.max(colWidths[i] || 10, cellLength + 2);
        });
      });
      
      worksheet['!cols'] = colWidths.map(width => ({ wch: Math.min(width, 50) }));
      
      XLSX.utils.book_append_sheet(this.workbook, worksheet, sheetName);
    });
  }

  getBlob(): Blob {
    this.finalize();
    const buffer = XLSX.write(this.workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([buffer], { type: getMimeType('xlsx') });
  }

  download(filename: string) {
    this.finalize();
    XLSX.writeFile(this.workbook, filename);
  }
}

// =============================================
// FORMAT CURRENCY
// =============================================

const CURRENCY_LOCALES: Record<string, string> = {
  USD: 'en-US',
  EUR: 'en-EU',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  INR: 'en-IN',
  CAD: 'en-CA',
  AUD: 'en-AU',
  CHF: 'de-CH',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  INR: 'Rs.',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
};

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const locale = CURRENCY_LOCALES[currency] || 'en-US';
  let formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
  
  // For INR, replace the rupee symbol with 'Rs.' for better PDF compatibility
  // jsPDF's default Helvetica font doesn't support the ₹ symbol
  if (currency === 'INR') {
    // Replace ₹ or any INR symbol variants with Rs.
    formatted = formatted.replace(/₹/g, 'Rs.');
    formatted = formatted.replace(/¹/g, 'Rs.');
    formatted = formatted.replace(/INR\s*/g, 'Rs.');
  }
  
  return formatted;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}
