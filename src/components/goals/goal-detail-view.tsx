'use client';

import { useState } from 'react';
import { useCurrency } from '@/contexts/currency-context';
import {
  ArrowLeft, Plus, TrendingUp, TrendingDown, Calendar,
  DollarSign, Target, Edit, Trash2, Download, Award,
  AlertCircle, CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FinancialGoal,
  useGoalProgress,
  useGoalProjection,
  useGoalSuggestions,
  useGoalContributions,
  useGoalMilestones,
} from '@/hooks/use-goals';
import { AddContributionDialog } from './add-contribution-dialog';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface GoalDetailViewProps {
  goal: FinancialGoal;
  onBack: () => void;
  onUpdate: () => void;
}

export function GoalDetailView({ goal, onBack, onUpdate }: GoalDetailViewProps) {
  const [showAddContribution, setShowAddContribution] = useState(false);
  const { formatCurrency } = useCurrency();
  const { progress } = useGoalProgress(goal.id);
  const { projection } = useGoalProjection(goal.id);
  const { suggestions } = useGoalSuggestions(goal.id);
  const { contributions, refetch: refetchContributions } = useGoalContributions(goal.id);
  const { milestones } = useGoalMilestones(goal.id);

  const progressPercentage = progress?.progress_percentage || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{goal.name}</h2>
            <p className="text-muted-foreground capitalize">
              {goal.goal_type.replace('_', ' ')} Goal
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowAddContribution(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Contribution
          </Button>
        </div>
      </div>

      {/* Main Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Circular Progress or Bar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                {/* Background circle */}
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke={goal.color || '#3b82f6'}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 88}`}
                  strokeDashoffset={`${2 * Math.PI * 88 * (1 - progressPercentage / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold">{progressPercentage.toFixed(1)}%</span>
              <span className="text-sm text-muted-foreground">Complete</span>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold">
              {formatCurrency(goal.current_amount)}
            </p>
            <p className="text-muted-foreground">
              of {formatCurrency(goal.target_amount)} goal
            </p>
          </div>
        </div>

        <Separator />          {/* Stats Grid */}
          {progress && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <DollarSign className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">
                {formatCurrency(progress.remaining_amount)}
              </p>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </div>              <div className="text-center p-3 bg-muted rounded-lg">
                <Calendar className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{progress.days_remaining}</p>
                <p className="text-xs text-muted-foreground">Days Left</p>
              </div>

              <div className="text-center p-3 bg-muted rounded-lg">
                <TrendingUp className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">
                  {formatCurrency(progress.average_daily_progress)}
                </p>
                <p className="text-xs text-muted-foreground">Daily Avg</p>
              </div>

              <div className="text-center p-3 bg-muted rounded-lg">
                {progress.on_track ? (
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 mx-auto mb-2 text-orange-500" />
                )}
                <p className="text-2xl font-bold">
                  {progress.on_track ? 'On Track' : 'Behind'}
                </p>
                <p className="text-xs text-muted-foreground">Status</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights & Suggestions */}
      {(projection || suggestions) && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Projection Card */}
          {projection && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Projected Completion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-bold">
                  {format(parseISO(projection.projected_date), 'MMM d, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {projection.days_until_completion} days from now
                </p>
                <Badge variant={
                  projection.confidence_level === 'high' ? 'default' :
                  projection.confidence_level === 'medium' ? 'secondary' :
                  'outline'
                }>
                  {projection.confidence_level} confidence
                </Badge>
                <p className="text-xs text-muted-foreground pt-2">
                  Based on {projection.based_on.replace('_', ' ')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Suggestions Card */}
          {suggestions && (
            <Card className={cn(
              suggestions.is_achievable ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"
            )}>
              <CardHeader>
                <CardTitle className="text-base">Monthly Contribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-bold">
                  {formatCurrency(suggestions.recommended_monthly)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Recommended per month
                </p>
                <div className="text-xs space-y-1 pt-2">
                  <p>Current avg: {formatCurrency(suggestions.current_monthly_avg)}/mo</p>
                  <p>Required: {formatCurrency(suggestions.required_monthly)}/mo</p>
                  {suggestions.suggested_adjustment !== 0 && (
                    <p className={suggestions.suggested_adjustment > 0 ? "text-orange-600" : "text-green-600"}>
                      {suggestions.suggested_adjustment > 0 ? '+' : ''}
                      {formatCurrency(Math.abs(suggestions.suggested_adjustment))} adjustment
                    </p>
                  )}
                </div>
                {suggestions.notes && (
                  <p className="text-xs pt-2 italic">{suggestions.notes}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabs for Details */}
      <Tabs defaultValue="contributions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contributions">
            Contributions ({contributions.length})
          </TabsTrigger>
          <TabsTrigger value="milestones">
            Milestones ({milestones.filter(m => m.is_achieved).length}/{milestones.length})
          </TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="contributions">
          <ContributionsTab contributions={contributions} />
        </TabsContent>

        <TabsContent value="milestones">
          <MilestonesTab milestones={milestones} />
        </TabsContent>

        <TabsContent value="details">
          <DetailsTab goal={goal} />
        </TabsContent>
      </Tabs>

      {/* Add Contribution Dialog */}
      <AddContributionDialog
        open={showAddContribution}
        onOpenChange={setShowAddContribution}
        goalId={goal.id}
        onSuccess={() => {
          setShowAddContribution(false);
          refetchContributions();
          onUpdate();
        }}
      />
    </div>
  );
}

// Sub-components for tabs will continue in next file due to length
function ContributionsTab({ contributions }: { contributions: any[] }) {
  const { formatCurrency } = useCurrency();
  
  if (contributions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No contributions yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {contributions.map((contribution: any) => (
            <div key={contribution.id} className="p-4 flex items-center justify-between hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  contribution.amount > 0 ? "bg-green-100" : "bg-red-100"
                )}>
                  {contribution.amount > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    {contribution.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(contribution.amount))}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(contribution.date), 'MMM d, yyyy')}
                  </p>
                  {contribution.notes && (
                    <p className="text-xs text-muted-foreground">{contribution.notes}</p>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="capitalize">
                {contribution.type}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MilestonesTab({ milestones }: { milestones: any[] }) {
  const { formatCurrency } = useCurrency();
  
  if (milestones.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Award className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No milestones set</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {milestones.map((milestone: any, index: number) => (
            <div key={milestone.id} className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                milestone.is_achieved ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
              )}>
                {milestone.is_achieved ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Award className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{milestone.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(milestone.target_amount)}
                </p>
                {milestone.is_achieved && milestone.achieved_date && (
                  <p className="text-xs text-green-600">
                    Achieved {format(parseISO(milestone.achieved_date), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailsTab({ goal }: { goal: FinancialGoal }) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Start Date</p>
            <p className="font-medium">{format(parseISO(goal.start_date), 'MMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Target Date</p>
            <p className="font-medium">{format(parseISO(goal.target_date), 'MMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Priority</p>
            <p className="font-medium">{goal.priority === 1 ? 'High' : goal.priority === 2 ? 'Medium' : 'Low'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Currency</p>
            <p className="font-medium">{goal.currency}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={goal.is_active ? "default" : "secondary"}>
              {goal.is_active ? 'Active' : 'Paused'}
            </Badge>
          </div>
          {goal.completed_at && (
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="font-medium">{format(parseISO(goal.completed_at), 'MMM d, yyyy')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
