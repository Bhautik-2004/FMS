'use client';

import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, GripVertical, Filter } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useCurrency } from '@/contexts/currency-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Category, CategoryType, CategoryWithStats } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface CategoriesPageClientProps {
  initialCategories: Category[];
  categoryStats: CategoryWithStats[];
}

const iconNames = [
  'DollarSign', 'TrendingUp', 'TrendingDown', 'Briefcase', 'Code', 'Store',
  'Gift', 'RotateCcw', 'Utensils', 'ShoppingCart', 'Coffee', 'Car', 'Home',
  'ShoppingBag', 'Film', 'Heart', 'FileText', 'GraduationCap', 'Sparkles',
  'Plane', 'CreditCard', 'Wallet', 'PiggyBank', 'Building', 'Fuel', 'Bus',
  'Phone', 'Wifi', 'Zap', 'Droplet', 'Flame', 'Lightbulb', 'Laptop', 'Shirt',
  'Package', 'Ticket', 'Tv', 'Pill', 'Shield', 'Dumbbell', 'BookOpen', 'Pencil',
  'Scissors', 'Camera', 'LineChart', 'PieChart', 'Bitcoin', 'Banknote'
];

const colorPalette = [
  '#ef4444', '#f97316', '#f59e0b', '#fbbf24', '#84cc16', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e', '#64748b', '#6b7280', '#475569'
];

