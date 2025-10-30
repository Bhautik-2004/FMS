'use client';

import { useState } from 'react';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { MobileSidebar } from '@/components/dashboard/mobile-sidebar';
import { TopNav } from '@/components/dashboard/top-nav';
import { CurrencyProvider } from '@/contexts/currency-context';
import { cn } from '@/lib/utils';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  user: {
    email?: string;
    name?: string;
    avatar?: string;
  } | null;
}

export function DashboardLayoutClient({ children, user }: DashboardLayoutClientProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) {
    redirect('/login');
  }

  return (
    <CurrencyProvider>
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Mobile Sidebar */}
        <MobileSidebar
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div
          className={cn(
            'min-h-screen transition-all duration-300',
            sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
          )}
        >
          {/* Top Navigation */}
          <TopNav
            onMenuClick={() => setMobileMenuOpen(true)}
            user={user}
          />

          {/* Page Content */}
          <main className="p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </CurrencyProvider>
  );
}
