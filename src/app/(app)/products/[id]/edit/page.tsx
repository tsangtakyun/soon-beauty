import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import ProductForm from '@/components/ProductForm';
import type { Product } from '@/types/database';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('categories').select('id, name, color, parent_id, sort_order').eq('user_id', user.id).order('sort_order'),
  ]);

  if (!product) notFound();

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
      <Link
        href={`/products/${id}`}
        className="inline-flex items-center gap-1 text-caption text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </Link>

      <h1 className="font-display text-heading text-ink-900">編輯產品</h1>

      <div className="card p-5">
        <ProductForm
          mode="edit"
          product={product as Product}
          categories={categories ?? []}
        />
      </div>
    </div>
  );
}
