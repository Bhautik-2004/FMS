'use client';

import { useState } from 'react';
import { DollarSign, Plus, Minus, Calendar } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format } from 'date-fns';

interface AddContributionDialogProps {
  goalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddContributionDialog({ goalId, open, onOpenChange, onSuccess }: AddContributionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [isPositive, setIsPositive] = useState(true);
  const [formData, setFormData] = useState({
    amount: '',
    type: 'manual' as 'manual' | 'automatic' | 'transaction',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const amount = parseFloat(formData.amount) * (isPositive ? 1 : -1);
      
      const response = await fetch(`/api/goals/${goalId}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          type: formData.type,
          date: formData.date,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to add contribution');

      onSuccess();
      // Reset form
      setFormData({
        amount: '',
        type: 'manual',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setIsPositive(true);
    } catch (error) {

      alert('Failed to add contribution');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contribution</DialogTitle>
          <DialogDescription>
            Record a contribution or withdrawal from this goal
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <div className="flex gap-2">
              <div className="flex rounded-md overflow-hidden border">
                <button
                  type="button"
                  onClick={() => setIsPositive(true)}
                  className={`px-3 py-2 transition-colors ${
                    isPositive ? 'bg-green-500 text-white' : 'bg-gray-100'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPositive(false)}
                  className={`px-3 py-2 transition-colors ${
                    !isPositive ? 'bg-red-500 text-white' : 'bg-gray-100'
                  }`}
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  className="pl-9"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {isPositive ? 'Adding to goal' : 'Withdrawing from goal'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Contribution Type *</Label>
            <RadioGroup
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as any })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="font-normal cursor-pointer">
                  Manual Contribution
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="automatic" id="automatic" />
                <Label htmlFor="automatic" className="font-normal cursor-pointer">
                  Automatic Transfer
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="transaction" id="transaction" />
                <Label htmlFor="transaction" className="font-normal cursor-pointer">
                  Linked Transaction
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${!formData.date && 'text-muted-foreground'}`}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {formData.date ? format(new Date(formData.date), 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={formData.date ? new Date(formData.date) : undefined}
                  onSelect={(date) => setFormData({ ...formData, date: date ? format(date, 'yyyy-MM-dd') : '' })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this contribution..."
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Contribution'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
