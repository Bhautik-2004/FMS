'use client';

import { useRouter } from 'next/navigation';
import { Plus, ArrowDownLeft, ArrowUpRight, Repeat, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QuickActions() {
  const router = useRouter();

  const quickActions = [
    {
      id: 'income',
      label: 'Add Income',
      icon: ArrowDownLeft,
      color: 'text-green-600',
      action: () => router.push('/transactions/add?type=income'),
    },
    {
      id: 'expense',
      label: 'Add Expense',
      icon: ArrowUpRight,
      color: 'text-red-600',
      action: () => router.push('/transactions/add?type=expense'),
    },
    {
      id: 'transfer',
      label: 'Transfer',
      icon: Repeat,
      color: 'text-blue-600',
      action: () => router.push('/transactions/add?type=transfer'),
    },
    {
      id: 'recurring',
      label: 'Recurring',
      icon: Receipt,
      color: 'text-purple-600',
      action: () => router.push('/recurring'),
    },
  ];

  return (
    <>
      {/* Floating Action Button (Mobile) */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50 lg:hidden"
        onClick={() => router.push('/transactions/add')}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Desktop Quick Actions Bar */}
      <div className="hidden lg:flex gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={action.action}
            >
              <Icon className={`h-4 w-4 ${action.color}`} />
              {action.label}
            </Button>
          );
        })}
      </div>
    </>
  );
}
