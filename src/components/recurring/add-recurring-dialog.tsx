'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRecurringTransactions, FrequencyType } from '@/hooks/use-recurring-transactions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AddRecurringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface RecurringFormData {
  // Base transaction
  amount: string;
  merchant: string;
  description: string;
  type: 'income' | 'expense';
  category_id: string;
  account_id: string;

  // Frequency
  frequency: FrequencyType;
  interval: number;
  day_of_month?: number;
  day_of_week?: number;
  start_date: Date;

  // End condition
  end_condition: 'never' | 'date' | 'count';
  end_date?: Date;
  occurrence_count?: number;

  // Advanced
  auto_approve: boolean;
  notification_enabled: boolean;
  notification_days_before: number;
}

export function AddRecurringDialog({ open, onOpenChange, onSuccess }: AddRecurringDialogProps) {
  const { toast } = useToast();
  const { createRecurring, loading } = useRecurringTransactions();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RecurringFormData>({
    defaultValues: {
      type: 'expense',
      frequency: 'monthly',
      interval: 1,
      start_date: new Date(),
      end_condition: 'never',
      auto_approve: false,
      notification_enabled: true,
      notification_days_before: 1,
    },
  });

  const frequency = watch('frequency');
  const endCondition = watch('end_condition');

  const onSubmit = async (data: RecurringFormData) => {
    try {
      const templateData = {
        amount: parseFloat(data.amount),
        merchant: data.merchant,
        description: data.description,
        type: data.type,
        category_id: data.category_id,
        account_id: data.account_id,
      };

      await createRecurring({
        frequency: data.frequency,
        interval: data.interval,
        day_of_month: data.day_of_month,
        day_of_week: data.day_of_week,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: endCondition === 'date' && endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        occurrence_count: endCondition === 'count' ? data.occurrence_count : undefined,
        template_data: templateData,
        auto_approve: data.auto_approve,
        notification_enabled: data.notification_enabled,
        notification_days_before: data.notification_days_before,
      });

      toast({
        title: 'Success',
        description: 'Recurring transaction created successfully',
      });

      reset();
      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create recurring transaction',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Recurring Transaction</DialogTitle>
          <DialogDescription>
            Create a new recurring income or expense transaction
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="frequency">Frequency</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Transaction Type</Label>
                <RadioGroup
                  defaultValue="expense"
                  onValueChange={(value) => setValue('type', value as 'income' | 'expense')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="expense" id="expense" />
                    <Label htmlFor="expense" className="font-normal cursor-pointer">
                      Expense
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="income" id="income" />
                    <Label htmlFor="income" className="font-normal cursor-pointer">
                      Income
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('amount', { required: 'Amount is required' })}
                  />
                  {errors.amount && (
                    <p className="text-sm text-destructive">{errors.amount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="merchant">Merchant/Payee</Label>
                  <Input
                    id="merchant"
                    placeholder="e.g., Netflix"
                    {...register('merchant', { required: 'Merchant is required' })}
                  />
                  {errors.merchant && (
                    <p className="text-sm text-destructive">{errors.merchant.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter a description..."
                  {...register('description')}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category_id">Category</Label>
                  <Select onValueChange={(value) => setValue('category_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cat-1">Subscriptions</SelectItem>
                      <SelectItem value="cat-2">Utilities</SelectItem>
                      <SelectItem value="cat-3">Rent/Mortgage</SelectItem>
                      <SelectItem value="cat-4">Salary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_id">Account</Label>
                  <Select onValueChange={(value) => setValue('account_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acc-1">Checking Account</SelectItem>
                      <SelectItem value="acc-2">Credit Card</SelectItem>
                      <SelectItem value="acc-3">Savings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Frequency Tab */}
            <TabsContent value="frequency" className="space-y-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  defaultValue="monthly"
                  onValueChange={(value) => setValue('frequency', value as FrequencyType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {frequency === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="interval">Repeat Every (days)</Label>
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    {...register('interval', { required: true, min: 1 })}
                  />
                </div>
              )}

              {frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label htmlFor="day_of_month">Day of Month</Label>
                  <Input
                    id="day_of_month"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="e.g., 15 for the 15th"
                    {...register('day_of_month', { min: 1, max: 31 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Leave empty to use the start date's day
                  </p>
                </div>
              )}

              {(frequency === 'weekly' || frequency === 'biweekly') && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select onValueChange={(value) => setValue('day_of_week', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                    <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Condition</Label>
                <RadioGroup
                  defaultValue="never"
                  onValueChange={(value) => setValue('end_condition', value as any)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="never" id="never" />
                    <Label htmlFor="never" className="font-normal cursor-pointer">
                      Never ends
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="date" id="end-date" />
                    <Label htmlFor="end-date" className="font-normal cursor-pointer">
                      End on specific date
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="count" id="count" />
                    <Label htmlFor="count" className="font-normal cursor-pointer">
                      After number of occurrences
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {endCondition === 'date' && (
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
                        {endDate ? format(endDate, 'PPP') : 'Pick an end date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {endCondition === 'count' && (
                <div className="space-y-2">
                  <Label htmlFor="occurrence_count">Number of Occurrences</Label>
                  <Input
                    id="occurrence_count"
                    type="number"
                    min="1"
                    placeholder="e.g., 12"
                    {...register('occurrence_count', { min: 1 })}
                  />
                </div>
              )}
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-approve Transactions</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create transactions without review
                  </p>
                </div>
                <Switch
                  onCheckedChange={(checked) => setValue('auto_approve', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded before transactions are due
                  </p>
                </div>
                <Switch
                  defaultChecked
                  onCheckedChange={(checked) => setValue('notification_enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification_days_before">Notify Days Before</Label>
                <Input
                  id="notification_days_before"
                  type="number"
                  min="0"
                  max="30"
                  defaultValue="1"
                  {...register('notification_days_before', { min: 0, max: 30 })}
                />
                <p className="text-sm text-muted-foreground">
                  Receive notification this many days before the due date
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                <h4 className="font-medium">Amount Variations</h4>
                <p className="text-sm text-muted-foreground">
                  You'll be able to modify the amount when approving each occurrence if auto-approve
                  is disabled.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Recurring Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
