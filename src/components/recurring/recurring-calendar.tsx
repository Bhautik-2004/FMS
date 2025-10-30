'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { useCurrency } from '@/contexts/currency-context';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RecurringTransaction } from '@/hooks/use-recurring-transactions';
import { cn } from '@/lib/utils';

interface RecurringCalendarProps {
  transactions: RecurringTransaction[];
  loading: boolean;
}

export function RecurringCalendar({ transactions, loading }: RecurringCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { formatCurrency } = useCurrency();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate occurrences for the month
  const getOccurrencesForDay = (date: Date) => {
    return transactions.filter((transaction) => {
      return isSameDay(new Date(transaction.next_occurrence_date), date);
    });
  };

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  if (loading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-medium text-sm text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {daysInMonth.map((day) => {
              const occurrences = getOccurrencesForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <Card
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[100px] p-2 cursor-pointer hover:bg-muted/50 transition-colors',
                    isToday && 'ring-2 ring-primary'
                  )}
                >
                  <div className="space-y-1">
                    <div
                      className={cn(
                        'text-sm font-medium',
                        isToday && 'text-primary font-bold'
                      )}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {occurrences.slice(0, 3).map((transaction) => (
                        <Badge
                          key={transaction.id}
                          variant={transaction.template_data.type === 'income' ? 'default' : 'destructive'}
                          className="w-full justify-start text-xs truncate"
                        >
                          {formatCurrency(transaction.template_data.amount)}
                        </Badge>
                      ))}
                      {occurrences.length > 3 && (
                        <Badge variant="outline" className="w-full text-xs">
                          +{occurrences.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge>Income</Badge>
              <span className="text-sm text-muted-foreground">Recurring income</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Expense</Badge>
              <span className="text-sm text-muted-foreground">Recurring expense</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
