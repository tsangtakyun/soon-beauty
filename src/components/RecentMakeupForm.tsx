'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Check, ChevronDown, Loader2, Plus, Share2, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/image';
import type { Category, Product, RecentMakeupLog } from '@/types/database';
import {
  DEFAULT_MAKEUP_SHARE_TEMPLATE_ID,
  getMakeupShareTemplate,
  type MakeupShareTemplate,
} from '@/lib/recent-makeup-share';

type RecentMakeupFormProps = {
  products: Product[];
  logs: RecentMakeupLog[];
  categories: Category[];
};

type LogPreview = RecentMakeupLog & {
  usedProducts: Product[];
};

async function uploadSelfie(file: File, userId: string) {
  const supabase = createClient();
  const compressed = await compressImage(file, { maxDimension: 1600, quality: 0.9 });
  const filename = `${userId}/makeup/${Date.now()}-${crypto.randomUUID()}.jpg`;
  const imageBuffer = Uint8Array.from(atob(compressed.base64), (char) => char.charCodeAt(0));
  const { error } = await supabase.storage.from('product-photos').upload(filename, imageBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (error) throw error;
  const { data } = supabase.storage.from('product-photos').getPublicUrl(filename);
  return data.publicUrl;
}

async function getShareImagePayload(file: File | null, selfieUrl: string | null) {
  if (file) {
    return await compressImage(file, { maxDimension: 1400, quality: 0.86 });
  }

  if (!selfieUrl) return null;

  const response = await fetch(selfieUrl);
  if (!response.ok) {
    throw new Error('未能讀取自拍圖片');
  }

  const blob = await response.blob();
  const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
  const fetchedFile = new File([blob], `share-source.${ext}`, {
    type: blob.type || 'image/jpeg',
  });

  return await compressImage(fetchedFile, { maxDimension: 1400, quality: 0.86 });
}

export default function RecentMakeupForm({ products, logs, categories }: RecentMakeupFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('collapsed');
  const [searchQuery, setSearchQuery] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharePreviewLoading, setSharePreviewLoading] = useState(false);
  const [sharePreviewError, setSharePreviewError] = useState<string | null>(null);
  const [shareGenerating, setShareGenerating] = useState(false);
  const [shareGenerateError, setShareGenerateError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [generatedShareUrl, setGeneratedShareUrl] = useState<string | null>(null);
  const [sharePreviewData, setSharePreviewData] = useState<{
    preview: {
      template: MakeupShareTemplate;
      prompt: string;
      summary: {
        title: string;
        notes: string;
        productCount: number;
        orientation: 'portrait' | 'square';
      };
    };
  } | null>(null);
  const activeShareTemplate = getMakeupShareTemplate(DEFAULT_MAKEUP_SHARE_TEMPLATE_ID);

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
    if (activeCategory === 'collapsed') {
      return [];
    }
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

  const selectedProductObjects = useMemo(
    () => products.filter((product) => selectedProducts.includes(product.id)),
    [products, selectedProducts]
  );

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

  async function handlePreviewShareTemplate() {
    setSharePreviewLoading(true);
    setSharePreviewError(null);

    try {
      const response = await fetch('/api/recent-makeup/share-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: DEFAULT_MAKEUP_SHARE_TEMPLATE_ID,
          title: title.trim() || null,
          notes: notes.trim() || null,
          selfieUrl: previewUrl,
          selectedProducts: selectedProductObjects.map((product) => ({
            name: product.name,
            brand: product.brand,
          })),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? '未能建立分享圖規格');
      }

      setSharePreviewData(payload);
    } catch (err) {
      setSharePreviewError(err instanceof Error ? err.message : '未能建立分享圖規格');
    } finally {
      setSharePreviewLoading(false);
    }
  }

  async function handleGenerateShareImage() {
    setShareGenerating(true);
    setShareGenerateError(null);
    setGeneratedShareUrl(null);

    try {
      const shareImage = await getShareImagePayload(file, logs[0]?.selfie_url ?? null);

      const response = await fetch('/api/recent-makeup/generate-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: DEFAULT_MAKEUP_SHARE_TEMPLATE_ID,
          title: title.trim() || null,
          notes: notes.trim() || null,
          selfieUrl: logs[0]?.selfie_url ?? null,
          ...(shareImage ?? {}),
          selectedProducts: selectedProductObjects.map((product) => ({
            name: product.name,
            brand: product.brand,
          })),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? '未能生成分享圖');
      }

      setGeneratedShareUrl(payload.imageUrl);
    } catch (err) {
      setShareGenerateError(err instanceof Error ? err.message : '未能生成分享圖');
    } finally {
      setShareGenerating(false);
    }
  }

  async function handleShareGeneratedImage() {
    if (!generatedShareUrl) return;

    setSharing(true);

    try {
      const shareTitle = title.trim() || '今日妝容';
      const shareText = `${shareTitle}｜Neaty Beauty 妝容分享`;

      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          const response = await fetch(generatedShareUrl);
          const blob = await response.blob();
          const file = new File([blob], 'neaty-beauty-makeup-share.png', {
            type: blob.type || 'image/png',
          });

          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              title: shareTitle,
              text: shareText,
              files: [file],
            });
            return;
          }
        } catch {
          // Fallback to URL sharing below if file-based share isn't available.
        }

        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: generatedShareUrl,
        });
        return;
      }

      window.open(generatedShareUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setShareGenerateError('未能開啟分享，請稍後再試。');
      }
    } finally {
      setSharing(false);
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

          <section className="fini-makeup-premium-hero">
            <div className="fini-makeup-premium-hero-copy">
              <p className="fini-section-kicker">AI 妝容封面</p>
              <h2 className="fini-section-title">生成今日妝容雜誌圖</h2>
              <p className="fini-dash-sub mt-2">
                以自拍、妝容標題與已選產品，直接整理成可分享的旁註解析版妝容圖。
              </p>
              <div className="fini-makeup-premium-hero-actions">
                <button
                  type="button"
                  className="fini-makeup-generate-button"
                  onClick={handleGenerateShareImage}
                  disabled={shareGenerating}
                >
                  {shareGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      生成 AI 妝容封面
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="fini-home-secondary"
                  onClick={handlePreviewShareTemplate}
                  disabled={sharePreviewLoading}
                >
                  {sharePreviewLoading ? '整理中...' : '查看模板規格'}
                </button>
              </div>
              <p className="fini-makeup-premium-hero-note">
                目前固定使用「旁註解析版」，先將生成效果與閱讀感打磨好。
              </p>
            </div>
            <div className="fini-makeup-demo-card" aria-hidden="true">
              <span className="fini-makeup-demo-kicker">AI DEMO</span>
              <strong>{activeShareTemplate.name}</strong>
              <p>{activeShareTemplate.tagline}</p>
            </div>
          </section>

          {shareGenerateError && <div className="fini-login-error">{shareGenerateError}</div>}

          {generatedShareUrl && (
            <div className="fini-makeup-generated-panel">
              <img src={generatedShareUrl} alt="AI 妝容封面" className="fini-makeup-generated-image" />
              <div className="fini-makeup-generated-actions">
                <button
                  type="button"
                  className="fini-makeup-generate-button"
                  onClick={handleShareGeneratedImage}
                  disabled={sharing}
                >
                  {sharing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      準備分享中...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      分享這張圖
                    </>
                  )}
                </button>
                <a href={generatedShareUrl} target="_blank" rel="noreferrer" className="fini-home-secondary">
                  開啟分享圖
                </a>
              </div>
            </div>
          )}

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
                className={`fini-makeup-category-pill ${activeCategory !== 'collapsed' ? 'is-active' : ''}`}
                onClick={() =>
                  setActiveCategory((current) => (current === 'collapsed' ? 'all' : 'collapsed'))
                }
              >
                {activeCategory === 'collapsed' ? '展開全部分類' : '收起產品分類'}
                <ChevronDown className={`w-4 h-4 ${activeCategory !== 'collapsed' ? 'rotate-180' : ''}`} />
              </button>
              {activeCategory !== 'collapsed' && categoryMeta.map((group) => (
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
            {activeCategory === 'collapsed' ? (
              <div className="fini-empty-state p-5">
                <p className="text-caption" style={{ color: '#8D786B' }}>
                  先展開分類清單，再挑選這次妝容使用的產品。
                </p>
              </div>
            ) : filteredCategoryGroups.length === 0 ? (
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
            <p className="fini-section-kicker">生成方向</p>
            <h2 className="fini-section-title">{activeShareTemplate.name}</h2>
            <p className="fini-dash-sub mt-2">{activeShareTemplate.description}</p>
          </div>
          <span className="fini-premium-badge">
            <Sparkles className="w-4 h-4" />
            固定套用
          </span>
        </div>

        <div className="fini-makeup-premium-note">
          <p>用家按下 AI 生成後，會直接以旁註解析版輸出，暫時不再提供其他模板選擇。</p>
        </div>

        {sharePreviewError && <div className="fini-login-error">{sharePreviewError}</div>}

        {sharePreviewData && (
          <div className="fini-makeup-preview-panel">
            <div className="fini-makeup-preview-meta">
              <div>
                <p className="fini-section-kicker">模板摘要</p>
                <h3>{sharePreviewData.preview.template.name}</h3>
              </div>
              <span className="fini-premium-state is-on">
                主模板
              </span>
            </div>
            <div className="fini-makeup-preview-summary">
              <span>比例：{sharePreviewData.preview.summary.orientation === 'portrait' ? '直向 4:5' : '正方形 1:1'}</span>
              <span>產品數量：{sharePreviewData.preview.summary.productCount} 件</span>
              <span>標題：{sharePreviewData.preview.summary.title}</span>
            </div>
            <pre className="fini-makeup-preview-prompt">{sharePreviewData.preview.prompt}</pre>
          </div>
        )}
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
