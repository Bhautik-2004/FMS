'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  TrendingUp,
  Scale,
  Waves,
  Target,
  TrendingDown,
  List,
  Store,
  History,
} from 'lucide-react';
// @ts-ignore - Files exist, TS language server cache issue
import { ReportCard } from './report-card';
// @ts-ignore - Files exist, TS language server cache issue
import { ReportHistoryTable } from './report-history-table';
import { REPORT_METADATA, ReportCategory } from '@/lib/types/reports';

export function CustomReports() {
  const [activeCategory, setActiveCategory] = useState<'all' | ReportCategory>('all');

  // Get icon component by name
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'TrendingUp': return TrendingUp;
      case 'Scale': return Scale;
      case 'Waves': return Waves;
      case 'Target': return Target;
      case 'TrendingDown': return TrendingDown;
      case 'List': return List;
      case 'Store': return Store;
      default: return FileText;
    }
  };

  // Filter reports by category
  const reportTypes = Object.entries(REPORT_METADATA).filter(([_, metadata]) => 
    activeCategory === 'all' || metadata.category === activeCategory
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Custom Reports
              </CardTitle>
              <CardDescription>
                Generate detailed financial, budget, and transaction reports in PDF, CSV, or Excel format
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All Reports</TabsTrigger>
          <TabsTrigger value="financial">Financial Statements</TabsTrigger>
          <TabsTrigger value="budget">Budget Reports</TabsTrigger>
          <TabsTrigger value="transaction">Transaction Reports</TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* All Reports Tab */}
        <TabsContent value="all" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reportTypes.map(([type, metadata]) => (
              <ReportCard
                key={type}
                reportType={type as any}
                metadata={metadata}
                icon={getIcon(metadata.icon)}
              />
            ))}
          </div>
        </TabsContent>

        {/* Financial Statements Tab */}
        <TabsContent value="financial" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reportTypes
              .filter(([_, metadata]) => metadata.category === 'financial')
              .map(([type, metadata]) => (
                <ReportCard
                  key={type}
                  reportType={type as any}
                  metadata={metadata}
                  icon={getIcon(metadata.icon)}
                />
              ))}
          </div>
        </TabsContent>

        {/* Budget Reports Tab */}
        <TabsContent value="budget" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reportTypes
              .filter(([_, metadata]) => metadata.category === 'budget')
              .map(([type, metadata]) => (
                <ReportCard
                  key={type}
                  reportType={type as any}
                  metadata={metadata}
                  icon={getIcon(metadata.icon)}
                />
              ))}
          </div>
        </TabsContent>

        {/* Transaction Reports Tab */}
        <TabsContent value="transaction" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reportTypes
              .filter(([_, metadata]) => metadata.category === 'transaction')
              .map(([type, metadata]) => (
                <ReportCard
                  key={type}
                  reportType={type as any}
                  metadata={metadata}
                  icon={getIcon(metadata.icon)}
                />
              ))}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6 mt-6">
          <ReportHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
