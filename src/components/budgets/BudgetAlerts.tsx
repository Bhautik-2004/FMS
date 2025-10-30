'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  X,
  Eye,
  Settings,
  Bell,
  BellOff,
  CheckCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BudgetAlert {
  id: string;
  budget_id: string;
  category_id?: string;
  alert_type: 'threshold' | 'exceeded' | 'approaching' | 'unusual_pattern';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_read: boolean;
  created_at: string;
  budget: {
    name: string;
    period_type: string;
  };
  category?: {
    name: string;
    icon?: string;
    color?: string;
  };
  metadata?: {
    spent_amount?: number;
    allocated_amount?: number;
    spent_percentage?: number;
    pattern_details?: string;
  };
}

interface BudgetAlertsProps {
  alerts: BudgetAlert[];
  showSettings?: boolean;
  compact?: boolean;
}

interface NotificationPreferences {
  approaching_enabled: boolean;
  threshold_enabled: boolean;
  exceeded_enabled: boolean;
  unusual_pattern_enabled: boolean;
  approaching_threshold: number;
  email_notifications: boolean;
  push_notifications: boolean;
}

export function BudgetAlerts({
  alerts: initialAlerts,
  showSettings = false,
  compact = false,
}: BudgetAlertsProps) {
  const router = useRouter();
  const supabase = createClient();

  const [alerts, setAlerts] = useState(initialAlerts);
  const [selectedAlert, setSelectedAlert] = useState<BudgetAlert | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [alertToDelete, setAlertToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    approaching_enabled: true,
    threshold_enabled: true,
    exceeded_enabled: true,
    unusual_pattern_enabled: true,
    approaching_threshold: 70,
    email_notifications: false,
    push_notifications: true,
  });

  // Get alert icon and color
  const getAlertIcon = (alert: BudgetAlert) => {
    switch (alert.alert_type) {
      case 'exceeded':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'threshold':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'approaching':
        return <TrendingUp className="h-5 w-5 text-yellow-600" />;
      case 'unusual_pattern':
        return <AlertTriangle className="h-5 w-5 text-blue-600" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-600">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="border-yellow-600 text-yellow-700">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  const getAlertColor = (alert: BudgetAlert) => {
    if (alert.is_read) return 'bg-muted/30';
    
    switch (alert.severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-muted/50';
    }
  };

  // Mark alert as read
  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('budget_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(alerts.map(a => 
        a.id === alertId ? { ...a, is_read: true } : a
      ));
    } catch (error) {

    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setIsLoading(true);
    try {
      const unreadIds = alerts.filter(a => !a.is_read).map(a => a.id);
      
      if (unreadIds.length === 0) {
        toast.info('No unread alerts');
        return;
      }

      const { error } = await (supabase as any)
        .from('budget_alerts')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setAlerts(alerts.map(a => ({ ...a, is_read: true })));
      toast.success('All alerts marked as read');
    } catch (error: any) {

      toast.error('Failed to mark alerts as read');
    } finally {
      setIsLoading(false);
    }
  };

  // Dismiss alert
  const dismissAlert = async (alertId: string) => {
    setIsLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('budget_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(alerts.filter(a => a.id !== alertId));
      setAlertToDelete(null);
      toast.success('Alert dismissed');
    } catch (error: any) {

      toast.error('Failed to dismiss alert');
    } finally {
      setIsLoading(false);
    }
  };

  // View alert details
  const viewDetails = (alert: BudgetAlert) => {
    setSelectedAlert(alert);
    setShowDetails(true);
    if (!alert.is_read) {
      markAsRead(alert.id);
    }
  };

  // Navigate to budget
  const goToBudget = (budgetId: string) => {
    router.push(`/budgets?id=${budgetId}`);
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="text-sm font-medium">Budget Alerts</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          {showSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreferences(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No active alerts
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 3).map(alert => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${getAlertColor(alert)}`}
                onClick={() => viewDetails(alert)}
              >
                {getAlertIcon(alert)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {alert.budget.name} • {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {alerts.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{alerts.length - 3} more alerts
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Budget Alerts
              </CardTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount} unread</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={isLoading}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark All Read
                </Button>
              )}
              {showSettings && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreferences(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            Notifications about your budget status and spending patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-medium">All clear!</p>
              <p className="text-sm text-muted-foreground">
                No active budget alerts at this time
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${getAlertColor(alert)} ${
                    !alert.is_read ? 'shadow-sm' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getAlertIcon(alert)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-muted-foreground">
                          {alert.budget.name}
                          {alert.category && ` • ${alert.category.name}`}
                        </p>
                      </div>
                      {getSeverityBadge(alert.severity)}
                    </div>
                    
                    {alert.metadata && (
                      <div className="flex items-center gap-4 text-sm">
                        {alert.metadata.spent_amount !== undefined && (
                          <span className="text-muted-foreground">
                            Spent: ${alert.metadata.spent_amount.toLocaleString()}
                            {alert.metadata.allocated_amount && 
                              ` / $${alert.metadata.allocated_amount.toLocaleString()}`}
                          </span>
                        )}
                        {alert.metadata.spent_percentage !== undefined && (
                          <Badge variant="outline">
                            {alert.metadata.spent_percentage.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDetails(alert)}
                        >
                          <Eye className="mr-2 h-3 w-3" />
                          Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => goToBudget(alert.budget_id)}
                        >
                          Adjust Budget
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAlertToDelete(alert.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert && getAlertIcon(selectedAlert)}
              Alert Details
            </DialogTitle>
            <DialogDescription>
              {selectedAlert?.budget.name}
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div>
                <Label>Message</Label>
                <p className="text-sm mt-1">{selectedAlert.message}</p>
              </div>
              
              {selectedAlert.metadata?.pattern_details && (
                <div>
                  <Label>Pattern Details</Label>
                  <p className="text-sm mt-1 text-muted-foreground">
                    {selectedAlert.metadata.pattern_details}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Alert Type</Label>
                  <p className="text-sm mt-1 capitalize">
                    {selectedAlert.alert_type.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <Label>Severity</Label>
                  <div className="mt-1">{getSeverityBadge(selectedAlert.severity)}</div>
                </div>
              </div>
              
              {selectedAlert.metadata && (
                <>
                  {selectedAlert.metadata.spent_amount !== undefined && (
                    <div>
                      <Label>Spending</Label>
                      <p className="text-sm mt-1">
                        ${selectedAlert.metadata.spent_amount.toLocaleString()}
                        {selectedAlert.metadata.allocated_amount &&
                          ` of $${selectedAlert.metadata.allocated_amount.toLocaleString()} allocated`}
                      </p>
                    </div>
                  )}
                  
                  {selectedAlert.metadata.spent_percentage !== undefined && (
                    <div>
                      <Label>Percentage Used</Label>
                      <div className="mt-2">
                        <Progress
                          value={Math.min(selectedAlert.metadata.spent_percentage, 100)}
                          className="h-2"
                          indicatorClassName={
                            selectedAlert.metadata.spent_percentage >= 100
                              ? 'bg-red-600'
                              : selectedAlert.metadata.spent_percentage >= 90
                              ? 'bg-red-500'
                              : selectedAlert.metadata.spent_percentage >= 70
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }
                        />
                        <p className="text-sm mt-1 text-muted-foreground">
                          {selectedAlert.metadata.spent_percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
            {selectedAlert && (
              <Button onClick={() => goToBudget(selectedAlert.budget_id)}>
                View Budget
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Preferences Dialog */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
            <DialogDescription>
              Customize when and how you receive budget alerts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Alert Types</h4>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Approaching Limit</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert when spending approaches threshold
                  </p>
                </div>
                <Switch
                  checked={preferences.approaching_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, approaching_enabled: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Threshold Reached</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert when reaching alert threshold (80%)
                  </p>
                </div>
                <Switch
                  checked={preferences.threshold_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, threshold_enabled: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Budget Exceeded</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert when budget is exceeded
                  </p>
                </div>
                <Switch
                  checked={preferences.exceeded_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, exceeded_enabled: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Unusual Patterns</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert for unusual spending patterns
                  </p>
                </div>
                <Switch
                  checked={preferences.unusual_pattern_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, unusual_pattern_enabled: checked })
                  }
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Delivery Methods</h4>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    In-app notifications
                  </p>
                </div>
                <Switch
                  checked={preferences.push_notifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, push_notifications: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts via email
                  </p>
                </div>
                <Switch
                  checked={preferences.email_notifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, email_notifications: checked })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreferences(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success('Preferences saved');
                setShowPreferences(false);
              }}
            >
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!alertToDelete} onOpenChange={() => setAlertToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss Alert?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this alert. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => alertToDelete && dismissAlert(alertToDelete)}
              disabled={isLoading}
            >
              {isLoading ? 'Dismissing...' : 'Dismiss'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
