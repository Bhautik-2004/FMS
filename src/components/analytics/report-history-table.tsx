'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Trash2, FileText, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { GeneratedReport, REPORT_METADATA } from '@/lib/types/reports';

export function ReportHistoryTable() {
  const { toast } = useToast();
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports/history?limit=50');
      if (!response.ok) throw new Error('Failed to fetch reports');
      
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error: any) {

      toast({
        title: 'Error',
        description: 'Failed to load report history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(reports.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (reportId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, reportId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== reportId));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    const count = selectedIds.length;
    if (!confirm(`Delete ${count} selected report${count !== 1 ? 's' : ''}?`)) return;

    setIsDeleting(true);
    try {
      // Delete all selected reports
      const deletePromises = selectedIds.map((id) =>
        fetch(`/api/reports/history?id=${id}`, { method: 'DELETE' })
      );

      const results = await Promise.allSettled(deletePromises);
      
      // Check for failures
      const failures = results.filter((r) => r.status === 'rejected');
      
      if (failures.length > 0) {
        throw new Error(`Failed to delete ${failures.length} report(s)`);
      }

      // Remove deleted reports from state
      setReports((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
      setSelectedIds([]);
      
      toast({
        title: 'Reports deleted',
        description: `${count} report${count !== 1 ? 's' : ''} deleted successfully`,
      });
    } catch (error: any) {

      toast({
        title: 'Error',
        description: error.message || 'Failed to delete some reports',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'failed':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'generating':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
          <CardDescription>Your generated reports will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No reports generated yet</p>
            <p className="text-sm">Start by generating a report from the tabs above</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Report History</CardTitle>
            <CardDescription>
              {reports.length} report{reports.length !== 1 ? 's' : ''} generated
              {selectedIds.length > 0 && ` • ${selectedIds.length} selected`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Selected ({selectedIds.length})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchReports}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedIds.length === reports.length && reports.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all reports"
                  />
                </TableHead>
                <TableHead>Report</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => {
                const metadata = REPORT_METADATA[report.reportType];
                const isSelected = selectedIds.includes(report.id);
                
                return (
                  <TableRow 
                    key={report.id}
                    className={isSelected ? 'bg-muted/50' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectOne(report.id, checked as boolean)}
                        aria-label={`Select ${report.title}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{report.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {metadata?.title || report.reportType}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {report.reportFormat.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {report.recordCount || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(report.generatedAt), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {report.generationTimeMs ? `${report.generationTimeMs}ms` : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
