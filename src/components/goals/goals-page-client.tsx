'use client';

import { useState } from 'react';
import { useCurrency } from '@/contexts/currency-context';
import { Plus, Target, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GoalsList } from './goals-list';
import { GoalDetailView } from './goal-detail-view';
import { AddGoalDialog } from './add-goal-dialog';
import { GoalTemplates } from './goal-templates';
import { useGoals } from '@/hooks/use-goals';

export function GoalsPageClient() {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateData, setTemplateData] = useState<any>(null);
  const { goals, loading, error, summary, refetch } = useGoals();
  const { formatCurrency } = useCurrency();

  const handleTemplateSelect = (template: any) => {
    setTemplateData(template);
    setShowTemplates(false);
    setShowAddDialog(true);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error Loading Goals</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const selectedGoal = goals.find((g: any) => g.id === selectedGoalId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Goals</h1>
          <p className="text-muted-foreground mt-1">
            Track your savings, investments, and financial milestones
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTemplates(true)}
          >
            <Target className="w-4 h-4 mr-2" />
            Templates
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Goal
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && goals.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.active_goals || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.completed_goals || 0} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary?.total_target_amount || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(summary?.total_current_amount || 0)} saved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overall Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(summary?.overall_progress || 0).toFixed(1)}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(summary?.overall_progress || 0, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                On Track
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary?.on_track_goals || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.behind_schedule_goals || 0} behind schedule
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {goals.length === 0 && !loading ? (
        <Card className="py-12">
          <CardContent className="text-center space-y-4">
            <Target className="w-16 h-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-xl font-semibold mb-2">No Goals Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start tracking your financial goals to achieve your dreams
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setShowTemplates(true)} variant="outline">
                  <Target className="w-4 h-4 mr-2" />
                  Browse Templates
                </Button>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Goal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active Goals ({goals.filter((g: any) => g.is_active).length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({goals.filter((g: any) => g.completed_at).length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Goals ({goals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {selectedGoal ? (
            <GoalDetailView
              goal={selectedGoal}
              onBack={() => setSelectedGoalId(null)}
              onUpdate={refetch}
            />
          ) : (
            <GoalsList
              goals={goals.filter((g: any) => g.is_active && !g.completed_at)}
              onSelectGoal={setSelectedGoalId}
              onUpdate={refetch}
            />
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <GoalsList
            goals={goals.filter((g: any) => g.completed_at)}
            onSelectGoal={setSelectedGoalId}
            onUpdate={refetch}
            showArchived
          />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {selectedGoal ? (
            <GoalDetailView
              goal={selectedGoal}
              onBack={() => setSelectedGoalId(null)}
              onUpdate={refetch}
            />
          ) : (
            <GoalsList
              goals={goals}
              onSelectGoal={setSelectedGoalId}
              onUpdate={refetch}
            />
          )}
        </TabsContent>
      </Tabs>
      )}

      {/* Dialogs */}
      <AddGoalDialog
        open={showAddDialog}
        onOpenChange={(open: boolean) => {
          setShowAddDialog(open);
          if (!open) setTemplateData(null);
        }}
        onSuccess={() => {
          setShowAddDialog(false);
          setTemplateData(null);
          refetch();
        }}
        template={templateData}
      />

      <GoalTemplates
        open={showTemplates}
        onOpenChange={setShowTemplates}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  );
}
