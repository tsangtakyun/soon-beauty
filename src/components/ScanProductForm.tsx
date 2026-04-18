'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import CameraCapture, { type CapturedImage } from './CameraCapture';
import ProductForm from './ProductForm';
import type { Product } from '@/types/database';

type Category = { id: string; name: string; color: string };
type Confidence = 'high' | 'medium' | 'low' | 'none';

type OcrResult = {
  name: string | null;
  brand: string | null;
  pao_months: number | null;
  expiry_date: string | null;
  batch_code: string | null;
  production_date: string | null;
  production_date_confidence: Confidence;
  production_date_reasoning: string | null;
  confidence: {
    name: Confidence;
    brand: Confidence;
    pao_months: Confidence;
    expiry_date: Confidence;
  };
  notes: string | null;
};

type Stage = 'intro' | 'capturing' | 'analyzing' | 'result' | 'form' | 'error';

// Upload正面相去Supabase Storage，回傳public URL
async function uploadFrontPhoto(base64: string): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const byteString = atob(base64);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/jpeg' });

    const filename = `${user.id}/${Date.now()}-front.jpg`;
    const { error } = await supabase.storage
      .from('product-photos')
      .upload(filename, blob, { contentType: 'image/jpeg', upsert: false });

    if (error) { console.error('Upload error:', error); return null; }

    const { data: urlData } = supabase.storage
      .from('product-photos')
      .getPublicUrl(filename);

    return urlData?.publicUrl ?? null;
  } catch (err) {
    console.error('Upload failed:', err);
    return null;
  }
}

