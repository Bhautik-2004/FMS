'use client';

import { Target, Home, Plane, Car, GraduationCap, Heart, Wallet, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  goal_type: 'savings' | 'debt_payoff' | 'net_worth' | 'investment';
  suggested_amount: number;
  suggested_months: number;
  priority: number;
}

interface GoalTemplatesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: GoalTemplate) => void;
}

const TEMPLATES: GoalTemplate[] = [
  {
    id: 'emergency_fund',
    name: 'Emergency Fund',
    description: '3-6 months of expenses for unexpected situations',
    icon: Wallet,
    color: '#3b82f6',
    goal_type: 'savings',
    suggested_amount: 10000,
    suggested_months: 12,
    priority: 1,
  },
  {
    id: 'house_down_payment',
    name: 'House Down Payment',
    description: 'Save 20% down payment for a home purchase',
    icon: Home,
    color: '#10b981',
    goal_type: 'savings',
    suggested_amount: 50000,
    suggested_months: 36,
    priority: 1,
  },
  {
    id: 'vacation_fund',
    name: 'Vacation Fund',
    description: 'Save for your dream vacation or travel',
    icon: Plane,
    color: '#06b6d4',
    goal_type: 'savings',
    suggested_amount: 5000,
    suggested_months: 12,
    priority: 3,
  },
  {
    id: 'car_purchase',
    name: 'Car Purchase',
    description: 'Save for a new or used vehicle',
    icon: Car,
    color: '#8b5cf6',
    goal_type: 'savings',
    suggested_amount: 25000,
    suggested_months: 24,
    priority: 2,
  },
  {
    id: 'education_fund',
    name: 'Education Fund',
    description: 'Save for tuition, courses, or certifications',
    icon: GraduationCap,
    color: '#f59e0b',
    goal_type: 'savings',
    suggested_amount: 15000,
    suggested_months: 18,
    priority: 1,
  },
  {
    id: 'wedding_fund',
    name: 'Wedding Fund',
    description: 'Plan and save for your special day',
    icon: Heart,
    color: '#ec4899',
    goal_type: 'savings',
    suggested_amount: 20000,
    suggested_months: 24,
    priority: 1,
  },
  {
    id: 'credit_card_payoff',
    name: 'Credit Card Payoff',
    description: 'Pay off high-interest credit card debt',
    icon: Target,
    color: '#f97316',
    goal_type: 'debt_payoff',
    suggested_amount: 5000,
    suggested_months: 12,
    priority: 1,
  },
  {
    id: 'investment_fund',
    name: 'Investment Fund',
    description: 'Build wealth through investments',
    icon: TrendingUp,
    color: '#10b981',
    goal_type: 'investment',
    suggested_amount: 10000,
    suggested_months: 12,
    priority: 2,
  },
];

export function GoalTemplates({ open, onOpenChange, onSelectTemplate }: GoalTemplatesProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return 'High Priority';
      case 2:
        return 'Medium Priority';
      case 3:
        return 'Low Priority';
      default:
        return 'Medium Priority';
    }
  };

  const getPriorityVariant = (priority: number) => {
    switch (priority) {
      case 1:
        return 'destructive';
      case 2:
        return 'default';
      case 3:
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Goal Templates</DialogTitle>
          <DialogDescription>
            Choose a template to quickly set up a common financial goal
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <Card
                key={template.id}
                className="p-4 cursor-pointer hover:border-primary transition-all"
                onClick={() => {
                  onSelectTemplate(template);
                  onOpenChange(false);
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${template.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: template.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{template.name}</h3>
                      <Badge variant={getPriorityVariant(template.priority)} className="text-xs shrink-0">
                        {getPriorityLabel(template.priority)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Target: </span>
                        <span className="font-medium">
                          {formatCurrency(template.suggested_amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Timeline: </span>
                        <span className="font-medium">{template.suggested_months} months</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
