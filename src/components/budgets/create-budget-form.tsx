'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addMonths, addDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Sparkles,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertCircle,
  Info,
  Percent,
  Target,
  Zap,
} from 'lucide-react';
import * as Icons from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  parent_id?: string;
}

interface CreateBudgetFormProps {
  categories: Category[];
  historicalSpending: Record<string, number>;
}

// Validation schema
const budgetSchema = z.object({
  name: z.string().min(1, 'Budget name is required'),
  period_type: z.enum(['monthly', 'quarterly', 'yearly', 'custom']),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  total_amount: z.string().min(1, 'Total amount is required').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    'Amount must be greater than 0'
  ),
  rollover_enabled: z.boolean(),
  alert_threshold: z.string().refine(
    (val) => !isNaN(parseInt(val)) && parseInt(val) >= 0 && parseInt(val) <= 100,
    'Threshold must be between 0 and 100'
  ),
  notes: z.string().optional(),
  category_allocations: z.record(z.string(), z.string()),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

// Budget templates
const templates = {
  '50-30-20': {
    name: '50/30/20 Rule',
    description: '50% Needs, 30% Wants, 20% Savings',
    allocations: {
      needs: 50,
      wants: 30,
      savings: 20,
    },
  },
  '80-20': {
    name: '80/20 Rule',
    description: '80% Expenses, 20% Savings',
    allocations: {
      expenses: 80,
      savings: 20,
    },
  },
  'zero-based': {
    name: 'Zero-Based Budget',
    description: 'Allocate every dollar',
    allocations: {},
  },
  'envelope': {
    name: 'Envelope Budgeting',
    description: 'Separate category envelopes',
    allocations: {},
  },
};

export function CreateBudgetForm({
  categories,
  historicalSpending,
}: CreateBudgetFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [categoryAllocations, setCategoryAllocations] = useState<Record<string, string>>({});
  const [zeroBasedMode, setZeroBasedMode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: '',
      period_type: 'monthly',
      start_date: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      end_date: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      total_amount: '',
      rollover_enabled: false,
      alert_threshold: '80',
      notes: '',
      category_allocations: {},
    },
  });

  const periodType = watch('period_type');
  const totalAmount = watch('total_amount');

  // Update date range when period type changes
  useEffect(() => {
    const today = new Date();
    let start, end;

    switch (periodType) {
      case 'monthly':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'quarterly':
        start = startOfQuarter(today);
        end = endOfQuarter(today);
        break;
      case 'yearly':
        start = startOfYear(today);
        end = endOfYear(today);
        break;
      default:
        return;
    }

    setValue('start_date', format(start, 'yyyy-MM-dd'));
    setValue('end_date', format(end, 'yyyy-MM-dd'));
  }, [periodType, setValue]);

  // Calculate total allocated
  const totalAllocated = Object.values(categoryAllocations).reduce(
    (sum, amount) => sum + (parseFloat(amount) || 0),
    0
  );

  const remaining = (parseFloat(totalAmount) || 0) - totalAllocated;
  const allocationPercentage = totalAmount ? (totalAllocated / parseFloat(totalAmount)) * 100 : 0;

  // Get icon component
  const getIcon = (iconName?: string) => {
    if (!iconName) return Icons.DollarSign;
    return (Icons as any)[iconName] || Icons.DollarSign;
  };

  // Apply template
  const applyTemplate = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    
    if (templateKey === '50-30-20') {
      // Auto-categorize into needs/wants/savings
      const needs = ['Groceries', 'Housing', 'Utilities', 'Transportation', 'Insurance', 'Healthcare'];
      const wants = ['Entertainment', 'Dining', 'Shopping', 'Hobbies', 'Subscriptions'];
      const savings = ['Savings', 'Investments', 'Emergency Fund'];
      
      const newAllocations: Record<string, string> = {};
      const total = parseFloat(totalAmount) || 0;
      
      categories.forEach(cat => {
        if (needs.some(n => cat.name.includes(n))) {
          newAllocations[cat.id] = (total * 0.5 / categories.filter(c => needs.some(n => c.name.includes(n))).length).toFixed(2);
        } else if (wants.some(w => cat.name.includes(w))) {
          newAllocations[cat.id] = (total * 0.3 / categories.filter(c => wants.some(w => c.name.includes(w))).length).toFixed(2);
        } else if (savings.some(s => cat.name.includes(s))) {
          newAllocations[cat.id] = (total * 0.2 / categories.filter(c => savings.some(s => c.name.includes(s))).length).toFixed(2);
        }
      });
      
      setCategoryAllocations(newAllocations);
    } else if (templateKey === 'zero-based') {
      setZeroBasedMode(true);
    }
    
    toast.success(`Applied ${templates[templateKey as keyof typeof templates].name} template`);
  };

  // Use historical spending
  const useHistoricalData = () => {
    const newAllocations: Record<string, string> = {};
    
    categories.forEach(cat => {
      if (historicalSpending[cat.id]) {
        newAllocations[cat.id] = historicalSpending[cat.id].toFixed(2);
      }
    });
    
    setCategoryAllocations(newAllocations);
    toast.success('Applied historical spending averages');
  };

  // Distribute evenly
  const distributeEvenly = () => {
    const total = parseFloat(totalAmount) || 0;
    const perCategory = (total / categories.length).toFixed(2);
    
    const newAllocations: Record<string, string> = {};
    categories.forEach(cat => {
      newAllocations[cat.id] = perCategory;
    });
    
    setCategoryAllocations(newAllocations);
    toast.success('Distributed budget evenly across categories');
  };

  // Update category allocation
  const updateAllocation = (categoryId: string, amount: string) => {
    setCategoryAllocations({
      ...categoryAllocations,
      [categoryId]: amount,
    });
  };

  // Handle form submission
  const onSubmit = async (data: BudgetFormData) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      // Validate allocations in zero-based mode
      if (zeroBasedMode && Math.abs(remaining) > 0.01) {
        toast.error('In zero-based mode, you must allocate the entire budget');
        setIsLoading(false);
        return;
      }

      // Create budget
      const budgetData = {
        user_id: user.id,
        name: data.name,
        period_type: data.period_type,
        start_date: data.start_date,
        end_date: data.end_date,
        total_amount: parseFloat(data.total_amount),
        rollover_enabled: data.rollover_enabled,
        alert_threshold: parseInt(data.alert_threshold),
        notes: data.notes || null,
        is_active: true,
      };

      const { data: budget, error: budgetError } = await (supabase as any)
        .from('budgets')
        .insert([budgetData])
        .select()
        .single();

      if (budgetError) throw budgetError;

      // Create category allocations
      const allocations = Object.entries(categoryAllocations)
        .filter(([_, amount]) => parseFloat(amount) > 0)
        .map(([categoryId, amount]) => ({
          budget_id: budget.id,
          category_id: categoryId,
          allocated_amount: parseFloat(amount),
          spent_amount: 0,
          rollover_from_previous: 0,
        }));

      if (allocations.length > 0) {
        const { error: allocError } = await (supabase as any)
          .from('budget_categories')
          .insert(allocations);

        if (allocError) throw allocError;
      }

      toast.success('Budget created successfully!');
      router.push('/budgets');
      router.refresh();
    } catch (error: any) {

      toast.error(error.message || 'Failed to create budget');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
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
          <h1 className="text-3xl font-bold tracking-tight">Create Budget</h1>
          <p className="text-muted-foreground">Set up a new budget to track your spending</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Essential budget details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Budget Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">Budget Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., January 2025 Budget"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Period Type */}
              <div className="grid gap-2">
                <Label htmlFor="period_type">Period Type *</Label>
                <Controller
                  name="period_type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="custom">Custom Period</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Controller
                    name="start_date"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!field.value && 'text-muted-foreground'}`}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {field.value ? format(new Date(field.value), 'PPP') : <span>Pick start date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.start_date && (
                    <p className="text-sm text-red-600">{errors.start_date.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Controller
                    name="end_date"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!field.value && 'text-muted-foreground'}`}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {field.value ? format(new Date(field.value), 'PPP') : <span>Pick end date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.end_date && (
                    <p className="text-sm text-red-600">{errors.end_date.message}</p>
                  )}
                </div>
              </div>

              {/* Total Amount */}
              <div className="grid gap-2">
                <Label htmlFor="total_amount">Total Budget Amount *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-10"
                    {...register('total_amount')}
                  />
                </div>
                {errors.total_amount && (
                  <p className="text-sm text-red-600">{errors.total_amount.message}</p>
                )}
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this budget..."
                  rows={3}
                  {...register('notes')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Budget Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Budget Templates
              </CardTitle>
              <CardDescription>Quick start with popular budgeting methods</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {Object.entries(templates).map(([key, template]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyTemplate(key)}
                  className={`p-4 text-left border rounded-lg hover:border-primary transition-colors ${
                    selectedTemplate === key ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </button>
              ))}
              
              <Separator className="my-2" />
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={useHistoricalData}
                  disabled={Object.keys(historicalSpending).length === 0}
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Use Historical
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={distributeEvenly}
                >
                  <Target className="mr-2 h-4 w-4" />
                  Distribute Evenly
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Category Allocations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Category Allocations</CardTitle>
                  <CardDescription>Assign budget amounts to each category</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="zero-based" className="cursor-pointer">
                    Zero-Based
                  </Label>
                  <Switch
                    id="zero-based"
                    checked={zeroBasedMode}
                    onCheckedChange={setZeroBasedMode}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No categories found. Create categories first.
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {categories.map(category => {
                    const IconComponent = getIcon(category.icon);
                    const amount = categoryAllocations[category.id] || '';
                    const percentage = totalAmount && amount
                      ? ((parseFloat(amount) / parseFloat(totalAmount)) * 100).toFixed(1)
                      : '0';
                    const historical = historicalSpending[category.id];

                    return (
                      <div key={category.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <IconComponent 
                          className="h-5 w-5 flex-shrink-0" 
                          style={{ color: category.color || undefined }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{category.name}</p>
                          {historical && (
                            <p className="text-xs text-muted-foreground">
                              Avg: ${historical}/mo
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative w-32">
                            <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="pl-7 text-right"
                              value={amount}
                              onChange={(e) => updateAllocation(category.id, e.target.value)}
                            />
                          </div>
                          <Badge variant="outline" className="w-16 justify-center">
                            {percentage}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between p-0 h-auto"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <CardTitle>Advanced Settings</CardTitle>
                <Badge variant="outline">{showAdvanced ? 'Hide' : 'Show'}</Badge>
              </Button>
            </CardHeader>
            {showAdvanced && (
              <CardContent className="space-y-4">
                {/* Alert Threshold */}
                <div className="grid gap-2">
                  <Label htmlFor="alert_threshold">Alert Threshold (%)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="alert_threshold"
                      type="number"
                      min="0"
                      max="100"
                      {...register('alert_threshold')}
                    />
                    <Percent className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get notified when spending reaches this percentage
                  </p>
                  {errors.alert_threshold && (
                    <p className="text-sm text-red-600">{errors.alert_threshold.message}</p>
                  )}
                </div>

                {/* Rollover Enabled */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="rollover">Enable Rollover</Label>
                    <p className="text-sm text-muted-foreground">
                      Carry unused budget to next period
                    </p>
                  </div>
                  <Controller
                    name="rollover_enabled"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="rollover"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          {/* Budget Summary */}
          <Card className={zeroBasedMode && Math.abs(remaining) > 0.01 ? 'border-orange-300' : ''}>
            <CardHeader>
              <CardTitle>Budget Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Budget</span>
                  <span className="font-medium">
                    ${parseFloat(totalAmount || '0').toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Allocated</span>
                  <span className="font-medium text-blue-600">
                    ${totalAllocated.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className={`font-medium ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${Math.abs(remaining).toLocaleString()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Allocated</span>
                  <span className="text-sm font-medium">{allocationPercentage.toFixed(1)}%</span>
                </div>
              </div>

              {zeroBasedMode && Math.abs(remaining) > 0.01 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    <p className="text-sm text-orange-900">
                      Zero-based budgeting requires allocating the entire budget amount
                    </p>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? 'Creating...' : 'Create Budget'}
              </Button>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Use templates for quick setup</p>
              <p>• Historical data shows average spending</p>
              <p>• Zero-based mode ensures every dollar is allocated</p>
              <p>• Enable rollover to carry unused budget forward</p>
              <p>• Set alert threshold to get notified early</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
