'use client';

import { useState, useRef } from 'react';
import { Camera, RefreshCw, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import type { Product } from '@/types/database';

type Stage = 'intro' | 'camera' | 'preview' | 'analyzing' | 'result';

type MakeupRecs = {
  foundation: string;
  blush: string[];
  lipstick: string[];
  eyeshadow: string[];
  contour: string;
};

type SkinToneResult = {
  calibration_note: string;
  season: string;
  season_cn: string;
  season_desc: string;
  tone: string;
  tone_cn: string;
  depth: string;
  depth_cn: string;
  undertone: string;
  undertone_cn: string;
  confidence: 'high' | 'medium' | 'low';
  analysis: string;
  makeup_recommendations: MakeupRecs;
  colors_to_avoid: string[];
  celebrity_reference: string;
  tips: string;
};

const SEASON_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  Spring:  { bg: '#FFF5EC', accent: '#E8825A', text: '#7A3A20' },
  Summer:  { bg: '#F0EEF8', accent: '#9080C0', text: '#3A2870' },
  Autumn:  { bg: '#FFF0E0', accent: '#C07030', text: '#6A3010' },
  Winter:  { bg: '#EEF0F8', accent: '#4050A0', text: '#1A2060' },
};

const SEASON_EMOJI: Record<string, string> = {
  Spring: '🌸', Summer: '🌿', Autumn: '🍂', Winter: '❄️',
};

// Match products to recommended colors based on notes/shade tags
function matchProducts(products: Product[], recs: MakeupRecs): Product[] {
  const allColors = [
    ...recs.blush,
    ...recs.lipstick,
    ...recs.eyeshadow,
  ].map((c) => c.toLowerCase());

  return products.filter((p) => {
    const notes = (p.notes ?? '').toLowerCase();
    return allColors.some((color) => notes.includes(color));
  }).slice(0, 6);
}

