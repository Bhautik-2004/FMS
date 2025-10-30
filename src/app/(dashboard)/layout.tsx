import { createClient } from '@/lib/supabase/server';
import { DashboardLayoutClient } from '@/components/dashboard/layout-client';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user profile data
  let userProfile = null;
  if (user) {
    const { data } = await supabase
      .from('user_profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    const profile = data as { full_name: string | null; avatar_url: string | null } | null;

    userProfile = {
      email: user.email,
      name: profile?.full_name || undefined,
      avatar: profile?.avatar_url || undefined,
    };
  }

  return <DashboardLayoutClient user={userProfile}>{children}</DashboardLayoutClient>;
}
