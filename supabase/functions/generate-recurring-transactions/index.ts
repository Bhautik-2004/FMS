// =====================================================
// SUPABASE EDGE FUNCTION: Generate Recurring Transactions
// =====================================================
// This function runs daily via cron to:
// 1. Generate due recurring transactions
// 2. Send notifications for pending approvals
// 3. Update recurring schedules
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurringGenerationResult {
  recurring_id: string;
  transaction_id: string | null;
  expected_date: string;
  status: string;
  message: string;
}

interface PendingNotification {
  user_id: string;
  recurring_id: string;
  occurrence_id: string;
  expected_date: string;
  days_until: number;
  notification_days_before: number;
  template_data: {
    amount: number;
    merchant: string;
    description: string;
    type: string;
  };
  user_email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify cron secret for scheduled invocations
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('Starting recurring transaction generation...');

    // =====================================================
    // STEP 1: Generate pending recurring transactions
    // =====================================================
    
    const { data: generatedResults, error: generateError } = await supabase
      .rpc('generate_pending_recurring_transactions', {
        p_up_to_date: new Date().toISOString().split('T')[0],
        p_days_ahead: 0, // Generate only for today
      }) as { data: RecurringGenerationResult[] | null; error: any };

    if (generateError) {
      console.error('Error generating recurring transactions:', generateError);
      throw generateError;
    }

    const generatedCount = generatedResults?.length || 0;
    const autoApprovedCount = generatedResults?.filter(r => r.status === 'generated').length || 0;
    const pendingApprovalCount = generatedResults?.filter(r => r.status === 'pending').length || 0;
    const errorCount = generatedResults?.filter(r => r.status === 'error').length || 0;

    console.log(`Generated ${generatedCount} recurring transactions:`);
    console.log(`- Auto-approved: ${autoApprovedCount}`);
    console.log(`- Pending approval: ${pendingApprovalCount}`);
    console.log(`- Errors: ${errorCount}`);

    // =====================================================
    // STEP 2: Get pending notifications
    // =====================================================
    
    const { data: pendingNotifications, error: notificationsError } = await supabase
      .rpc('get_pending_notifications', {
        p_date: new Date().toISOString().split('T')[0],
      }) as { data: PendingNotification[] | null; error: any };

    if (notificationsError) {
      console.error('Error fetching pending notifications:', notificationsError);
      throw notificationsError;
    }

    const notificationCount = pendingNotifications?.length || 0;
    console.log(`Found ${notificationCount} pending notifications to send`);

    // =====================================================
    // STEP 3: Send notifications
    // =====================================================
    
    const sentNotifications: string[] = [];
    const failedNotifications: string[] = [];

    if (pendingNotifications && pendingNotifications.length > 0) {
      for (const notification of pendingNotifications) {
        try {
          // Send notification via email or push notification
          // This is a placeholder - integrate with your notification service
          await sendNotification(notification);
          sentNotifications.push(notification.occurrence_id);
          
          console.log(`Notification sent for occurrence ${notification.occurrence_id}`);
        } catch (error) {
          console.error(`Failed to send notification for occurrence ${notification.occurrence_id}:`, error);
          failedNotifications.push(notification.occurrence_id);
        }
      }
    }

    // =====================================================
    // STEP 4: Return summary
    // =====================================================
    
    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      generation: {
        total: generatedCount,
        autoApproved: autoApprovedCount,
        pendingApproval: pendingApprovalCount,
        errors: errorCount,
        details: generatedResults,
      },
      notifications: {
        total: notificationCount,
        sent: sentNotifications.length,
        failed: failedNotifications.length,
        sentIds: sentNotifications,
        failedIds: failedNotifications,
      },
    };

    console.log('Recurring transaction generation completed successfully');
    console.log(JSON.stringify(summary, null, 2));

    return new Response(
      JSON.stringify(summary),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-recurring-transactions function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// =====================================================
// HELPER: Send notification
// =====================================================
// Integrate with your notification service (email, push, SMS)
// =====================================================

async function sendNotification(notification: PendingNotification): Promise<void> {
  // TODO: Integrate with your notification service
  // Examples:
  // - SendGrid for email
  // - Twilio for SMS
  // - Firebase Cloud Messaging for push notifications
  // - Slack/Discord webhooks
  
  // For now, log the notification (replace with actual implementation)
  const message = formatNotificationMessage(notification);
  
  console.log('='.repeat(50));
  console.log('NOTIFICATION TO SEND:');
  console.log(`To: ${notification.user_email}`);
  console.log(`Subject: Recurring Transaction Due`);
  console.log(`Message:\n${message}`);
  console.log('='.repeat(50));
  
  // Example: Send via email (uncomment and configure)
  /*
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: notification.user_email }],
        subject: 'Recurring Transaction Due',
      }],
      from: { email: 'noreply@yourapp.com' },
      content: [{
        type: 'text/plain',
        value: message,
      }],
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.statusText}`);
  }
  */
  
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
}

// =====================================================
// HELPER: Format notification message
// =====================================================

function formatNotificationMessage(notification: PendingNotification): string {
  const { template_data, expected_date, days_until } = notification;
  const { amount, merchant, description, type } = template_data;
  
  const daysText = days_until === 0 
    ? 'today' 
    : days_until === 1 
    ? 'tomorrow' 
    : `in ${days_until} days`;
  
  return `
Hello,

You have a recurring ${type} due ${daysText} (${expected_date}).

Details:
- Merchant: ${merchant}
- Amount: $${amount.toFixed(2)}
- Description: ${description}

Please log in to your account to approve or skip this transaction.

If this transaction should be processed automatically in the future, you can enable auto-approval in your recurring transaction settings.

Best regards,
Your Financial Management System
  `.trim();
}

// =====================================================
// USAGE INSTRUCTIONS
// =====================================================
/*

1. Deploy this function to Supabase:
   ```bash
   supabase functions deploy generate-recurring-transactions
   ```

2. Set environment variables:
   ```bash
   supabase secrets set CRON_SECRET=your-secret-key
   supabase secrets set SENDGRID_API_KEY=your-sendgrid-key  # Optional
   ```

3. Schedule with cron (runs daily at 2 AM UTC):
   Add to supabase/functions/_shared/cron.sql or use Supabase Dashboard

   ```sql
   SELECT cron.schedule(
     'generate-recurring-transactions-daily',
     '0 2 * * *',  -- 2 AM UTC every day
     $$
     SELECT
       net.http_post(
         url:='https://your-project.supabase.co/functions/v1/generate-recurring-transactions',
         headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
         body:='{}'::jsonb
       ) AS request_id;
     $$
   );
   ```

4. Test manually:
   ```bash
   curl -X POST \
     'https://your-project.supabase.co/functions/v1/generate-recurring-transactions' \
     -H 'Authorization: Bearer YOUR_CRON_SECRET' \
     -H 'Content-Type: application/json'
   ```

5. View logs:
   ```bash
   supabase functions logs generate-recurring-transactions
   ```

*/
