import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import ProductForm from '@/components/ProductForm';

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, color, parent_id, sort_order')
    .eq('user_id', user.id)
    .order('sort_order');

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-caption text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </Link>

      <div>
        <h1 className="font-display text-heading text-ink-900">加新產品</h1>
        <p className="text-caption text-ink-500 mt-1">
          Phase 1 先用手動輸入，掃碼同拍照辨識會喺Phase 2加。
        </p>
      </div>

      <div className="card p-5">
        <ProductForm categories={categories ?? []} mode="create" />
      </div>
    </div>
  );
}
