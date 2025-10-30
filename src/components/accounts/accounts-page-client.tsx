'use client';

import { useState } from 'react';
import { Plus, MoreVertical, Eye, Edit, Trash2, RefreshCw, ArrowUpRight, Building2, Wallet, CreditCard, Banknote, TrendingUp, HandCoins } from 'lucide-react';
import { useCurrency } from '@/contexts/currency-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Account, AccountType } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Database } from '@/lib/supabase/types';

interface AccountsPageClientProps {
  initialAccounts: Account[];
}

const accountTypeIcons: Record<AccountType, React.ElementType> = {
  checking: Building2,
  savings: Wallet,
  credit_card: CreditCard,
  cash: Banknote,
  investment: TrendingUp,
  loan: HandCoins,
};

const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  cash: 'Cash',
  investment: 'Investment',
  loan: 'Loan',
};

const accountTypeColors: Record<AccountType, string> = {
  checking: '#3b82f6',
  savings: '#10b981',
  credit_card: '#ef4444',
  cash: '#f59e0b',
  investment: '#8b5cf6',
  loan: '#ec4899',
};

export function AccountsPageClient({ initialAccounts }: AccountsPageClientProps) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking' as AccountType,
    currency: 'USD',
    initial_balance: '0',
    institution_name: '',
    account_number_last4: '',
    color: accountTypeColors.checking,
  });

  const supabase = createClient();

  // Group accounts by type
  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.type]) {
      acc[account.type] = [];
    }
    acc[account.type].push(account);
    return acc;
  }, {} as Record<AccountType, Account[]>);

  // Calculate totals
  const totalAssets = accounts
    .filter((a) => ['checking', 'savings', 'cash', 'investment'].includes(a.type) && a.is_active)
    .reduce((sum, a) => sum + a.current_balance, 0);

  const totalLiabilities = accounts
    .filter((a) => ['credit_card', 'loan'].includes(a.type) && a.is_active)
    .reduce((sum, a) => sum + Math.abs(a.current_balance), 0);

  const netWorth = totalAssets - totalLiabilities;

  const handleAddAccount = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('accounts')
        .insert([{
          user_id: user.id,
          name: formData.name,
          type: formData.type,
          currency: formData.currency,
          initial_balance: parseFloat(formData.initial_balance),
          current_balance: parseFloat(formData.initial_balance),
          institution_name: formData.institution_name || null,
          account_number_last4: formData.account_number_last4 || null,
          color: formData.color,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;

      setAccounts([data as Account, ...accounts]);
      setIsAddDialogOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAccount = async () => {
    if (!selectedAccount) return;
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('accounts')
        .update({
          name: formData.name,
          type: formData.type,
          institution_name: formData.institution_name || null,
          account_number_last4: formData.account_number_last4 || null,
          color: formData.color,
        })
        .eq('id', selectedAccount.id)
        .select()
        .single();

      if (error) throw error;

      setAccounts(accounts.map((a) => (a.id === (data as Account).id ? (data as Account) : a)));
      setIsEditDialogOpen(false);
      setSelectedAccount(null);
      resetForm();
      router.refresh();
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return;
    setIsLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('accounts')
        .delete()
        .eq('id', selectedAccount.id);

      if (error) throw error;

      setAccounts(accounts.filter((a) => a.id !== selectedAccount.id));
      setIsDeleteDialogOpen(false);
      setSelectedAccount(null);
      router.refresh();
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (account: Account) => {
    setSelectedAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      currency: account.currency,
      initial_balance: account.initial_balance.toString(),
      institution_name: account.institution_name || '',
      account_number_last4: account.account_number_last4 || '',
      color: account.color || accountTypeColors[account.type],
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'checking',
      currency: 'USD',
      initial_balance: '0',
      institution_name: '',
      account_number_last4: '',
      color: accountTypeColors.checking,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">
            Manage your bank accounts, credit cards, and investments
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalAssets)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {accounts.filter((a) => ['checking', 'savings', 'cash', 'investment'].includes(a.type) && a.is_active).length} accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalLiabilities)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {accounts.filter((a) => ['credit_card', 'loan'].includes(a.type) && a.is_active).length} accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Worth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', netWorth >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatCurrency(netWorth)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {accounts.filter((a) => a.is_active).length} total accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts by Type */}
      {Object.entries(groupedAccounts).map(([type, typeAccounts]) => {
        const Icon = accountTypeIcons[type as AccountType];
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-4">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">{accountTypeLabels[type as AccountType]}</h2>
              <Badge variant="secondary">{typeAccounts.length}</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {typeAccounts.map((account) => {
                const AccountIcon = accountTypeIcons[account.type];
                return (
                  <Card key={account.id} className={cn(!account.is_active && 'opacity-60')}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${account.color || accountTypeColors[account.type]}20` }}
                          >
                            <AccountIcon
                              className="h-5 w-5"
                              style={{ color: account.color || accountTypeColors[account.type] }}
                            />
                          </div>
                          <div>
                            <CardTitle className="text-base">{account.name}</CardTitle>
                            {account.institution_name && (
                              <CardDescription className="text-xs">
                                {account.institution_name}
                                {account.account_number_last4 && ` •••• ${account.account_number_last4}`}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Transactions
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(account)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Account
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Reconcile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedAccount(account);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
                          <p
                            className={cn(
                              'text-2xl font-bold',
                              account.current_balance >= 0 ? 'text-green-600' : 'text-red-600'
                            )}
                          >
                            {formatCurrency(account.current_balance)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Initial Balance</span>
                          <span className="font-medium">{formatCurrency(account.initial_balance)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Change</span>
                          <span
                            className={cn(
                              'font-medium flex items-center gap-1',
                              account.current_balance - account.initial_balance >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            )}
                          >
                            {account.current_balance - account.initial_balance >= 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3 rotate-90" />
                            )}
                            {formatCurrency(Math.abs(account.current_balance - account.initial_balance))}
                          </span>
                        </div>
                        {!account.is_active && (
                          <Badge variant="secondary" className="w-full justify-center">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {accounts.length === 0 && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No accounts yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first account
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Account Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Add a new bank account, credit card, or investment account to track
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Account Name</Label>
              <Input
                id="name"
                placeholder="e.g., Chase Checking"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Account Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as AccountType, color: accountTypeColors[value as AccountType] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(accountTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="initial_balance">Initial Balance</Label>
                <Input
                  id="initial_balance"
                  type="number"
                  step="0.01"
                  value={formData.initial_balance}
                  onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="institution">Institution (Optional)</Label>
              <Input
                id="institution"
                placeholder="e.g., Chase Bank"
                value={formData.institution_name}
                onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last4">Last 4 Digits (Optional)</Label>
              <Input
                id="last4"
                placeholder="1234"
                maxLength={4}
                value={formData.account_number_last4}
                onChange={(e) => setFormData({ ...formData, account_number_last4: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleAddAccount} disabled={isLoading || !formData.name}>
              {isLoading ? 'Adding...' : 'Add Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update your account information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Account Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Account Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as AccountType, color: accountTypeColors[value as AccountType] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(accountTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-institution">Institution</Label>
              <Input
                id="edit-institution"
                value={formData.institution_name}
                onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-last4">Last 4 Digits</Label>
              <Input
                id="edit-last4"
                maxLength={4}
                value={formData.account_number_last4}
                onChange={(e) => setFormData({ ...formData, account_number_last4: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleEditAccount} disabled={isLoading || !formData.name}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedAccount?.name}&quot;? This action cannot be undone and will
              also delete all associated transactions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
