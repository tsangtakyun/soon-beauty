'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, X, Share2, Check, Search } from 'lucide-react';
import type { Product } from '@/types/database';

const MAX_WATCHLIST = 10;

type Props = {
  allActive: Product[];
  thisMonth: Product[];
  thisMonthSavings: number;
  monthLabel: string;
};

export default function EmptyBottleClient({ allActive, thisMonth, thisMonthSavings, monthLabel }: Props) {
  // Local state — don't rely on server refresh
  const [products, setProducts] = useState<Product[]>(allActive);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [marking, setMarking] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);

  const watchlist = products.filter((p) => p.on_watchlist && (p.status === 'in_use' || p.status === 'unopened'));
  const nonWatchlist = products.filter((p) => !p.on_watchlist && (p.status === 'in_use' || p.status === 'unopened'));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return nonWatchlist;
    return nonWatchlist.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.brand ?? '').toLowerCase().includes(q)
    );
  }, [search, nonWatchlist]);

  async function addToWatchlist(product: Product) {
    if (watchlist.length >= MAX_WATCHLIST) return;
    setToggling(product.id);
    const supabase = createClient();
    await supabase.from('products').update({ on_watchlist: true }).eq('id', product.id);
    // Update local state immediately
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, on_watchlist: true } : p));
    setToggling(null);
    setShowPicker(false);
    setSearch('');
  }

  async function removeFromWatchlist(product: Product) {
    setToggling(product.id);
    const supabase = createClient();
    await supabase.from('products').update({ on_watchlist: false }).eq('id', product.id);
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, on_watchlist: false } : p));
    setToggling(null);
  }

  async function markFinished(product: Product) {
    setMarking(product.id);
    const supabase = createClient();
    await supabase.from('products').update({
      status: 'finished',
      on_watchlist: false,
    }).eq('id', product.id);
    // Remove from local state (move to finished = no longer active)
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    setMarking(null);
  }

  async function generateReport() {
    setGeneratingReport(true);
    setReportHtml(null);
    const prompt = `你係Lama，Fini app嘅貓咪美容管家。幫用家生成一個「${monthLabel}鐵皮報告」HTML卡片。

數據：
- 本月用完：${thisMonth.length} 件
- 節省：HK$${thisMonthSavings.toFixed(0)}
- 本月鐵皮：${thisMonth.map((p) => `${p.name}${p.brand ? `（${p.brand}）` : ''}`).join('、') || '尚未有記錄'}

要求：
- 只return純HTML（唔好markdown唔好code fence）
- 固定寬度480px，可以截圖分享
- 背景 #FAFAF8，深色文字 #1A1218，玫瑰 #B06070，字體用system-ui sans-serif
- 頂部「FINI ®」logo（letter-spacing 0.15em）同「${monthLabel} 鐵皮報告」副標題
- 中間大數字顯示用完件數，Lama說一句廣東話鼓勵（親切有趣，例如：「好叻呀！又用完X支，繼續加油呀～ 🐱」）
- 底部列出本月鐵皮清單（每行一件，細字）
- 整體padding 32px，設計簡潔靚靚，border 0.5px solid #E0D4D8`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1200,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const html = data.content?.[0]?.text ?? '';
      const clean = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      setReportHtml(clean);
    } catch {
      setReportHtml('<div style="padding:20px;color:#A04040;font-family:system-ui">生成失敗，請稍後再試</div>');
    }
    setGeneratingReport(false);
  }

  return (
    <div className="space-y-4">

      {/* Watchlist card */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '0.5px solid #E0D4D8' }}>
          <div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 15, fontWeight: 500, color: '#1A1218' }}>鐵皮清單</span>
              <span className="text-micro px-1.5 py-0.5 rounded-full"
                style={{ background: '#F0E4E8', color: '#9A7080' }}>
                {watchlist.length}/{MAX_WATCHLIST}
              </span>
            </div>
            <p className="text-micro mt-0.5" style={{ color: '#9A7080' }}>追蹤我想用完嘅產品</p>
          </div>
          {watchlist.length < MAX_WATCHLIST && (
            <button
              onClick={() => { setShowPicker(true); setSearch(''); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption"
              style={{ background: '#F0E4E8', color: '#7A5060' }}
            >
              <Plus style={{ width: 13, height: 13 }} />加入
            </button>
          )}
        </div>

        {watchlist.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-caption" style={{ color: '#B09898' }}>
              撳「加入」揀最多 {MAX_WATCHLIST} 件想用完嘅產品
            </p>
          </div>
        ) : (
          <div>
            {watchlist.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3"
                style={{ borderBottom: '0.5px solid #F5EEF0' }}>
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} className="rounded object-cover flex-shrink-0"
                    style={{ width: 40, height: 40 }} />
                ) : (
                  <div className="rounded flex-shrink-0 flex items-center justify-center"
                    style={{ width: 40, height: 40, background: '#E8E0E4', color: '#5A4050',
                      fontSize: 16, fontFamily: "'Cormorant Garamond', serif" }}>
                    {p.name.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-caption font-medium truncate" style={{ color: '#1A1218' }}>{p.name}</div>
                  <div className="text-micro" style={{ color: '#9A7080' }}>{p.brand ?? '—'}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => markFinished(p)} disabled={marking === p.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-micro"
                    style={{ background: '#E8F4EC', color: '#2E7A4A' }}>
                    <Check style={{ width: 11, height: 11 }} />
                    {marking === p.id ? '標記中...' : '用完了'}
                  </button>
                  <button onClick={() => removeFromWatchlist(p)} disabled={toggling === p.id}
                    className="p-1 rounded-full" style={{ color: '#C8B4BC' }}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(26,18,24,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowPicker(false); setSearch(''); } }}>
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{ background: '#FAFAF8', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>

            <div className="flex items-center justify-between p-4"
              style={{ borderBottom: '0.5px solid #E0D4D8' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1218' }}>加入鐵皮清單</div>
                <div className="text-micro" style={{ color: '#9A7080' }}>
                  還可以加 {MAX_WATCHLIST - watchlist.length} 件
                </div>
              </div>
              <button onClick={() => { setShowPicker(false); setSearch(''); }}
                className="p-1.5 rounded-full" style={{ background: '#F0E4E8', color: '#7A5060' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="p-3" style={{ borderBottom: '0.5px solid #F0E8EC' }}>
              <div className="relative">
                <Search style={{ width: 14, height: 14, position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', color: '#B09898' }} />
                <input type="text" placeholder="搜尋產品名稱或品牌..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  autoFocus className="input" style={{ paddingLeft: 34, fontSize: 13 }} />
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-caption" style={{ color: '#B09898' }}>
                    {search ? '找不到符合嘅產品' : '所有產品已在清單內'}
                  </p>
                </div>
              ) : (
                filtered.map((p) => (
                  <button key={p.id} onClick={() => addToWatchlist(p)}
                    disabled={toggling === p.id}
                    className="w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-pink-50"
                    style={{ borderBottom: '0.5px solid #F5EEF0' }}>
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} className="rounded object-cover flex-shrink-0"
                        style={{ width: 40, height: 40 }} />
                    ) : (
                      <div className="rounded flex-shrink-0 flex items-center justify-center"
                        style={{ width: 40, height: 40, background: '#E8E0E4', color: '#5A4050',
                          fontSize: 16, fontFamily: "'Cormorant Garamond', serif" }}>
                        {p.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-caption font-medium truncate" style={{ color: '#1A1218' }}>{p.name}</div>
                      <div className="text-micro" style={{ color: '#9A7080' }}>{p.brand ?? '—'}</div>
                    </div>
                    <Plus style={{ width: 16, height: 16, color: '#C8B4BC', flexShrink: 0 }} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Monthly report */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1218' }}>{monthLabel}鐵皮報告</div>
            {thisMonth.length === 0 ? (
              <p className="text-micro mt-0.5" style={{ color: '#B09898' }}>本月尚未有鐵皮記錄</p>
            ) : (
              <p className="text-micro mt-0.5" style={{ color: '#7A6068' }}>
                本月用完 <span style={{ color: '#B06070', fontWeight: 500 }}>{thisMonth.length}</span> 件
                {thisMonthSavings > 0 && <> · 節省 <span style={{ color: '#2E7A4A', fontWeight: 500 }}>HK${thisMonthSavings.toFixed(0)}</span></>}
              </p>
            )}
          </div>
          <button onClick={generateReport} disabled={generatingReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption"
            style={{ background: '#B06070', color: '#FDF8F6', opacity: generatingReport ? 0.7 : 1 }}>
            <Share2 style={{ width: 13, height: 13 }} />
            {generatingReport ? '生成中...' : '生成報告'}
          </button>
        </div>

        {reportHtml && (
          <div className="space-y-2">
            <p className="text-micro" style={{ color: '#9A7080' }}>截圖後可分享到 IG / 小紅書 📸</p>
            <div className="rounded-md overflow-hidden" style={{ border: '0.5px solid #E0D4D8' }}
              dangerouslySetInnerHTML={{ __html: reportHtml }} />
          </div>
        )}
      </div>
    </div>
  );
}