export function CategoriesPageClient({ initialCategories, categoryStats }: CategoriesPageClientProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedType, setSelectedType] = useState<'all' | CategoryType>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { formatCurrency } = useCurrency();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as CategoryType,
    parent_id: '__root__', // Use special value instead of empty string
    color: colorPalette[0],
    icon: 'DollarSign',
  });

  const supabase = createClient();

  // Build tree structure
  const categoryTree = useMemo(() => {
    const filtered = categories.filter(c => 
      selectedType === 'all' || c.type === selectedType
    );

    const rootCategories = filtered.filter(c => !c.parent_category_id);
    const childCategories = filtered.filter(c => c.parent_category_id);

    return rootCategories.map(parent => ({
      ...parent,
      children: childCategories.filter(child => child.parent_category_id === parent.id),
    }));
  }, [categories, selectedType]);

  // Get stats for a category
  const getCategoryStats = (categoryId: string) => {
    return categoryStats.find(s => s.id === categoryId) || {
      transaction_count: 0,
      total_amount: 0,
    };
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Handle add category
  const handleAddCategory = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const parentId = formData.parent_id === '__root__' ? null : formData.parent_id;
      const maxSortOrder = 0; // Simplified since sort_order doesn't exist in schema

      const { data, error } = await (supabase as any)
        .from('categories')
        .insert([{
          user_id: user.id,
          name: formData.name,
          type: formData.type,
          parent_category_id: parentId,
          color: formData.color,
          icon: formData.icon,
          is_system: false,
        }])
        .select()
        .single();

      if (error) throw error;

      setCategories([...categories, data]);
      setIsAddDialogOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit category
  const handleEditCategory = async () => {
    if (!selectedCategory) return;
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('categories')
        .update({
          name: formData.name,
          type: formData.type,
          color: formData.color,
          icon: formData.icon,
        })
        .eq('id', selectedCategory.id)
        .select()
        .single();

      if (error) throw error;

      setCategories(categories.map(c => c.id === data.id ? data : c));
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      resetForm();
      router.refresh();
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete category
  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    setIsLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('categories')
        .delete()
        .eq('id', selectedCategory.id);

      if (error) throw error;

      setCategories(categories.filter(c => c.id !== selectedCategory.id));
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
      router.refresh();
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      parent_id: category.parent_category_id || '__root__',
      color: category.color || colorPalette[0],
      icon: category.icon || 'DollarSign',
    });
    setIsEditDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      type: 'expense',
      parent_id: '__root__',
      color: colorPalette[0],
      icon: 'DollarSign',
    });
  };

  // Get icon component
  const getIcon = (iconName?: string | null) => {
    if (!iconName) return Icons.DollarSign;
    return (Icons as any)[iconName] || Icons.DollarSign;
  };

  // Count categories by type
  const categoryCounts = useMemo(() => {
    return {
      all: categories.length,
      income: categories.filter(c => c.type === 'income').length,
      expense: categories.filter(c => c.type === 'expense').length,
      both: categories.filter(c => c.type === 'both').length,
    };
  }, [categories]);

  // Render category item
  const renderCategoryItem = (category: Category & { children?: Category[] }, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const stats = getCategoryStats(category.id);
    const Icon = getIcon(category.icon);

    return (
      <div key={category.id} className={cn('', level > 0 && 'ml-6')}>
        <Card className="mb-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleCategory(category.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {!hasChildren && <div className="w-6" />}

                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{ color: category.color }}
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{category.name}</span>
                    {category.is_system && (
                      <Badge variant="secondary" className="text-xs">System</Badge>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">
                      {category.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>{stats.transaction_count} transactions</span>
                    {stats.total_amount && stats.total_amount > 0 && (
                      <span>{formatCurrency(stats.total_amount)}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!category.is_system && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {hasChildren && isExpanded && (
          <div className="mt-2">
            {category.children!.map(child => renderCategoryItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Manage your income and expense categories
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={cn('cursor-pointer transition-colors', selectedType === 'all' && 'ring-2 ring-primary')}
          onClick={() => setSelectedType('all')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              All Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryCounts.all}</div>
          </CardContent>
        </Card>

        <Card className={cn('cursor-pointer transition-colors', selectedType === 'income' && 'ring-2 ring-primary')}
          onClick={() => setSelectedType('income')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{categoryCounts.income}</div>
          </CardContent>
        </Card>

        <Card className={cn('cursor-pointer transition-colors', selectedType === 'expense' && 'ring-2 ring-primary')}
          onClick={() => setSelectedType('expense')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{categoryCounts.expense}</div>
          </CardContent>
        </Card>

        <Card className={cn('cursor-pointer transition-colors', selectedType === 'both' && 'ring-2 ring-primary')}
          onClick={() => setSelectedType('both')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Both
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{categoryCounts.both}</div>
          </CardContent>
        </Card>
      </div>

      {/* Categories List */}
      <div className="space-y-2">
        {categoryTree.map(category => renderCategoryItem(category))}
      </div>

      {categoryTree.length === 0 && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Filter className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No categories found</h3>
            <p className="text-muted-foreground mb-4">
              {selectedType === 'all' 
                ? 'Get started by adding your first category'
                : `No ${selectedType} categories found. Try a different filter.`}
            </p>
            {selectedType === 'all' && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new category to organize your transactions
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                placeholder="e.g., Groceries"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as CategoryType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="parent">Parent Category</Label>
                <Select
                  value={formData.parent_id}
                  onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (Root)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__root__">None (Root)</SelectItem>
                    {categories
                      .filter(c => !c.parent_category_id && (c.type === formData.type || c.type === 'both'))
                      .map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {colorPalette.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-all',
                      formData.color === color ? 'border-primary scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                {iconNames.map(iconName => {
                  const IconComp = getIcon(iconName);
                  return (
                    <button
                      key={iconName}
                      type="button"
                      className={cn(
                        'p-2 rounded hover:bg-accent transition-colors',
                        formData.icon === iconName && 'bg-accent ring-2 ring-primary'
                      )}
                      onClick={() => setFormData({ ...formData, icon: iconName })}
                    >
                      <IconComp className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory} disabled={isLoading || !formData.name}>
              {isLoading ? 'Adding...' : 'Add Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Category Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as CategoryType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {colorPalette.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-all',
                      formData.color === color ? 'border-primary scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                {iconNames.map(iconName => {
                  const IconComp = getIcon(iconName);
                  return (
                    <button
                      key={iconName}
                      type="button"
                      className={cn(
                        'p-2 rounded hover:bg-accent transition-colors',
                        formData.icon === iconName && 'bg-accent ring-2 ring-primary'
                      )}
                      onClick={() => setFormData({ ...formData, icon: iconName })}
                    >
                      <IconComp className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleEditCategory} disabled={isLoading || !formData.name}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedCategory?.name}&quot;? This will also delete all
              subcategories and unassign transactions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory} disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
