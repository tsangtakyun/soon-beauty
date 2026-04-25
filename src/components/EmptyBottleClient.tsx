'use client';

import { useMemo, useState } from 'react';
import { Camera, Check, Download, Loader2, Plus, Search, Share2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/image';
import { createPanRecordCardDataUrl } from '@/lib/pan-record-card';
import type { Product, ProductPanLog } from '@/types/database';

const MAX_WATCHLIST = 10;

type Props = {
  allActive: Product[];
  thisMonth: Product[];
  thisMonthSavings: number;
  monthLabel: string;
  initialLogs: ProductPanLog[];
  finishedTracked: Product[];
};

function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatLoggedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildMonthlyReportHtml({
  monthLabel,
  thisMonth,
  thisMonthSavings,
}: {
  monthLabel: string;
  thisMonth: Product[];
  thisMonthSavings: number;
}) {
  const items = thisMonth.length
    ? thisMonth
        .map(
          (product) =>
            `<li style="margin:0 0 10px;padding:14px 16px;border:1px solid #E8DDCF;border-radius:18px;background:#FFFDF8;">
              <div style="font-size:16px;font-weight:600;color:#2F2620;">${escapeHtml(product.name)}</div>
              <div style="font-size:13px;color:#8D786B;margin-top:4px;">${escapeHtml(product.brand ?? '我的收藏')}</div>
            </li>`
        )
        .join('')
    : '<li style="margin:0;padding:18px 16px;border:1px dashed #E8DDCF;border-radius:18px;color:#8D786B;background:#FFFDF8;">本月尚未有完成紀錄，慢慢用都算是一種進度。</li>';

  return `
    <div style="width:480px;padding:32px;background:#FAFAF8;color:#1A1218;font-family:system-ui,sans-serif;border:0.5px solid #E0D4D8;border-radius:28px;">
      <div style="letter-spacing:0.08em;font-size:13px;color:#A28C7B;margin-bottom:10px;">NEATY BEAUTY</div>
      <div style="font-size:30px;font-weight:700;color:#2F2620;margin-bottom:6px;">${monthLabel} 鐵皮報告</div>
      <div style="font-size:15px;color:#8D786B;line-height:1.75;margin-bottom:18px;">今月一共完成 <strong style="color:#8A6A52;">${thisMonth.length}</strong> 件產品${thisMonthSavings > 0 ? `，大約節省 <strong style="color:#66806A;">HK$${thisMonthSavings.toFixed(0)}</strong>` : ''}。</div>
      <div style="padding:18px 20px;border-radius:22px;background:#F6EEE6;margin-bottom:18px;">
        <div style="font-size:15px;color:#A28C7B;margin-bottom:8px;">本月小總結</div>
        <div style="font-size:24px;font-weight:700;color:#2F2620;">每一件用完，都是整理得更輕盈的一步。</div>
      </div>
      <ul style="list-style:none;margin:0;padding:0;">${items}</ul>
    </div>
  `;
}

async function uploadProgressPhoto(file: File, userId: string, productId: string) {
  const supabase = createClient();
  const compressed = await compressImage(file, { maxDimension: 1600, quality: 0.9 });
  const filename = `${userId}/pan-progress/${productId}/${Date.now()}-${crypto.randomUUID()}.jpg`;
  const imageBuffer = Uint8Array.from(atob(compressed.base64), (char) => char.charCodeAt(0));
  const { error } = await supabase.storage.from('product-photos').upload(filename, imageBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (error) throw error;
  const { data } = supabase.storage.from('product-photos').getPublicUrl(filename);
  return data.publicUrl;
}

export default function EmptyBottleClient({
  allActive,
  thisMonth,
  thisMonthSavings,
  monthLabel,
  initialLogs,
  finishedTracked,
}: Props) {
  const [products, setProducts] = useState<Product[]>(allActive);
  const [panLogs, setPanLogs] = useState<ProductPanLog[]>(initialLogs);
  const [completedProducts, setCompletedProducts] = useState<Product[]>(finishedTracked);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [marking, setMarking] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [logProduct, setLogProduct] = useState<Product | null>(null);
  const [logFile, setLogFile] = useState<File | null>(null);
  const [logPreviewUrl, setLogPreviewUrl] = useState<string | null>(null);
  const [logNote, setLogNote] = useState('');
  const [savingLog, setSavingLog] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [recordProductId, setRecordProductId] = useState<string | null>(null);
  const [recordImageUrl, setRecordImageUrl] = useState<string | null>(null);
  const [downloadingRecord, setDownloadingRecord] = useState(false);
  const [sharingRecord, setSharingRecord] = useState(false);

  const currentMonthKey = getMonthKey();
  const watchlist = products.filter((p) => p.on_watchlist && (p.status === 'in_use' || p.status === 'unopened'));
  const nonWatchlist = products.filter((p) => !p.on_watchlist && (p.status === 'in_use' || p.status === 'unopened'));

  const logsByProduct = useMemo(() => {
    const map = new Map<string, ProductPanLog[]>();
    panLogs.forEach((log) => {
      const current = map.get(log.product_id) ?? [];
      current.push(log);
      map.set(log.product_id, current);
    });
    map.forEach((entries, productId) => {
      map.set(
        productId,
        [...entries].sort((a, b) => b.logged_date.localeCompare(a.logged_date))
      );
    });
    return map;
  }, [panLogs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return nonWatchlist;
    return nonWatchlist.filter((p) => p.name.toLowerCase().includes(q) || (p.brand ?? '').toLowerCase().includes(q));
  }, [search, nonWatchlist]);

  async function addToWatchlist(product: Product) {
    if (watchlist.length >= MAX_WATCHLIST) return;
    setToggling(product.id);
    const supabase = createClient();
    await supabase.from('products').update({ on_watchlist: true }).eq('id', product.id);
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, on_watchlist: true } : p)));
    setToggling(null);
    setShowPicker(false);
    setSearch('');
  }

  async function removeFromWatchlist(product: Product) {
    setToggling(product.id);
    const supabase = createClient();
    await supabase.from('products').update({ on_watchlist: false }).eq('id', product.id);
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, on_watchlist: false } : p)));
    setToggling(null);
  }

  async function markFinished(product: Product) {
    setMarking(product.id);
    const supabase = createClient();
    await supabase.from('products').update({ status: 'finished', on_watchlist: false }).eq('id', product.id);
    const finishedProduct = { ...product, status: 'finished' as const, on_watchlist: false };
    setProducts((prev) =>
      prev.map((item) => (item.id === product.id ? finishedProduct : item))
    );
    if ((logsByProduct.get(product.id) ?? []).length > 0) {
      setCompletedProducts((prev) =>
        prev.some((item) => item.id === product.id) ? prev : [finishedProduct, ...prev]
      );
    }
    setMarking(null);
  }

  function openProgressModal(product: Product) {
    const currentLog = (logsByProduct.get(product.id) ?? []).find((entry) => entry.month_key === currentMonthKey) ?? null;
    setLogProduct(product);
    setLogFile(null);
    setLogPreviewUrl(currentLog?.photo_url ?? null);
    setLogNote(currentLog?.notes ?? '');
    setLogError(null);
  }

  function closeProgressModal() {
    setLogProduct(null);
    setLogFile(null);
    setLogPreviewUrl(null);
    setLogNote('');
    setLogError(null);
  }

  async function saveMonthlyProgress() {
    if (!logProduct) return;
    if (!logFile && !logPreviewUrl) {
      setLogError('請先上傳一張今月進度照片。');
      return;
    }

    setSavingLog(true);
    setLogError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('請重新登入後再試。');

      const existing = (logsByProduct.get(logProduct.id) ?? []).find((entry) => entry.month_key === currentMonthKey) ?? null;
      const photoUrl = logFile ? await uploadProgressPhoto(logFile, user.id, logProduct.id) : existing?.photo_url ?? logPreviewUrl;

      const { data, error } = await supabase
        .from('product_pan_logs')
        .upsert(
          {
            user_id: user.id,
            product_id: logProduct.id,
            month_key: currentMonthKey,
            logged_date: new Date().toISOString().slice(0, 10),
            photo_url: photoUrl,
            notes: logNote.trim() || null,
          },
          { onConflict: 'user_id,product_id,month_key' }
        )
        .select('*')
        .single();

      if (error) throw error;

      setPanLogs((prev) => {
        const next = prev.filter((entry) => !(entry.product_id === logProduct.id && entry.month_key === currentMonthKey));
        next.push(data as ProductPanLog);
        return next;
      });

      closeProgressModal();
    } catch (error) {
      setLogError(error instanceof Error ? error.message : '未能儲存本月進度，請稍後再試。');
    } finally {
      setSavingLog(false);
    }
  }

  async function generateReport() {
    setGeneratingReport(true);
    setReportHtml(
      buildMonthlyReportHtml({
        monthLabel,
        thisMonth,
        thisMonthSavings,
      })
    );
    setGeneratingReport(false);
  }

  function generateRecordCard(product: Product) {
    const logs = logsByProduct.get(product.id) ?? [];
    if (logs.length === 0) return;
    setRecordProductId(product.id);
    setRecordImageUrl(createPanRecordCardDataUrl(product, logs));
  }

  async function handleDownloadRecord(product: Product) {
    const nextUrl = recordProductId === product.id && recordImageUrl ? recordImageUrl : createPanRecordCardDataUrl(product, logsByProduct.get(product.id) ?? []);
    setRecordProductId(product.id);
    setRecordImageUrl(nextUrl);
    setDownloadingRecord(true);

    try {
      const link = document.createElement('a');
      const safeTitle = `${product.name}-pan-record`.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-');
      link.href = nextUrl;
      link.download = `${safeTitle}.svg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      setDownloadingRecord(false);
    }
  }

  async function handleShareRecord(product: Product) {
    const nextUrl = recordProductId === product.id && recordImageUrl ? recordImageUrl : createPanRecordCardDataUrl(product, logsByProduct.get(product.id) ?? []);
    setRecordProductId(product.id);
    setRecordImageUrl(nextUrl);
    setSharingRecord(true);

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `${product.name} 鐵皮完成紀錄`,
          text: `${product.name} 的鐵皮進度完成了，記低每月使用情況。`,
          url: nextUrl,
        });
        return;
      }

      window.open(nextUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // Ignore cancellation and fallback errors.
    } finally {
      setSharingRecord(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="fini-section-panel overflow-hidden">
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '0.5px solid #E8DDCF' }}>
          <div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 15, fontWeight: 500, color: '#2F2620' }}>鐵皮清單</span>
              <span className="text-micro px-1.5 py-0.5 rounded-full" style={{ background: '#F3E7DA', color: '#8A6A52' }}>
                {watchlist.length}/{MAX_WATCHLIST}
              </span>
            </div>
            <p className="text-micro mt-0.5" style={{ color: '#8D786B' }}>
              從我的產品選最多 10 件，每月上傳一次進度。
            </p>
          </div>
          {watchlist.length < MAX_WATCHLIST && (
            <button
              onClick={() => {
                setShowPicker(true);
                setSearch('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption"
              style={{ background: '#F3E7DA', color: '#7A5E47' }}
            >
              <Plus style={{ width: 13, height: 13 }} />
              加入
            </button>
          )}
        </div>

        {watchlist.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-caption" style={{ color: '#9D8777' }}>
              撳「加入」揀最多 {MAX_WATCHLIST} 件想優先完成嘅產品。
            </p>
          </div>
        ) : (
          <div>
            {watchlist.map((product) => {
              const entries = logsByProduct.get(product.id) ?? [];
              const monthCount = new Set(entries.map((entry) => entry.month_key)).size;
              const currentMonthEntry = entries.find((entry) => entry.month_key === currentMonthKey) ?? null;

              return (
                <div key={product.id} className="p-3 space-y-3" style={{ borderBottom: '0.5px solid #F1E8DE' }}>
                  <div className="flex items-center gap-3">
                    {product.photo_url ? (
                      <img src={product.photo_url} alt={product.name} className="rounded object-cover flex-shrink-0" style={{ width: 44, height: 44, borderRadius: 18 }} />
                    ) : (
                      <div
                        className="rounded flex-shrink-0 flex items-center justify-center"
                        style={{
                          width: 44,
                          height: 44,
                          background: '#E8E0E4',
                          color: '#5A4050',
                          fontSize: 16,
                          fontFamily: "'Cormorant Garamond', serif",
                        }}
                      >
                        {product.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-caption font-medium truncate" style={{ color: '#2F2620' }}>
                        {product.name}
                      </div>
                      <div className="text-micro" style={{ color: '#8D786B' }}>
                        {product.brand ?? '—'}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-micro px-2 py-1 rounded-full" style={{ background: '#F6EEE6', color: '#8A6A52' }}>
                          已記錄 {monthCount} 個月
                        </span>
                        <span className="text-micro px-2 py-1 rounded-full" style={{ background: currentMonthEntry ? '#EEF3EA' : '#FBF4EA', color: currentMonthEntry ? '#66806A' : '#9D8777' }}>
                          {currentMonthEntry ? '本月已更新' : '本月未更新'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => markFinished(product)}
                        disabled={marking === product.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-micro"
                        style={{ background: '#EEF3EA', color: '#66806A' }}
                      >
                        <Check style={{ width: 11, height: 11 }} />
                        {marking === product.id ? '標記中...' : '完成'}
                      </button>
                      <button onClick={() => removeFromWatchlist(product)} disabled={toggling === product.id} className="p-1 rounded-full" style={{ color: '#C8B4BC' }}>
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[20px] p-3" style={{ background: '#FFFAF4', border: '0.5px solid #EFE1D4' }}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-caption font-medium" style={{ color: '#2F2620' }}>
                          今月進度
                        </div>
                        {currentMonthEntry ? (
                          <p className="text-micro mt-1" style={{ color: '#8D786B' }}>
                            {formatLoggedDate(currentMonthEntry.logged_date)}
                            {currentMonthEntry.notes ? ` · ${currentMonthEntry.notes}` : ' · 已補上本月照片'}
                          </p>
                        ) : (
                          <p className="text-micro mt-1" style={{ color: '#9D8777' }}>
                            仍未補上本月更新，可以加相片同一句進度備註。
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => openProgressModal(product)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption"
                        style={{ background: '#F3E7DA', color: '#7A5E47' }}
                      >
                        <Camera style={{ width: 13, height: 13 }} />
                        {currentMonthEntry ? '更新今月進度' : '上傳今月進度'}
                      </button>
                    </div>

                    {currentMonthEntry?.photo_url && (
                      <div className="flex items-center gap-3 mt-3">
                        <img src={currentMonthEntry.photo_url} alt={`${product.name} 本月進度`} className="rounded-[18px] object-cover" style={{ width: 72, height: 72 }} />
                        <div className="text-micro" style={{ color: '#8D786B', lineHeight: 1.8 }}>
                          每月一張照片，之後 dashboard 就會幫你計算已追蹤幾多個月。
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(26,18,24,0.5)' }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowPicker(false);
              setSearch('');
            }
          }}
        >
          <div
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{
              background: '#FBF7F1',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #E8DDCF',
            }}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '0.5px solid #E8DDCF' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#2F2620' }}>加入鐵皮清單</div>
                <div className="text-micro" style={{ color: '#8D786B' }}>
                  還可以加 {MAX_WATCHLIST - watchlist.length} 件
                </div>
              </div>
              <button onClick={() => { setShowPicker(false); setSearch(''); }} className="p-1.5 rounded-full" style={{ background: '#F3E7DA', color: '#7A5E47' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="p-3" style={{ borderBottom: '0.5px solid #F1E8DE' }}>
              <div className="relative">
                <Search
                  style={{
                    width: 14,
                    height: 14,
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#B09898',
                  }}
                />
                <input
                  type="text"
                  placeholder="搜尋產品名稱或品牌..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  autoFocus
                  className="input"
                  style={{ paddingLeft: 34, fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-caption" style={{ color: '#9D8777' }}>
                    {search ? '找不到符合嘅產品' : '所有產品已在清單內'}
                  </p>
                </div>
              ) : (
                filtered.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToWatchlist(product)}
                    disabled={toggling === product.id}
                    className="w-full flex items-center gap-3 p-3 text-left transition-colors"
                    style={{ borderBottom: '0.5px solid #F1E8DE' }}
                  >
                    {product.photo_url ? (
                      <img src={product.photo_url} alt={product.name} className="rounded object-cover flex-shrink-0" style={{ width: 44, height: 44, borderRadius: 18 }} />
                    ) : (
                      <div
                        className="rounded flex-shrink-0 flex items-center justify-center"
                        style={{
                          width: 44,
                          height: 44,
                          background: '#E8E0E4',
                          color: '#5A4050',
                          fontSize: 16,
                          fontFamily: "'Cormorant Garamond', serif",
                        }}
                      >
                        {product.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-caption font-medium truncate" style={{ color: '#2F2620' }}>
                        {product.name}
                      </div>
                      <div className="text-micro" style={{ color: '#8D786B' }}>
                        {product.brand ?? '—'}
                      </div>
                    </div>
                    <Plus style={{ width: 16, height: 16, color: '#B89E88', flexShrink: 0 }} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {logProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(26,18,24,0.5)' }}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeProgressModal();
          }}
        >
          <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden" style={{ background: '#FBF7F1', border: '1px solid #E8DDCF' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '0.5px solid #E8DDCF' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#2F2620' }}>上傳今月進度</div>
                <div className="text-micro" style={{ color: '#8D786B' }}>
                  {logProduct.name}
                </div>
              </div>
              <button onClick={closeProgressModal} className="p-1.5 rounded-full" style={{ background: '#F3E7DA', color: '#7A5E47' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    setLogFile(nextFile);
                    setLogPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
                  }}
                />
                <div className="rounded-[24px] overflow-hidden flex items-center justify-center cursor-pointer" style={{ minHeight: 220, background: '#FFF8F1', border: '1px dashed #E8DACA' }}>
                  {logPreviewUrl ? (
                    <img src={logPreviewUrl} alt={`${logProduct.name} 本月進度預覽`} className="w-full h-[260px] object-cover" />
                  ) : (
                    <div className="text-center space-y-2" style={{ color: '#9D8777' }}>
                      <Camera className="w-7 h-7 mx-auto" />
                      <div className="text-caption">加入本月進度照片</div>
                    </div>
                  )}
                </div>
              </label>

              <div className="space-y-2">
                <label className="text-caption font-medium" style={{ color: '#2F2620' }}>
                  今月備註
                </label>
                <textarea
                  value={logNote}
                  onChange={(event) => setLogNote(event.target.value)}
                  rows={3}
                  className="input"
                  style={{ minHeight: 112, resize: 'vertical' }}
                  placeholder="例如：中間見底了、已經連續每日用、仲有少少。"
                />
              </div>

              {logError && <div className="fini-login-error">{logError}</div>}

              <button
                onClick={saveMonthlyProgress}
                disabled={savingLog}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-caption"
                style={{ background: 'linear-gradient(180deg, #A67C52 0%, #8A6A52 100%)', color: '#FFF9F4', opacity: savingLog ? 0.7 : 1 }}
              >
                {savingLog ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {savingLog ? '儲存中...' : '儲存本月進度'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fini-section-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#2F2620' }}>{monthLabel}鐵皮報告</div>
            {thisMonth.length === 0 ? (
              <p className="text-micro mt-0.5" style={{ color: '#9D8777' }}>
                本月尚未有鐵皮記錄
              </p>
            ) : (
              <p className="text-micro mt-0.5" style={{ color: '#7A6656' }}>
                本月用完 <span style={{ color: '#8A6A52', fontWeight: 500 }}>{thisMonth.length}</span> 件
                {thisMonthSavings > 0 && (
                  <>
                    {' '}
                    · 節省 <span style={{ color: '#66806A', fontWeight: 500 }}>HK${thisMonthSavings.toFixed(0)}</span>
                  </>
                )}
              </p>
            )}
          </div>
          <button
            onClick={generateReport}
            disabled={generatingReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption"
            style={{ background: 'linear-gradient(180deg, #A67C52 0%, #8A6A52 100%)', color: '#FFF9F4', opacity: generatingReport ? 0.7 : 1 }}
          >
            <Share2 style={{ width: 13, height: 13 }} />
            {generatingReport ? '生成中...' : '生成報告'}
          </button>
        </div>

        {reportHtml && (
          <div className="space-y-2">
            <p className="text-micro" style={{ color: '#8D786B' }}>
              截圖後可分享到 IG / 小紅書 📸
            </p>
            <div className="rounded-md overflow-hidden" style={{ border: '0.5px solid #E0D4D8' }} dangerouslySetInnerHTML={{ __html: reportHtml }} />
          </div>
        )}
      </div>

      <div className="fini-section-panel p-4 space-y-3">
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#2F2620' }}>完成紀錄圖</div>
          <p className="text-micro mt-0.5" style={{ color: '#8D786B' }}>
            當一件產品真正用完，就可以整理成一張有日期線索的完成紀錄。
          </p>
        </div>

        {completedProducts.length === 0 ? (
          <div className="rounded-[20px] p-4" style={{ background: '#FFF8F1', border: '0.5px solid #EFE1D4' }}>
            <p className="text-caption" style={{ color: '#9D8777' }}>
              目前尚未有完成並附帶月度紀錄的產品。先持續每月更新，之後完成時就可以生成紀錄圖。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedProducts.map((product) => {
              const logs = logsByProduct.get(product.id) ?? [];
              const months = new Set(logs.map((entry) => entry.month_key)).size;
              const isActivePreview = recordProductId === product.id && recordImageUrl;

              return (
                <div key={product.id} className="rounded-[20px] p-4" style={{ background: '#FFF8F1', border: '0.5px solid #EFE1D4' }}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-caption font-medium" style={{ color: '#2F2620' }}>
                        {product.name}
                      </div>
                      <p className="text-micro mt-1" style={{ color: '#8D786B' }}>
                        {product.brand ?? '—'} · 已記錄 {months} 個月
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => generateRecordCard(product)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption"
                        style={{ background: '#F3E7DA', color: '#7A5E47' }}
                      >
                        生成紀錄圖
                      </button>
                      <button
                        onClick={() => handleShareRecord(product)}
                        disabled={sharingRecord}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption"
                        style={{ background: '#FBF4EA', color: '#8A6A52', opacity: sharingRecord ? 0.7 : 1 }}
                      >
                        <Share2 style={{ width: 13, height: 13 }} />
                        分享
                      </button>
                      <button
                        onClick={() => handleDownloadRecord(product)}
                        disabled={downloadingRecord}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption"
                        style={{ background: '#EEF3EA', color: '#66806A', opacity: downloadingRecord ? 0.7 : 1 }}
                      >
                        {downloadingRecord ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download style={{ width: 13, height: 13 }} />}
                        下載
                      </button>
                    </div>
                  </div>

                  {isActivePreview && (
                    <div className="mt-4 rounded-[20px] overflow-hidden" style={{ border: '0.5px solid #E8DDCF' }}>
                      <img src={recordImageUrl} alt={`${product.name} 鐵皮完成紀錄圖`} className="w-full" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