export default function ScanProductForm({ categories }: { categories: Category[] }) {
  const [stage, setStage] = useState<Stage>('intro');
  const [attempt, setAttempt] = useState(1);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function runOcr(images: CapturedImage[]) {
    setStage('analyzing');
    setErrorMsg(null);

    // 同時：upload正面相 + 呼叫OCR API
    const frontImage = images.find((img) => img.type === 'front');

    const [ocrResponse, uploadedUrl] = await Promise.all([
      fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: images.map((img) => ({
            type: img.type,
            data: img.base64,
            mediaType: img.mediaType,
          })),
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
    setStage('result');
  }

  function retryCapture() { setAttempt(attempt + 1); setStage('capturing'); }
  function acceptResult() { setStage('form'); }
  function skipToManual() { setStage('form'); }

  // ── 介紹頁面 ───────────────────────────────────────────────────────────────
  if (stage === 'intro') {
    return (
      <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
        <Link href="/products" className="inline-flex items-center gap-1 text-caption text-ink-500 hover:text-ink-800">
          <ArrowLeft className="w-4 h-4" />返回
        </Link>
        <div className="card p-6 space-y-5">
          <div className="w-12 h-12 rounded bg-brand-100 text-brand-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-heading text-ink-900 mb-1">拍照新增產品</h1>
            <p className="text-caption text-ink-600 leading-relaxed">
              拍攝產品包裝，自動識別產品名稱、品牌、PAO、到期日，並根據批號推算生產日期。
              共分三個步驟：正面 → 底部 → 到期日。
            </p>
          </div>
          <div className="bg-ink-50 rounded p-4 text-caption text-ink-600 space-y-1">
            <div className="font-medium text-ink-700 mb-2">📸 拍攝技巧</div>
            <div>· 確保光線充足，避免陰影與反光</div>
            <div>· 鏡頭靠近包裝，讓文字填滿畫面</div>
            <div>· 底部照片須包含開蓋圖示及批號</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStage('form')} className="btn-secondary flex-1">手動輸入</button>
            <button onClick={() => setStage('capturing')} className="btn-primary flex-1">開始拍照</button>
          </div>
        </div>
      </div>
    );
  }

  // ── 拍照 ───────────────────────────────────────────────────────────────────
  if (stage === 'capturing') {
    return <CameraCapture onComplete={runOcr} onCancel={() => setStage('intro')} />;
  }

  // ── 分析中 ─────────────────────────────────────────────────────────────────
  if (stage === 'analyzing') {
    return (
      <div className="max-w-lg mx-auto pt-20 text-center space-y-4 animate-fade-in">
        <div className="inline-block animate-spin">
          <Sparkles className="w-10 h-10 text-brand-500" />
        </div>
        <h2 className="font-display text-heading text-ink-900">正在識別產品資訊...</h2>
        <p className="text-caption text-ink-500">AI 分析相片中，約需 10–20 秒</p>
      </div>
    );
  }

  // ── 錯誤 ───────────────────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
        <div className="card p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display text-heading text-ink-900 mb-1">識別失敗</h2>
            <p className="text-caption text-ink-600">{errorMsg ?? '無法連接識別服務，請稍後再試'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={skipToManual} className="btn-secondary flex-1">手動輸入</button>
            <button onClick={() => setStage('capturing')} className="btn-primary flex-1">重試</button>
          </div>
        </div>
      </div>
    );
  }

  // ── 識別結果 ───────────────────────────────────────────────────────────────
  if (stage === 'result' && ocrResult) {
    const hasLowConfidence = Object.values(ocrResult.confidence).some(
      (c) => c === 'low' || c === 'none'
    );
    const hasNothing =
      !ocrResult.name && !ocrResult.brand && !ocrResult.pao_months && !ocrResult.expiry_date;

    return (
      <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-500" />
              <h2 className="font-display text-title text-ink-900">識別結果</h2>
            </div>
            <div className="flex items-center gap-2.5">
              <ConfidenceBadge confidence="high" showLabel />
              <ConfidenceBadge confidence="medium" showLabel />
              <ConfidenceBadge confidence="low" showLabel />
            </div>
          </div>

          {/* 正面相預覽（如已上傳） */}
          {photoUrl && (
            <img
              src={photoUrl}
              alt="產品正面"
              className="w-full h-40 object-cover rounded-md"
            />
          )}

          {hasNothing ? (
            <div className="bg-amber-50 border border-amber-200 rounded p-4 text-caption text-amber-900">
              未能識別任何資訊。相片可能過於模糊或光線不足。
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              <ResultRow label="產品名稱" value={ocrResult.name} confidence={ocrResult.confidence.name} />
              <ResultRow label="品牌" value={ocrResult.brand} confidence={ocrResult.confidence.brand} />
              <ResultRow
                label="PAO（開封後保質期）"
                value={ocrResult.pao_months ? `${ocrResult.pao_months} 個月` : null}
                confidence={ocrResult.confidence.pao_months}
              />
              <ResultRow
                label="包裝到期日"
                value={ocrResult.expiry_date}
                confidence={ocrResult.confidence.expiry_date}
              />
              {ocrResult.batch_code && (
                <ResultRow label="批號" value={ocrResult.batch_code} confidence="high" />
              )}
              {ocrResult.production_date && (
                <ResultRow
                  label="生產日期"
                  value={ocrResult.production_date}
                  confidence={ocrResult.production_date_confidence ?? 'low'}
                  isEstimate
                  estimateReason={ocrResult.production_date_reasoning}
                />
              )}
              {ocrResult.notes && (
                <div className="pt-3 text-caption text-ink-500">💡 {ocrResult.notes}</div>
              )}
            </div>
          )}

          {hasLowConfidence && attempt < 2 && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-caption text-amber-900">
              部分資訊信心度較低，是否重新拍攝以提高準確度？
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {(hasLowConfidence || hasNothing) && attempt < 2 ? (
              <>
                <button onClick={acceptResult} className="btn-secondary flex-1">手動修正</button>
                <button onClick={retryCapture} className="btn-primary flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />重新拍攝
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setStage('capturing')} className="btn-secondary flex-1">重新拍攝</button>
                <button onClick={acceptResult} className="btn-primary flex-1">使用此資訊繼續</button>
              </>
            )}
          </div>

          {attempt >= 2 && hasLowConfidence && (
            <p className="text-micro text-ink-500 text-center">
              已嘗試 2 次，建議手動補填未能識別的資訊。
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── 確認表單 ───────────────────────────────────────────────────────────────
  if (stage === 'form') {
    const initial: Partial<Product> = ocrResult ? {
      name: ocrResult.name ?? '',
      brand: ocrResult.brand ?? null,
      pao_months: ocrResult.pao_months ?? null,
      expiry_date: ocrResult.expiry_date ?? null,
      photo_url: photoUrl ?? null,
    } : {};

    return (
      <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
        <button
          onClick={() => setStage('intro')}
          className="inline-flex items-center gap-1 text-caption text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="w-4 h-4" />返回
        </button>
        <div>
          <h1 className="font-display text-heading text-ink-900">確認產品資訊</h1>
          <p className="text-caption text-ink-500 mt-1">
            {ocrResult ? '識別結果已填入，請確認後儲存' : '請手動輸入產品資訊'}
          </p>
        </div>

        {/* 產品縮圖預覽 */}
        {photoUrl && (
          <div className="flex items-center gap-3 p-3 bg-ink-50 rounded-md">
            <img src={photoUrl} alt="產品" className="w-14 h-14 rounded object-cover flex-shrink-0" />
            <div className="text-caption text-ink-600">
              ✅ 產品相片已儲存，將顯示於產品列表。
            </div>
          </div>
        )}

        <div className="card p-5">
          <ProductForm categories={categories} mode="create" initial={initial} />
        </div>
      </div>
    );
  }

  return null;
}

// ── 子元件 ─────────────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence, showLabel = false }: {
  confidence: 'high' | 'medium' | 'low';
  showLabel?: boolean;
}) {
  const map = {
    high:   { bg: 'bg-green-100',  text: 'text-green-600',  icon: '✓', label: '準確' },
    medium: { bg: 'bg-amber-100',  text: 'text-amber-600',  icon: '!', label: '請核實' },
    low:    { bg: 'bg-orange-100', text: 'text-orange-600', icon: '?', label: '不確定' },
  }[confidence];

  return (
    <span className="inline-flex items-center gap-1 text-micro text-ink-400">
      <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${map.bg} ${map.text} text-xs font-bold`}>
        {map.icon}
      </span>
      {showLabel && <span>{map.label}</span>}
    </span>
  );
}

function ResultRow({ label, value, confidence, isEstimate = false, estimateReason }: {
  label: string;
  value: string | null;
  confidence: Confidence;
  isEstimate?: boolean;
  estimateReason?: string | null;
}) {
  const iconMap: Record<Confidence, { bg: string; text: string; icon: string; tip: string }> = {
    high:   { bg: 'bg-green-100',  text: 'text-green-600',  icon: '✓', tip: '識別準確，可直接使用' },
    medium: { bg: 'bg-amber-100',  text: 'text-amber-600',  icon: '!', tip: '稍有不確定，建議核實' },
    low:    { bg: 'bg-orange-100', text: 'text-orange-600', icon: '?', tip: '信心不足，請手動確認' },
    none:   { bg: 'bg-ink-100',    text: 'text-ink-400',    icon: '—', tip: '未能識別' },
  };
  const c = iconMap[confidence];

  return (
    <div className="py-3 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-micro text-ink-500">{label}</span>
          {isEstimate && (
            <span className="text-micro px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full">AI 推算</span>
          )}
        </div>
        <div className="text-body text-ink-900">
          {value ?? <span className="text-ink-400">—</span>}
        </div>
        {isEstimate && estimateReason && (
          <div className="text-micro text-ink-400 mt-0.5">{estimateReason}</div>
        )}
      </div>
      <div
        className={`flex-shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full ${c.bg} ${c.text} text-xs font-bold`}
        title={c.tip}
      >
        {c.icon}
      </div>
    </div>
  );
}
