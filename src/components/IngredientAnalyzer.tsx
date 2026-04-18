'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Sparkles, Camera, RotateCcw, Check,
  X, AlertTriangle, ShieldCheck, Zap, ChevronDown, ChevronUp, Save
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/image';
import type { AnalysisResult } from '@/app/api/analyze-ingredients/route';

type Category = { id: string; name: string; color: string };
type Stage = 'intro' | 'capturing' | 'analyzing' | 'result' | 'saving' | 'saved' | 'error';

type CapturedImage = {
  base64: string;
  mediaType: 'image/jpeg';
  previewUrl: string;
};

export default function IngredientAnalyzer({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('intro');
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [previewing, setPreviewing] = useState<CapturedImage | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [savingCategory, setSavingCategory] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function openCamera() { fileInputRef.current?.click(); }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const { base64, mediaType } = await compressImage(file);
      const previewUrl = URL.createObjectURL(file);
      setPreviewing({ base64, mediaType, previewUrl });
    } catch {
      setErrorMsg('相片處理失敗，請重試。');
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function confirmPhoto() {
    if (!previewing) return;
    setImages((prev) => [...prev, previewing]);
    setPreviewing(null);
  }

  function retakePhoto() {
    if (previewing?.previewUrl) URL.revokeObjectURL(previewing.previewUrl);
    setPreviewing(null);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const copy = [...prev];
      if (copy[index]?.previewUrl) URL.revokeObjectURL(copy[index].previewUrl);
      copy.splice(index, 1);
      return copy;
    });
  }

  async function runAnalysis() {
    if (images.length === 0) return;
    setStage('analyzing');
    setErrorMsg(null);
    try {
      const response = await fetch('/api/analyze-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: images.map((img) => ({
            data: img.base64,
            mediaType: img.mediaType,
          })),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? `伺服器錯誤 ${response.status}`);
      }
      const data = await response.json();
      setResult(data.result);
      setStage('result');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '分析失敗，請重試');
      setStage('error');
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaveLoading(true);
    setSaveError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaveError('請重新登入'); setSaveLoading(false); return; }

    const { data, error } = await supabase
      .from('products')
      .insert({
        user_id: user.id,
        name: result.product_name ?? '未命名產品',
        brand: result.brand ?? null,
        category_id: savingCategory || null,
        status: 'unopened',
        notes: `成份分析摘要：${result.recommendation_reason}`,
      })
      .select('id')
      .single();

    if (error) { setSaveError(error.message); setSaveLoading(false); return; }
    setStage('saved');
    setTimeout(() => router.push(`/products/${data.id}`), 1500);
  }

  // ── INTRO ─────────────────────────────────────────────────────────────────
  if (stage === 'intro' || stage === 'capturing') {
    return (
      <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
        <Link href="/products" className="inline-flex items-center gap-1 text-caption text-ink-500 hover:text-ink-800">
          <ArrowLeft className="w-4 h-4" />返回
        </Link>

        <div>
          <h1 className="font-display text-heading text-ink-900">分析產品成份</h1>
          <p className="text-caption text-ink-500 mt-1">
            拍攝成份表，AI 將分析安全性、優質成份，並檢查與您現有產品是否相容。
          </p>
        </div>

        {/* 已拍攝的相片 */}
        {images.length > 0 && (
          <div className="space-y-2">
            <div className="text-caption font-medium text-ink-700">已拍攝 {images.length} 張</div>
            <div className="flex gap-2 flex-wrap">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img.previewUrl} alt={`成份表 ${i + 1}`} className="w-20 h-20 rounded object-cover border border-ink-200" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-ink-800 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 預覽確認 */}
        {previewing ? (
          <div className="space-y-3">
            <img src={previewing.previewUrl} alt="預覽" className="w-full rounded-md border border-ink-200" />
            <div className="flex gap-2">
              <button onClick={retakePhoto} className="btn-secondary flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />重新拍攝
              </button>
              <button onClick={confirmPhoto} className="btn-primary flex-1">
                <Check className="w-4 h-4 mr-2" />確認使用
              </button>
            </div>
          </div>
        ) : (
          <div className="card p-5 space-y-4">
            <div className="bg-ink-50 rounded p-3 text-caption text-ink-600 space-y-1">
              <div className="font-medium text-ink-700 mb-1">📋 拍攝建議</div>
              <div>· 對準成份表（Ingredients / 成份）部分</div>
              <div>· 確保文字清晰，光線充足</div>
              <div>· 成份表較長可分多張拍攝</div>
            </div>

            <button
              onClick={openCamera}
              disabled={processing}
              className="w-full py-5 bg-ink-900 text-white rounded-md font-medium flex items-center justify-center gap-3 hover:bg-ink-800 transition-colors disabled:opacity-50"
            >
              <Camera className="w-5 h-5" />
              {processing ? '處理中...' : images.length === 0 ? '拍攝成份表' : '再拍一張（成份表較長）'}
            </button>

            {images.length > 0 && (
              <button
                onClick={runAnalysis}
                className="w-full py-3 bg-brand-500 text-white rounded-md font-medium hover:bg-brand-600 transition-colors"
              >
                開始分析 →
              </button>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  // ── ANALYZING ─────────────────────────────────────────────────────────────
  if (stage === 'analyzing') {
    return (
      <div className="max-w-lg mx-auto pt-20 text-center space-y-4 animate-fade-in">
        <div className="inline-block animate-spin">
          <Sparkles className="w-10 h-10 text-brand-500" />
        </div>
        <h2 className="font-display text-heading text-ink-900">正在分析成份...</h2>
        <p className="text-caption text-ink-500">AI 正在識別成份並檢查相容性，約需 15–30 秒</p>
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
        <div className="card p-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <div>
            <h2 className="font-display text-heading text-ink-900 mb-1">分析失敗</h2>
            <p className="text-caption text-ink-600">{errorMsg}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setStage('intro'); setImages([]); }} className="btn-secondary flex-1">重新開始</button>
            <button onClick={runAnalysis} className="btn-primary flex-1">重試</button>
          </div>
        </div>
      </div>
    );
  }

  // ── SAVED ─────────────────────────────────────────────────────────────────
  if (stage === 'saved') {
    return (
      <div className="max-w-lg mx-auto pt-20 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full mx-auto flex items-center justify-center">
          <Check className="w-8 h-8" />
        </div>
        <h2 className="font-display text-heading text-ink-900">已儲存至產品庫</h2>
        <p className="text-caption text-ink-500">正在前往產品頁面...</p>
      </div>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (stage === 'result' && result) {
    const recConfig = {
      buy:     { bg: 'bg-green-50 border-green-200',  icon: '✅', text: 'text-green-800', label: '建議購買' },
      caution: { bg: 'bg-amber-50 border-amber-200',  icon: '⚠️', text: 'text-amber-800', label: '請謹慎考慮' },
      avoid:   { bg: 'bg-red-50 border-red-200',      icon: '🚫', text: 'text-red-800',   label: '建議避免' },
    }[result.recommendation];

    return (
      <div className="max-w-lg mx-auto space-y-4 animate-fade-in pb-8">
        <Link href="/products" className="inline-flex items-center gap-1 text-caption text-ink-500 hover:text-ink-800">
          <ArrowLeft className="w-4 h-4" />返回
        </Link>

        {/* 產品名稱 */}
        {(result.product_name || result.brand) && (
          <div>
            <h1 className="font-display text-heading text-ink-900">
              {result.product_name ?? '產品成份分析'}
            </h1>
            {result.brand && <p className="text-caption text-ink-500">{result.brand}</p>}
          </div>
        )}

        {/* OCR信心度警告 */}
        {result.ocr_confidence === 'low' && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-caption text-amber-800">
            ⚠️ 成份表識別準確度較低，建議重新拍攝更清晰的相片以獲得更準確的分析。
          </div>
        )}

        {/* AI綜合建議 */}
        <div className={`card p-5 border ${recConfig.bg} space-y-2`}>
          <div className={`font-display text-title font-medium ${recConfig.text} flex items-center gap-2`}>
            <span>{recConfig.icon}</span>
            <span>{recConfig.label}</span>
          </div>
          <p className={`text-caption leading-relaxed ${recConfig.text}`}>
            {result.recommendation_reason}
          </p>
        </div>

        {/* 需要注意的成份 */}
        {result.concerns.length > 0 && (
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2 font-medium text-ink-900">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-title">需要注意的成份</span>
            </div>
            <div className="space-y-3">
              {result.concerns.map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    c.severity === 'high' ? 'bg-red-500' :
                    c.severity === 'medium' ? 'bg-amber-500' : 'bg-yellow-400'
                  }`} />
                  <div>
                    <div className="text-caption font-medium text-ink-900">{c.name}</div>
                    <div className="text-micro text-ink-600 mt-0.5">{c.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 優質成份 */}
        {result.highlights.length > 0 && (
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2 font-medium text-ink-900">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span className="text-title">優質成份</span>
            </div>
            <div className="space-y-3">
              {result.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <div>
                    <div className="text-caption font-medium text-ink-900">{h.name}</div>
                    <div className="text-micro text-ink-600 mt-0.5">{h.benefit}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 與現有產品衝突 */}
        {result.conflicts.length > 0 && (
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2 font-medium text-ink-900">
              <Zap className="w-4 h-4 text-orange-500" />
              <span className="text-title">與現有產品的相容性</span>
            </div>
            <div className="space-y-3">
              {result.conflicts.map((c, i) => (
                <div key={i} className={`rounded p-3 space-y-1 ${
                  c.severity === 'high' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
                }`}>
                  <div className="text-caption font-medium text-ink-900">
                    {c.severity === 'high' ? '🔴' : '🟡'} {c.product_name}
                  </div>
                  <div className="text-micro text-ink-700">
                    {c.this_ingredient} × {c.existing_ingredient}
                  </div>
                  <div className="text-micro text-ink-600">{c.advice}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 不同膚質建議 */}
        {Object.values(result.skin_type_notes).some(Boolean) && (
          <div className="card p-5 space-y-3">
            <div className="text-title font-medium text-ink-900">不同膚質的建議</div>
            <div className="grid grid-cols-2 gap-2">
              {result.skin_type_notes.oily && (
                <SkinTypeNote type="油性肌膚" note={result.skin_type_notes.oily} />
              )}
              {result.skin_type_notes.dry && (
                <SkinTypeNote type="乾性肌膚" note={result.skin_type_notes.dry} />
              )}
              {result.skin_type_notes.sensitive && (
                <SkinTypeNote type="敏感肌膚" note={result.skin_type_notes.sensitive} />
              )}
              {result.skin_type_notes.combination && (
                <SkinTypeNote type="混合性肌膚" note={result.skin_type_notes.combination} />
              )}
            </div>
          </div>
        )}

        {/* 識別到的全部成份（可展開） */}
        {result.ingredients_detected.length > 0 && (
          <div className="card p-5 space-y-3">
            <button
              onClick={() => setShowAllIngredients(!showAllIngredients)}
              className="w-full flex items-center justify-between text-title font-medium text-ink-900"
            >
              <span>全部成份（{result.ingredients_detected.length} 種）</span>
              {showAllIngredients ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAllIngredients && (
              <div className="flex flex-wrap gap-1.5">
                {result.ingredients_detected.map((ing, i) => (
                  <span key={i} className="text-micro px-2 py-1 bg-ink-100 text-ink-700 rounded-full">
                    {ing}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 免責聲明 */}
        <p className="text-micro text-ink-400 text-center leading-relaxed px-4">
          {result.disclaimer}
        </p>

        {/* 儲存至產品庫 */}
        <div className="card p-5 space-y-3">
          <div className="text-title font-medium text-ink-900">儲存至產品庫</div>
          <div>
            <label className="label">選擇分類</label>
            <select
              value={savingCategory}
              onChange={(e) => setSavingCategory(e.target.value)}
              className="input"
            >
              <option value="">未分類</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {saveError && <p className="text-caption text-red-600">{saveError}</p>}
          <button
            onClick={handleSave}
            disabled={saveLoading}
            className="btn-primary w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveLoading ? '儲存中...' : '儲存至我的產品庫'}
          </button>
          <p className="text-micro text-ink-400 text-center">
            此產品將計入您的 100 件配額
          </p>
        </div>

        {/* 重新分析 */}
        <button
          onClick={() => { setStage('intro'); setImages([]); setResult(null); }}
          className="btn-secondary w-full"
        >
          分析另一件產品
        </button>
      </div>
    );
  }

  return null;
}

function SkinTypeNote({ type, note }: { type: string; note: string }) {
  return (
    <div className="bg-ink-50 rounded p-2.5">
      <div className="text-micro font-medium text-ink-700 mb-0.5">{type}</div>
      <div className="text-micro text-ink-600">{note}</div>
    </div>
  );
}
