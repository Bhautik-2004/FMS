// =====================================================
// React Hook: useRecurringTransactions
// =====================================================
// Manages recurring transactions with API integration
// =====================================================

import { useState, useEffect, useCallback } from 'react';

export type FrequencyType = 
  | 'daily' 
  | 'weekly' 
  | 'biweekly' 
  | 'monthly' 
  | 'quarterly' 
  | 'yearly' 
  | 'custom';

export type OccurrenceStatus = 'pending' | 'generated' | 'skipped' | 'modified';

export interface RecurringTransaction {
  id: string;
  user_id: string;
  template_transaction_id?: string;
  frequency: FrequencyType;
  interval: number;
  day_of_month?: number;
  day_of_week?: number;
  start_date: string;
  end_date?: string;
  occurrence_count?: number;
  next_occurrence_date: string;
  last_generated_date?: string;
  template_data: {
    amount: number;
    category_id: string;
    account_id: string;
    merchant: string;
    description: string;
    type: 'income' | 'expense';
  };
  is_active: boolean;
  auto_approve: boolean;
  notification_enabled: boolean;
  notification_days_before: number;
  created_at: string;
  updated_at: string;
}

export interface RecurringOccurrence {
  id: string;
  recurring_id: string;
  generated_transaction_id?: string;
  expected_date: string;
  actual_date?: string;
  status: OccurrenceStatus;
  amount_variance: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRecurringTransactionData {
  template_transaction_id?: string;
  frequency: FrequencyType;
  interval?: number;
  day_of_month?: number;
  day_of_week?: number;
  start_date: string;
  end_date?: string;
  occurrence_count?: number;
  template_data: {
    amount: number;
    category_id: string;
    account_id: string;
    merchant: string;
    description: string;
    type: 'income' | 'expense';
  };
  auto_approve?: boolean;
  notification_enabled?: boolean;
  notification_days_before?: number;
}

export interface UseRecurringTransactionsResult {
  recurring: RecurringTransaction[];
  loading: boolean;
  error: string | null;
  fetchRecurring: (includeInactive?: boolean) => Promise<void>;
  createRecurring: (data: CreateRecurringTransactionData) => Promise<RecurringTransaction>;
  updateRecurring: (id: string, data: Partial<RecurringTransaction>) => Promise<RecurringTransaction>;
  deleteRecurring: (id: string) => Promise<void>;
  approveOccurrence: (occurrenceId: string, actualAmount?: number, actualDate?: string) => Promise<string>;
  skipOccurrence: (occurrenceId: string, reason?: string) => Promise<void>;
}

export function useRecurringTransactions(): UseRecurringTransactionsResult {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecurring = useCallback(async (includeInactive = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (includeInactive) {
        params.append('include_inactive', 'true');
      }

      const response = await fetch(`/api/recurring?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch recurring transactions');
      }

      const data = await response.json();
      setRecurring(data.recurring || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);

    } finally {
      setLoading(false);
    }
  }, []);

  const createRecurring = useCallback(async (data: CreateRecurringTransactionData) => {
    try {
      setError(null);

      const response = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create recurring transaction');
      }

      const result = await response.json();
      setRecurring(prev => [...prev, result.recurring]);
      return result.recurring;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    }
  }, []);

  const updateRecurring = useCallback(async (
    id: string, 
    data: Partial<RecurringTransaction>
  ) => {
    try {
      setError(null);

      const response = await fetch(`/api/recurring/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update recurring transaction');
      }

      const result = await response.json();
      setRecurring(prev => 
        prev.map(r => r.id === id ? result.recurring : r)
      );
      return result.recurring;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    }
  }, []);

  const deleteRecurring = useCallback(async (id: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/recurring/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete recurring transaction');
      }

      setRecurring(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    }
  }, []);

  const approveOccurrence = useCallback(async (
    occurrenceId: string,
    actualAmount?: number,
    actualDate?: string
  ): Promise<string> => {
    try {
      setError(null);

      const response = await fetch(`/api/recurring/occurrences/${occurrenceId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual_amount: actualAmount, actual_date: actualDate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve occurrence');
      }

      const result = await response.json();
      
      // Refresh recurring transactions to get updated next_occurrence_date
      await fetchRecurring();
      
      return result.transaction_id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    }
  }, [fetchRecurring]);

  const skipOccurrence = useCallback(async (
    occurrenceId: string,
    reason?: string
  ) => {
    try {
      setError(null);

      const response = await fetch(`/api/recurring/occurrences/${occurrenceId}/skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to skip occurrence');
      }

      // Refresh recurring transactions
      await fetchRecurring();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    }
  }, [fetchRecurring]);

  useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring]);

  return {
    recurring,
    loading,
    error,
    fetchRecurring,
    createRecurring,
    updateRecurring,
    deleteRecurring,
    approveOccurrence,
    skipOccurrence,
  };
}
