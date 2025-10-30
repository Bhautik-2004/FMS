'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Menu, Search, Moon, Sun, ChevronDown, Calendar, DollarSign, TrendingUp, BarChart3, Target } from 'lucide-react';
import { useTheme } from 'next-themes';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCurrency } from '@/contexts/currency-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/auth/actions';

interface TopNavProps {
  onMenuClick: () => void;
  user?: {
    email?: string;
    name?: string;
    avatar?: string;
  };
}

export function TopNav({ onMenuClick, user }: TopNavProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();
  const { formatCurrency } = useCurrency();
  const [mounted, setMounted] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Reset search when dialog closes
  useEffect(() => {
    if (!commandOpen) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchQuery('');
    }
  }, [commandOpen]);

  // Search transactions with debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const searchTransactions = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          console.log('No user found');
          setIsSearching(false);
          return;
        }

        console.log('Searching for:', searchQuery);

        // Fetch transactions
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('id, description, amount, type, date, merchant_name, category_id, account_id')
          .eq('user_id', currentUser.id)
          .or(`description.ilike.%${searchQuery}%,merchant_name.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`)
          .order('date', { ascending: false })
          .limit(8);

        console.log('Search results:', transactions, 'Error:', txError);

        if (txError) {
          console.error('Transaction search error:', txError);
          setIsSearching(false);
          return;
        }

        if (!transactions || transactions.length === 0) {
          console.log('No transactions found');
          setSearchResults([]);
          setIsSearching(false);
          return;
        }

        // Fetch categories
        const categoryIds = transactions
          .map(t => t.category_id)
          .filter((id): id is string => id !== null);
        const { data: categories } = categoryIds.length > 0 
          ? await supabase
              .from('categories')
              .select('id, name, color, icon')
              .in('id', categoryIds)
          : { data: [] };

        // Fetch accounts
        const accountIds = transactions
          .map(t => t.account_id)
          .filter((id): id is string => id !== null);
        const { data: accounts } = accountIds.length > 0
          ? await supabase
              .from('accounts')
              .select('id, name')
              .in('id', accountIds)
          : { data: [] };

        // Create lookup maps
        const categoryMap = new Map(categories?.map(c => [c.id, c]) || []);
        const accountMap = new Map(accounts?.map(a => [a.id, a]) || []);

        // Enrich transactions with category and account data
        const enrichedTransactions = transactions.map(tx => ({
          ...tx,
          category: tx.category_id ? categoryMap.get(tx.category_id) : null,
          account: tx.account_id ? accountMap.get(tx.account_id) : null,
        }));

        console.log('Enriched transactions:', enrichedTransactions);
        setSearchResults(enrichedTransactions);
        setIsSearching(false);
      } catch (error) {
        console.error('Search error:', error);
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchTransactions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, supabase]);

  const handleSignOut = async () => {
    await signOut();
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-4 lg:px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Center Section - Command Search */}
      <div className="flex-1 max-w-md mx-4">
        <Button
          variant="outline"
          className="relative w-full justify-start text-sm text-muted-foreground"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="mr-2 h-4 w-4" />
          <span>Search transactions...</span>
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="hidden sm:inline-flex"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        )}

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>
              Notifications
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                No notifications yet
              </p>
              <p className="text-xs text-muted-foreground">
                You'll see notifications here when they arrive
              </p>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="pl-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={user?.name || user?.email} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(user?.name, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline-block text-sm font-medium">
                  {user?.name || user?.email?.split('@')[0] || 'User'}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 hidden sm:inline-block" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </header>

      {/* Command Palette Dialog */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
          <CommandInput 
            placeholder="Search transactions or navigate..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
        <CommandEmpty>
          {isSearching 
            ? 'Searching...' 
            : searchQuery.length < 2 
            ? 'Type at least 2 characters to search transactions...' 
            : 'No transactions found matching your search.'}
        </CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">{!searchQuery && (
          <>
          <CommandItem onSelect={() => { router.push('/transactions/new'); setCommandOpen(false); }}>
            <DollarSign className="mr-2 h-4 w-4" />
            <span>Add Transaction</span>
          </CommandItem>
          <CommandItem onSelect={() => { router.push('/budgets'); setCommandOpen(false); }}>
            <TrendingUp className="mr-2 h-4 w-4" />
            <span>View Budgets</span>
          </CommandItem>
          <CommandItem onSelect={() => { router.push('/analytics'); setCommandOpen(false); }}>
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Analytics</span>
          </CommandItem>
          <CommandItem onSelect={() => { router.push('/goals'); setCommandOpen(false); }}>
            <Target className="mr-2 h-4 w-4" />
            <span>Financial Goals</span>
          </CommandItem>
          </>
        )}
        </CommandGroup>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <CommandGroup heading="Recent Transactions">
            {searchResults.map((transaction) => (
              <CommandItem
                key={transaction.id}
                onSelect={() => {
                  router.push(`/transactions?id=${transaction.id}`);
                  setCommandOpen(false);
                }}
                className="flex items-center gap-3"
              >
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {transaction.description || transaction.merchant_name || 'Untitled'}
                    </span>
                    {transaction.category && (
                      <Badge
                        variant="outline"
                        className="text-xs shrink-0"
                        style={{
                          borderColor: transaction.category.color,
                          color: transaction.category.color,
                        }}
                      >
                        {transaction.category.icon} {transaction.category.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(transaction.date), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
                <span
                  className={cn(
                    "font-semibold text-sm whitespace-nowrap",
                    transaction.type === 'income'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {formatCurrency(transaction.type === 'income' ? transaction.amount : -Math.abs(transaction.amount))}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
    </>
  );
}
