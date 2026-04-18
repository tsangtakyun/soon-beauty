'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Pencil, Trash2, PackageOpen, CheckCircle } from 'lucide-react';
import type { ProductWithExpiry } from '@/types/database';

export default function ProductActions({ product }: { product: ProductWithExpiry }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function markOpened() {
    setLoading('open');
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('products')
      .update({ opened_date: today, status: 'in_use' })
      .eq('id', product.id);
    setLoading(null);
    router.refresh();
  }

  async function markFinished() {
    setLoading('finish');
    const supabase = createClient();
    await supabase
      .from('products')
      .update({ status: 'finished' })
      .eq('id', product.id);
    setLoading(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm('確定要刪除此產品？此操作無法復原。')) return;
    setLoading('delete');
    const supabase = createClient();
    await supabase.from('products').delete().eq('id', product.id);
    router.push('/products');
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {product.status === 'unopened' && (
        <button
          onClick={markOpened}
          disabled={loading === 'open'}
          className="btn-primary w-full"
        >
          <PackageOpen className="w-4 h-4 mr-2" />
          {loading === 'open' ? '記錄中...' : '今日開封'}
        </button>
      )}

      {product.status === 'in_use' && (
        <button
          onClick={markFinished}
          disabled={loading === 'finish'}
          className="btn-primary w-full"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {loading === 'finish' ? '記錄中...' : '標記為已用完'}
        </button>
      )}

      <div className="flex gap-2">
        <Link href={`/products/${product.id}/edit`} className="btn-secondary flex-1">
          <Pencil className="w-4 h-4 mr-2" />
          編輯
        </Link>
        <button
          onClick={handleDelete}
          disabled={loading === 'delete'}
          className="btn-secondary flex-1 text-status-expired hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {loading === 'delete' ? '刪除中...' : '刪除'}
        </button>
      </div>
    </div>
  );
}
