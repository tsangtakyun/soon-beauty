'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import type { Category } from '@/types/database';

// Curated color palette — soft, harmonious, works well together
const COLOR_PALETTE = [
  '#FFE5E5', '#FFD4D4', '#FFBFBF', // pinks
  '#FFE5D4', '#FFD4B8', // peach
  '#FFF3E5', '#FFE8CC', // cream
  '#FFFAE5', '#FFF2B8', // yellow
  '#E5FFEF', '#C8F5D9', // mint
  '#E5F3FF', '#C8E2FF', // sky
  '#E5E5FF', '#D0D0FF', // lavender
  '#F3E5FF', '#E8C8FF', // violet
  '#FFE5F3', '#FFC8E2', // rose
  '#EEEEEE', '#DDDDDD', // neutral
];

export default function CategoryManager({
  initialCategories,
  productCounts,
}: {
  initialCategories: Category[];
  productCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  async function addCategory(name: string, color: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const maxOrder = Math.max(0, ...categories.map((c) => c.sort_order));

    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name,
        color,
        sort_order: maxOrder + 1,
      })
      .select()
      .single();

    if (!error && data) {
      setCategories([...categories, data as Category]);
      setIsAdding(false);
      router.refresh();
    }
  }

  async function updateCategory(id: string, updates: { name?: string; color?: string }) {
    const supabase = createClient();
    const { error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setCategories(categories.map((c) => c.id === id ? { ...c, ...updates } : c));
      setEditingId(null);
      router.refresh();
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm('確定刪除？呢個分類下嘅產品會變成「未分類」。')) return;
    const supabase = createClient();
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) {
      setCategories(categories.filter((c) => c.id !== id));
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      {categories.map((c) => (
        <CategoryRow
          key={c.id}
          category={c}
          count={productCounts[c.id] ?? 0}
          isEditing={editingId === c.id}
          onEdit={() => setEditingId(c.id)}
          onCancelEdit={() => setEditingId(null)}
          onSave={(updates) => updateCategory(c.id, updates)}
          onDelete={() => deleteCategory(c.id)}
        />
      ))}

      {isAdding ? (
        <CategoryEditRow
          onSave={addCategory}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="fini-empty-state p-4 w-full flex items-center justify-center gap-2 transition-colors"
          style={{ color: '#7A6656' }}
        >
          <Plus className="w-4 h-4" />
          <span className="text-caption">加新分類</span>
        </button>
      )}
    </div>
  );
}

function CategoryRow({
  category,
  count,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  category: Category;
  count: number;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updates: { name: string; color: string }) => void;
  onDelete: () => void;
}) {
  if (isEditing) {
    return (
      <CategoryEditRow
        initialName={category.name}
        initialColor={category.color}
        onSave={(name, color) => onSave({ name, color })}
        onCancel={onCancelEdit}
      />
    );
  }

  return (
    <div className="fini-product-row">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-[16px] flex-shrink-0"
          style={{ backgroundColor: category.color }}
        />
        <div className="min-w-0">
          <div className="text-body font-medium" style={{ color: '#2F2620' }}>{category.name}</div>
          <div className="text-micro" style={{ color: '#8D786B' }}>
            {count} 件產品
          </div>
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={onEdit} className="btn-ghost p-2" style={{ color: '#7A6656' }}>
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="btn-ghost p-2 hover:bg-red-50"
          style={{ color: '#B95E5E' }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CategoryEditRow({
  initialName = '',
  initialColor = COLOR_PALETTE[0],
  onSave,
  onCancel,
}: {
  initialName?: string;
  initialColor?: string;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  return (
    <div className="fini-section-panel p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-[16px] flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input flex-1"
          placeholder="分類名稱"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-10 gap-1.5">
        {COLOR_PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`aspect-square rounded transition-transform ${
              color === c ? 'ring-2 ring-offset-1 scale-110' : 'hover:scale-105'
            }`}
            style={{ backgroundColor: c }}
            aria-label={`選擇顏色 ${c}`}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-secondary flex-1">
          <X className="w-4 h-4 mr-1" />
          取消
        </button>
        <button
          onClick={() => name.trim() && onSave(name.trim(), color)}
          disabled={!name.trim()}
          className="btn-primary flex-1"
        >
          <Check className="w-4 h-4 mr-1" />
          儲存
        </button>
      </div>
    </div>
  );
}
