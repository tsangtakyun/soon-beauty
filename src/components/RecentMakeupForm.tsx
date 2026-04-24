'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Check, Loader2, Plus, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Category, Product, RecentMakeupLog } from '@/types/database';

type RecentMakeupFormProps = {
  products: Product[];
  logs: RecentMakeupLog[];
  categories: Category[];
};

type LogPreview = RecentMakeupLog & {
  usedProducts: Product[];
};

const MAGAZINE_TEMPLATES = [
  {
    id: 'soft-cover',
    name: '柔光封面',
    description: '偏奶油紙感，適合日常妝與溫柔自拍。',
  },
  {
    id: 'editorial-note',
    name: '編輯手記',
    description: '像雜誌內頁，會同時突出妝容與使用產品。',
  },
  {
    id: 'product-sheet',
    name: '產品清單',
    description: '以產品排列與妝容重點為主，適合分享今日搭配。',
  },
];

async function uploadSelfie(file: File, userId: string) {
  const supabase = createClient();
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${userId}/makeup/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('product-photos').upload(filename, file, {
    contentType: file.type || 'image/jpeg',
  });

  if (error) throw error;
  const { data } = supabase.storage.from('product-photos').getPublicUrl(filename);
  return data.publicUrl;
}

export default function RecentMakeupForm({ products, logs, categories }: RecentMakeupFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>(MAGAZINE_TEMPLATES[0].id);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrichedLogs = useMemo<LogPreview[]>(() => {
    return logs.map((log) => ({
      ...log,
      usedProducts: products.filter((product) => log.used_product_ids.includes(product.id)),
    }));
  }, [logs, products]);

  const categoryMeta = useMemo(() => {
    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const groups = new Map<
      string,
      {
        id: string;
        name: string;
        color: string;
        products: Product[];
      }
    >();

    products.forEach((product) => {
      const category = product.category_id ? categoryMap.get(product.category_id) : null;
      const groupId = category?.id ?? 'uncategorized';
      const existing = groups.get(groupId);

      if (existing) {
        existing.products.push(product);
        return;
      }

      groups.set(groupId, {
        id: groupId,
        name: category?.name ?? '未分類',
        color: category?.color ?? '#E8DACA',
        products: [product],
      });
    });

    const sortedGroups = Array.from(groups.values()).sort((a, b) => {
      if (a.id === 'uncategorized') return 1;
      if (b.id === 'uncategorized') return -1;
      return a.name.localeCompare(b.name, 'zh-HK');
    });

    return sortedGroups;
  }, [categories, products]);

  const filteredCategoryGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return categoryMeta
      .map((group) => ({
        ...group,
        products: group.products.filter((product) => {
          const matchesCategory = activeCategory === 'all' || group.id === activeCategory;
          const haystack = `${product.name} ${product.brand ?? ''}`.toLowerCase();
          const matchesQuery = query.length === 0 || haystack.includes(query);
          return matchesCategory && matchesQuery;
        }),
      }))
      .filter((group) => group.products.length > 0);
  }, [activeCategory, categoryMeta, searchQuery]);

  function toggleProduct(productId: string) {
    setSelectedProducts((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('請重新登入後再試。');

      let selfieUrl: string | null = null;
      if (file) {
        selfieUrl = await uploadSelfie(file, user.id);
      }

      const { error } = await supabase.from('recent_makeup_logs').insert({
        user_id: user.id,
        title: title.trim() || null,
        notes: notes.trim() || null,
        selfie_url: selfieUrl,
        used_product_ids: selectedProducts,
      });

      if (error) throw error;

      setTitle('');
      setNotes('');
      setSelectedProducts([]);
      setFile(null);
      setPreviewUrl(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗，請稍後再試。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="fini-section-panel">
        <div className="mb-4">
          <p className="fini-section-kicker">妝容記錄</p>
          <h2 className="fini-section-title">記錄最近化妝</h2>
          <p className="fini-dash-sub mt-2">
            上傳一張自拍，記下今次妝容使用了哪些產品，之後就可以在個人首頁快速回看。
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
            <label className="fini-makeup-upload">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const nextFile = e.target.files?.[0] ?? null;
                  setFile(nextFile);
                  setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
                }}
              />
              {previewUrl ? (
                <img src={previewUrl} alt="自拍預覽" className="fini-makeup-upload-image" />
              ) : (
                <div className="fini-makeup-upload-placeholder">
                  <Camera className="w-7 h-7" />
                  <span>加入自拍</span>
                </div>
              )}
            </label>

            <div className="space-y-4">
              <div className="fini-field">
                <label className="fini-field-label" htmlFor="makeup-title">
                  今次妝容
                </label>
                <input
                  id="makeup-title"
                  className="fini-field-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：今日返工妝、約會妝"
                />
              </div>

              <div className="fini-field">
                <label className="fini-field-label" htmlFor="makeup-notes">
                  備註
                </label>
                <textarea
                  id="makeup-notes"
                  className="fini-field-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="可以記錄天氣、場合、整體感覺，或者今次最滿意的位。"
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <label className="fini-field-label">用了哪些產品</label>
                <p className="fini-makeup-help">
                  可先按分類切換，再輸入產品或品牌名稱查找。
                </p>
              </div>
              <div className="fini-makeup-search-wrap">
                <input
                  className="fini-field-input fini-makeup-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋產品或品牌"
                />
              </div>
            </div>
            <div className="fini-makeup-category-row">
              <button
                type="button"
                className={`fini-makeup-category-pill ${activeCategory === 'all' ? 'is-active' : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                全部分類
              </button>
              {categoryMeta.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={`fini-makeup-category-pill ${activeCategory === group.id ? 'is-active' : ''}`}
                  onClick={() => setActiveCategory(group.id)}
                >
                  {group.name}
                  <span>{group.products.length}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-micro" style={{ color: '#9d8777' }}>
                已選 {selectedProducts.length} 件
              </span>
            </div>
            {filteredCategoryGroups.length === 0 ? (
              <div className="fini-empty-state p-5">
                <p className="text-caption" style={{ color: '#8D786B' }}>
                  找不到符合條件的產品。你可以清除搜尋，或先到產品頁新增產品。
                </p>
              </div>
            ) : (
              <div className="fini-makeup-category-stack">
                {filteredCategoryGroups.map((group) => (
                  <section key={group.id} className="fini-makeup-category-panel">
                    <div className="fini-makeup-category-head">
                      <div
                        className="fini-makeup-category-dot"
                        style={{ background: group.color }}
                      />
                      <h3>{group.name}</h3>
                      <span>{group.products.length} 件</span>
                    </div>
                    <div className="fini-makeup-product-grid">
                      {group.products.map((product) => {
                        const active = selectedProducts.includes(product.id);
                        return (
                          <button
                            key={product.id}
                            type="button"
                            className={`fini-makeup-product-pill ${active ? 'is-active' : ''}`}
                            onClick={() => toggleProduct(product.id)}
                          >
                            <span className="fini-makeup-product-pill-copy">
                              <strong>{product.name}</strong>
                              <em>{product.brand ?? group.name}</em>
                            </span>
                            {active && <Check className="w-4 h-4" />}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>

          {error && <div className="fini-login-error">{error}</div>}

          <button type="submit" className="fini-makeup-submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                儲存中...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                儲存今次化妝
              </>
            )}
          </button>
        </form>
      </section>

      <section className="fini-section-panel">
        <div className="fini-makeup-premium-head">
          <div>
            <p className="fini-section-kicker">分享圖預覽</p>
            <h2 className="fini-section-title">雜誌式分享圖</h2>
            <p className="fini-dash-sub mt-2">
              之後可用自拍與已選產品生成雜誌風分享圖，方便直接分享當日妝容與使用清單。
            </p>
          </div>
          <span className="fini-premium-badge">
            <Sparkles className="w-4 h-4" />
            Premium
          </span>
        </div>

        <div className="fini-makeup-template-grid">
          {MAGAZINE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`fini-makeup-template-card ${selectedTemplate === template.id ? 'is-active' : ''}`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <span className="fini-makeup-template-name">{template.name}</span>
              <span className="fini-makeup-template-body">{template.description}</span>
            </button>
          ))}
        </div>

        <div className="fini-makeup-premium-note">
          <p>此功能已預留在頁面內，之後可再接入付費方案、生成圖流程與範本選擇。</p>
        </div>
      </section>

      <section className="fini-section-panel">
        <div className="mb-4">
          <p className="fini-section-kicker">歷史記錄</p>
          <h2 className="fini-section-title">最近化妝紀錄</h2>
        </div>

        {enrichedLogs.length === 0 ? (
          <div className="fini-empty-state p-6">
            <p className="text-caption" style={{ color: '#8D786B' }}>
              尚未有化妝紀錄。儲存第一張自拍之後，這裡就會開始累積你的妝容日誌。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {enrichedLogs.map((log) => (
              <article key={log.id} className="fini-makeup-log-row">
                <div className="fini-makeup-log-thumb">
                  {log.selfie_url ? (
                    <img src={log.selfie_url} alt={log.title ?? '化妝自拍'} className="fini-makeup-log-image" />
                  ) : (
                    <div className="fini-makeup-log-image fini-makeup-log-image-empty">
                      <Image src="/brand/cat-notes.png" alt="" width={84} height={84} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-body font-medium" style={{ color: '#2F2620' }}>
                      {log.title || '未命名妝容'}
                    </h3>
                    <span className="text-micro" style={{ color: '#9D8777' }}>
                      {new Date(log.created_at).toLocaleDateString('zh-HK')}
                    </span>
                  </div>
                  {log.notes && (
                    <p className="text-caption mt-2" style={{ color: '#7A6656', lineHeight: 1.8 }}>
                      {log.notes}
                    </p>
                  )}
                  <div className="fini-makeup-log-tags">
                    {log.usedProducts.length > 0 ? (
                      log.usedProducts.map((product) => (
                        <span key={product.id} className="fini-makeup-log-tag">
                          {product.name}
                        </span>
                      ))
                    ) : (
                      <span className="fini-makeup-log-tag">未有產品紀錄</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
