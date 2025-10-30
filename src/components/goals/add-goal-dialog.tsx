'use client';

import { useState, useEffect } from 'react';
import { Target, TrendingUp, DollarSign, Calendar, Palette, Hash } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';

interface GoalTemplate {
  name: string;
  goal_type: 'savings' | 'debt_payoff' | 'net_worth' | 'investment';
  suggested_amount: number;
  suggested_months: number;
  color: string;
  priority: number;
}

interface AddGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  template?: GoalTemplate | null;
}

const GOAL_TYPES = [
  { value: 'savings', label: 'Savings', icon: Target, color: '#3b82f6' },
  { value: 'debt_payoff', label: 'Debt Payoff', icon: TrendingUp, color: '#f97316' },
  { value: 'net_worth', label: 'Net Worth', icon: DollarSign, color: '#8b5cf6' },
  { value: 'investment', label: 'Investment', icon: TrendingUp, color: '#10b981' },
];

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function AddGoalDialog({ open, onOpenChange, onSuccess, template }: AddGoalDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    goal_type: 'savings' as 'savings' | 'debt_payoff' | 'net_worth' | 'investment',
    target_amount: '',
    current_amount: '0',
    start_date: new Date().toISOString().split('T')[0],
    target_date: '',
    color: '#3b82f6',
    priority: '2',
    category_id: '',
    account_id: '',
    create_milestones: true,
  });

  // Apply template data when provided
  useEffect(() => {
    if (template && open) {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + template.suggested_months);
      
      setFormData({
        name: template.name,
        goal_type: template.goal_type,
        target_amount: template.suggested_amount.toString(),
        current_amount: '0',
        start_date: new Date().toISOString().split('T')[0],
        target_date: targetDate.toISOString().split('T')[0],
        color: template.color,
        priority: template.priority.toString(),
        category_id: '',
        account_id: '',
        create_milestones: true,
      });
    } else if (!template && !open) {
      // Reset form when dialog closes without template
      setFormData({
        name: '',
        goal_type: 'savings',
        target_amount: '',
        current_amount: '0',
        start_date: new Date().toISOString().split('T')[0],
        target_date: '',
        color: '#3b82f6',
        priority: '2',
        category_id: '',
        account_id: '',
        create_milestones: true,
      });
    }
  }, [template, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.target_amount || !formData.start_date || !formData.target_date) {
      alert('Please fill in all required fields: Name, Target Amount, Start Date, and Target Date');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          goal_type: formData.goal_type,
          target_amount: parseFloat(formData.target_amount),
          current_amount: parseFloat(formData.current_amount) || 0,
          start_date: formData.start_date,
          target_date: formData.target_date,
          color: formData.color,
          priority: parseInt(formData.priority),
          category_id: formData.category_id || null,
          account_id: formData.account_id || null,
          create_milestones: formData.create_milestones,
        }),
      });

      if (!response.ok) throw new Error('Failed to create goal');

      onSuccess();
      // Reset form
      setFormData({
        name: '',
        goal_type: 'savings',
        target_amount: '',
        current_amount: '0',
        start_date: new Date().toISOString().split('T')[0],
        target_date: '',
        color: '#3b82f6',
        priority: '2',
        category_id: '',
        account_id: '',
        create_milestones: true,
      });
    } catch (error) {

      alert('Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
          <DialogDescription>
            Set up a new financial goal to track your progress
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" type="button">Basic Info</TabsTrigger>
              <TabsTrigger value="timeline" type="button">Timeline</TabsTrigger>
              <TabsTrigger value="advanced" type="button">Advanced</TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Goal Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Emergency Fund, Vacation, Car Down Payment"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Goal Type *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {GOAL_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, goal_type: type.value as any, color: type.color })}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          formData.goal_type === type.value
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm font-medium">{type.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_amount">Target Amount *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="target_amount"
                      type="number"
                      step="0.01"
                      className="pl-9"
                      placeholder="0.00"
                      value={formData.target_amount}
                      onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_amount">Current Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="current_amount"
                      type="number"
                      step="0.01"
                      className="pl-9"
                      placeholder="0.00"
                      value={formData.current_amount}
                      onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Color Theme</Label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        formData.color === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${!formData.start_date && 'text-muted-foreground'}`}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {formData.start_date ? format(new Date(formData.start_date), 'PPP') : <span>Pick start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={formData.start_date ? new Date(formData.start_date) : undefined}
                        onSelect={(date) => setFormData({ ...formData, start_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_date">Target Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${!formData.target_date && 'text-muted-foreground'}`}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {formData.target_date ? format(new Date(formData.target_date), 'PPP') : <span>Pick target date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={formData.target_date ? new Date(formData.target_date) : undefined}
                        onSelect={(date) => setFormData({ ...formData, target_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">High Priority</SelectItem>
                    <SelectItem value="2">Medium Priority</SelectItem>
                    <SelectItem value="3">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-create Milestones</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically create 25%, 50%, 75%, and 100% milestones
                    </p>
                  </div>
                  <Switch
                    checked={formData.create_milestones}
                    onCheckedChange={(checked) => setFormData({ ...formData, create_milestones: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category_id">Linked Category (Optional)</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {/* Categories will be loaded dynamically */}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Link to a category to automatically track related transactions
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_id">Dedicated Account (Optional)</Label>
                  <Select
                    value={formData.account_id}
                    onValueChange={(value) => setFormData({ ...formData, account_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {/* Accounts will be loaded dynamically */}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Track a specific account balance for this goal
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
