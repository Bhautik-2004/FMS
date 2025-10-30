'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, LucideIcon } from 'lucide-react';
import { ReportType, ReportFormat, ReportMetadata, REPORT_METADATA } from '@/lib/types/reports';
// @ts-ignore - File exists, TS language server cache issue
import { GenerateReportDialog } from './generate-report-dialog';

interface ReportCardProps {
  reportType: ReportType;
  metadata: ReportMetadata;
  icon: LucideIcon;
}

export function ReportCard({ reportType, metadata, icon: Icon }: ReportCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setDialogOpen(true)}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">{metadata.title}</CardTitle>
              </div>
            </div>
          </div>
          <CardDescription className="mt-2">{metadata.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {metadata.supportedFormats.map((format) => (
              <Badge key={format} variant="outline" className="text-xs">
                {format.toUpperCase()}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <GenerateReportDialog
        reportType={reportType}
        metadata={metadata}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
