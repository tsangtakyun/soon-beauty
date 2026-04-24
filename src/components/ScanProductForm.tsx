'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, AlertCircle, RefreshCw, Save, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import CameraCapture, { type CapturedImage } from './CameraCapture';
import ProductForm from './ProductForm';
import type { Product } from '@/types/database';

type Category = { id: string; name: string; color: string; parent_id?: string | null; sort_order?: number };
type Confidence = 'high' | 'medium' | 'low' | 'none';

type OcrResult = {
  name: string | null;
  brand: string | null;
  pao_months: number | null;
  pao_source: 'seen' | 'estimated' | null;
  expiry_date: string | null;
  batch_code: string | null;
  production_date: string | null;
  production_date_confidence: Confidence;
  production_date_reasoning: string | null;
  computed_expiry_date: string | null;
  computed_expiry_reasoning: string | null;
  expiry_warning: boolean;
  suggested_category: string | null;
  matched_category_id?: string;
  confidence: { name: Confidence; brand: Confidence; pao_months: Confidence; expiry_date: Confidence };
  notes: string | null;
};

type IngredientsResult = {
  inci_list: string[];
  key_ingredients: { name: string; benefit: string; concern?: string }[];
  concerns: string[];
  suitable_for: string[];
  avoid_if: string[];
  overall_rating: 'gentle' | 'moderate' | 'active' | 'unknown';
};

type ColorProfile = {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  warm_cool: 'warm' | 'cool' | 'neutral';
  suitable_shades: string[];
} | null;

type Stage = 'intro' | 'capturing' | 'analyzing' | 'result' | 'form' | 'error';

async function uploadFrontPhoto(base64: string): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const byteString = atob(base64);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    const filename = `${user.id}/${Date.now()}-front.jpg`;
    const { error } = await supabase.storage.from('product-photos').upload(filename, blob, { contentType: 'image/jpeg' });
    if (error) return null;
    const { data: urlData } = supabase.storage.from('product-photos').getPublicUrl(filename);
    return urlData?.publicUrl ?? null;
  } catch { return null; }
}

const RATING_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  gentle:   { label: '溫和', color: '#2E7A4A', bg: '#E8F4EC' },
  moderate: { label: '中等', color: '#C06030', bg: '#FDF0E8' },
  active:   { label: '活性', color: '#3A68B0', bg: '#E8F0FB' },
  unknown:  { label: '未知', color: '#9A7080', bg: '#F0E8EC' },
};

