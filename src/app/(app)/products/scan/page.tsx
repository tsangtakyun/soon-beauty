import { createClient } from '@/lib/supabase/server';
import ScanProductForm from '@/components/ScanProductForm';

export default async function ScanProductPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, color, parent_id, sort_order')
    .eq('user_id', user.id)
    .order('sort_order');

  return <ScanProductForm categories={categories ?? []} />;
}
