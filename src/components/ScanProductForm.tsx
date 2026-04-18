'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import CameraCapture, { type CapturedImage } from './CameraCapture';
import ProductForm from './ProductForm';
import type { Product } from '@/types/database';

type Category = { id: string; name: string; color: string };

type OcrResult = {
  name: string | null;
  brand: string | null;
  pao_months: number | null;
  expiry_date: string | null;
  batch_code: string | null;
  confidence: {
    name: 'high' | 'medium' | 'low' | 'none';
    brand: 'high' | 'medium' | 'low' | 'none';
    pao_months: 'high' | 'medium' | 'low' | 'none';
    expiry_date: 'high' | 'medium' | 'low' | 'none';
  };
  notes: string | null;
};

type Stage = 'intro' | 'capturing' | 'analyzing' | 'result' | 'form' | 'error';

export default function ScanProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
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

  function retryCapture() {
    setAttempt(attempt + 1);
    setStage('capturing');
  }

  function acceptResult() {
    setStage('form');
  }

  function skipToManual() {
    setStage('form');
  }

  // ==========================================================================
  // Render stages
  // ==========================================================================

  if (stage === 'intro') {
    return (
      <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-caption text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>

        <div className="card p-6 space-y-5">
          <div className="w-12 h-12 rounded bg-brand-100 text-brand-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>

          <div>
            <h1 className="font-display text-heading text-ink-900 mb-1">
              拍照加產品
            </h1>
            <p className="text-caption text-ink-600 leading-relaxed">
              用相機影你嘅產品包裝，我哋會自動識別產品名、品牌、PAO同到期日。
              成個過程分3步：正面 → 底部 → 到期日。
            </p>
          </div>

          <div className="bg-ink-50 rounded p-4 space-y-2 text-caption text-ink-700">
            <div className="font-medium">📸 小貼士</div>
            <ul className="space-y-1 list-disc list-inside text-ink-600">
              <li>光源要夠，避免陰影同反光</li>
              <li>鏡頭靠近包裝，填滿畫面</li>
              <li>如果文字太細，集中影一部分</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStage('form')}
              className="btn-secondary flex-1"
            >
              手動輸入
            </button>
            <button
              onClick={() => setStage('capturing')}
              className="btn-primary flex-1"
            >
              開始拍照
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'capturing') {
    return (
      <CameraCapture
        onComplete={runOcr}
        onCancel={() => setStage('intro')}
      />
    );
  }

  if (stage === 'analyzing') {
    return (
      <div className="max-w-lg mx-auto pt-20 text-center space-y-4 animate-fade-in">
        <div className="inline-block animate-spin">
          <Sparkles className="w-10 h-10 text-brand-500" />
        </div>
        <h2 className="font-display text-heading text-ink-900">
          識別緊產品資料...
        </h2>
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
            <h2 className="font-display text-heading text-ink-900 mb-1">
              識別失敗
            </h2>
            <p className="text-caption text-ink-600">
              {errorMsg ?? '未能連接識別服務，請稍後再試'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={skipToManual} className="btn-secondary flex-1">
              手動輸入
            </button>
            <button onClick={() => setStage('capturing')} className="btn-primary flex-1">
              重試
            </button>
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
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-500" />
            <h2 className="font-display text-title text-ink-900">識別結果</h2>
          </div>

          {hasNothing ? (
            <div className="bg-amber-50 border border-amber-200 rounded p-4 text-caption text-amber-900">
              冇識別到任何資料。可能係相片太模糊或者光線唔足。
            </div>
          ) : (
            <div className="space-y-3">
              <ResultRow label="產品名" value={ocrResult.name} confidence={ocrResult.confidence.name} />
              <ResultRow label="品牌" value={ocrResult.brand} confidence={ocrResult.confidence.brand} />
              <ResultRow
                label="PAO"
                value={ocrResult.pao_months ? `${ocrResult.pao_months} 個月` : null}
                confidence={ocrResult.confidence.pao_months}
              />
              <ResultRow
                label="到期日"
                value={ocrResult.expiry_date}
                confidence={ocrResult.confidence.expiry_date}
              />
              {ocrResult.batch_code && (
                <ResultRow label="批號" value={ocrResult.batch_code} confidence="high" />
              )}
              {ocrResult.notes && (
                <div className="pt-2 border-t border-ink-100 text-caption text-ink-600">
                  💡 {ocrResult.notes}
                </div>
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
                <button onClick={acceptResult} className="btn-secondary flex-1">
                  手動填返
                </button>
                <button onClick={retryCapture} className="btn-primary flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  再影一次
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setStage('capturing')} className="btn-secondary flex-1">
                  重新拍照
                </button>
                <button onClick={acceptResult} className="btn-primary flex-1">
                  用呢啲資料繼續
                </button>
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
    // Pre-fill ProductForm with OCR result
    const initial: Partial<Product> = ocrResult
      ? {
          name: ocrResult.name ?? '',
          brand: ocrResult.brand ?? null,
          pao_months: ocrResult.pao_months ?? null,
          expiry_date: ocrResult.expiry_date ?? null,
        }
      : {};

    return (
      <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
        <button
          onClick={() => setStage('intro')}
          className="inline-flex items-center gap-1 text-caption text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>

        <div>
          <h1 className="font-display text-heading text-ink-900">確認產品資料</h1>
          <p className="text-caption text-ink-500 mt-1">
            {ocrResult ? '識別結果已填好，check一check再儲存' : '手動輸入產品資料'}
          </p>
        </div>

        <div className="card p-5">
          <ProductForm
            categories={categories}
            mode="create"
            initial={initial}
          />
        </div>
      </div>
    );
  }

  return null;
}

function ResultRow({
  label,
  value,
  confidence,
}: {
  label: string;
  value: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
}) {
  const confidenceColor = {
    high: 'text-status-ok',
    medium: 'text-status-caution',
    low: 'text-status-urgent',
    none: 'text-ink-400',
  }[confidence];

  const confidenceLabel = {
    high: '● 高',
    medium: '● 中',
    low: '● 低',
    none: '○ 冇',
  }[confidence];

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-micro text-ink-500">{label}</div>
        <div className="text-body text-ink-900 truncate">
          {value ?? <span className="text-ink-400">—</span>}
        </div>
      </div>
      <div className={`text-micro font-medium ${confidenceColor} flex-shrink-0`}>
        {confidenceLabel}
      </div>
    </div>
  );
}
