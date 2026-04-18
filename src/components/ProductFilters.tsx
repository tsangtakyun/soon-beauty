'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

type Category = { id: string; name: string; color: string };

const STATUS_FILTERS = [
  { key: '', label: '全部' },
  { key: 'in_use', label: '使用中' },
  { key: 'unopened', label: '未開封' },
  { key: 'expiring', label: '快過期' },
  { key: 'expired', label: '已過期' },
  { key: 'finished', label: '用完' },
];

const SORT_OPTIONS = [
  { key: 'expiry_asc', label: '最快過期' },
  { key: 'name_asc', label: '名稱' },
  { key: 'newest', label: '最新加' },
];

export default function ProductFilters({
  currentFilter,
  currentCategory,
  currentSort,
  categories,
}: {
  currentFilter?: string;
  currentCategory?: string;
  currentSort: string;
  categories: Category[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/products?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      {/* Status chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => updateParam('filter', f.key)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 text-caption rounded-full border transition-colors',
              (currentFilter ?? '') === f.key
                ? 'bg-ink-900 text-white border-ink-900'
                : 'bg-white text-ink-600 border-ink-200 hover:border-ink-300'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => updateParam('category', '')}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 text-caption rounded-full border transition-colors',
              !currentCategory
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white text-ink-600 border-ink-200 hover:border-ink-300'
            )}
          >
            全部分類
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => updateParam('category', c.id)}
              className={cn(
                'flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-caption rounded-full border transition-colors',
                currentCategory === c.id
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-white text-ink-600 border-ink-200 hover:border-ink-300'
              )}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Sort */}
      <div className="flex items-center gap-2 text-caption">
        <span className="text-ink-500">排序：</span>
        <select
          value={currentSort}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="text-ink-800 bg-transparent border-none focus:outline-none cursor-pointer"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
