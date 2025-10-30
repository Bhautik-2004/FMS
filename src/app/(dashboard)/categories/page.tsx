import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CategoriesPageClient } from '@/components/categories/categories-page-client';

export default async function CategoriesPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all categories (system + user)
  const { data: categories, error } = await (supabase as any)
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {

  }

  // Fetch category statistics
  const { data: stats, error: statsError } = await (supabase as any)
    .from('category_statistics')
    .select('*');

  if (statsError) {

  }

  return <CategoriesPageClient initialCategories={categories || []} categoryStats={stats || []} />;
}
