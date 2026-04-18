'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
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

export default function ScanProductForm({ categories }: { categories: Category[] }) {
  const [stage, setStage] = useState<Stage>('intro');
  const [attempt, setAttempt] = useState(1);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function runOcr(images: CapturedImage[]) {
    setStage('analyzing');
    setErrorMsg(null);
    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: images.map((img) => ({
            type: img.type,
            data: img.base64,
            mediaType: img.mediaType,
          })),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? `Server returned ${response.status}`);
      }
      const data = await response.json();
      setOcrResult(data.result);
      setStage('result');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '識別失敗');
      setStage('error');
    }
  }

  function retryCapture() { setAttempt(attempt + 1); setStage('capturing'); }
  function acceptResult() { setStage('form'); }
  function skipToManual() { setStage('form'); }

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
            <h1 className="font-display text-heading text-ink-900 mb-1">拍照加產品</h1>
            <p className="text-caption text-ink-600 leading-relaxed">
              自動識別產品名、品牌、PAO、到期日，同埋根據批號推算生產日期。
              分3步：正面 → 底部 → 到期日。
            </p>
          </div>
          <div className="bg-ink-50 rounded p-4 text-caption text-ink-600 space-y-1">
            <div className="font-medium text-ink-700 mb-2">📸 小貼士</div>
            <div>· 光源要夠，避免陰影同反光</div>
            <div>· 鏡頭靠近，文字填滿畫面</div>
            <div>· 底部嗰張要影到開蓋icon同批號</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStage('form')} className="btn-secondary flex-1">手動輸入</button>
            <button onClick={() => setStage('capturing')} className="btn-primary flex-1">開始拍照</button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'capturing') {
    return <CameraCapture onComplete={runOcr} onCancel={() => setStage('intro')} />;
  }

  if (stage === 'analyzing') {
    return (
      <div className="max-w-lg mx-auto pt-20 text-center space-y-4 animate-fade-in">
        <div className="inline-block animate-spin">
          <Sparkles className="w-10 h-10 text-brand-500" />
        </div>
        <h2 className="font-display text-heading text-ink-900">識別緊產品資料...</h2>
        <p className="text-caption text-ink-500">Claude正在分析相片，大約10-20秒</p>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
        <div className="card p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display text-heading text-ink-900 mb-1">識別失敗</h2>
            <p className="text-caption text-ink-600">{errorMsg ?? '未能連接識別服務，請稍後再試'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={skipToManual} className="btn-secondary flex-1">手動輸入</button>
            <button onClick={() => setStage('capturing')} className="btn-primary flex-1">重試</button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'result' && ocrResult) {
    const hasLowConfidence = Object.values(ocrResult.confidence).some(
      (c) => c === 'low' || c === 'none'
    );
    const hasNothing =
      !ocrResult.name && !ocrResult.brand && !ocrResult.pao_months && !ocrResult.expiry_date;

    return (
      <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
        <div className="card p-6 space-y-4">

          {/* Header + legend */}
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

          {hasNothing ? (
            <div className="bg-amber-50 border border-amber-200 rounded p-4 text-caption text-amber-900">
              冇識別到任何資料。可能係相片太模糊或者光線唔足。
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              <ResultRow label="產品名" value={ocrResult.name} confidence={ocrResult.confidence.name} />
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
              部分資料信心度唔高，想唔想再影清楚啲？
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {(hasLowConfidence || hasNothing) && attempt < 2 ? (
              <>
                <button onClick={acceptResult} className="btn-secondary flex-1">手動填返</button>
                <button onClick={retryCapture} className="btn-primary flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />再影一次
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setStage('capturing')} className="btn-secondary flex-1">重新拍照</button>
                <button onClick={acceptResult} className="btn-primary flex-1">用呢啲資料繼續</button>
              </>
            )}
          </div>

          {attempt >= 2 && hasLowConfidence && (
            <p className="text-micro text-ink-500 text-center">
              已試 2 次，建議手動填返未識別到嘅資料
            </p>
          )}
        </div>
      </div>
    );
  }

  if (stage === 'form') {
    const initial: Partial<Product> = ocrResult ? {
      name: ocrResult.name ?? '',
      brand: ocrResult.brand ?? null,
      pao_months: ocrResult.pao_months ?? null,
      expiry_date: ocrResult.expiry_date ?? null,
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
          <h1 className="font-display text-heading text-ink-900">確認產品資料</h1>
          <p className="text-caption text-ink-500 mt-1">
            {ocrResult ? '識別結果已填好，check一check再儲存' : '手動輸入產品資料'}
          </p>
        </div>
        <div className="card p-5">
          <ProductForm categories={categories} mode="create" initial={initial} />
        </div>
      </div>
    );
  }

  return null;
}

// ── SUB-COMPONENTS ─────────────────────────────────────────────────────────

function ConfidenceBadge({
  confidence,
  showLabel = false,
}: {
  confidence: 'high' | 'medium' | 'low';
  showLabel?: boolean;
}) {
  const map = {
    high:   { bg: 'bg-green-100',  text: 'text-green-600',  icon: '✓', label: '準確' },
    medium: { bg: 'bg-amber-100',  text: 'text-amber-600',  icon: '!', label: '核實' },
    low:    { bg: 'bg-orange-100', text: 'text-orange-600', icon: '?', label: '唔確定' },
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

function ResultRow({
  label,
  value,
  confidence,
  isEstimate = false,
  estimateReason,
}: {
  label: string;
  value: string | null;
  confidence: Confidence;
  isEstimate?: boolean;
  estimateReason?: string | null;
}) {
  const iconMap: Record<Confidence, { bg: string; text: string; icon: string; tip: string }> = {
    high:   { bg: 'bg-green-100',  text: 'text-green-600',  icon: '✓', tip: '識別準確，可以直接用' },
    medium: { bg: 'bg-amber-100',  text: 'text-amber-600',  icon: '!', tip: '有啲唔確定，建議核實' },
    low:    { bg: 'bg-orange-100', text: 'text-orange-600', icon: '?', tip: '信心唔足，請手動確認' },
    none:   { bg: 'bg-ink-100',    text: 'text-ink-400',    icon: '—', tip: '未能識別' },
  };
  const c = iconMap[confidence];

  return (
    <div className="py-3 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-micro text-ink-500">{label}</span>
          {isEstimate && (
            <span className="text-micro px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full">
              AI推算
            </span>
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
