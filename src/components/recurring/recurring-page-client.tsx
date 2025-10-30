'use client';

import { useState } from 'react';
import { Plus, Calendar, History, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecurringList } from './recurring-list';
import { RecurringCalendar } from './recurring-calendar';
import { RecurringHistory } from './recurring-history';
import { AddRecurringDialog } from './add-recurring-dialog';
import { useRecurringTransactions } from '@/hooks/use-recurring-transactions';

type ViewMode = 'list' | 'calendar' | 'history';

export function RecurringPageClient() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { recurring, loading, error, fetchRecurring } = useRecurringTransactions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recurring Transactions</h1>
          <p className="text-muted-foreground">
            Manage your recurring income and expenses
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Recurring
        </Button>
      </div>

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-6">
          <RecurringList
            transactions={recurring}
            loading={loading}
            error={error}
            onRefetch={fetchRecurring}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <RecurringCalendar
            transactions={recurring}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <RecurringHistory />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <AddRecurringDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={() => {
          setIsAddDialogOpen(false);
          fetchRecurring();
        }}
      />
    </div>
  );
}
