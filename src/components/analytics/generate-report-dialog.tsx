'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Calendar as CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/currency-context';
import { ReportType, ReportMetadata, ReportFormat, ReportParameters, generateFileName } from '@/lib/types/reports';
import { generateReport, downloadBlob } from '@/lib/reports';

interface GenerateReportDialogProps {
  reportType: ReportType;
  metadata: ReportMetadata;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateReportDialog({ reportType, metadata, open, onOpenChange }: GenerateReportDialogProps) {
  const { toast } = useToast();
  const { currency } = useCurrency();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form state
  const [reportFormat, setReportFormat] = useState<ReportFormat>(metadata.defaultFormat);
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [asOfDate, setAsOfDate] = useState<Date | undefined>(new Date());

  const handleGenerate = async () => {
    if (metadata.requiresDateRange && (!startDate || !endDate)) {
      toast({
        title: 'Missing dates',
        description: 'Please select both start and end dates',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Build parameters
      const parameters: ReportParameters = { currency };
      if (metadata.requiresDateRange) {
        parameters.startDate = format(startDate!, 'yyyy-MM-dd');
        parameters.endDate = format(endDate!, 'yyyy-MM-dd');
      } else {
        parameters.asOfDate = format(asOfDate!, 'yyyy-MM-dd');
      }

      // Call API to get report data
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          reportFormat,
          parameters,
          title: metadata.title,
          description: metadata.description,
        }),
      });

      if (!response.ok) {
        const error = await response.json();

        throw new Error(error.error || 'Failed to generate report');
      }

      const { data, fileName, recordCount } = await response.json();

      // Check if data is empty
      if (!data || data.length === 0) {
        toast({
          title: 'No data available',
          description: `No data found for the selected date range. Please try a different period or add ${
            reportType.includes('budget') ? 'budgets' : 
            reportType === 'merchant_analysis' ? 'transactions with merchant names' : 
            'data'
          } first.`,
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }

      // Generate the file using report generators
      const blob = generateReport(reportType, reportFormat, data, parameters);
      
      // Download the file
      downloadBlob(blob, fileName);

      toast({
        title: 'Report generated',
        description: `Your ${metadata.title} with ${recordCount} records has been downloaded successfully`,
      });

      onOpenChange(false);
    } catch (error: any) {

      toast({
        title: 'Generation failed',
        description: error.message || 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate {metadata.title}</DialogTitle>
          <DialogDescription>{metadata.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Report Format</Label>
            <RadioGroup
              value={reportFormat}
              onValueChange={(value) => setReportFormat(value as ReportFormat)}
              className="flex gap-4"
            >
              {metadata.supportedFormats.map((format) => (
                <div key={format} className="flex items-center space-x-2">
                  <RadioGroupItem value={format} id={format} />
                  <Label htmlFor={format} className="cursor-pointer">
                    {format.toUpperCase()}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Date Range Selection */}
          {metadata.requiresDateRange ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !startDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>As of Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !asOfDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {asOfDate ? format(asOfDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={asOfDate}
                    onSelect={setAsOfDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
