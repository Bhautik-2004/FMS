'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  CreditCard,
  PieChart,
  Tag,
  Wallet,
  BarChart3,
  Repeat,
  Target,
  Lightbulb,
  Settings,
  X,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Transactions',
    href: '/dashboard/transactions',
    icon: CreditCard,
  },
  {
    title: 'Budgets',
    href: '/dashboard/budgets',
    icon: PieChart,
  },
  {
    title: 'Categories',
    href: '/dashboard/categories',
    icon: Tag,
  },
  {
    title: 'Accounts',
    href: '/dashboard/accounts',
    icon: Wallet,
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    title: 'Insights',
    href: '/dashboard/insights',
    icon: Lightbulb,
  },
  {
    title: 'Recurring',
    href: '/dashboard/recurring',
    icon: Repeat,
  },
  {
    title: 'Goals',
    href: '/dashboard/goals',
    icon: Target,
  },
];

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">FMS</span>
          </SheetTitle>
        </SheetHeader>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.title}</span>
              </Link>
            );
          })}

          <Separator className="my-3" />

          {/* Settings */}
          <Link
            href="/settings"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              'hover:bg-accent hover:text-accent-foreground',
              pathname === '/settings'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'text-muted-foreground'
            )}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            <span>Settings</span>
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
