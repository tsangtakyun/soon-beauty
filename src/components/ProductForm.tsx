'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/types/database';

type Category = { id: string; name: string; color: string };

type Props =
  | { mode: 'create'; categories: Category[]; product?: never; initial?: Partial<Product> }
  | { mode: 'edit'; categories: Category[]; product: Product; initial?: never };

const PAO_OPTIONS = [
  { value: 3, label: '3 個月 (3M)' },
  { value: 6, label: '6 個月 (6M)' },
  { value: 9, label: '9 個月 (9M)' },
  { value: 12, label: '12 個月 (12M)' },
  { value: 18, label: '18 個月 (18M)' },
  { value: 24, label: '24 個月 (24M)' },
  { value: 36, label: '36 個月 (36M)' },
];

export default function ProductForm({ categories, mode, product, initial }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = mode === 'edit' ? product : initial;

  const [form, setForm] = useState({
    name: source?.name ?? '',
    brand: source?.brand ?? '',
    category_id: source?.category_id ?? categories[0]?.id ?? '',
    pao_months: source?.pao_months?.toString() ?? '',
    expiry_date: source?.expiry_date ?? '',
    opened_date: source?.opened_date ?? '',
    status: source?.status ?? 'unopened',
    location: source?.location ?? '',
    notes: source?.notes ?? '',
  });

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('請重新登入');
      setLoading(false);
      return;
    }

    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      category_id: form.category_id || null,
      pao_months: form.pao_months ? parseInt(form.pao_months, 10) : null,
      expiry_date: form.expiry_date || null,
      opened_date: form.opened_date || null,
      status: form.status as Product['status'],
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (mode === 'create') {
      const { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select('id')
        .single();
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push(`/products/${data.id}`);
      router.refresh();
    } else {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', product!.id);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push(`/products/${product!.id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">產品名稱 *</label>
        <input
          id="name"
          type="text"
          required
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          className="input"
          placeholder="例如：A.E.S.O.P 橄欖油潔面膏"
        />
      </div>

      <div>
        <label className="label" htmlFor="brand">品牌</label>
        <input
          id="brand"
          type="text"
          value={form.brand}
          onChange={(e) => update('brand', e.target.value)}
          className="input"
          placeholder="例如：Aesop"
        />
      </div>

      <div>
        <label className="label" htmlFor="category">分類</label>
        <select
          id="category"
          value={form.category_id}
          onChange={(e) => update('category_id', e.target.value)}
          className="input"
        >
          <option value="">未分類</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="status">狀態</label>
        <select
          id="status"
          value={form.status}
          onChange={(e) => update('status', e.target.value as Product['status'])}
          className="input"
        >
          <option value="unopened">未開封</option>
          <option value="in_use">使用中</option>
          <option value="finished">已用完</option>
          <option value="discarded">已棄置</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="pao">PAO（開封後保質期）</label>
        <select
          id="pao"
          value={form.pao_months}
          onChange={(e) => update('pao_months', e.target.value)}
          className="input"
        >
          <option value="">未知</option>
          {PAO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <p className="text-micro text-ink-500 mt-1">
          產品包裝上嗰個開蓋icon入面寫住嘅數字
        </p>
      </div>

      <div>
        <label className="label" htmlFor="opened">開封日期</label>
        <input
          id="opened"
          type="date"
          value={form.opened_date}
          onChange={(e) => update('opened_date', e.target.value)}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="expiry">包裝上嘅到期日</label>
        <input
          id="expiry"
          type="date"
          value={form.expiry_date}
          onChange={(e) => update('expiry_date', e.target.value)}
          className="input"
        />
        <p className="text-micro text-ink-500 mt-1">
          未開封時效，有寫先填
        </p>
      </div>

      <div>
        <label className="label" htmlFor="location">擺放位置</label>
        <input
          id="location"
          type="text"
          value={form.location}
          onChange={(e) => update('location', e.target.value)}
          className="input"
          placeholder="例如：梳妝台、浴室、旅行包"
        />
      </div>

      <div>
        <label className="label" htmlFor="notes">備註</label>
        <textarea
          id="notes"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          className="input min-h-[80px] resize-none"
          placeholder="任何想記低嘅嘢..."
        />
      </div>

      {error && <p className="text-caption text-status-expired">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary flex-1"
          disabled={loading}
        >
          取消
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={loading || !form.name}>
          {loading ? '儲緊...' : mode === 'create' ? '加入' : '儲存'}
        </button>
      </div>
    </form>
  );
}
