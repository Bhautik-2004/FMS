'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Account, Category, TransactionType, PaymentMethod } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  Upload,
  Calculator,
  MapPin,
  Calendar as CalendarIcon,
  Split,
  Repeat,
  FileText,
  Trash2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  ChevronDown,
} from 'lucide-react';
import dynamic from 'next/dynamic';

interface AddTransactionFormProps {
  accounts: Account[];
  categories: Category[];
  merchants: string[];
  descriptions: string[];
  tags: string[];
}

// Validation schema
const transactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.string().min(1, 'Amount is required').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    'Amount must be greater than 0'
  ),
  currency: z.string(),
  date: z.string().min(1, 'Date is required'),
  account_id: z.string().min(1, 'Account is required'),
  description: z.string().min(1, 'Description is required'),
  category_id: z.string().optional(),
  merchant_name: z.string().optional(),
  payment_method: z.enum(['cash', 'card', 'bank_transfer', 'upi', 'other']).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
  
  // Split transaction
  is_split: z.boolean(),
  splits: z.array(z.object({
    category_id: z.string().min(1, 'Category is required'),
    amount: z.string().min(1, 'Amount is required'),
    notes: z.string().optional(),
  })).optional(),
  
  // Recurring
  is_recurring: z.boolean(),
  recurring_frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']).optional(),
  recurring_end_date: z.string().optional(),
  recurring_count: z.string().optional(),
}).refine((data) => {
  // Validate splits total if split transaction
  if (data.is_split && data.splits && data.splits.length > 0) {
    const total = data.splits.reduce((sum, split) => sum + parseFloat(split.amount || '0'), 0);
    const amount = parseFloat(data.amount);
    return Math.abs(total - amount) < 0.01; // Allow for floating point errors
  }
  return true;
}, {
  message: 'Split amounts must equal transaction amount',
  path: ['splits'],
});

type TransactionFormData = z.infer<typeof transactionSchema>;

const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'CAD', 'AUD'];

const frequencies = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly (Every 2 weeks)' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly (Every 3 months)' },
  { value: 'yearly', label: 'Yearly' },
];

