import { createClient } from '@/lib/supabase/server';
import IngredientAnalyzer from '@/components/IngredientAnalyzer';

export default async function AnalyzePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, color')
    .eq('user_id', user.id)
    .order('sort_order');

  return (
    <IngredientAnalyzer categories={categories ?? []} />
  );
}
