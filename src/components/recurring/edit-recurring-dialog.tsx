'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Switch } from '@/components/ui/switch';
import { RecurringTransaction, useRecurringTransactions } from '@/hooks/use-recurring-transactions';
import { useToast } from '@/hooks/use-toast';

interface EditRecurringDialogProps {
  transaction: RecurringTransaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditRecurringDialog({
  transaction,
  open,
  onOpenChange,
  onSuccess,
}: EditRecurringDialogProps) {
  const { toast } = useToast();
  const { updateRecurring, loading } = useRecurringTransactions();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      amount: transaction.template_data.amount,
      merchant: transaction.template_data.merchant,
      description: transaction.template_data.description,
      auto_approve: transaction.auto_approve,
      notification_enabled: transaction.notification_enabled,
    },
  });

  const onSubmit = async (data: any) => {
    try {
      await updateRecurring(transaction.id, {
        template_data: {
          ...transaction.template_data,
          amount: data.amount,
          merchant: data.merchant,
          description: data.description,
        },
        auto_approve: data.auto_approve,
        notification_enabled: data.notification_enabled,
      });

      toast({
        title: 'Success',
        description: 'Recurring transaction updated successfully',
      });

      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update recurring transaction',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Recurring Transaction</DialogTitle>
          <DialogDescription>
            Update the details of your recurring transaction
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register('amount', { required: 'Amount is required' })}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchant">Merchant/Payee</Label>
            <Input
              id="merchant"
              {...register('merchant', { required: 'Merchant is required' })}
            />
            {errors.merchant && (
              <p className="text-sm text-destructive">{errors.merchant.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Auto-approve</Label>
            <Switch {...register('auto_approve')} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Notifications</Label>
            <Switch {...register('notification_enabled')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
