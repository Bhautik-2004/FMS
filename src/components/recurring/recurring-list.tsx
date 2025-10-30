'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useCurrency } from '@/contexts/currency-context';
import {
  Pause,
  Play,
  Edit2,
  Trash2,
  SkipForward,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RecurringTransaction, FrequencyType } from '@/hooks/use-recurring-transactions';
import { EditRecurringDialog } from './edit-recurring-dialog';
import { DeleteRecurringDialog } from './delete-recurring-dialog';
import { cn } from '@/lib/utils';

interface RecurringListProps {
  transactions: RecurringTransaction[];
  loading: boolean;
  error: string | null;
  onRefetch: () => void;
}

const frequencyLabels: Record<FrequencyType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

export function RecurringList({ transactions, loading, error, onRefetch }: RecurringListProps) {
  const { formatCurrency } = useCurrency();
  const [search, setSearch] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<RecurringTransaction | null>(null);

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.template_data.merchant?.toLowerCase().includes(search.toLowerCase()) ||
      transaction.template_data.description?.toLowerCase().includes(search.toLowerCase());

    const matchesFrequency =
      frequencyFilter === 'all' || transaction.frequency === frequencyFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && transaction.is_active) ||
      (statusFilter === 'paused' && !transaction.is_active);

    return matchesSearch && matchesFrequency && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-10 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const getFrequencyText = (transaction: RecurringTransaction): string => {
    const base = frequencyLabels[transaction.frequency];
    if (transaction.interval > 1) {
      return `Every ${transaction.interval} ${transaction.frequency === 'custom' ? 'days' : base.toLowerCase()}`;
    }
    return base;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search recurring transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frequencies</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Biweekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Recurring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactions.filter((t) => t.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter((t) => !t.is_active).length} paused
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(
                transactions
                  .filter(
                    (t) =>
                      t.is_active &&
                      t.template_data.type === 'income' &&
                      t.frequency === 'monthly'
                  )
                  .reduce((sum, t) => sum + (typeof t.template_data.amount === 'number' ? t.template_data.amount : parseFloat(String(t.template_data.amount))), 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">From recurring sources</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(
                transactions
                  .filter(
                    (t) =>
                      t.is_active &&
                      t.template_data.type === 'expense' &&
                      t.frequency === 'monthly'
                  )
                  .reduce((sum, t) => sum + (typeof t.template_data.amount === 'number' ? t.template_data.amount : parseFloat(String(t.template_data.amount))), 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">From recurring bills</p>
          </CardContent>
        </Card>
      </div>

      {/* Recurring Transactions List */}
      {filteredTransactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No recurring transactions found</p>
            {search || frequencyFilter !== 'all' || statusFilter !== 'all' ? (
              <Button
                variant="link"
                onClick={() => {
                  setSearch('');
                  setFrequencyFilter('all');
                  setStatusFilter('all');
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((transaction) => (
            <Card key={transaction.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Transaction Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      {/* Type Icon */}
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg',
                          transaction.template_data.type === 'income'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                        )}
                      >
                        {transaction.template_data.type === 'income' ? (
                          <TrendingUp className="h-5 w-5" />
                        ) : (
                          <TrendingDown className="h-5 w-5" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {transaction.template_data.merchant || 'Untitled'}
                          </h3>
                          {!transaction.is_active && (
                            <Badge variant="secondary">Paused</Badge>
                          )}
                          {transaction.auto_approve && (
                            <Badge variant="outline">Auto-approve</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {transaction.template_data.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" />
                            {getFrequencyText(transaction)}
                          </span>
                          <span>•</span>
                          <span>
                            Next: {format(new Date(transaction.next_occurrence_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div
                        className={cn(
                          'text-2xl font-bold',
                          transaction.template_data.type === 'income'
                            ? 'text-green-600'
                            : 'text-red-600'
                        )}
                      >
                        {transaction.template_data.type === 'income' ? '+' : '-'}
                        {formatCurrency(
                          typeof transaction.template_data.amount === 'number' 
                            ? transaction.template_data.amount 
                            : parseFloat(String(transaction.template_data.amount))
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {transaction.template_data.merchant}
                      </p>
                    </div>

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setEditingTransaction(transaction)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {transaction.is_active ? (
                            <>
                              <Pause className="mr-2 h-4 w-4" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              Resume
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <SkipForward className="mr-2 h-4 w-4" />
                          Skip Next
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeletingTransaction(transaction)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingTransaction && (
        <EditRecurringDialog
          transaction={editingTransaction}
          open={!!editingTransaction}
          onOpenChange={(open: boolean) => !open && setEditingTransaction(null)}
          onSuccess={() => {
            setEditingTransaction(null);
            onRefetch();
          }}
        />
      )}

      {/* Delete Dialog */}
      {deletingTransaction && (
        <DeleteRecurringDialog
          transaction={deletingTransaction}
          open={!!deletingTransaction}
          onOpenChange={(open: boolean) => !open && setDeletingTransaction(null)}
          onSuccess={() => {
            setDeletingTransaction(null);
            onRefetch();
          }}
        />
      )}
    </div>
  );
}
