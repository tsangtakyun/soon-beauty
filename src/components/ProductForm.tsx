'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { addMonths, format } from 'date-fns';
import { zhHK } from 'date-fns/locale';
import { Check, Pencil, X } from 'lucide-react';
import type { Product } from '@/types/database';

type CategoryOption = {
  id: string;
  name: string;
  color: string;
  parent_id?: string | null;
  sort_order?: number;
};

type InitialValues = Partial<Product> & { category_id?: string | null };

type Props =
  | { mode: 'create'; categories: CategoryOption[]; product?: never; initial?: InitialValues }
  | { mode: 'edit'; categories: CategoryOption[]; product: Product; initial?: never };

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
  in_use:   '使用中',
  finished: '已用完',
  discarded:'已棄置',
};

const SHADE_CATEGORIES = ['腮紅', '唇妝', '眼影', '提亮／高光', '修容'];

const SHADE_OPTIONS: Record<string, string[]> = {
  '腮紅':      ['粉紅', '橙', '裸', '其他'],
  '唇妝':      ['紅', '粉紅', '橙', '裸', '紫', '其他'],
  '眼影':      ['大地色', '紅', '粉紅', '橙', '紫', '裸', '其他'],
  '提亮／高光': ['珠光', '金', '玫瑰金', '其他'],
  '修容':      ['冷棕', '暖棕', '裸', '其他'],
};

function fmt(date: string) {
  return format(new Date(date), 'yyyy年M月d日', { locale: zhHK });
}

function calcEffectiveExpiry(openedDate: string, paoMonths: number): string {
  return format(addMonths(new Date(openedDate), paoMonths), 'yyyy年M月d日', { locale: zhHK });
}

