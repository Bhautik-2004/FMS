'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Insight } from '@/lib/analytics/insights';

interface UseInsightsOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

export function useInsights(options: UseInsightsOptions = {}) {
  const { autoFetch = true, refreshInterval } = options;
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/insights');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch insights');
      }

      setInsights(data.insights || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');

    } finally {
      setLoading(false);
    }
  }, []);

  const generateInsights = useCallback(async (regenerate = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate insights');
      }

      // Refresh insights list
      await fetchInsights();

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');

      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchInsights]);

  const dismissInsight = useCallback(async (insightId: string) => {
    try {
      const response = await fetch(`/api/insights/${insightId}/dismiss`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to dismiss insight');
      }

      // Remove from local state
      setInsights((prev) => prev.filter((i) => i.id !== insightId));
    } catch (err) {

      throw err;
    }
  }, []);

  const snoozeInsight = useCallback(async (insightId: string, days: number) => {
    try {
      const response = await fetch(`/api/insights/${insightId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to snooze insight');
      }

      // Remove from local state
      setInsights((prev) => prev.filter((i) => i.id !== insightId));
    } catch (err) {

      throw err;
    }
  }, []);

  const markHelpful = useCallback(async (insightId: string, helpful: boolean) => {
    try {
      const response = await fetch(`/api/insights/${insightId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark insight');
      }

      // Update local state
      setInsights((prev) =>
        prev.map((i) => (i.id === insightId ? { ...i, helpful } : i))
      );
    } catch (err) {

      throw err;
    }
  }, []);

  const recordAction = useCallback(async (
    insightId: string,
    actionType: string,
    actionData?: Record<string, any>
  ) => {
    try {
      await fetch(`/api/insights/${insightId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType, actionData }),
      });
    } catch (err) {

      // Don't throw - this is a non-critical tracking operation
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchInsights();
    }
  }, [autoFetch, fetchInsights]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchInsights, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchInsights]);

  return {
    insights,
    loading,
    error,
    fetchInsights,
    generateInsights,
    dismissInsight,
    snoozeInsight,
    markHelpful,
    recordAction,
  };
}

// Hook for insight analytics
export function useInsightAnalytics(days = 30) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/insights/analytics?days=${days}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }

      setAnalytics(data.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');

    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { analytics, loading, error, refetch: fetchAnalytics };
}
