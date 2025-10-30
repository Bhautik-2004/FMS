import { useState, useEffect } from 'react';

export interface FinancialGoal {
  id: string;
  user_id: string;
  name: string;
  goal_type: 'savings' | 'debt_payoff' | 'net_worth' | 'investment';
  target_amount: number;
  current_amount: number;
  currency: string;
  start_date: string;
  target_date: string;
  category_id: string | null;
  account_id: string | null;
  icon: string | null;
  color: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface GoalProgress {
  goal_id: string;
  target_amount: number;
  current_amount: number;
  progress_percentage: number;
  remaining_amount: number;
  is_completed: boolean;
  days_remaining: number;
  days_elapsed: number;
  total_days: number;
  average_daily_progress: number;
  on_track: boolean;
}

export interface GoalProjection {
  projected_date: string;
  days_until_completion: number;
  confidence_level: 'high' | 'medium' | 'low';
  based_on: string;
}

export interface GoalSuggestion {
  required_monthly: number;
  recommended_monthly: number;
  current_monthly_avg: number;
  months_remaining: number;
  suggested_adjustment: number;
  is_achievable: boolean;
  notes: string;
}

export interface GoalSummary {
  total_goals: number;
  active_goals: number;
  completed_goals: number;
  total_target_amount: number;
  total_current_amount: number;
  overall_progress: number;
  on_track_goals: number;
  behind_schedule_goals: number;
  total_contributions_30d: number;
}

export interface GoalContribution {
  id: string;
  goal_id: string;
  transaction_id: string | null;
  amount: number;
  type: 'manual' | 'automatic' | 'transaction';
  date: string;
  notes: string | null;
  created_at: string;
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  name: string;
  target_amount: number;
  is_achieved: boolean;
  achieved_date: string | null;
  created_at: string;
}

export function useGoals() {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [summary, setSummary] = useState<GoalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/goals');
      if (!response.ok) throw new Error('Failed to fetch goals');
      const data = await response.json();
      setGoals(data.goals || []);
      setSummary(data.summary || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  return {
    goals,
    summary,
    loading,
    error,
    refetch: fetchGoals,
  };
}

export function useGoalProgress(goalId: string | null) {
  const [progress, setProgress] = useState<GoalProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!goalId) {
      setProgress(null);
      return;
    }

    const fetchProgress = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/goals/${goalId}/progress`);
        if (!response.ok) throw new Error('Failed to fetch progress');
        const data = await response.json();
        setProgress(data.progress);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [goalId]);

  return { progress, loading, error };
}

export function useGoalProjection(goalId: string | null, method: string = 'current_rate') {
  const [projection, setProjection] = useState<GoalProjection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!goalId) {
      setProjection(null);
      return;
    }

    const fetchProjection = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/goals/${goalId}/projection?method=${method}`);
        if (!response.ok) throw new Error('Failed to fetch projection');
        const data = await response.json();
        setProjection(data.projection);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProjection();
  }, [goalId, method]);

  return { projection, loading, error };
}

export function useGoalSuggestions(goalId: string | null) {
  const [suggestions, setSuggestions] = useState<GoalSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!goalId) {
      setSuggestions(null);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/goals/${goalId}/suggestions`);
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        const data = await response.json();
        setSuggestions(data.suggestions);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [goalId]);

  return { suggestions, loading, error };
}

export function useGoalContributions(goalId: string | null) {
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContributions = async () => {
    if (!goalId) {
      setContributions([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/goals/${goalId}/contributions`);
      if (!response.ok) throw new Error('Failed to fetch contributions');
      const data = await response.json();
      setContributions(data.contributions || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContributions();
  }, [goalId]);

  return {
    contributions,
    loading,
    error,
    refetch: fetchContributions,
  };
}

export function useGoalMilestones(goalId: string | null) {
  const [milestones, setMilestones] = useState<GoalMilestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMilestones = async () => {
    if (!goalId) {
      setMilestones([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/goals/${goalId}/milestones`);
      if (!response.ok) throw new Error('Failed to fetch milestones');
      const data = await response.json();
      setMilestones(data.milestones || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, [goalId]);

  return {
    milestones,
    loading,
    error,
    refetch: fetchMilestones,
  };
}
