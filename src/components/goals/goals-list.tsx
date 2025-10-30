'use client';

import { useState } from 'react';
import { useCurrency } from '@/contexts/currency-context';
import { 
  Target, TrendingUp, AlertCircle, CheckCircle2, Calendar,
  DollarSign, Filter, Search, MoreVertical, Edit, Trash2,
  Play, Pause, Copy
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { FinancialGoal } from '@/hooks/use-goals';
import { cn } from '@/lib/utils';
import { format, differenceInDays, parseISO } from 'date-fns';

interface GoalsListProps {
  goals: FinancialGoal[];
  onSelectGoal: (goalId: string) => void;
  onUpdate: () => void;
  showArchived?: boolean;
}

const GOAL_ICONS: Record<string, any> = {
  savings: Target,
  debt_payoff: TrendingUp,
  net_worth: DollarSign,
  investment: TrendingUp,
};

const GOAL_TYPE_COLORS: Record<string, string> = {
  savings: 'bg-blue-500',
  debt_payoff: 'bg-orange-500',
  net_worth: 'bg-purple-500',
  investment: 'bg-green-500',
};

export function GoalsList({ goals, onSelectGoal, onUpdate, showArchived }: GoalsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('priority');
  const { formatCurrency } = useCurrency();

  // Filter goals
  const filteredGoals = goals.filter((goal: FinancialGoal) => {
    const matchesSearch = goal.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || goal.goal_type === filterType;
    return matchesSearch && matchesType;
  });

  // Sort goals
  const sortedGoals = [...filteredGoals].sort((a: FinancialGoal, b: FinancialGoal) => {
    switch (sortBy) {
      case 'priority':
        return a.priority - b.priority;
      case 'progress':
        return (b.current_amount / b.target_amount) - (a.current_amount / a.target_amount);
      case 'deadline':
        return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
      case 'amount':
        return b.target_amount - a.target_amount;
      default:
        return 0;
    }
  });

  const handleDelete = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete goal');
      onUpdate();
    } catch (error) {

    }
  };

  const handleToggleActive = async (goalId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!response.ok) throw new Error('Failed to update goal');
      onUpdate();
    } catch (error) {

    }
  };

  if (sortedGoals.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {showArchived ? 'No completed goals yet' : 'No active goals'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {showArchived 
              ? 'Complete your first goal to see it here'
              : 'Create your first financial goal to start tracking your progress'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search goals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="savings">Savings</SelectItem>
            <SelectItem value="debt_payoff">Debt Payoff</SelectItem>
            <SelectItem value="net_worth">Net Worth</SelectItem>
            <SelectItem value="investment">Investment</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="progress">Progress</SelectItem>
            <SelectItem value="deadline">Deadline</SelectItem>
            <SelectItem value="amount">Amount</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Goals Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedGoals.map((goal: FinancialGoal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onSelect={() => onSelectGoal(goal.id)}
            onDelete={() => handleDelete(goal.id)}
            onToggleActive={() => handleToggleActive(goal.id, goal.is_active)}
            showArchived={showArchived}
          />
        ))}
      </div>
    </div>
  );
}

interface GoalCardProps {
  goal: FinancialGoal;
  onSelect: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  showArchived?: boolean;
}

function GoalCard({ goal, onSelect, onDelete, onToggleActive, showArchived }: GoalCardProps) {
  const { formatCurrency } = useCurrency();
  const Icon = GOAL_ICONS[goal.goal_type] || Target;
  const progress = (goal.current_amount / goal.target_amount) * 100;
  const daysRemaining = differenceInDays(parseISO(goal.target_date), new Date());
  const isOverdue = daysRemaining < 0;
  const isCompleted = goal.completed_at !== null;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg",
        !goal.is_active && !showArchived && "opacity-60"
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div 
              className={cn("p-2 rounded-lg", GOAL_TYPE_COLORS[goal.goal_type])}
              style={{ backgroundColor: goal.color }}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{goal.name}</CardTitle>
              <CardDescription className="capitalize">
                {goal.goal_type.replace('_', ' ')}
              </CardDescription>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onToggleActive();
              }}>
                {goal.is_active ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Goal
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume Goal
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Amount Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">
              {formatCurrency(goal.current_amount)}
            </span>
            <span className="text-muted-foreground">
              {formatCurrency(goal.target_amount)}
            </span>
          </div>
          <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={cn(
                "h-3 rounded-full transition-all duration-500",
                isCompleted ? "bg-green-500" : "bg-blue-500"
              )}
              style={{ 
                width: `${Math.min(progress, 100)}%`,
                backgroundColor: !isCompleted ? goal.color : undefined
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress.toFixed(1)}% complete</span>
            <span>{formatCurrency(goal.target_amount - goal.current_amount)} remaining</span>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {isCompleted && (
            <Badge className="bg-green-500">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          )}
          {!isCompleted && isOverdue && (
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              {Math.abs(daysRemaining)} days overdue
            </Badge>
          )}
          {!isCompleted && !isOverdue && daysRemaining <= 30 && (
            <Badge variant="secondary">
              <Calendar className="w-3 h-3 mr-1" />
              {daysRemaining} days left
            </Badge>
          )}
          {goal.priority === 1 && (
            <Badge variant="outline">High Priority</Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 text-xs text-muted-foreground">
        <Calendar className="w-3 h-3 mr-1" />
        Target: {format(parseISO(goal.target_date), 'MMM d, yyyy')}
      </CardFooter>
    </Card>
  );
}
