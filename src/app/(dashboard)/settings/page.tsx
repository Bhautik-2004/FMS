'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCurrency } from '@/contexts/currency-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Globe, Bell, Shield, Palette, Database, AlertTriangle } from 'lucide-react';
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

interface UserSettings {
  full_name: string | null;
  email: string;
  currency: string;
  timezone: string;
  date_format: string;
}

interface NotificationSettings {
  budget_alerts: boolean;
  transaction_alerts: boolean;
  goal_reminders: boolean;
  recurring_reminders: boolean;
  weekly_summary: boolean;
  monthly_report: boolean;
  email_notifications: boolean;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  compact_view: boolean;
  show_balances: boolean;
  currency_symbol_position: 'before' | 'after';
}

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'JPY', label: 'Japanese Yen (¥)' },
  { value: 'INR', label: 'Indian Rupee (₹)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
  { value: 'AUD', label: 'Australian Dollar (A$)' },
  { value: 'CHF', label: 'Swiss Franc (CHF)' },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris, Berlin, Rome' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Beijing, Shanghai' },
  { value: 'Asia/Kolkata', label: 'Mumbai, Kolkata' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2025)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2025)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-12-31)' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY (31 Dec 2025)' },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const supabase = createClient();
  const { setCurrency: updateGlobalCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [userSettings, setUserSettings] = useState<UserSettings>({
    full_name: '',
    email: '',
    currency: 'USD',
    timezone: 'UTC',
    date_format: 'MM/DD/YYYY',
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    budget_alerts: true,
    transaction_alerts: true,
    goal_reminders: true,
    recurring_reminders: true,
    weekly_summary: true,
    monthly_report: true,
    email_notifications: false,
  });

  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>({
    theme: 'system',
    compact_view: false,
    show_balances: true,
    currency_symbol_position: 'before',
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to view settings',
          variant: 'destructive',
        });
        return;
      }

      setUserId(user.id);

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setUserSettings({
          full_name: profile.full_name,
          email: profile.email,
          currency: profile.currency || 'USD',
          timezone: profile.timezone || 'UTC',
          date_format: profile.date_format || 'MM/DD/YYYY',
        });
      }

      // Load notification settings from localStorage
      const savedNotifications = localStorage.getItem('notification_settings');
      if (savedNotifications) {
        setNotificationSettings(JSON.parse(savedNotifications));
      }

      // Load appearance settings from localStorage
      const savedAppearance = localStorage.getItem('appearance_settings');
      if (savedAppearance) {
        setAppearanceSettings(JSON.parse(savedAppearance));
      }
    } catch (error) {

      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveUserSettings = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: userSettings.full_name,
          currency: userSettings.currency,
          timezone: userSettings.timezone,
          date_format: userSettings.date_format,
        })
        .eq('id', userId);

      if (error) throw error;

      // Update global currency context
      updateGlobalCurrency(userSettings.currency as any);

      toast({
        title: 'Success',
        description: 'Profile settings saved successfully',
      });
    } catch (error) {

      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = () => {
    localStorage.setItem('notification_settings', JSON.stringify(notificationSettings));
    toast({
      title: 'Success',
      description: 'Notification preferences saved',
    });
  };

  const saveAppearanceSettings = () => {
    localStorage.setItem('appearance_settings', JSON.stringify(appearanceSettings));
    
    // Apply theme change
    if (appearanceSettings.theme !== 'system') {
      document.documentElement.classList.toggle('dark', appearanceSettings.theme === 'dark');
    }

    toast({
      title: 'Success',
      description: 'Appearance settings saved',
    });
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your password to confirm',
        variant: 'destructive',
      });
      return;
    }

    setDeleting(true);
    try {
      // Verify password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userSettings.email,
        password: deletePassword,
      });

      if (signInError) {
        toast({
          title: 'Error',
          description: 'Incorrect password. Please try again.',
          variant: 'destructive',
        });
        setDeleting(false);
        return;
      }

      // Delete user data from all tables
      if (userId) {
        // Delete in order: transactions, budgets, goals, recurring, categories, accounts, profile
        await supabase.from('transactions').delete().eq('user_id', userId);
        await supabase.from('budgets').delete().eq('user_id', userId);
        await supabase.from('financial_goals').delete().eq('user_id', userId);
        await supabase.from('goal_contributions').delete().eq('user_id', userId);
        await supabase.from('goal_milestones').delete().eq('user_id', userId);
        await supabase.from('recurring_transactions').delete().eq('user_id', userId);
        await supabase.from('recurring_occurrences').delete().eq('user_id', userId);
        await supabase.from('insights').delete().eq('user_id', userId);
        await supabase.from('insight_history').delete().eq('user_id', userId);
        await supabase.from('categories').delete().eq('user_id', userId);
        await supabase.from('accounts').delete().eq('user_id', userId);
        await supabase.from('user_profiles').delete().eq('id', userId);
      }

      // Delete the auth user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId!);

      if (deleteError) {
        // If admin delete fails, try regular signOut
        await supabase.auth.signOut();
      }

      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted',
      });

      // Redirect to homepage
      window.location.href = '/';
    } catch (error) {

      toast({
        title: 'Error',
        description: 'Failed to delete account. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeletePassword('');
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="regional">
            <Globe className="w-4 h-4 mr-2" />
            Regional
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="w-4 h-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database className="w-4 h-4 mr-2" />
            Data
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={userSettings.full_name || ''}
                  onChange={(e) =>
                    setUserSettings({ ...userSettings, full_name: e.target.value })
                  }
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userSettings.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed here. Contact support to change your email.
                </p>
              </div>

              <Button onClick={saveUserSettings} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regional Settings */}
        <TabsContent value="regional" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regional Preferences</CardTitle>
              <CardDescription>
                Customize currency, timezone, and date format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={userSettings.currency}
                  onValueChange={(value) =>
                    setUserSettings({ ...userSettings, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={userSettings.timezone}
                  onValueChange={(value) =>
                    setUserSettings({ ...userSettings, timezone: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((timezone) => (
                      <SelectItem key={timezone.value} value={timezone.value}>
                        {timezone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_format">Date Format</Label>
                <Select
                  value={userSettings.date_format}
                  onValueChange={(value) =>
                    setUserSettings({ ...userSettings, date_format: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={saveUserSettings} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">In-App Notifications</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Budget Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when approaching budget limits
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.budget_alerts}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, budget_alerts: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Transaction Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify for large or unusual transactions
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.transaction_alerts}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, transaction_alerts: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Goal Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Reminders about your financial goals
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.goal_reminders}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, goal_reminders: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Recurring Transaction Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Upcoming recurring transactions
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.recurring_reminders}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, recurring_reminders: checked })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Email Notifications</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive important updates via email
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.email_notifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, email_notifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Summary</Label>
                    <p className="text-sm text-muted-foreground">
                      Weekly financial summary email
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.weekly_summary}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, weekly_summary: checked })
                    }
                    disabled={!notificationSettings.email_notifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Monthly Report</Label>
                    <p className="text-sm text-muted-foreground">
                      Detailed monthly financial report
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.monthly_report}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, monthly_report: checked })
                    }
                    disabled={!notificationSettings.email_notifications}
                  />
                </div>
              </div>

              <Button onClick={saveNotificationSettings}>
                Save Notification Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how the app looks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select
                  value={appearanceSettings.theme}
                  onValueChange={(value: 'light' | 'dark' | 'system') =>
                    setAppearanceSettings({ ...appearanceSettings, theme: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact View</Label>
                  <p className="text-sm text-muted-foreground">
                    Show more information in less space
                  </p>
                </div>
                <Switch
                  checked={appearanceSettings.compact_view}
                  onCheckedChange={(checked) =>
                    setAppearanceSettings({ ...appearanceSettings, compact_view: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Account Balances</Label>
                  <p className="text-sm text-muted-foreground">
                    Display account balances in sidebar
                  </p>
                </div>
                <Switch
                  checked={appearanceSettings.show_balances}
                  onCheckedChange={(checked) =>
                    setAppearanceSettings({ ...appearanceSettings, show_balances: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Currency Symbol Position</Label>
                <Select
                  value={appearanceSettings.currency_symbol_position}
                  onValueChange={(value: 'before' | 'after') =>
                    setAppearanceSettings({ ...appearanceSettings, currency_symbol_position: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before">Before amount ($100)</SelectItem>
                    <SelectItem value="after">After amount (100$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={saveAppearanceSettings}>
                Save Appearance Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Change your password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To change your password, please use the password reset link sent to your email.
              </p>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const { error } = await supabase.auth.resetPasswordForEmail(userSettings.email, {
                      redirectTo: `${window.location.origin}/auth/reset-password`,
                    });
                    
                    if (error) throw error;

                    toast({
                      title: 'Success',
                      description: 'Password reset email sent',
                    });
                  } catch (error) {
                    toast({
                      title: 'Error',
                      description: 'Failed to send password reset email',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                Send Password Reset Email
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Manage your active sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Sign out from all devices except this one
              </p>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await supabase.auth.signOut({ scope: 'others' });
                    toast({
                      title: 'Success',
                      description: 'Signed out from other devices',
                    });
                  } catch (error) {
                    toast({
                      title: 'Error',
                      description: 'Failed to sign out from other devices',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                Sign Out Other Sessions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Settings */}
        <TabsContent value="data" className="space-y-4">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Delete Account</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button 
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This will permanently delete:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>All your transactions</li>
              <li>All your accounts</li>
              <li>All your budgets and goals</li>
              <li>All your categories</li>
              <li>Your profile and settings</li>
            </ul>
            
            <div className="space-y-2 pt-4">
              <Label htmlFor="delete-password">Enter your password to confirm</Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
                disabled={deleting}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting || !deletePassword.trim()}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
