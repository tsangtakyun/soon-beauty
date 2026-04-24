import { createClient } from '@/lib/supabase/server';
import CategoryManager from '@/components/CategoryManager';
import type { Category } from '@/types/database';

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order');

  // Get product counts per category
  const { data: products } = await supabase
    .from('products')
    .select('category_id')
    .eq('user_id', user.id)
    .in('status', ['unopened', 'in_use']);

  const counts: Record<string, number> = {};
  (products as { category_id: string | null }[] | null)?.forEach((p) => {
    if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="fini-page-hero fini-page-hero-compact">
        <div className="fini-page-hero-copy">
          <p className="fini-section-kicker">Organize Your Library</p>
        <h1 className="font-display text-heading text-ink-900">分類</h1>
        <p className="fini-dash-sub mt-1">
          自訂分類同色系，令產品list更加一目了然。
        </p>
        </div>
      </section>

      <CategoryManager
        initialCategories={(categories as Category[]) ?? []}
        productCounts={counts}
      />
    </div>
  );
}
