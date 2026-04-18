'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { addMonths, format } from 'date-fns';
import { zhHK } from 'date-fns/locale';
import { Check, Pencil } from 'lucide-react';
import type { Product } from '@/types/database';

type Category = { id: string; name: string; color: string };

type Props =
  | { mode: 'create'; categories: Category[]; product?: never; initial?: Partial<Product> }
  | { mode: 'edit'; categories: Category[]; product: Product; initial?: never };

type FormMode = 'edit' | 'preview';

const PAO_OPTIONS = [
  { value: 3,  label: '3 個月 (3M)' },
  { value: 6,  label: '6 個月 (6M)' },
  { value: 9,  label: '9 個月 (9M)' },
  { value: 12, label: '12 個月 (12M)' },
  { value: 18, label: '18 個月 (18M)' },
  { value: 24, label: '24 個月 (24M)' },
  { value: 36, label: '36 個月 (36M)' },
];

const STATUS_LABELS: Record<string, string> = {
  unopened: '未開封',
  in_use: '使用中',
  finished: '已用完',
  discarded: '已棄置',
};

function fmt(date: string) {
  return format(new Date(date), 'yyyy年M月d日', { locale: zhHK });
}

function calcEffectiveExpiry(openedDate: string, paoMonths: number): string {
  return format(addMonths(new Date(openedDate), paoMonths), 'yyyy年M月d日', { locale: zhHK });
}

export default function ProductForm({ categories, mode, product, initial }: Props) {
  const router = useRouter();
  const [formMode, setFormMode] = useState<FormMode>('edit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = mode === 'edit' ? product : initial;

  const [form, setForm] = useState({
    name: source?.name ?? '',
    brand: (source?.brand as string) ?? '',
    category_id: source?.category_id ?? categories[0]?.id ?? '',
    pao_months: source?.pao_months?.toString() ?? '',
    expiry_date: (source?.expiry_date as string) ?? '',
    opened_date: (source?.opened_date as string) ?? '',
    status: source?.status ?? 'unopened',
    location: (source?.location as string) ?? '',
    notes: (source?.notes as string) ?? '',
  });

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleReview(e: React.FormEvent) {
    e.preventDefault();
    setFormMode('preview');
  }

  async function handleConfirmSave() {
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
      if (error) { setError(error.message); setLoading(false); return; }
      router.push(`/products/${data.id}`);
      router.refresh();
    } else {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', product!.id);
      if (error) { setError(error.message); setLoading(false); return; }
      router.push(`/products/${product!.id}`);
      router.refresh();
    }
  }

  const selectedCategory = categories.find((c) => c.id === form.category_id);
  const paoNum = form.pao_months ? parseInt(form.pao_months, 10) : null;

  // ── PREVIEW ──────────────────────────────────────────────────────────────
  if (formMode === 'preview') {
    return (
      <div className="space-y-5 animate-fade-in">
        {/* Product card preview */}
        <div
          className="rounded-md p-5 space-y-4 border border-ink-100"
          style={{
            background: selectedCategory?.color
              ? `linear-gradient(135deg, ${selectedCategory.color}60, white)`
              : '#FAFAF8',
          }}
        >
          {/* Category + name */}
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded flex-shrink-0 flex items-center justify-center font-display text-title text-ink-700"
              style={{ backgroundColor: selectedCategory?.color ?? '#EEEEEE' }}
            >
              {form.name.slice(0, 1)}
            </div>
            <div>
              <div className="text-micro text-ink-500 mb-0.5">
                {selectedCategory?.name ?? '未分類'}
              </div>
              <div className="font-display text-heading text-ink-900 leading-tight">
                {form.name}
              </div>
              {form.brand && (
                <div className="text-caption text-ink-600">{form.brand}</div>
              )}
            </div>
          </div>

          {/* Key details */}
          <div className="grid grid-cols-2 gap-3">
            <PreviewField label="狀態" value={STATUS_LABELS[form.status]} />
            <PreviewField
              label="PAO"
              value={paoNum ? `${paoNum} 個月` : '未知'}
            />
            {form.opened_date && (
              <PreviewField label="開封日" value={fmt(form.opened_date)} />
            )}
            {form.expiry_date && (
              <PreviewField label="包裝到期日" value={fmt(form.expiry_date)} />
            )}
            {form.opened_date && paoNum && (
              <PreviewField
                label="實際到期日"
                value={calcEffectiveExpiry(form.opened_date, paoNum)}
                highlight
              />
            )}
            {form.location && (
              <PreviewField label="位置" value={form.location} />
            )}
          </div>

          {form.notes && (
            <div className="text-caption text-ink-600 bg-white/60 rounded p-3">
              📝 {form.notes}
            </div>
          )}
        </div>

        {error && (
          <p className="text-caption text-red-600">{error}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFormMode('edit')}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            <Pencil className="w-4 h-4 mr-2" />
            返回修改
          </button>
          <button
            type="button"
            onClick={handleConfirmSave}
            disabled={loading}
            className="btn-primary flex-1"
          >
            <Check className="w-4 h-4 mr-2" />
            {loading ? '儲緊...' : '確認儲存'}
          </button>
        </div>

        <p className="text-micro text-ink-400 text-center">
          請確認以上資料正確再儲存
        </p>
      </div>
    );
  }

  // ── EDIT FORM ─────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleReview} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">產品名稱 *</label>
        <input
          id="name"
          type="text"
          required
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          className="input"
          placeholder="例如：Classic Clean Anti-Dandruff Shampoo"
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
          placeholder="例如：head & shoulders"
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
          產品底部開蓋icon入面寫住嘅月數
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
        <p className="text-micro text-ink-500 mt-1">未開封時效，有寫先填</p>
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

      {error && <p className="text-caption text-red-600">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary flex-1"
          disabled={loading}
        >
          取消
        </button>
        <button
          type="submit"
          className="btn-primary flex-1"
          disabled={!form.name}
        >
          {mode === 'create' ? '預覽確認 →' : '預覽確認 →'}
        </button>
      </div>
    </form>
  );
}

function PreviewField({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-white/70 rounded p-2.5">
      <div className="text-micro text-ink-500 mb-0.5">{label}</div>
      <div className={`text-caption font-medium ${highlight ? 'text-brand-600' : 'text-ink-900'}`}>
        {value}
      </div>
    </div>
  );
}