export default function ScanProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('intro');
  const [attempt, setAttempt] = useState(1);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ingredients, setIngredients] = useState<IngredientsResult | null>(null);
  const [colorProfile, setColorProfile] = useState<ColorProfile>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickSaved, setQuickSaved] = useState(false);

  async function runOcr(images: CapturedImage[]) {
    setStage('analyzing');
    setErrorMsg(null);
    const frontImage = images.find((img) => img.type === 'front');

    const [ocrResponse, uploadedUrl] = await Promise.all([
      fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: images.map((img) => ({ type: img.type, data: img.base64, mediaType: img.mediaType })),
        }),
      }),
      frontImage ? uploadFrontPhoto(frontImage.base64) : Promise.resolve(null),
    ]);

    if (uploadedUrl) setPhotoUrl(uploadedUrl);
    if (!ocrResponse.ok) {
      const data = await ocrResponse.json().catch(() => ({}));
      setErrorMsg(data.error ?? `伺服器錯誤 ${ocrResponse.status}`);
      setStage('error');
      return;
    }

    const data = await ocrResponse.json();
    setOcrResult(data.result);
    setIngredients(data.ingredients ?? null);
    setColorProfile(data.color_profile ?? null);
    setStage('result');
  }

  async function quickSave() {
    if (!ocrResult?.name) return;
    setQuickSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setQuickSaving(false); return; }

    const { data, error } = await supabase.from('products').insert({
      user_id: user.id,
      name: ocrResult.name,
      brand: ocrResult.brand ?? null,
      pao_months: ocrResult.pao_months ?? null,
      expiry_date: ocrResult.expiry_date ?? ocrResult.computed_expiry_date ?? null,
      photo_url: photoUrl ?? null,
      category_id: ocrResult.matched_category_id ?? null,
      status: 'unopened',
      ingredients_analysis: ingredients ?? null,
      notes: [
        ocrResult.batch_code ? `批號：${ocrResult.batch_code}` : null,
        ocrResult.production_date ? `生產日期：${ocrResult.production_date}` : null,
        ocrResult.pao_source === 'estimated' ? 'PAO 係根據產品類別估算，請核實' : null,
        ocrResult.computed_expiry_reasoning ?? null,
      ].filter(Boolean).join('\n') || null,
    }).select('id').single();

    setQuickSaving(false);
    if (!error && data) {
      setQuickSaved(true);
      setTimeout(() => router.push(`/products/${data.id}`), 800);
    }
  }

  if (stage === 'intro') {
    return (
      <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
        <Link href="/products" className="inline-flex items-center gap-1 text-caption text-ink-500 hover:text-ink-800">
          <ArrowLeft className="w-4 h-4" />返回
        </Link>
        <div className="fini-page-hero" style={{ gridTemplateColumns: '1fr' }}>
          <div className="w-12 h-12 rounded" style={{ background: '#F0E4E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles className="w-6 h-6" style={{ color: '#8A6A52' }} />
          </div>
          <div>
            <h1 className="fini-dash-title" style={{ fontSize: 24 }}>拍照新增產品</h1>
            <p className="text-caption leading-relaxed mt-1" style={{ color: '#7A6656' }}>
              用相機幫你快速帶入產品資訊、成分分析同到期推算，再慢慢確認細節。
            </p>
          </div>
          <div className="rounded-[24px] p-4 text-caption space-y-1" style={{ background: '#F8F1E8', color: '#7A6656', border: '1px solid #E9DED0' }}>
            <div className="font-medium mb-2" style={{ color: '#1A1218' }}>📸 拍攝技巧</div>
            <div>· 正面：清楚拍到產品名同品牌</div>
            <div>· 底部：包含批號同任何日期標示</div>
            <div>· 成份：成份表清晰可見最佳</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStage('form')} className="btn-secondary flex-1">手動輸入</button>
            <button onClick={() => setStage('capturing')} className="btn-primary flex-1">開始拍照</button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'capturing') return <CameraCapture onComplete={runOcr} onCancel={() => setStage('intro')} />;

  if (stage === 'analyzing') {
    return (
      <div className="max-w-lg mx-auto pt-20 text-center space-y-4 animate-fade-in fini-section-panel">
        <div className="inline-block animate-spin">
          <Sparkles className="w-10 h-10" style={{ color: '#8A6A52' }} />
        </div>
        <h2 className="fini-dash-title" style={{ fontSize: 22 }}>識別 + 分析成份中...</h2>
        <p className="text-caption" style={{ color: '#8D786B' }}>AI 同時識別產品資訊及分析成份，約需 15–25 秒</p>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
        <div className="fini-section-panel p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 mx-auto" style={{ color: '#C04040' }} />
          <div>
            <h2 className="fini-dash-title" style={{ fontSize: 20 }}>識別失敗</h2>
            <p className="text-caption text-ink-600 mt-1">{errorMsg}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStage('form')} className="btn-secondary flex-1">手動輸入</button>
            <button onClick={() => setStage('capturing')} className="btn-primary flex-1">重試</button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'result' && ocrResult) {
    const hasNothing = !ocrResult.name && !ocrResult.brand;
    const hasLowConfidence = Object.values(ocrResult.confidence).some((c) => c === 'low' || c === 'none');
    const ratingInfo = ingredients ? RATING_LABELS[ingredients.overall_rating] : null;

    // Color compatibility check
    const isMakeup = ['腮紅', '唇妝', '眼影', '提亮／高光', '修容'].includes(ocrResult.suggested_category ?? '');
    const colorMatch = colorProfile && isMakeup ? 'check' : null;

    return (
      <div className="max-w-lg mx-auto space-y-4 animate-fade-in">
        <div className="fini-section-panel p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: '#8A6A52' }} />
              <span className="fini-section-title">識別結果</span>
            </div>
            <div className="flex items-center gap-2">
              <ConfBadge c="high" label="準確" />
              <ConfBadge c="medium" label="請核實" />
              <ConfBadge c="low" label="不確定" />
            </div>
          </div>

          {photoUrl && <img src={photoUrl} alt="產品" className="w-full h-40 object-cover rounded-[24px]" />}

          {/* Expiry warning */}
          {ocrResult.expiry_warning && (
            <div className="flex items-start gap-2 p-3 rounded-[20px]" style={{ background: '#FDF0E8', border: '0.5px solid #F0D4B8' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#C06030' }} />
              <p className="text-caption" style={{ color: '#C06030' }}>
                推算出嚟嘅過期日子係過去，可能讀取有誤，請手動核實
              </p>
            </div>
          )}

          {hasNothing ? (
            <div className="p-4 rounded-[20px] text-caption" style={{ background: '#FDF0E8', color: '#C06030' }}>
              未能識別任何資訊，相片可能過於模糊。
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              <ResultRow label="產品名稱" value={ocrResult.name} conf={ocrResult.confidence.name} />
              <ResultRow label="品牌" value={ocrResult.brand} conf={ocrResult.confidence.brand} />
              <ResultRow
                label="PAO（開封後保質期）"
                value={ocrResult.pao_months ? `${ocrResult.pao_months} 個月` : null}
                conf={ocrResult.confidence.pao_months}
                isEstimate={ocrResult.pao_source === 'estimated'}
                estimateNote="根據產品類別估算"
              />
              {ocrResult.suggested_category && (
                <ResultRow
                  label="建議分類"
                  value={ocrResult.suggested_category + (ocrResult.matched_category_id ? ' ✓' : '')}
                  conf={ocrResult.matched_category_id ? 'high' : 'medium'}
                />
              )}
              {ocrResult.expiry_date && (
                <ResultRow label="包裝到期日" value={ocrResult.expiry_date} conf="high" />
              )}
              {ocrResult.batch_code && (
                <ResultRow label="批號" value={ocrResult.batch_code} conf="high" />
              )}
              {ocrResult.production_date && (
                <ResultRow
                  label="生產日期"
                  value={ocrResult.production_date}
                  conf={ocrResult.production_date_confidence}
                  isEstimate
                  estimateNote={ocrResult.production_date_reasoning ?? undefined}
                />
              )}
              {ocrResult.computed_expiry_date && !ocrResult.expiry_date && (
                <ResultRow
                  label="推算過期日子"
                  value={ocrResult.computed_expiry_date}
                  conf={ocrResult.production_date_confidence}
                  isEstimate
                  estimateNote={ocrResult.computed_expiry_reasoning ?? undefined}
                  highlight
                  warning={ocrResult.expiry_warning}
                />
              )}
              {ocrResult.notes && (
                <div className="pt-3 text-caption" style={{ color: '#9A7080' }}>💡 {ocrResult.notes}</div>
              )}
            </div>
          )}

          {/* Ingredients summary */}
          {ingredients && (ingredients.key_ingredients.length > 0 || ingredients.concerns.length > 0) && (
            <div className="pt-2 border-t border-ink-100 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-caption font-medium" style={{ color: '#1A1218' }}>成份分析</span>
                  {ingredients.inci_list.length === 0 && (
                    <span className="text-micro px-1.5 py-0.5 rounded-full" style={{ background: '#F0E8F8', color: '#7A50A0' }}>
                      根據產品類型估算
                    </span>
                  )}
                </div>
                {ratingInfo && (
                  <span className="text-micro px-2 py-0.5 rounded-full"
                    style={{ background: ratingInfo.bg, color: ratingInfo.color }}>
                    {ratingInfo.label}
                  </span>
                )}
              </div>
              {ingredients.key_ingredients.slice(0, 3).map((ing) => (
                <div key={ing.name} className="text-micro" style={{ color: '#7A6068' }}>
                  <span className="font-medium" style={{ color: '#1A1218' }}>{ing.name}</span>
                  {' — '}{ing.benefit}
                  {ing.concern && <span style={{ color: '#C06030' }}> ⚠️ {ing.concern}</span>}
                </div>
              ))}
              {ingredients.concerns.length > 0 && (
                <div className="text-micro px-2.5 py-1.5 rounded" style={{ background: '#FDF0E8', color: '#C06030' }}>
                  {ingredients.concerns.join(' · ')}
                </div>
              )}
              {ingredients.suitable_for.length > 0 && (
                <div className="text-micro" style={{ color: '#7A6068' }}>
                  適合：{ingredients.suitable_for.join('、')}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-1">
            {!hasNothing && ocrResult.name && (
              <button onClick={quickSave} disabled={quickSaving || quickSaved} className="btn-primary w-full"
                style={{ background: quickSaved ? '#66806A' : undefined }}>
                <Save className="w-4 h-4 mr-2" />
                {quickSaved ? '已加入產品庫 ✓' : quickSaving ? '加入中...' : '直接加入我的產品'}
              </button>
            )}
            <div className="flex gap-2">
              <button onClick={() => setStage('capturing')} className="btn-secondary flex-1">
                <RefreshCw className="w-4 h-4 mr-1.5" />重新拍攝
              </button>
              <button onClick={() => setStage('form')} className="btn-secondary flex-1">修改後加入</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'form') {
    const initial: Partial<Product> & { category_id?: string | null } = ocrResult ? {
      name: ocrResult.name ?? '',
      brand: ocrResult.brand ?? null,
      pao_months: ocrResult.pao_months ?? null,
      expiry_date: ocrResult.expiry_date ?? ocrResult.computed_expiry_date ?? null,
      photo_url: photoUrl ?? null,
      category_id: ocrResult.matched_category_id ?? undefined,
      ingredients_analysis: ingredients ?? null,
    } : {};

    return (
      <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
        <button onClick={() => ocrResult ? setStage('result') : setStage('intro')}
          className="inline-flex items-center gap-1 text-caption text-ink-500 hover:text-ink-800">
          <ArrowLeft className="w-4 h-4" />返回
        </button>
        <div>
          <h1 className="fini-dash-title" style={{ fontSize: 22 }}>確認產品資訊</h1>
          <p className="text-caption mt-1" style={{ color: '#8D786B' }}>
            {ocrResult ? '識別結果已填入，請確認後儲存' : '請手動輸入產品資訊'}
          </p>
        </div>
        {photoUrl && (
          <div className="flex items-center gap-3 p-3 rounded-[22px]" style={{ background: '#F8F1E8', border: '1px solid #E9DED0' }}>
            <img src={photoUrl} alt="產品" className="rounded-[16px] object-cover flex-shrink-0" style={{ width: 48, height: 48 }} />
            <span className="text-caption" style={{ color: '#7A6656' }}>✅ 產品相片已儲存</span>
          </div>
        )}
        <div className="fini-section-panel p-5">
          <ProductForm categories={categories} mode="create" initial={initial} />
        </div>
      </div>
    );
  }

  return null;
}

function ConfBadge({ c, label }: { c: 'high' | 'medium' | 'low'; label: string }) {
  const map = { high: { bg: 'bg-green-100', text: 'text-green-600', icon: '✓' }, medium: { bg: 'bg-amber-100', text: 'text-amber-600', icon: '!' }, low: { bg: 'bg-orange-100', text: 'text-orange-600', icon: '?' } }[c];
  return (
    <span className="inline-flex items-center gap-1 text-micro text-ink-400">
      <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${map.bg} ${map.text} text-xs font-bold`}>{map.icon}</span>
      {label}
    </span>
  );
}

function ResultRow({ label, value, conf, isEstimate, estimateNote, highlight, warning }: {
  label: string; value: string | null; conf: Confidence;
  isEstimate?: boolean; estimateNote?: string; highlight?: boolean; warning?: boolean;
}) {
  const iconMap: Record<Confidence, { bg: string; text: string; icon: string }> = {
    high: { bg: 'bg-green-100', text: 'text-green-600', icon: '✓' },
    medium: { bg: 'bg-amber-100', text: 'text-amber-600', icon: '!' },
    low: { bg: 'bg-orange-100', text: 'text-orange-600', icon: '?' },
    none: { bg: 'bg-ink-100', text: 'text-ink-400', icon: '—' },
  };
  const c = iconMap[conf];
  return (
    <div className={`py-3 flex items-start justify-between gap-3 ${highlight ? '-mx-1 px-1 rounded' : ''}`}
      style={highlight ? { background: warning ? '#FDF0E8' : '#F5EEF8' } : {}}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-micro text-ink-500">{label}</span>
          {isEstimate && <span className="text-micro px-1.5 py-0.5 rounded-full" style={{ background: '#F0E8F8', color: '#7A50A0' }}>AI 推算</span>}
        </div>
        <div className={`text-body ${highlight ? 'font-medium' : ''}`}
          style={{ color: highlight ? (warning ? '#C06030' : '#7A50A0') : '#1A1218' }}>
          {value ?? <span className="text-ink-400">—</span>}
        </div>
        {isEstimate && estimateNote && <div className="text-micro text-ink-400 mt-0.5">{estimateNote}</div>}
      </div>
      <div className={`flex-shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full ${c.bg} ${c.text} text-xs font-bold`}>
        {c.icon}
      </div>
    </div>
  );
}