function groupCategories(categories: CategoryOption[]) {
  const parents = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return parents.map((parent) => ({
    parent,
    children: categories
      .filter((c) => c.parent_id === parent.id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }));
}

export default function ProductForm({ categories, mode, product, initial }: Props) {
  const router = useRouter();
  const [formMode, setFormMode] = useState<FormMode>('edit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = mode === 'edit' ? product : initial;
  const leafCategories = categories.filter((c) => c.parent_id);

  const [form, setForm] = useState({
    name:        source?.name ?? '',
    brand:       (source?.brand as string) ?? '',
    category_id: source?.category_id != null ? source.category_id : '',
    tags:        (source?.tags as string[] | null) ?? [] as string[],
    shade:       '',
    pao_months:  source?.pao_months?.toString() ?? '',
    expiry_date: (source?.expiry_date as string) ?? '',
    opened_date: (source?.opened_date as string) ?? '',
    status:      source?.status ?? 'unopened',
    location:    (source?.location as string) ?? '',
    price:       source?.price?.toString() ?? '',
    currency:    (source?.currency as string) ?? 'HKD',
    notes:       (source?.notes as string) ?? '',
  });

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleTag(catId: string) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(catId)
        ? f.tags.filter((t) => t !== catId)
        : [...f.tags, catId],
    }));
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
    if (!user) { setError('請重新登入'); setLoading(false); return; }

    const notesWithShade = form.shade
      ? `${form.notes ? form.notes + '\n' : ''}色系：${form.shade}`
      : form.notes;

    // tags = secondary categories (exclude primary if accidentally in tags)
    const cleanTags = form.tags.filter((t) => t !== form.category_id);

    const payload = {
      user_id:     user.id,
      name:        form.name.trim(),
      brand:       form.brand.trim() || null,
      category_id: form.category_id || null,
      tags:        cleanTags.length > 0 ? cleanTags : null,
      pao_months:  form.pao_months ? parseInt(form.pao_months, 10) : null,
      expiry_date: form.expiry_date || null,
      opened_date: form.opened_date || null,
      status:      form.status as Product['status'],
      location:    form.location.trim() || null,
      price:       form.price ? parseFloat(form.price) : null,
      currency:    form.currency || 'HKD',
      notes:       notesWithShade.trim() || null,
    };

    if (mode === 'create') {
      const { data, error } = await supabase.from('products').insert(payload).select('id').single();
      if (error) { setError(error.message); setLoading(false); return; }
      router.push(`/products/${data.id}`);
      router.refresh();
    } else {
      const { error } = await supabase.from('products').update(payload).eq('id', product!.id);
      if (error) { setError(error.message); setLoading(false); return; }
      router.push(`/products/${product!.id}`);
      router.refresh();
    }
  }

  const grouped = groupCategories(categories);
  const selectedCat = leafCategories.find((c) => c.id === form.category_id);
  const paoNum = form.pao_months ? parseInt(form.pao_months, 10) : null;
  const showShade = selectedCat && SHADE_CATEGORIES.includes(selectedCat.name);
  const shadeOptions = selectedCat ? (SHADE_OPTIONS[selectedCat.name] ?? []) : [];

  // Secondary category candidates = all leaf cats except primary
  const secondaryCandidates = leafCategories.filter((c) => c.id !== form.category_id);
  const selectedTagCats = leafCategories.filter((c) => form.tags.includes(c.id));

  // ── PREVIEW ──────────────────────────────────────────────────────────────
  if (formMode === 'preview') {
    return (
      <div className="space-y-5 animate-fade-in">
        <div
          className="rounded-md p-5 space-y-4 border border-ink-100"
          style={{
            background: selectedCat?.color
              ? `linear-gradient(135deg, ${selectedCat.color}80, white)`
              : '#FAFAF8',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded flex-shrink-0 flex items-center justify-center font-display"
              style={{ backgroundColor: selectedCat?.color ?? '#EEEEEE', color: '#5A4050', fontSize: 18 }}
            >
              {form.name.slice(0, 1)}
            </div>
            <div>
              <div className="text-micro mb-0.5" style={{ color: '#9A7080' }}>
                {selectedCat?.name ?? '未分類'}
                {form.shade && <span> · {form.shade}</span>}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: '#1A1218' }}>
                {form.name}
              </div>
              {form.brand && <div className="text-caption" style={{ color: '#7A6068' }}>{form.brand}</div>}
            </div>
          </div>

          {/* Secondary tags preview */}
          {selectedTagCats.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-micro" style={{ color: '#9A7080' }}>副分類：</span>
              {selectedTagCats.map((c) => (
                <span key={c.id} className="text-micro px-2 py-0.5 rounded-full"
                  style={{ background: c.color, color: '#3A2830' }}>
                  {c.name}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <PreviewField label="狀態"    value={STATUS_LABELS[form.status]} />
            <PreviewField label="PAO"     value={paoNum ? `${paoNum} 個月` : '未知'} />
            {form.opened_date && <PreviewField label="開封日" value={fmt(form.opened_date)} />}
            {form.expiry_date && <PreviewField label="包裝到期日" value={fmt(form.expiry_date)} />}
            {form.opened_date && paoNum && (
              <PreviewField label="實際到期日" value={calcEffectiveExpiry(form.opened_date, paoNum)} highlight />
            )}
            {form.location && <PreviewField label="位置" value={form.location} />}
          </div>

          {form.notes && (
            <div className="text-caption rounded p-3" style={{ background: 'rgba(255,255,255,0.6)', color: '#7A6068' }}>
              📝 {form.notes}
            </div>
          )}
        </div>

        {error && <p className="text-caption" style={{ color: '#A04040' }}>{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={() => setFormMode('edit')} disabled={loading} className="btn-secondary flex-1">
            <Pencil className="w-4 h-4 mr-2" />返回修改
          </button>
          <button type="button" onClick={handleConfirmSave} disabled={loading} className="btn-primary flex-1">
            <Check className="w-4 h-4 mr-2" />
            {loading ? '儲存中...' : '確認儲存'}
          </button>
        </div>
        <p className="text-micro text-center" style={{ color: '#B09898' }}>請確認以上資料正確再儲存</p>
      </div>
    );
  }

  // ── EDIT FORM ─────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleReview} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">產品名稱 *</label>
        <input id="name" type="text" required value={form.name}
          onChange={(e) => update('name', e.target.value)}
          className="input" placeholder="例如：Laneige 水光精華" />
      </div>

      <div>
        <label className="label" htmlFor="brand">品牌</label>
        <input id="brand" type="text" value={form.brand}
          onChange={(e) => update('brand', e.target.value)}
          className="input" placeholder="例如：Laneige" />
      </div>

      {/* Primary category */}
      <div>
        <label className="label" htmlFor="category">主分類</label>
        <select id="category" value={form.category_id}
          onChange={(e) => { update('category_id', e.target.value); update('shade', ''); update('tags', []); }}
          className="input">
          <option value="">未分類</option>
          {grouped.map(({ parent, children }) => (
            <optgroup key={parent.id} label={`── ${parent.name}`}>
              {children.map((child) => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="text-micro text-ink-500 mt-1">主分類用於計算總數量及過期追蹤</p>
      </div>

      {/* Secondary tags — multi-select */}
      {form.category_id && secondaryCandidates.length > 0 && (
        <div>
          <label className="label">
            副分類（選填，可選多個）
          </label>
          <p className="text-micro text-ink-500 mb-2">
            例如眼影盤可同時屬於「腮紅」、「提亮」等分類，方便搜尋
          </p>

          {/* Selected tags */}
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedTagCats.map((c) => (
                <button key={c.id} type="button" onClick={() => toggleTag(c.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-micro transition-all"
                  style={{ background: c.color, color: '#3A2830' }}>
                  {c.name}
                  <X style={{ width: 10, height: 10 }} />
                </button>
              ))}
            </div>
          )}

          {/* Category grid — grouped by parent */}
          <div className="border border-ink-100 rounded-md overflow-hidden">
            {grouped.map(({ parent, children }) => {
              const available = children.filter((c) => c.id !== form.category_id);
              if (available.length === 0) return null;
              return (
                <div key={parent.id} className="border-b border-ink-100 last:border-b-0">
                  <div className="px-3 py-1.5 text-micro font-medium" style={{ background: parent.color + '40', color: '#5A3050' }}>
                    {parent.name}
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2.5">
                    {available.map((c) => {
                      const selected = form.tags.includes(c.id);
                      return (
                        <button key={c.id} type="button" onClick={() => toggleTag(c.id)}
                          className="px-2.5 py-1 rounded-full text-micro transition-all"
                          style={{
                            background: selected ? c.color : '#F5F0F2',
                            color: selected ? '#3A2830' : '#8A7078',
                            border: selected ? `1.5px solid ${c.color}` : '1px solid #E0D4D8',
                            fontWeight: selected ? 500 : 400,
                          }}>
                          {selected && '✓ '}{c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shade selector */}
      {showShade && shadeOptions.length > 0 && (
        <div>
          <label className="label">色系（選填）</label>
          <div className="flex flex-wrap gap-2">
            {shadeOptions.map((s) => (
              <button key={s} type="button"
                onClick={() => update('shade', form.shade === s ? '' : s)}
                className={`px-3 py-1.5 rounded-full text-caption transition-all ${
                  form.shade === s ? 'text-white' : 'border border-ink-200 text-ink-600 hover:bg-ink-50'
                }`}
                style={form.shade === s ? { background: '#B06070' } : {}}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="label" htmlFor="status">狀態</label>
        <select id="status" value={form.status}
          onChange={(e) => update('status', e.target.value as Product['status'])}
          className="input">
          <option value="unopened">未開封</option>
          <option value="in_use">使用中</option>
          <option value="finished">已用完</option>
          <option value="discarded">已棄置</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="pao">PAO（開封後保質期）</label>
        <select id="pao" value={form.pao_months}
          onChange={(e) => update('pao_months', e.target.value)}
          className="input">
          <option value="">未知</option>
          {PAO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <p className="text-micro text-ink-500 mt-1">產品底部開蓋 icon 內的月數</p>
      </div>

      <div>
        <label className="label" htmlFor="opened">開封日期</label>
        <input id="opened" type="date" value={form.opened_date}
          onChange={(e) => update('opened_date', e.target.value)} className="input" />
      </div>

      <div>
        <label className="label" htmlFor="expiry">包裝上的到期日</label>
        <input id="expiry" type="date" value={form.expiry_date}
          onChange={(e) => update('expiry_date', e.target.value)} className="input" />
        <p className="text-micro text-ink-500 mt-1">未開封時效，有寫先填</p>
      </div>

      <div>
        <label className="label" htmlFor="location">擺放位置</label>
        <input id="location" type="text" value={form.location}
          onChange={(e) => update('location', e.target.value)}
          className="input" placeholder="例如：梳妝台、浴室、旅行包" />
      </div>

      <div>
        <label className="label" htmlFor="price">購買價格（選填）</label>
        <div className="flex gap-2">
          <select value={form.currency}
            onChange={(e) => update('currency', e.target.value)}
            className="input" style={{ width: 90, flexShrink: 0 }}>
            <option value="HKD">HKD</option>
            <option value="TWD">TWD</option>
            <option value="CNY">CNY</option>
            <option value="USD">USD</option>
          </select>
          <input id="price" type="number" min="0" step="0.01" value={form.price}
            onChange={(e) => update('price', e.target.value)}
            className="input flex-1" placeholder="0.00" />
        </div>
        <p className="text-micro text-ink-500 mt-1">用於計算鐵皮計劃的節省金額</p>
      </div>

      <div>
        <label className="label" htmlFor="notes">備註</label>
        <textarea id="notes" value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          className="input min-h-[80px] resize-none"
          placeholder="任何想記下的..." />
      </div>

      {error && <p className="text-caption" style={{ color: '#A04040' }}>{error}</p>}

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={() => router.back()}
          className="btn-secondary flex-1" disabled={loading}>取消</button>
        <button type="submit" className="btn-primary flex-1" disabled={!form.name}>
          預覽確認 →
        </button>
      </div>
    </form>
  );
}

function PreviewField({ label, value, highlight = false }: {
  label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className="rounded p-2.5" style={{ background: 'rgba(255,255,255,0.7)' }}>
      <div className="text-micro mb-0.5" style={{ color: '#9A7080' }}>{label}</div>
      <div className="text-caption font-medium" style={{ color: highlight ? '#B06070' : '#1A1218' }}>{value}</div>
    </div>
  );
}