export function AddTransactionForm({
  accounts,
  categories,
  merchants,
  descriptions,
  tags: availableTags,
}: AddTransactionFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  const supabase = createClient();

  // All hooks must be called before any conditional returns
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      amount: '',
      currency: 'USD',
      date: format(new Date(), 'yyyy-MM-dd'),
      account_id: '',
      description: '',
      category_id: '',
      merchant_name: '',
      payment_method: 'card',
      tags: [],
      notes: '',
      location: '',
      is_split: false,
      splits: [],
      is_recurring: false,
      recurring_frequency: 'monthly',
    },
  });

  const { fields: splitFields, append: appendSplit, remove: removeSplit } = useFieldArray({
    control,
    name: 'splits',
  });

  // All watch calls must be before conditional returns
  const transactionType = watch('type');
  const isSplit = watch('is_split');
  const isRecurring = watch('is_recurring');
  const amount = watch('amount');
  const selectedCategoryId = watch('category_id');

  // Load draft - must be before conditional return
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const draft = localStorage.getItem('transaction_draft');
      if (draft) {
        try {
          const data = JSON.parse(draft);
          Object.keys(data).forEach((key) => {
            setValue(key as any, data[key]);
          });
          if (data.tags) setSelectedTags(data.tags);
          toast.info('Draft loaded');
        } catch (error) {

        }
      }
    }
  }, [setValue]);

  // Fix hydration by ensuring client-only rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render until mounted to prevent hydration errors
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  // Get subcategories based on selected category
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const subcategories = categories.filter(c => c.parent_category_id === selectedCategoryId);

  // Filter categories by type
  const filteredCategories = categories.filter(c => {
    if (!c.parent_category_id) { // Only show parent categories
      if (transactionType === 'income') return c.type === 'income' || c.type === 'both';
      if (transactionType === 'expense') return c.type === 'expense' || c.type === 'both';
      return true;
    }
    return false;
  });

  // Get icon component - only after mount to prevent hydration errors
  const getIcon = (iconName?: string | null) => {
    if (!isMounted || !iconName) return null;
    return (Icons as any)[iconName] || Icons.DollarSign;
  };

  // Calculator operations
  const handleCalculator = (value: string) => {
    try {
      if (value === 'C') {
        setCalculatorValue('');
        return;
      }
      if (value === '=') {
        const result = eval(calculatorValue);
        setValue('amount', result.toString());
        setCalculatorValue('');
        setShowCalculator(false);
        return;
      }
      setCalculatorValue(prev => prev + value);
    } catch (error) {
      toast.error('Invalid calculation');
    }
  };

  // Handle tag addition
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      const newTags = [...selectedTags, trimmedTag];
      setSelectedTags(newTags);
      setValue('tags', newTags);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    const newTags = selectedTags.filter(t => t !== tag);
    setSelectedTags(newTags);
    setValue('tags', newTags);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate split remaining
  const calculateSplitRemaining = () => {
    const total = parseFloat(amount || '0');
    const splitsTotal = splitFields.reduce((sum, _, index) => {
      const splitAmount = watch(`splits.${index}.amount`);
      return sum + parseFloat(splitAmount || '0');
    }, 0);
    return total - splitsTotal;
  };

  // Add split
  const handleAddSplit = () => {
    const remaining = calculateSplitRemaining();
    appendSplit({
      category_id: '',
      amount: remaining > 0 ? remaining.toFixed(2) : '0',
      notes: '',
    });
  };

  // Calculate next recurring date
  const calculateNextDate = (startDate: string, frequency: string) => {
    const date = new Date(startDate);
    switch (frequency) {
      case 'daily': return format(addDays(date, 1), 'yyyy-MM-dd');
      case 'weekly': return format(addWeeks(date, 1), 'yyyy-MM-dd');
      case 'biweekly': return format(addWeeks(date, 2), 'yyyy-MM-dd');
      case 'monthly': return format(addMonths(date, 1), 'yyyy-MM-dd');
      case 'quarterly': return format(addMonths(date, 3), 'yyyy-MM-dd');
      case 'yearly': return format(addYears(date, 1), 'yyyy-MM-dd');
      default: return startDate;
    }
  };

  // Use current location
  const useCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // In production, you would use a geocoding API here
            setValue('location', `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
            toast.success('Location added');
          } catch (error) {
            toast.error('Failed to get location name');
          }
        },
        (error) => {
          toast.error('Failed to get location');
        }
      );
    } else {
      toast.error('Geolocation is not supported');
    }
  };

  // Submit form
  const onSubmit = async (data: TransactionFormData) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        setIsLoading(false);
        return;
      }

      // Upload files if any (simplified - in production, upload to storage)
      let receiptUrl = null;
      if (uploadedFiles.length > 0) {
        // TODO: Implement file upload to Supabase Storage
        toast.info('File upload feature coming soon');
      }

      // Create main transaction
      const transactionData = {
        user_id: user.id,
        type: data.type,
        amount: parseFloat(data.amount),
        currency: data.currency,
        date: data.date,
        account_id: data.account_id,
        description: data.description,
        category_id: data.category_id || null,
        merchant_name: data.merchant_name || null,
        payment_method: data.payment_method || null,
        tags: data.tags && data.tags.length > 0 ? data.tags : null,
        notes: data.notes || null,
        location: data.location || null,
        is_recurring: data.is_recurring,
        receipt_url: receiptUrl,
      };

      const { data: transaction, error: transactionError } = await (supabase as any)
        .from('transactions')
        .insert([transactionData])
        .select()
        .single();

      if (transactionError) {

        toast.error(`Failed to add transaction: ${transactionError.message}`);
        throw transactionError;
      }

      if (!transaction) {

        toast.error('Failed to add transaction: No data returned');
        throw new Error('No transaction data returned');
      }

      // Handle splits if enabled
      if (data.is_split && data.splits && data.splits.length > 0) {
        const splitsData = data.splits.map(split => ({
          transaction_id: transaction.id,
          category_id: split.category_id,
          amount: parseFloat(split.amount),
          notes: split.notes || null,
        }));

        const { error: splitsError } = await (supabase as any)
          .from('transaction_splits')
          .insert(splitsData);

        if (splitsError) {

          toast.error(`Failed to add splits: ${splitsError.message}`);
          throw splitsError;
        }
      }

      // Handle recurring if enabled
      if (data.is_recurring) {
        const recurringId = transaction.id;

        const { error: recurringError } = await (supabase as any)
          .from('transactions')
          .update({ recurring_id: recurringId })
          .eq('id', transaction.id);

        if (recurringError) {

          toast.error(`Failed to set recurring: ${recurringError.message}`);
          throw recurringError;
        }
      }

      toast.success('Transaction added successfully!', {
        action: {
          label: 'Undo',
          onClick: async () => {
            await (supabase as any)
              .from('transactions')
              .delete()
              .eq('id', transaction.id);
            toast.success('Transaction deleted');
          },
        },
      });

      // Reset form and redirect
      reset();
      setSelectedTags([]);
      setUploadedFiles([]);
      router.push('/transactions');
      router.refresh();
    } catch (error: any) {

      toast.error(error.message || 'Failed to add transaction');
    } finally {
      setIsLoading(false);
    }
  };

  // Save as draft
  const saveDraft = () => {
    const formData = watch();
    localStorage.setItem('transaction_draft', JSON.stringify(formData));
    toast.success('Draft saved');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add Transaction</h1>
            <p className="text-muted-foreground">Create a new financial transaction</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={saveDraft}>
            <FileText className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Transaction'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Details</CardTitle>
              <CardDescription>Essential transaction information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Type Selector */}
              <div className="grid gap-2">
                <Label>Transaction Type *</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={transactionType === 'income' ? 'default' : 'outline'}
                    className="h-20 flex flex-col gap-2"
                    onClick={() => setValue('type', 'income')}
                  >
                    <TrendingUp className="h-6 w-6" />
                    <span>Income</span>
                  </Button>
                  <Button
                    type="button"
                    variant={transactionType === 'expense' ? 'default' : 'outline'}
                    className="h-20 flex flex-col gap-2"
                    onClick={() => setValue('type', 'expense')}
                  >
                    <TrendingDown className="h-6 w-6" />
                    <span>Expense</span>
                  </Button>
                  <Button
                    type="button"
                    variant={transactionType === 'transfer' ? 'default' : 'outline'}
                    className="h-20 flex flex-col gap-2"
                    onClick={() => setValue('type', 'transfer')}
                  >
                    <ArrowRightLeft className="h-6 w-6" />
                    <span>Transfer</span>
                  </Button>
                </div>
                {errors.type && (
                  <p className="text-sm text-red-600">{errors.type.message}</p>
                )}
              </div>

              {/* Amount */}
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="text-2xl font-bold h-14 pl-10"
                      {...register('amount')}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-14 w-14"
                    onClick={() => setShowCalculator(!showCalculator)}
                  >
                    <Calculator className="h-5 w-5" />
                  </Button>
                </div>
                {errors.amount && (
                  <p className="text-sm text-red-600">{errors.amount.message}</p>
                )}

                {/* Simple Calculator */}
                {showCalculator && (
                  <Card className="p-4">
                    <div className="space-y-2">
                      <Input
                        value={calculatorValue}
                        onChange={(e) => setCalculatorValue(e.target.value)}
                        placeholder="Enter calculation"
                        className="text-right font-mono"
                      />
                      <div className="grid grid-cols-4 gap-2">
                        {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+'].map(btn => (
                          <Button
                            key={btn}
                            type="button"
                            variant="outline"
                            onClick={() => handleCalculator(btn)}
                          >
                            {btn}
                          </Button>
                        ))}
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => handleCalculator('C')}
                          className="col-span-4"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Currency & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Controller
                    name="currency"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map(currency => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="date">Date *</Label>
                  <Controller
                    name="date"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!field.value && 'text-muted-foreground'}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(new Date(field.value), 'PPP') : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.date && (
                    <p className="text-sm text-red-600">{errors.date.message}</p>
                  )}
                </div>
              </div>

              {/* Account */}
              <div className="grid gap-2">
                <Label htmlFor="account">Account *</Label>
                <Controller
                  name="account_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.account_id && (
                  <p className="text-sm text-red-600">{errors.account_id.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  placeholder="e.g., Grocery shopping"
                  list="descriptions"
                  {...register('description')}
                />
                <datalist id="descriptions">
                  {descriptions.map(desc => (
                    <option key={desc} value={desc} />
                  ))}
                </datalist>
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Advanced Details</CardTitle>
                  <CardDescription>Optional transaction information</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Hide' : 'Show'}
                  <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            {showAdvanced && (
              <CardContent className="space-y-4">
                {/* Category */}
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Controller
                    name="category_id"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredCategories.map(category => {
                            const IconComponent = getIcon(category.icon);
                            return (
                              <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center gap-2">
                                  {IconComponent && <IconComponent className="h-4 w-4" style={{ color: category.color || undefined }} />}
                                  {category.name}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Subcategory (if parent selected) */}
                {subcategories.length > 0 && (
                  <div className="grid gap-2">
                    <Label>Subcategory</Label>
                    <Controller
                      name="category_id"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select subcategory" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={selectedCategoryId || ''}>
                              {selectedCategory?.name} (All)
                            </SelectItem>
                            {subcategories.map(category => {
                              const IconComponent = getIcon(category.icon);
                              return (
                                <SelectItem key={category.id} value={category.id}>
                                  <div className="flex items-center gap-2">
                                    {IconComponent && <IconComponent className="h-4 w-4" style={{ color: category.color || undefined }} />}
                                    {category.name}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}

                {/* Merchant */}
                <div className="grid gap-2">
                  <Label htmlFor="merchant">Merchant</Label>
                  <Input
                    id="merchant"
                    placeholder="e.g., Walmart"
                    list="merchants"
                    {...register('merchant_name')}
                  />
                  <datalist id="merchants">
                    {merchants.map(merchant => (
                      <option key={merchant} value={merchant} />
                    ))}
                  </datalist>
                </div>

                {/* Payment Method */}
                <div className="grid gap-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Controller
                    name="payment_method"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
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
                    )}
                  />
                </div>

                {/* Tags */}
                <div className="grid gap-2">
                  <Label htmlFor="tags">Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(tagInput);
                        }
                      }}
                      list="available-tags"
                    />
                    <datalist id="available-tags">
                      {availableTags.map(tag => (
                        <option key={tag} value={tag} />
                      ))}
                    </datalist>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addTag(tagInput)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map(tag => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="flex gap-2">
                    <Input
                      id="location"
                      placeholder="e.g., New York, NY"
                      {...register('location')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={useCurrentLocation}
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Notes */}
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes..."
                    rows={3}
                    {...register('notes')}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Split Transaction */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Split className="h-5 w-5" />
                    Split Transaction
                  </CardTitle>
                  <CardDescription>
                    Divide this transaction across multiple categories
                  </CardDescription>
                </div>
                <Controller
                  name="is_split"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </CardHeader>
            {isSplit && (
              <CardContent className="space-y-4">
                {splitFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div className="grid gap-2">
                        <Label>Category *</Label>
                        <Controller
                          name={`splits.${index}.category_id`}
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
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
                          )}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Amount *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...register(`splits.${index}.amount`)}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-8"
                      onClick={() => removeSplit(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Remaining: <span className="font-medium">${calculateSplitRemaining().toFixed(2)}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSplit}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Split
                  </Button>
                </div>

                {errors.splits && (
                  <p className="text-sm text-red-600">{errors.splits.message}</p>
                )}
              </CardContent>
            )}
          </Card>

          {/* Recurring Transaction */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Repeat className="h-5 w-5" />
                    Recurring Transaction
                  </CardTitle>
                  <CardDescription>
                    Automatically create this transaction on a schedule
                  </CardDescription>
                </div>
                <Controller
                  name="is_recurring"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </CardHeader>
            {isRecurring && (
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Frequency</Label>
                  <Controller
                    name="recurring_frequency"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {frequencies.map(freq => (
                            <SelectItem key={freq.value} value={freq.value}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>End Date (Optional)</Label>
                    <Controller
                      name="recurring_end_date"
                      control={control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full justify-start text-left font-normal ${!field.value && 'text-muted-foreground'}`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(new Date(field.value), 'PPP') : <span>Pick end date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Or Occurrence Count</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 12"
                      {...register('recurring_count')}
                    />
                  </div>
                </div>

                {watch('date') && watch('recurring_frequency') && (
                  <div className="p-3 bg-muted rounded-md text-sm">
                    <p className="font-medium">Next occurrence:</p>
                    <p className="text-muted-foreground">
                      {calculateNextDate(watch('date'), watch('recurring_frequency') || 'monthly')}
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Receipt Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Attachments
              </CardTitle>
              <CardDescription>Upload receipts or documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary cursor-pointer transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, PDF up to 10MB
                  </p>
                </label>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm truncate flex-1">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium capitalize">{transactionType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className={`font-medium ${transactionType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {amount ? `$${parseFloat(amount).toFixed(2)}` : '$0.00'}
                </span>
              </div>
              {isSplit && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Splits:</span>
                  <span className="font-medium">{splitFields.length}</span>
                </div>
              )}
              {isRecurring && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recurring:</span>
                  <Badge variant="secondary" className="capitalize">
                    {watch('recurring_frequency')}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>💡 Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Use the calculator for complex amounts</p>
              <p>• Tags help you organize transactions</p>
              <p>• Split transactions for multiple categories</p>
              <p>• Set recurring for automatic tracking</p>
              <p>• Upload receipts for better records</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