export default function SkinToneClient({ products }: { products: Product[] }) {
  const [stage, setStage] = useState<Stage>('intro');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>('image/jpeg');
  const [result, setResult] = useState<SkinToneResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStage('camera');
    } catch {
      setError('無法開啟相機，請改用上傳相片');
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    setCapturedImage(base64);
    setMediaType('image/jpeg');
    stopCamera();
    setStage('preview');
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setCapturedImage(base64);
      setMediaType(file.type || 'image/jpeg');
      setStage('preview');
    };
    reader.readAsDataURL(file);
  }

  async function analyzePhoto() {
    if (!capturedImage) return;
    setStage('analyzing');
    setError(null);

    try {
      const res = await fetch('/api/skin-tone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed');
      setResult(data.result);
      setStage('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失敗，請重試');
      setStage('preview');
    }
  }

  function reset() {
    setCapturedImage(null);
    setResult(null);
    setError(null);
    stopCamera();
    setStage('intro');
  }

  const matchedProducts = result ? matchProducts(products, result.makeup_recommendations) : [];
  const seasonStyle = result ? (SEASON_COLORS[result.season] ?? SEASON_COLORS.Spring) : SEASON_COLORS.Spring;

  // ── INTRO ─────────────────────────────────────────────────────────────────
  if (stage === 'intro') {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="card p-6 space-y-5">
          <div className="space-y-2">
            <div className="text-2xl">🎨</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: '#1A1218', margin: 0 }}>
              個人色彩分析
            </h2>
            <p className="text-caption" style={{ color: '#7A6068' }}>
              運用四季色彩理論，AI 分析你嘅膚色，找出最適合你嘅 Spring / Summer / Autumn / Winter 色系。
            </p>
          </div>

          {/* White card instruction */}
          <div className="rounded-md p-4 space-y-2" style={{ background: '#F5F0F2', border: '0.5px solid #E0D0D8' }}>
            <p className="text-caption font-medium" style={{ color: '#1A1218' }}>📄 拍攝前準備</p>
            <div className="space-y-1.5 text-caption" style={{ color: '#7A6068' }}>
              <div>1. 準備一張白紙（A4紙即可）</div>
              <div>2. 在自然光下拍攝，避免黃燈</div>
              <div>3. 拍攝時白紙放喺臉旁邊同框</div>
              <div>4. 輕妝或卸妝狀態更準確</div>
            </div>
          </div>

          <p className="text-micro" style={{ color: '#B09898' }}>
            ⚠️ 結果僅供參考，相片光線會影響分析準確度。白紙校準可提升準確度約 40%。
          </p>

          {error && (
            <div className="rounded p-3 text-caption" style={{ background: '#FDF0F0', color: '#A04040' }}>
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()}
              className="btn-secondary flex-1">
              上傳相片
            </button>
            <button onClick={startCamera} className="btn-primary flex-1">
              <Camera style={{ width: 15, height: 15, marginRight: 6 }} />
              拍攝
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={handleFileUpload} />
        </div>
      </div>
    );
  }

  // ── CAMERA ────────────────────────────────────────────────────────────────
  if (stage === 'camera') {
    return (
      <div className="max-w-lg mx-auto space-y-3">
        <div className="rounded-xl overflow-hidden" style={{ background: '#1A1218' }}>
          <video ref={videoRef} autoPlay playsInline muted
            className="w-full" style={{ aspectRatio: '4/3', objectFit: 'cover' }} />
        </div>
        <div className="card p-3 text-center">
          <p className="text-micro mb-3" style={{ color: '#9A7080' }}>
            請確保白紙在臉旁邊同框，自然光拍攝
          </p>
          <div className="flex gap-2">
            <button onClick={() => { stopCamera(); setStage('intro'); }} className="btn-secondary flex-1">
              取消
            </button>
            <button onClick={capturePhoto} className="btn-primary flex-1">
              <Camera style={{ width: 15, height: 15, marginRight: 6 }} />
              拍攝
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PREVIEW ───────────────────────────────────────────────────────────────
  if (stage === 'preview' && capturedImage) {
    return (
      <div className="max-w-lg mx-auto space-y-3">
        <div className="rounded-xl overflow-hidden">
          <img src={`data:${mediaType};base64,${capturedImage}`} alt="預覽"
            className="w-full" style={{ maxHeight: 400, objectFit: 'cover' }} />
        </div>
        {error && (
          <div className="card p-3 text-caption" style={{ color: '#A04040' }}>{error}</div>
        )}
        <div className="card p-4 space-y-3">
          <p className="text-caption" style={{ color: '#7A6068' }}>
            確認白紙清楚可見，然後開始分析。
          </p>
          <div className="flex gap-2">
            <button onClick={reset} className="btn-secondary flex-1">
              <RefreshCw style={{ width: 14, height: 14, marginRight: 6 }} />
              重新拍攝
            </button>
            <button onClick={analyzePhoto} className="btn-primary flex-1">
              <Sparkles style={{ width: 14, height: 14, marginRight: 6 }} />
              開始分析
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ANALYZING ─────────────────────────────────────────────────────────────
  if (stage === 'analyzing') {
    return (
      <div className="max-w-lg mx-auto pt-16 text-center space-y-4">
        <div className="inline-block animate-spin">
          <Sparkles style={{ width: 36, height: 36, color: '#B06070' }} />
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: '#1A1218' }}>
          正在分析你的膚色...
        </h2>
        <p className="text-caption" style={{ color: '#9A7080' }}>
          AI 正在校準白紙色溫，分析四季色彩分型，約需 10–20 秒
        </p>
      </div>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (stage === 'result' && result) {
    return (
      <div className="max-w-lg mx-auto space-y-4">

        {/* Season card */}
        <div className="card overflow-hidden">
          <div className="p-6 text-center space-y-2"
            style={{ background: seasonStyle.bg }}>
            <div style={{ fontSize: 40 }}>{SEASON_EMOJI[result.season]}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32,
              color: seasonStyle.text, fontWeight: 400 }}>
              {result.season_cn}
            </div>
            <div style={{ fontSize: 13, color: seasonStyle.accent }}>{result.season_desc}</div>
            <div className="flex items-center justify-center gap-3 pt-1">
              <Tag label={result.tone_cn} color={seasonStyle.accent} bg={seasonStyle.bg} />
              <Tag label={result.depth_cn} color={seasonStyle.accent} bg={seasonStyle.bg} />
              <Tag label={result.undertone_cn} color={seasonStyle.accent} bg={seasonStyle.bg} />
            </div>
          </div>

          {/* Confidence + calibration */}
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ borderTop: `0.5px solid ${seasonStyle.accent}30`, background: '#FAFAF8' }}>
            {result.confidence === 'high'
              ? <CheckCircle style={{ width: 14, height: 14, color: '#2E7A4A', flexShrink: 0 }} />
              : <XCircle style={{ width: 14, height: 14, color: '#C06030', flexShrink: 0 }} />}
            <p className="text-micro" style={{ color: '#9A7080' }}>
              {result.calibration_note}
            </p>
          </div>
        </div>

        {/* Analysis */}
        <div className="card p-4 space-y-2">
          <h3 style={{ fontSize: 14, fontWeight: 500, color: '#1A1218', margin: 0 }}>分析說明</h3>
          <p className="text-caption" style={{ color: '#7A6068', lineHeight: 1.7 }}>{result.analysis}</p>
          {result.celebrity_reference && (
            <p className="text-micro" style={{ color: '#9A7080' }}>
              🌟 參考：{result.celebrity_reference}
            </p>
          )}
        </div>

        {/* Makeup recommendations */}
        <div className="card p-4 space-y-4">
          <h3 style={{ fontSize: 14, fontWeight: 500, color: '#1A1218', margin: 0 }}>彩妝色系建議</h3>

          <RecRow label="粉底方向" value={result.makeup_recommendations.foundation} accent={seasonStyle.accent} />

          <div>
            <p className="text-micro mb-1.5" style={{ color: '#9A7080' }}>腮紅</p>
            <div className="flex flex-wrap gap-1.5">
              {result.makeup_recommendations.blush.map((c) => (
                <ColorPill key={c} label={c} accent={seasonStyle.accent} bg={seasonStyle.bg} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-micro mb-1.5" style={{ color: '#9A7080' }}>唇妝</p>
            <div className="flex flex-wrap gap-1.5">
              {result.makeup_recommendations.lipstick.map((c) => (
                <ColorPill key={c} label={c} accent={seasonStyle.accent} bg={seasonStyle.bg} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-micro mb-1.5" style={{ color: '#9A7080' }}>眼影</p>
            <div className="flex flex-wrap gap-1.5">
              {result.makeup_recommendations.eyeshadow.map((c) => (
                <ColorPill key={c} label={c} accent={seasonStyle.accent} bg={seasonStyle.bg} />
              ))}
            </div>
          </div>

          <RecRow label="修容" value={result.makeup_recommendations.contour} accent={seasonStyle.accent} />

          {/* Avoid */}
          {result.colors_to_avoid.length > 0 && (
            <div>
              <p className="text-micro mb-1.5" style={{ color: '#9A7080' }}>建議避免</p>
              <div className="flex flex-wrap gap-1.5">
                {result.colors_to_avoid.map((c) => (
                  <span key={c} className="text-micro px-2.5 py-1 rounded-full"
                    style={{ background: '#F5F0F2', color: '#9A7080',
                      textDecoration: 'line-through' }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tip */}
        <div className="card p-4 flex items-start gap-3"
          style={{ background: seasonStyle.bg, borderColor: seasonStyle.accent + '40' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🐱</span>
          <p className="text-caption" style={{ color: seasonStyle.text, lineHeight: 1.7 }}>
            {result.tips}
          </p>
        </div>

        {/* Matched products from library */}
        {matchedProducts.length > 0 && (
          <div className="card p-4 space-y-3">
            <h3 style={{ fontSize: 14, fontWeight: 500, color: '#1A1218', margin: 0 }}>
              你產品庫入面符合色系的產品
            </h3>
            <div className="space-y-2">
              {matchedProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name} className="rounded object-cover flex-shrink-0"
                      style={{ width: 36, height: 36 }} />
                  ) : (
                    <div className="rounded flex-shrink-0 flex items-center justify-center"
                      style={{ width: 36, height: 36, background: seasonStyle.bg,
                        color: seasonStyle.text, fontSize: 14,
                        fontFamily: "'Cormorant Garamond', serif" }}>
                      {p.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-caption truncate" style={{ color: '#1A1218' }}>{p.name}</div>
                    <div className="text-micro" style={{ color: '#9A7080' }}>{p.brand ?? '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Retake */}
        <button onClick={reset} className="btn-secondary w-full">
          <RefreshCw style={{ width: 14, height: 14, marginRight: 6 }} />
          重新分析
        </button>
      </div>
    );
  }

  return null;
}

function Tag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className="text-micro px-2.5 py-1 rounded-full"
      style={{ background: color + '20', color, border: `0.5px solid ${color}50` }}>
      {label}
    </span>
  );
}

function ColorPill({ label, accent, bg }: { label: string; accent: string; bg: string }) {
  return (
    <span className="text-micro px-2.5 py-1 rounded-full"
      style={{ background: bg, color: accent, border: `0.5px solid ${accent}40` }}>
      {label}
    </span>
  );
}

function RecRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-micro flex-shrink-0 mt-0.5" style={{ color: '#9A7080', minWidth: 48 }}>{label}</span>
      <span className="text-caption" style={{ color: '#1A1218' }}>{value}</span>
    </div>
  );
}
