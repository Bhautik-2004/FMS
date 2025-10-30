'use client';

import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RecurringTransaction, useRecurringTransactions } from '@/hooks/use-recurring-transactions';
import { useToast } from '@/hooks/use-toast';

interface DeleteRecurringDialogProps {
  transaction: RecurringTransaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteRecurringDialog({
  transaction,
  open,
  onOpenChange,
  onSuccess,
}: DeleteRecurringDialogProps) {
  const { toast } = useToast();
  const { deleteRecurring, loading } = useRecurringTransactions();

  const handleDelete = async () => {
    try {
      await deleteRecurring(transaction.id);

      toast({
        title: 'Success',
        description: 'Recurring transaction deleted successfully',
      });

      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete recurring transaction',
        variant: 'destructive',
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Delete Recurring Transaction</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Are you sure you want to delete "{transaction.template_data.merchant}"?
            <br />
            <br />
            This will permanently remove the recurring transaction and all its occurrences. Past
            transactions that were already created will not be affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
