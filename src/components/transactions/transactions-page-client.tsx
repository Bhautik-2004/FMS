'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/contexts/currency-context';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  flexRender,
} from '@tanstack/react-table';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Transaction, Account, Category, TransactionType, PaymentMethod } from '@/lib/supabase/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import * as Icons from 'lucide-react';
import {
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  X,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
} from 'lucide-react';

interface TransactionsPageClientProps {
  initialTransactions: any[];
  accounts: Account[];
  categories: Category[];
  tags: string[];
}

type DateRangePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

interface Filters {
  search: string;
  dateRange: { from: Date | null; to: Date | null };
  datePreset: DateRangePreset;
  accountIds: string[];
  categoryIds: string[];
  types: TransactionType[];
  amountRange: { min: number | null; max: number | null };
  tags: string[];
  paymentMethods: PaymentMethod[];
}

export function TransactionsPageClient({
  initialTransactions,
  accounts,
  categories,
  tags: availableTags,
}: TransactionsPageClientProps) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<any[]>(initialTransactions || []);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [bulkAction, setBulkAction] = useState<'delete' | 'categorize' | 'tag' | 'account' | null>(null);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    dateRange: { from: null, to: null },
    datePreset: 'thisMonth',
    accountIds: [],
    categoryIds: [],
    types: [],
    amountRange: { min: null, max: null },
    tags: [],
    paymentMethods: [],
  });

  // Form state for add/edit
  const [formData, setFormData] = useState({
    account_id: '',
    type: 'expense' as TransactionType,
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    category_id: '',
    merchant_name: '',
    payment_method: 'card' as PaymentMethod,
    notes: '',
    tags: [] as string[],
    location: '',
  });

  // Bulk action form
  const [bulkFormData, setBulkFormData] = useState({
    category_id: '',
    account_id: '',
    tags: [] as string[],
  });

  const supabase = createClient();

  // Apply date preset
  useEffect(() => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;

    switch (filters.datePreset) {
      case 'today':
        from = startOfDay(now);
        to = endOfDay(now);
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        from = startOfDay(yesterday);
        to = endOfDay(yesterday);
        break;
      case 'thisWeek':
        from = startOfWeek(now, { weekStartsOn: 1 });
        to = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'lastWeek':
        const lastWeek = subWeeks(now, 1);
        from = startOfWeek(lastWeek, { weekStartsOn: 1 });
        to = endOfWeek(lastWeek, { weekStartsOn: 1 });
        break;
      case 'thisMonth':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
      case 'custom':
        // Keep current custom range
        return;
    }

    if (from && to) {
      setFilters(prev => ({ ...prev, dateRange: { from, to } }));
    }
  }, [filters.datePreset]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(transaction => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          transaction.description?.toLowerCase().includes(searchLower) ||
          transaction.merchant_name?.toLowerCase().includes(searchLower) ||
          transaction.notes?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Date range filter
      if (filters.dateRange.from && filters.dateRange.to) {
        const transactionDate = new Date(transaction.date);
        if (transactionDate < filters.dateRange.from || transactionDate > filters.dateRange.to) {
          return false;
        }
      }

      // Account filter
      if (filters.accountIds.length > 0 && !filters.accountIds.includes(transaction.account_id)) {
        return false;
      }

      // Category filter
      if (filters.categoryIds.length > 0 && !filters.categoryIds.includes(transaction.category_id)) {
        return false;
      }

      // Type filter
      if (filters.types.length > 0 && !filters.types.includes(transaction.type)) {
        return false;
      }

      // Amount range filter
      if (filters.amountRange.min !== null && transaction.amount < filters.amountRange.min) {
        return false;
      }
      if (filters.amountRange.max !== null && transaction.amount > filters.amountRange.max) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = transaction.tags?.some((tag: string) => filters.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Payment method filter
      if (filters.paymentMethods.length > 0 && !filters.paymentMethods.includes(transaction.payment_method)) {
        return false;
      }

      return true;
    });
  }, [transactions, filters]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    return {
      income,
      expenses,
      net: income - expenses,
      count: filteredTransactions.length,
      average: filteredTransactions.length > 0 
        ? (income + expenses) / filteredTransactions.length 
        : 0,
    };
  }, [filteredTransactions]);

  // Get icon component
  const getIcon = (iconName?: string) => {
    if (!iconName) return Icons.DollarSign;
    return (Icons as any)[iconName] || Icons.DollarSign;
  };

  // Define table columns
  const columns: ColumnDef<any>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'date',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => format(new Date(row.getValue('date')), 'MMM dd, yyyy'),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{transaction.description}</span>
            {transaction.merchant_name && (
              <span className="text-sm text-muted-foreground">{transaction.merchant_name}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const category = row.original.category;
        if (!category) return <span className="text-muted-foreground">Uncategorized</span>;
        
        const IconComponent = getIcon(category.icon);
        return (
          <Badge
            variant="secondary"
            style={{ backgroundColor: category.color + '20', color: category.color }}
          >
            <IconComponent className="mr-1 h-3 w-3" />
            {category.name}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'account',
      header: 'Account',
      cell: ({ row }) => {
        const account = row.original.account;
        return <span className="text-sm">{account?.name || 'Unknown'}</span>;
      },
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="w-full justify-end"
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const transaction = row.original;
        const amount = parseFloat(transaction.amount);
        const isIncome = transaction.type === 'income';
        
        return (
          <div className={`text-right font-medium ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
            {isIncome ? '+' : '-'}{formatCurrency(amount)}
          </div>
        );
      },
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => {
        const tags = row.original.tags || [];
        if (tags.length === 0) return null;
        
        return (
          <div className="flex gap-1 flex-wrap">
            {tags.slice(0, 2).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const transaction = row.original;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openViewDialog(transaction)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditDialog(transaction)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDuplicate(transaction)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => openDeleteDialog(transaction)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Initialize table
  const table = useReactTable({
    data: filteredTransactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  // Calculate selected transactions summary
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedSummary = useMemo(() => {
    if (selectedRows.length === 0) {
      return null;
    }

    const summary = {
      count: selectedRows.length,
      income: 0,
      expense: 0,
      transfer: 0,
      netAmount: 0,
    };

    selectedRows.forEach((row) => {
      const transaction = row.original;
      const amount = transaction.amount || 0;

      if (transaction.type === 'income') {
        summary.income += amount;
        summary.netAmount += amount;
      } else if (transaction.type === 'expense') {
        summary.expense += amount;
        summary.netAmount -= amount;
      } else if (transaction.type === 'transfer') {
        summary.transfer += amount;
      }
    });

    return summary;
  }, [selectedRows]);

  // Handle add transaction
  const handleAddTransaction = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First, insert the transaction without joins
      const { data, error } = await (supabase as any)
        .from('transactions')
        .insert([{
          user_id: user.id,
          ...formData,
          amount: parseFloat(formData.amount),
          tags: formData.tags.length > 0 ? formData.tags : null,
        }])
        .select()
        .single();

      if (error) throw error;

      // Then fetch account and category info separately
      const account = accounts.find((a: Account) => a.id === data.account_id);
      const category = categories.find((c: Category) => c.id === data.category_id);

      // Merge the data
      const enrichedData = {
        ...data,
        account: account ? { name: account.name, type: account.type } : null,
        category: category ? { name: category.name, color: category.color, icon: category.icon } : null,
      };

      setTransactions([enrichedData, ...(transactions || [])]);
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('Transaction added successfully');
      router.refresh();
    } catch (error: any) {

      toast.error(error.message || 'Failed to add transaction');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit transaction
  const handleEditTransaction = async () => {
    if (!selectedTransaction) return;
    setIsLoading(true);
    try {
      // Update without joins
      const { data, error } = await (supabase as any)
        .from('transactions')
        .update({
          ...formData,
          amount: parseFloat(formData.amount),
          tags: formData.tags.length > 0 ? formData.tags : null,
        })
        .eq('id', selectedTransaction.id)
        .select()
        .single();

      if (error) throw error;

      // Fetch related data
      const account = accounts.find((a: Account) => a.id === data.account_id);
      const category = categories.find((c: Category) => c.id === data.category_id);

      // Merge the data
      const enrichedData = {
        ...data,
        account: account ? { name: account.name, type: account.type } : null,
        category: category ? { name: category.name, color: category.color, icon: category.icon } : null,
      };

      setTransactions((transactions || []).map(t => t.id === data.id ? enrichedData : t));
      setIsEditDialogOpen(false);
      setSelectedTransaction(null);
      resetForm();
      toast.success('Transaction updated successfully');
      router.refresh();
    } catch (error: any) {

      toast.error(error.message || 'Failed to update transaction');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete transaction
  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return;
    setIsLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('transactions')
        .delete()
        .eq('id', selectedTransaction.id);

      if (error) throw error;

      setTransactions((transactions || []).filter(t => t.id !== selectedTransaction.id));
      setIsDeleteDialogOpen(false);
      setSelectedTransaction(null);
      router.refresh();
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  // Handle duplicate
  const handleDuplicate = (transaction: any) => {
    setFormData({
      account_id: transaction.account_id,
      type: transaction.type,
      amount: transaction.amount,
      description: `${transaction.description} (Copy)`,
      date: format(new Date(), 'yyyy-MM-dd'),
      category_id: transaction.category_id || '',
      merchant_name: transaction.merchant_name || '',
      payment_method: transaction.payment_method || 'card',
      notes: transaction.notes || '',
      tags: transaction.tags || [],
      location: transaction.location || '',
    });
    setIsAddDialogOpen(true);
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const ids = selectedRows.map(row => row.original.id);
    
    setIsLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('transactions')
        .delete()
        .in('id', ids);

      if (error) throw error;

      setTransactions((transactions || []).filter(t => !ids.includes(t.id)));
      setRowSelection({});
      setIsBulkActionDialogOpen(false);
      router.refresh();
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  // Handle bulk categorize
  const handleBulkCategorize = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const ids = selectedRows.map(row => row.original.id);
    
    setIsLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('transactions')
        .update({ category_id: bulkFormData.category_id })
        .in('id', ids);

      if (error) throw error;

      // Refresh transactions
      const { data } = await (supabase as any)
        .from('transactions')
        .select(`
          *,
          account:accounts(name, type),
          category:categories(name, color, icon)
        `)
        .in('id', ids);

      if (data) {
        setTransactions((transactions || []).map(t => {
          const updated = data.find((d: any) => d.id === t.id);
          return updated || t;
        }));
      }

      setRowSelection({});
      setIsBulkActionDialogOpen(false);
      setBulkFormData({ category_id: '', account_id: '', tags: [] });
      router.refresh();
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  // Handle bulk tag
  const handleBulkTag = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const ids = selectedRows.map(row => row.original.id);
    
    setIsLoading(true);
    try {
      // Get existing tags and merge
      const updates = selectedRows.map(row => {
        const existingTags = row.original.tags || [];
        const newTags = Array.from(new Set([...existingTags, ...bulkFormData.tags]));
        return {
          id: row.original.id,
          tags: newTags,
        };
      });

      for (const update of updates) {
        await (supabase as any)
          .from('transactions')
          .update({ tags: update.tags })
          .eq('id', update.id);
      }

      // Refresh
      router.refresh();
      setRowSelection({});
      setIsBulkActionDialogOpen(false);
      setBulkFormData({ category_id: '', account_id: '', tags: [] });
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  // Handle bulk account change
  const handleBulkAccountChange = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const ids = selectedRows.map(row => row.original.id);
    
    setIsLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('transactions')
        .update({ account_id: bulkFormData.account_id })
        .in('id', ids);

      if (error) throw error;

      router.refresh();
      setRowSelection({});
      setIsBulkActionDialogOpen(false);
      setBulkFormData({ category_id: '', account_id: '', tags: [] });
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  // Dialog helpers
  const openViewDialog = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (transaction: any) => {
    setSelectedTransaction(transaction);
    setFormData({
      account_id: transaction.account_id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      date: transaction.date,
      category_id: transaction.category_id || '',
      merchant_name: transaction.merchant_name || '',
      payment_method: transaction.payment_method || 'card',
      notes: transaction.notes || '',
      tags: transaction.tags || [],
      location: transaction.location || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };

  const openBulkActionDialog = (action: 'delete' | 'categorize' | 'tag' | 'account') => {
    setBulkAction(action);
    setIsBulkActionDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      account_id: '',
      type: 'expense',
      amount: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      category_id: '',
      merchant_name: '',
      payment_method: 'card',
      notes: '',
      tags: [],
      location: '',
    });
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: '',
      dateRange: { from: null, to: null },
      datePreset: 'thisMonth',
      accountIds: [],
      categoryIds: [],
      types: [],
      amountRange: { min: null, max: null },
      tags: [],
      paymentMethods: [],
    });
  };

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            Manage and track your financial transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {showFilters && <ChevronUp className="ml-2 h-4 w-4" />}
            {!showFilters && <ChevronDown className="ml-2 h-4 w-4" />}
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.income)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.expenses)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.net)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Icons.List className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average</CardTitle>
            <Icons.BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.average)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Filters</CardTitle>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="grid gap-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-input"
                  placeholder="Search description, merchant, notes..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Date Range Preset */}
            <div className="grid gap-2">
              <Label>Date Range</Label>
              <div className="grid grid-cols-7 gap-2">
                {(['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'custom'] as DateRangePreset[]).map(preset => (
                  <Button
                    key={preset}
                    variant={filters.datePreset === preset ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilters({ ...filters, datePreset: preset })}
                    className="capitalize"
                  >
                    {preset === 'thisWeek' ? 'This Week' :
                     preset === 'lastWeek' ? 'Last Week' :
                     preset === 'thisMonth' ? 'This Month' :
                     preset === 'lastMonth' ? 'Last Month' :
                     preset}
                  </Button>
                ))}
              </div>
              
              {/* Custom Date Range Picker */}
              {filters.datePreset === 'custom' && (
                <div className="mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          !filters.dateRange.from && !filters.dateRange.to && 'text-muted-foreground'
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange.from ? (
                          filters.dateRange.to ? (
                            <>
                              {format(filters.dateRange.from, 'LLL dd, y')} -{' '}
                              {format(filters.dateRange.to, 'LLL dd, y')}
                            </>
                          ) : (
                            format(filters.dateRange.from, 'LLL dd, y')
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={filters.dateRange.from ?? undefined}
                        selected={{
                          from: filters.dateRange.from ?? undefined,
                          to: filters.dateRange.to ?? undefined,
                        }}
                        onSelect={(range) => {
                          setFilters({
                            ...filters,
                            dateRange: {
                              from: range?.from ?? null,
                              to: range?.to ?? null,
                            },
                          });
                        }}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              
              {filters.dateRange.from && filters.dateRange.to && filters.datePreset !== 'custom' && (
                <p className="text-sm text-muted-foreground">
                  {format(filters.dateRange.from, 'MMM dd, yyyy')} - {format(filters.dateRange.to, 'MMM dd, yyyy')}
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Account Filter */}
              <div className="grid gap-2">
                <Label>Accounts</Label>
                <Select
                  value={filters.accountIds[0] || '__all__'}
                  onValueChange={(value) => {
                    if (value === '__all__') {
                      setFilters({ ...filters, accountIds: [] });
                    } else {
                      setFilters({ ...filters, accountIds: [value] });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Accounts</SelectItem>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="grid gap-2">
                <Label>Categories</Label>
                <Select
                  value={filters.categoryIds[0] || '__all__'}
                  onValueChange={(value) => {
                    if (value === '__all__') {
                      setFilters({ ...filters, categoryIds: [] });
                    } else {
                      setFilters({ ...filters, categoryIds: [value] });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type Filter */}
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={filters.types[0] || '__all__'}
                  onValueChange={(value) => {
                    if (value === '__all__') {
                      setFilters({ ...filters, types: [] });
                    } else {
                      setFilters({ ...filters, types: [value as TransactionType] });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Amount Range */}
            <div className="grid gap-2">
              <Label>Amount Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.amountRange.min || ''}
                  onChange={(e) => setFilters({
                    ...filters,
                    amountRange: { ...filters.amountRange, min: e.target.value ? parseFloat(e.target.value) : null }
                  })}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.amountRange.max || ''}
                  onChange={(e) => setFilters({
                    ...filters,
                    amountRange: { ...filters.amountRange, max: e.target.value ? parseFloat(e.target.value) : null }
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">{selectedCount} selected</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openBulkActionDialog('categorize')}>
                Categorize
              </Button>
              <Button variant="outline" size="sm" onClick={() => openBulkActionDialog('tag')}>
                Add Tags
              </Button>
              <Button variant="outline" size="sm" onClick={() => openBulkActionDialog('account')}>
                Change Account
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => openBulkActionDialog('delete')}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Sticky Selection Summary Footer */}
            {selectedSummary && (
              <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Selected:</span>
                      <Badge variant="secondary" className="font-semibold">
                        {selectedSummary.count} {selectedSummary.count === 1 ? 'item' : 'items'}
                      </Badge>
                    </div>
                    
                    {selectedSummary.income > 0 && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-muted-foreground">Income:</span>
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(selectedSummary.income)}
                        </span>
                      </div>
                    )}

                    {selectedSummary.expense > 0 && (
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-muted-foreground">Expense:</span>
                        <span className="text-sm font-semibold text-red-600">
                          {formatCurrency(selectedSummary.expense)}
                        </span>
                      </div>
                    )}

                    {selectedSummary.transfer > 0 && (
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-muted-foreground">Transfer:</span>
                        <span className="text-sm font-semibold text-blue-600">
                          {formatCurrency(selectedSummary.transfer)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <Separator orientation="vertical" className="h-8" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Net Amount:</span>
                      <span
                        className={`text-lg font-bold ${
                          selectedSummary.netAmount > 0
                            ? 'text-green-600'
                            : selectedSummary.netAmount < 0
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {selectedSummary.netAmount > 0 ? '+' : ''}
                        {formatCurrency(selectedSummary.netAmount)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => table.resetRowSelection()}
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredTransactions.length)} of{' '}
                {filteredTransactions.length} transactions
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={table.getState().pagination.pageSize.toString()}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedTransaction(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
            <DialogDescription>
              {isEditDialogOpen ? 'Update transaction details' : 'Create a new transaction'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={formData.type} onValueChange={(value: TransactionType) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Description *</Label>
              <Input
                placeholder="e.g., Grocery shopping"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Account *</Label>
                <Select value={formData.account_id} onValueChange={(value) => setFormData({ ...formData, account_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${!formData.date && 'text-muted-foreground'}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(new Date(formData.date), 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.date ? new Date(formData.date) : undefined}
                      onSelect={(date) => setFormData({ ...formData, date: date ? format(date, 'yyyy-MM-dd') : '' })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Payment Method</Label>
                <Select value={formData.payment_method} onValueChange={(value: PaymentMethod) => setFormData({ ...formData, payment_method: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Merchant</Label>
              <Input
                placeholder="e.g., Walmart"
                value={formData.merchant_name}
                onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>Location</Label>
              <Input
                placeholder="e.g., New York, NY"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditDialogOpen ? handleEditTransaction : handleAddTransaction}
              disabled={isLoading || !formData.description || !formData.amount || !formData.account_id}
            >
              {isLoading ? 'Saving...' : isEditDialogOpen ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTransaction} disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{format(new Date(selectedTransaction.date), 'MMMM dd, yyyy')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium capitalize">{selectedTransaction.type}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="font-medium">{selectedTransaction.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className={`text-2xl font-bold ${selectedTransaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedTransaction.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(selectedTransaction.amount))}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p className="font-medium capitalize">{selectedTransaction.payment_method || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Account</Label>
                  <p className="font-medium">{selectedTransaction.account?.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  {selectedTransaction.category ? (
                    <Badge
                      variant="secondary"
                      style={{ backgroundColor: selectedTransaction.category.color + '20', color: selectedTransaction.category.color }}
                    >
                      {selectedTransaction.category.name}
                    </Badge>
                  ) : (
                    <p className="text-muted-foreground">Uncategorized</p>
                  )}
                </div>
              </div>

              {selectedTransaction.merchant_name && (
                <div>
                  <Label className="text-muted-foreground">Merchant</Label>
                  <p className="font-medium">{selectedTransaction.merchant_name}</p>
                </div>
              )}

              {selectedTransaction.location && (
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <p className="font-medium">{selectedTransaction.location}</p>
                </div>
              )}

              {selectedTransaction.tags && selectedTransaction.tags.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Tags</Label>
                  <div className="flex gap-2 mt-1">
                    {selectedTransaction.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedTransaction.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="font-medium whitespace-pre-wrap">{selectedTransaction.notes}</p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p>{format(new Date(selectedTransaction.created_at), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Updated</Label>
                  <p>{format(new Date(selectedTransaction.updated_at), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewDialogOpen(false);
              if (selectedTransaction) openEditDialog(selectedTransaction);
            }}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={isBulkActionDialogOpen} onOpenChange={setIsBulkActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'delete' && 'Bulk Delete'}
              {bulkAction === 'categorize' && 'Bulk Categorize'}
              {bulkAction === 'tag' && 'Bulk Add Tags'}
              {bulkAction === 'account' && 'Bulk Change Account'}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'delete' && `Delete ${selectedCount} transactions? This cannot be undone.`}
              {bulkAction === 'categorize' && `Assign a category to ${selectedCount} transactions`}
              {bulkAction === 'tag' && `Add tags to ${selectedCount} transactions`}
              {bulkAction === 'account' && `Change account for ${selectedCount} transactions`}
            </DialogDescription>
          </DialogHeader>

          {bulkAction === 'categorize' && (
            <div className="grid gap-2 py-4">
              <Label>Category</Label>
              <Select
                value={bulkFormData.category_id}
                onValueChange={(value) => setBulkFormData({ ...bulkFormData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {bulkAction === 'account' && (
            <div className="grid gap-2 py-4">
              <Label>Account</Label>
              <Select
                value={bulkFormData.account_id}
                onValueChange={(value) => setBulkFormData({ ...bulkFormData, account_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {bulkAction === 'tag' && (
            <div className="grid gap-2 py-4">
              <Label>Tags (comma-separated)</Label>
              <Input
                placeholder="e.g., vacation, business, important"
                value={bulkFormData.tags.join(', ')}
                onChange={(e) => setBulkFormData({
                  ...bulkFormData,
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                })}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={bulkAction === 'delete' ? 'destructive' : 'default'}
              onClick={() => {
                if (bulkAction === 'delete') handleBulkDelete();
                else if (bulkAction === 'categorize') handleBulkCategorize();
                else if (bulkAction === 'tag') handleBulkTag();
                else if (bulkAction === 'account') handleBulkAccountChange();
              }}
              disabled={isLoading || (bulkAction === 'categorize' && !bulkFormData.category_id) || (bulkAction === 'account' && !bulkFormData.account_id)}
            >
              {isLoading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
