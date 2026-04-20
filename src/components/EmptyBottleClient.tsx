'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, X, Share2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { Product } from '@/types/database';

const MAX_WATCHLIST = 10;
const WATCHLIST_TAG = '__watchlist__';

type Props = {
  allActive: Product[];
  thisMonth: Product[];
  thisMonthSavings: number;
  monthLabel: string;
};

export default function EmptyBottleClient({ allActive, thisMonth, thisMonthSavings, monthLabel }: Props) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [marking, setMarking] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);

  // Watchlist = active products whose notes contain WATCHLIST_TAG
  const watchlist = allActive.filter((p) => p.notes?.includes(WATCHLIST_TAG));
  const nonWatchlist = allActive.filter((p) => !p.notes?.includes(WATCHLIST_TAG));

  async function addToWatchlist(product: Product) {
    if (watchlist.length >= MAX_WATCHLIST) return;
    const supabase = createClient();
    const newNotes = product.notes
      ? `${product.notes}\n${WATCHLIST_TAG}`
      : WATCHLIST_TAG;
    await supabase.from('products').update({ notes: newNotes }).eq('id', product.id);
    router.refresh();
    setShowPicker(false);
  }

  async function removeFromWatchlist(product: Product) {
    const supabase = createClient();
    const newNotes = (product.notes ?? '').replace(WATCHLIST_TAG, '').trim() || null;
    await supabase.from('products').update({ notes: newNotes }).eq('id', product.id);
    router.refresh();
  }

  async function markFinished(product: Product) {
    setMarking(product.id);
    const supabase = createClient();
    const cleanNotes = (product.notes ?? '').replace(WATCHLIST_TAG, '').trim() || null;
    await supabase.from('products').update({
      status: 'finished',
      notes: cleanNotes,
    }).eq('id', product.id);
    router.refresh();
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
- 寬度固定500px，可以截圖分享
- 用Fini嘅品牌色：深色 #1A1218，玫瑰 #B06070，米色 #FAFAF8
- 頂部有「FINI ®」logo同「${monthLabel} 鐵皮報告」
- 中間顯示主要數字（用完X件）同Lama說一句鼓勵說話
- 底部列出本月鐵皮清單
- 設計要靚，可以直接截圖post社交媒體
- Lama說話要親切有趣，廣東話口吻`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const html = data.content?.[0]?.text ?? '';
      const clean = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      setReportHtml(clean);
    } catch {
      setReportHtml('<div style="padding:20px;color:#A04040">生成失敗，請稍後再試</div>');
    }
    setGeneratingReport(false);
  }

  return (
    <div className="space-y-4">

      {/* Watchlist section */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#E0D4D8' }}>
          <div>
            <h2 className="fini-section-title" style={{ fontSize: 16 }}>
              鐵皮清單
              <span className="text-micro ml-2 font-normal" style={{ color: '#9A7080' }}>
                {watchlist.length}/{MAX_WATCHLIST}
              </span>
            </h2>
            <p className="text-micro mt-0.5" style={{ color: '#9A7080' }}>追蹤我想用完嘅產品</p>
          </div>
          {watchlist.length < MAX_WATCHLIST && (
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption transition-all"
              style={{ background: '#F0E4E8', color: '#7A5060' }}
            >
              <Plus style={{ width: 13, height: 13 }} />
              加入
            </button>
          )}
        </div>

        {/* Picker */}
        {showPicker && (
          <div className="border-b" style={{ borderColor: '#E0D4D8', background: '#FAF6F8' }}>
            <div className="p-3">
              <p className="text-micro mb-2" style={{ color: '#9A7080' }}>揀一件想用完嘅產品：</p>
              {nonWatchlist.length === 0 ? (
                <p className="text-caption" style={{ color: '#B09898' }}>所有產品已在清單內</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {nonWatchlist.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addToWatchlist(p)}
                      className="w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors hover:bg-white"
                    >
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={p.name}
                          className="rounded object-cover flex-shrink-0"
                          style={{ width: 32, height: 32 }} />
                      ) : (
                        <div className="rounded flex-shrink-0 flex items-center justify-center"
                          style={{ width: 32, height: 32, background: '#E8E0E4', color: '#5A4050', fontSize: 14 }}>
                          {p.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-caption truncate" style={{ color: '#1A1218' }}>{p.name}</div>
                        <div className="text-micro" style={{ color: '#9A7080' }}>{p.brand ?? '—'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Watchlist items */}
        {watchlist.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-caption" style={{ color: '#B09898' }}>
              撳「加入」揀最多 {MAX_WATCHLIST} 件想用完嘅產品
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#F0E8EC' }}>
            {watchlist.map((p) => (
              <div key={p.id} className="p-3 flex items-center gap-3">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name}
                    className="rounded object-cover flex-shrink-0"
                    style={{ width: 40, height: 40 }} />
                ) : (
                  <div className="rounded flex-shrink-0 flex items-center justify-center"
                    style={{ width: 40, height: 40, background: '#E8E0E4', color: '#5A4050', fontSize: 16 }}>
                    {p.name.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-caption font-medium truncate" style={{ color: '#1A1218' }}>{p.name}</div>
                  <div className="text-micro" style={{ color: '#9A7080' }}>{p.brand ?? '—'}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => markFinished(p)}
                    disabled={marking === p.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-micro transition-all"
                    style={{ background: '#E8F4EC', color: '#2E7A4A' }}
                  >
                    <Check style={{ width: 11, height: 11 }} />
                    {marking === p.id ? '標記中...' : '用完了'}
                  </button>
                  <button onClick={() => removeFromWatchlist(p)}
                    className="p-1 rounded-full transition-colors"
                    style={{ color: '#C8B4BC' }}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly report */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="fini-section-title" style={{ fontSize: 16 }}>{monthLabel}鐵皮報告</h2>
          <button
            onClick={generateReport}
            disabled={generatingReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption transition-all"
            style={{ background: '#B06070', color: '#FDF8F6' }}
          >
            <Share2 style={{ width: 13, height: 13 }} />
            {generatingReport ? '生成中...' : '生成報告'}
          </button>
        </div>

        {thisMonth.length === 0 ? (
          <p className="text-caption" style={{ color: '#B09898' }}>本月尚未有鐵皮記錄</p>
        ) : (
          <div className="text-caption" style={{ color: '#7A6068' }}>
            本月用完 <span style={{ color: '#B06070', fontWeight: 500 }}>{thisMonth.length}</span> 件
            {thisMonthSavings > 0 && <>，節省 <span style={{ color: '#2E7A4A', fontWeight: 500 }}>HK${thisMonthSavings.toFixed(0)}</span></>}
          </div>
        )}

        {/* Generated report */}
        {reportHtml && (
          <div className="mt-3 space-y-2">
            <p className="text-micro" style={{ color: '#9A7080' }}>截圖後可直接分享到社交媒體 📸</p>
            <div
              className="rounded-md overflow-hidden border"
              style={{ borderColor: '#E0D4D8' }}
              dangerouslySetInnerHTML={{ __html: reportHtml }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
