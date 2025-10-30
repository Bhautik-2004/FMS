'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
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
import { Calendar } from '@/components/ui/calendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  DollarSign,
  AlertCircle,
  Trash2,
  Plus,
  X,
  Calendar as CalendarIcon,
} from 'lucide-react';
import * as Icons from 'lucide-react';

interface Budget {
  id: string;
  name: string;
  period_type: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  rollover_enabled: boolean;
  alert_threshold: number;
  notes: string | null;
  is_active: boolean;
}

interface BudgetCategory {
  id: string;
  category_id: string;
  allocated_amount: number;
  spent_amount: number;
  category: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
}

interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  parent_id?: string;
}

interface EditBudgetFormProps {
  budget: Budget;
  budgetCategories: BudgetCategory[];
  categories: Category[];
  historicalSpending: Record<string, number>;
}

// Validation schema
const budgetSchema = z.object({
  name: z.string().min(1, 'Budget name is required'),
  period_type: z.enum(['monthly', 'quarterly', 'yearly', 'custom']),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  rollover_enabled: z.boolean(),
  alert_threshold: z.string().refine(
    (val) => !isNaN(parseInt(val)) && parseInt(val) >= 0 && parseInt(val) <= 100,
    'Threshold must be between 0 and 100'
  ),
  notes: z.string().optional(),
  is_active: z.boolean(),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

export function EditBudgetForm({
  budget,
  budgetCategories: initialBudgetCategories,
  categories,
  historicalSpending,
}: EditBudgetFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryAllocations, setCategoryAllocations] = useState<Record<string, string>>({});
  const [deletedCategories, setDeletedCategories] = useState<string[]>([]);

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: budget.name,
      period_type: budget.period_type as any,
      start_date: format(new Date(budget.start_date), 'yyyy-MM-dd'),
      end_date: format(new Date(budget.end_date), 'yyyy-MM-dd'),
      rollover_enabled: budget.rollover_enabled,
      alert_threshold: budget.alert_threshold.toString(),
      notes: budget.notes || '',
      is_active: budget.is_active,
    },
  });

  // Initialize category allocations
  useEffect(() => {
    const initialAllocations: Record<string, string> = {};
    initialBudgetCategories.forEach(bc => {
      initialAllocations[bc.category_id] = bc.allocated_amount.toString();
    });
    setCategoryAllocations(initialAllocations);
  }, [initialBudgetCategories]);

  // Calculate totals
  const totalAllocated = Object.values(categoryAllocations).reduce(
    (sum, amount) => sum + (parseFloat(amount) || 0),
    0
  );

  // Get icon component
  const getIcon = (iconName?: string) => {
    if (!iconName) return Icons.DollarSign;
    return (Icons as any)[iconName] || Icons.DollarSign;
  };

  // Update category allocation
  const updateAllocation = (categoryId: string, amount: string) => {
    setCategoryAllocations({
      ...categoryAllocations,
      [categoryId]: amount,
    });
  };

  // Remove category
  const removeCategory = (categoryId: string) => {
    const existing = initialBudgetCategories.find(bc => bc.category_id === categoryId);
    if (existing) {
      setDeletedCategories([...deletedCategories, existing.id]);
    }
    
    const newAllocations = { ...categoryAllocations };
    delete newAllocations[categoryId];
    setCategoryAllocations(newAllocations);
  };

  // Add category
  const addCategory = (categoryId: string) => {
    if (categoryAllocations[categoryId] !== undefined) {
      toast.error('Category already added');
      return;
    }
    
    const historical = historicalSpending[categoryId];
    setCategoryAllocations({
      ...categoryAllocations,
      [categoryId]: historical ? historical.toString() : '0',
    });
  };

  // Get available categories (not yet allocated)
  const availableCategories = categories.filter(
    cat => categoryAllocations[cat.id] === undefined
  );

  // Handle form submission
  const onSubmit = async (data: BudgetFormData) => {
    setIsLoading(true);
    try {
      // Update budget
      const budgetData = {
        name: data.name,
        period_type: data.period_type,
        start_date: data.start_date,
        end_date: data.end_date,
        total_amount: totalAllocated,
        rollover_enabled: data.rollover_enabled,
        alert_threshold: parseInt(data.alert_threshold),
        notes: data.notes || null,
        is_active: data.is_active,
        updated_at: new Date().toISOString(),
      };

      const { error: budgetError } = await (supabase as any)
        .from('budgets')
        .update(budgetData)
        .eq('id', budget.id);

      if (budgetError) throw budgetError;

      // Delete removed categories
      if (deletedCategories.length > 0) {
        const { error: deleteError } = await (supabase as any)
          .from('budget_categories')
          .delete()
          .in('id', deletedCategories);

        if (deleteError) throw deleteError;
      }

      // Update or insert category allocations
      const existingCategoryIds = initialBudgetCategories.map(bc => bc.category_id);
      const currentCategoryIds = Object.keys(categoryAllocations);

      // Update existing
      for (const bc of initialBudgetCategories) {
        if (categoryAllocations[bc.category_id] !== undefined && !deletedCategories.includes(bc.id)) {
          const { error } = await (supabase as any)
            .from('budget_categories')
            .update({
              allocated_amount: parseFloat(categoryAllocations[bc.category_id]),
            })
            .eq('id', bc.id);

          if (error) throw error;
        }
      }

      // Insert new
      const newCategories = currentCategoryIds.filter(
        catId => !existingCategoryIds.includes(catId)
      );

      if (newCategories.length > 0) {
        const newAllocations = newCategories
          .filter(catId => parseFloat(categoryAllocations[catId]) > 0)
          .map(catId => ({
            budget_id: budget.id,
            category_id: catId,
            allocated_amount: parseFloat(categoryAllocations[catId]),
            spent_amount: 0,
            rollover_from_previous: 0,
          }));

        if (newAllocations.length > 0) {
          const { error: insertError } = await (supabase as any)
            .from('budget_categories')
            .insert(newAllocations);

          if (insertError) throw insertError;
        }
      }

      toast.success('Budget updated successfully!');
      router.push('/budgets');
      router.refresh();
    } catch (error: any) {

      toast.error(error.message || 'Failed to update budget');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete budget
  const deleteBudget = async () => {
    setIsLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('budgets')
        .delete()
        .eq('id', budget.id);

      if (error) throw error;

      toast.success('Budget deleted successfully');
      router.push('/budgets');
      router.refresh();
    } catch (error: any) {

      toast.error('Failed to delete budget');
      setIsLoading(false);
    }
  };

  return (
    <>
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
              <h1 className="text-3xl font-bold tracking-tight">Edit Budget</h1>
              <p className="text-muted-foreground">Update your budget settings and allocations</p>
            </div>
          </div>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Budget
          </Button>
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
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(new Date(field.value), 'PPP') : <span>Pick start date</span>}
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
                    {errors.end_date && (
                      <p className="text-sm text-red-600">{errors.end_date.message}</p>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_active">Budget Active</Label>
                    <p className="text-sm text-muted-foreground">
                      Inactive budgets won't track spending
                    </p>
                  </div>
                  <Controller
                    name="is_active"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="is_active"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
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

            {/* Category Allocations */}
            <Card>
              <CardHeader>
                <CardTitle>Category Allocations</CardTitle>
                <CardDescription>Adjust budget amounts for each category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.keys(categoryAllocations).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No categories allocated. Add categories below.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(categoryAllocations).map(([categoryId, amount]) => {
                      const category = categories.find(c => c.id === categoryId);
                      const budgetCategory = initialBudgetCategories.find(
                        bc => bc.category_id === categoryId
                      );
                      if (!category) return null;

                      const IconComponent = getIcon(category.icon);
                      const percentage = totalAllocated > 0
                        ? ((parseFloat(amount) / totalAllocated) * 100).toFixed(1)
                        : '0';

                      return (
                        <div key={categoryId} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <IconComponent
                            className="h-5 w-5 flex-shrink-0"
                            style={{ color: category.color || undefined }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{category.name}</p>
                            {budgetCategory && (
                              <p className="text-xs text-muted-foreground">
                                Spent: ${budgetCategory.spent_amount.toLocaleString()}
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
                                onChange={(e) => updateAllocation(categoryId, e.target.value)}
                              />
                            </div>
                            <Badge variant="outline" className="w-16 justify-center">
                              {percentage}%
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCategory(categoryId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Category */}
                {availableCategories.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Add Category</Label>
                      <div className="flex flex-wrap gap-2">
                        {availableCategories.map(category => {
                          const IconComponent = getIcon(category.icon);
                          return (
                            <Button
                              key={category.id}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addCategory(category.id)}
                              className="gap-2"
                            >
                              <IconComponent
                                className="h-4 w-4"
                                style={{ color: category.color || undefined }}
                              />
                              {category.name}
                              <Plus className="h-3 w-3" />
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Alert Threshold */}
                <div className="grid gap-2">
                  <Label htmlFor="alert_threshold">Alert Threshold (%)</Label>
                  <Input
                    id="alert_threshold"
                    type="number"
                    min="0"
                    max="100"
                    {...register('alert_threshold')}
                  />
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
            </Card>
          </div>

          {/* Sidebar Summary */}
          <div className="space-y-6">
            {/* Budget Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Allocated</span>
                    <span className="font-medium">
                      ${totalAllocated.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Categories</span>
                    <span className="font-medium">
                      {Object.keys(categoryAllocations).length}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Original Amount</span>
                    <span className="text-sm font-medium">
                      ${budget.total_amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>

            {/* Warning */}
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  <div className="text-sm text-orange-900">
                    <p className="font-medium mb-1">Note</p>
                    <p>
                      Changes to allocations won't affect already spent amounts.
                      Spent tracking continues from current values.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this budget and all its category allocations.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteBudget}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Deleting...' : 'Delete Budget'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
