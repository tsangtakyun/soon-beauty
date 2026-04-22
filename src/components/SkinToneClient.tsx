'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, RefreshCw, Sparkles, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import type { Product } from '@/types/database';

type SuitableShades = { lip: string[]; blush: string[]; eyeshadow: string[]; foundation: string[] };
type ColorProfile = {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  warm_cool: 'warm' | 'cool' | 'neutral';
  skin_depth: string;
  undertone: string;
  suitable_shades: SuitableShades;
  avoid_shades: string[];
  season_description: string;
  analysed_at?: string;
};
type AnalysisResult = ColorProfile & { season_confidence: string; lama_message: string; notes: string };
type VeinColor = 'blue_purple' | 'green' | 'unclear';
type Stage = 'landing' | 'vein' | 'jewelry' | 'wrist' | 'face' | 'analyzing' | 'result';
type JewelryPref = 'gold' | 'silver' | 'both';

const SEASON_CONFIG: Record<string, { label: string; emoji: string; bg: string; color: string; border: string }> = {
  spring: { label: 'Spring 春季型', emoji: '🌸', bg: '#FEF8F0', color: '#B06030', border: '#F0D4B0' },
  summer: { label: 'Summer 夏季型', emoji: '🌿', bg: '#F0EAF4', color: '#7A50A0', border: '#D0B8E0' },
  autumn: { label: 'Autumn 秋季型', emoji: '🍂', bg: '#FEF0E8', color: '#A04020', border: '#F0C4A0' },
  winter: { label: 'Winter 冬季型', emoji: '❄️', bg: '#EAF0F8', color: '#304080', border: '#B0C4E0' },
};

function getCompat(product: Product, profile: ColorProfile): 'match' | 'avoid' | 'neutral' {
  const shade = (product.notes ?? '').match(/色系：(.+)/)?.[1]?.trim();
  if (!shade) return 'neutral';
  const allSuitable = Object.values(profile.suitable_shades).flat();
  if (allSuitable.some((s) => shade.includes(s) || s.includes(shade))) return 'match';
  if (profile.avoid_shades?.some((s) => shade.includes(s) || s.includes(shade))) return 'avoid';
  return 'neutral';
}

function ImageCapture({
  title, subtitle, instruction, tip,
  onCapture, onBack, backLabel,
}: {
  title: string; subtitle: string; instruction: string; tip?: string;
  onCapture: (data: string, url: string) => void;
  onBack: () => void; backLabel: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreviewData(dataUrl.split(',')[1]);
      setPreviewUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="card p-5 space-y-4">
      <div>
        <div className="text-micro mb-1" style={{ color: '#9A7080' }}>{subtitle}</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, color: '#1A1218' }}>
          {title}
        </h2>
        <p className="text-caption mt-1" style={{ color: '#7A6068', lineHeight: 1.7 }}>{instruction}</p>
      </div>

      {tip && (
        <div className="rounded-md p-3 text-caption" style={{ background: '#F5F0F2', color: '#7A6068' }}>
          💡 {tip}
        </div>
      )}

      {previewUrl ? (
        <>
          <img src={previewUrl} alt="預覽" className="w-full rounded-md object-cover" style={{ maxHeight: 260 }} />
          <div className="flex gap-2">
            <button onClick={() => { setPreviewUrl(null); setPreviewData(null); }}
              className="btn-secondary flex-1">
              <RefreshCw className="w-4 h-4 mr-1.5" />換張相
            </button>
            <button onClick={() => onCapture(previewData!, previewUrl)} className="btn-primary flex-1">
              確認，下一步 →
            </button>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => camRef.current?.click()}
            className="flex flex-col items-center gap-2 p-4 rounded-md transition-colors"
            style={{ border: '0.5px solid #D8C8D0', background: '#FAFAF8' }}>
            <Camera className="w-6 h-6" style={{ color: '#B06070' }} />
            <span className="text-caption" style={{ color: '#1A1218' }}>拍照</span>
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-2 p-4 rounded-md transition-colors"
            style={{ border: '0.5px solid #D8C8D0', background: '#FAFAF8' }}>
            <Upload className="w-6 h-6" style={{ color: '#B06070' }} />
            <span className="text-caption" style={{ color: '#1A1218' }}>上傳相片</span>
          </button>
        </div>
      )}

      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      <button onClick={onBack} className="text-caption w-full text-center" style={{ color: '#B09898' }}>
        ← {backLabel}
      </button>
    </div>
  );
}

export default function SkinToneClient({ existingProfile, products }: { existingProfile: ColorProfile | null; products: Product[] }) {
  const [stage, setStage] = useState<Stage>(existingProfile ? 'result' : 'landing');
  const [veinColor, setVeinColor] = useState<VeinColor | null>(null);
  const [jewelryPref, setJewelryPref] = useState<JewelryPref | null>(null);
  const [wristData, setWristData] = useState<string | null>(null);
  const [faceData, setFaceData] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [profile, setProfile] = useState<ColorProfile | null>(existingProfile);
  const [error, setError] = useState<string | null>(null);

  async function analyse() {
    if (!wristData || !faceData) return;
    setStage('analyzing');
    setError(null);
    try {
      const res = await fetch('/api/skin-tone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wristData, faceData, mediaType: 'image/jpeg', veinColor, jewelryPref }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
      setProfile(data.result);
      setStage('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析失敗');
      setStage('face');
    }
  }

  // ── LANDING ──
  if (stage === 'landing') return (
    <div className="card p-6 space-y-5">
      <div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 400, color: '#1A1218' }}>
          找出你的個人色彩
        </h2>
        <p className="text-caption mt-1" style={{ color: '#7A6068', lineHeight: 1.7 }}>
          三重驗證——一條問題 + 手腕相片 + 臉部相片，AI 更準確分析你的膚色冷暖調。
        </p>
      </div>

      {/* Steps preview */}
      <div className="space-y-2">
        {[
          { step: '1', label: '靜脈顏色問題', desc: '翻轉手腕看靜脈' },
          { step: '2', label: '金銀飾物問題', desc: '判斷冷暖調' },
          { step: '3', label: '拍攝手腕內側', desc: '判斷底色最準確' },
          { step: '4', label: '拍攝臉部正面', desc: '手持白紙校正色溫' },
        ].map((s) => (
          <div key={s.step} className="flex items-center gap-3 p-2.5 rounded-md" style={{ background: '#F5F0F2' }}>
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-caption font-medium"
              style={{ background: '#B06070', color: 'white' }}>{s.step}</div>
            <div>
              <div className="text-caption font-medium" style={{ color: '#1A1218' }}>{s.label}</div>
              <div className="text-micro" style={{ color: '#9A7080' }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setStage('vein')} className="btn-primary w-full">開始分析</button>

      {existingProfile && (
        <button onClick={() => setStage('result')}
          className="text-caption w-full text-center" style={{ color: '#B09898' }}>
          查看上次結果
        </button>
      )}
    </div>
  );

  // ── VEIN QUESTION ──
  if (stage === 'vein') return (
    <div className="card p-6 space-y-5">
      <div>
        <div className="text-micro mb-1" style={{ color: '#9A7080' }}>第 1 步 / 共 3 步</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, color: '#1A1218' }}>
          睇一睇你的手腕靜脈
        </h2>
        <p className="text-caption mt-2" style={{ color: '#7A6068', lineHeight: 1.7 }}>
          將手腕翻轉，在自然光下觀察手背靜脈顏色，這是判斷冷暖調最準確的方法。
        </p>
      </div>

      <div className="space-y-3">
        {[
          { value: 'blue_purple' as VeinColor, label: '藍色或紫色', desc: '靜脈帶有明顯藍/紫色調', color: '#7A70D0' },
          { value: 'green' as VeinColor, label: '綠色', desc: '靜脈帶有明顯綠色調', color: '#5A9060' },
          { value: 'unclear' as VeinColor, label: '睇唔清楚 / 兩者都有', desc: '顏色不明顯或藍綠都有', color: '#9A8090' },
        ].map((opt) => (
          <button key={opt.value} onClick={() => setVeinColor(opt.value)}
            className="w-full flex items-center gap-4 p-4 rounded-md text-left transition-all"
            style={{
              border: veinColor === opt.value ? '1.5px solid #B06070' : '0.5px solid #E0D4D8',
              background: veinColor === opt.value ? '#FDF0F4' : '#FAFAF8',
            }}>
            <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: opt.color, opacity: 0.85 }} />
            <div className="flex-1">
              <div className="text-caption font-medium" style={{ color: '#1A1218' }}>{opt.label}</div>
              <div className="text-micro mt-0.5" style={{ color: '#9A7080' }}>{opt.desc}</div>
            </div>
            {veinColor === opt.value && (
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#B06070', color: 'white', fontSize: 11 }}>✓</div>
            )}
          </button>
        ))}
      </div>

      <button onClick={() => setStage('jewelry')} disabled={!veinColor} className="btn-primary w-full">
        下一步：金銀飾物問題 →
      </button>
      <button onClick={() => setStage('landing')} className="text-caption w-full text-center" style={{ color: '#B09898' }}>
        返回
      </button>
    </div>
  );

  // ── JEWELRY QUESTION ──
  if (stage === 'jewelry') return (
    <div className="card p-6 space-y-5">
      <div>
        <div className="text-micro mb-1" style={{ color: '#9A7080' }}>第 2 步 / 共 4 步</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, color: '#1A1218' }}>
          金飾還是銀飾？
        </h2>
        <p className="text-caption mt-2" style={{ color: '#7A6068', lineHeight: 1.7 }}>
          回想你戴金色飾物（黃金、玫瑰金）定銀色飾物（白銀、白金）時，哪個令你膚色看起來更好睇、更有氣色？
        </p>
      </div>

      <div className="space-y-3">
        {[
          {
            value: 'gold' as JewelryPref,
            label: '金色飾物更好睇',
            desc: '黃金或玫瑰金令我膚色更有光澤',
            emoji: '🥇',
          },
          {
            value: 'silver' as JewelryPref,
            label: '銀色飾物更好睇',
            desc: '白銀或白金令我膚色更清透',
            emoji: '🥈',
          },
          {
            value: 'both' as JewelryPref,
            label: '兩個都OK / 唔確定',
            desc: '分唔清楚或者兩種都適合',
            emoji: '🤷',
          },
        ].map((opt) => (
          <button key={opt.value} onClick={() => setJewelryPref(opt.value)}
            className="w-full flex items-center gap-4 p-4 rounded-md text-left transition-all"
            style={{
              border: jewelryPref === opt.value ? '1.5px solid #B06070' : '0.5px solid #E0D4D8',
              background: jewelryPref === opt.value ? '#FDF0F4' : '#FAFAF8',
            }}>
            <span style={{ fontSize: 24 }}>{opt.emoji}</span>
            <div className="flex-1">
              <div className="text-caption font-medium" style={{ color: '#1A1218' }}>{opt.label}</div>
              <div className="text-micro mt-0.5" style={{ color: '#9A7080' }}>{opt.desc}</div>
            </div>
            {jewelryPref === opt.value && (
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#B06070', color: 'white', fontSize: 11 }}>✓</div>
            )}
          </button>
        ))}
      </div>

      <button onClick={() => setStage('wrist')} disabled={!jewelryPref} className="btn-primary w-full">
        下一步：拍手腕 →
      </button>
      <button onClick={() => setStage('vein')} className="text-caption w-full text-center" style={{ color: '#B09898' }}>
        ← 返回修改靜脈答案
      </button>
    </div>
  );

  // ── WRIST PHOTO ──
  if (stage === 'wrist') return (
    <ImageCapture
      subtitle="第 3 步 / 共 4 步"
      title="拍攝手腕內側"
      instruction="將手腕翻轉，在自然光下拍攝手腕內側皮膚。確保畫面清晰，可以看到靜脈。"
      tip="自然光效果最好，避免黃燈或強烈閃光。手腕放鬆，不要繃緊。"
      onCapture={(data) => { setWristData(data); setStage('face'); }}
      onBack={() => setStage('jewelry')}
      backLabel="返回修改飾物答案"
    />
  );

  // ── FACE PHOTO ──
  if (stage === 'face') return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded-md text-caption" style={{ background: '#FDF0E8', color: '#C06030' }}>
          ⚠️ {error}，請重試
        </div>
      )}
      <ImageCapture
        subtitle="第 4 步 / 共 4 步"
        title="拍攝臉部正面"
        instruction="手持一張白紙靠近臉旁，在自然光下正面拍攝。白紙幫助AI校正光線色溫，令膚色分析更準確。素顏或淡妝效果最佳，避免濾鏡。"
        tip="白紙放喺臉側或下巴位置即可，確保臉部同白紙都在畫面內。拍完會立即開始分析！"
        onCapture={(data) => { setFaceData(data); analyse(); }}
        onBack={() => setStage('wrist')}
        backLabel="返回重拍手腕"
      />
    </div>
  );

  // ── ANALYZING ──
  if (stage === 'analyzing') return (
    <div className="pt-16 text-center space-y-4">
      <div className="inline-block animate-spin">
        <Sparkles className="w-10 h-10" style={{ color: '#B06070' }} />
      </div>
      <h2 className="fini-dash-title" style={{ fontSize: 20 }}>三重分析緊你的個人色彩...</h2>
      <p className="text-caption" style={{ color: '#9A7080' }}>結合靜脈答案、手腕底色、臉部膚色，約需 15–20 秒</p>
    </div>
  );

  // ── RESULT ──
  if (stage === 'result' && profile) {
    const cfg = SEASON_CONFIG[profile.season] ?? SEASON_CONFIG.autumn;
    return (
      <div className="space-y-4">
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: cfg.bg, border: `0.5px solid ${cfg.border}` }}>
              <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: cfg.color }}>{cfg.label}</span>
            </div>
            <button onClick={() => setStage('landing')} className="text-caption" style={{ color: '#B06070' }}>
              重新分析
            </button>
          </div>

          {result?.lama_message && (
            <div className="rounded-xl p-3" style={{ background: '#FDF0F4', border: '0.5px solid #E8C8D0' }}>
              <p className="text-caption" style={{ color: '#7A3050', lineHeight: 1.7 }}>🐱 {result.lama_message}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '冷暖調', value: profile.warm_cool === 'warm' ? '暖調' : profile.warm_cool === 'cool' ? '冷調' : '中性' },
              { label: '膚色', value: ({ fair:'白皙', light:'偏白', medium:'中等', tan:'小麥', deep:'深色' } as Record<string,string>)[profile.skin_depth] ?? profile.skin_depth },
              { label: '底色', value: ({ pink:'粉紅底', yellow:'黃底', olive:'橄欖底', cool_pink:'冷粉紅', warm_yellow:'暖黃', warm_olive:'暖橄欖', cool_blue:'冷藍調', neutral:'中性底' } as Record<string,string>)[profile.undertone] ?? profile.undertone },
            ].map((item) => (
              <div key={item.label} className="rounded-md p-3 text-center" style={{ background: '#F5F0F2' }}>
                <div className="text-micro mb-1" style={{ color: '#9A7080' }}>{item.label}</div>
                <div className="text-caption font-medium" style={{ color: '#1A1218' }}>{item.value}</div>
              </div>
            ))}
          </div>

          {profile.season_description && (
            <p className="text-caption" style={{ color: '#7A6068', lineHeight: 1.75 }}>{profile.season_description}</p>
          )}
        </div>

        <div className="card p-4 space-y-3">
          <h3 style={{ fontSize: 14, fontWeight: 500, color: '#1A1218' }}>建議色系</h3>
          {Object.entries(profile.suitable_shades).map(([cat, shades]) => (
            <div key={cat} className="flex items-start gap-3">
              <span className="text-micro flex-shrink-0 mt-0.5 w-10" style={{ color: '#9A7080' }}>
                {({ lip:'唇妝', blush:'腮紅', eyeshadow:'眼影', foundation:'粉底' } as Record<string,string>)[cat] ?? cat}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(shades as string[]).map((s) => (
                  <span key={s} className="text-micro px-2 py-0.5 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}` }}>{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {profile.avoid_shades?.length > 0 && (
          <div className="card p-4 space-y-2">
            <h3 style={{ fontSize: 14, fontWeight: 500, color: '#1A1218' }}>建議避免</h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.avoid_shades.map((s) => (
                <span key={s} className="text-micro px-2 py-0.5 rounded-full"
                  style={{ background: '#F5F0F2', color: '#9A7080', border: '0.5px solid #E0D4D8' }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {products.length > 0 && (
          <div className="card p-4 space-y-3">
            <h3 style={{ fontSize: 14, fontWeight: 500, color: '#1A1218' }}>
              你的產品庫
              <span className="text-micro font-normal ml-2" style={{ color: '#9A7080' }}>色系適合度</span>
            </h3>
            <div className="space-y-1">
              {products.slice(0, 8).map((p) => {
                const compat = getCompat(p, profile);
                return (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-md"
                    style={{ background: compat === 'match' ? '#F0FAF4' : compat === 'avoid' ? '#FDF0F0' : '#FAFAF8' }}>
                    {p.photo_url
                      ? <img src={p.photo_url} alt={p.name} className="rounded object-cover flex-shrink-0" style={{ width: 36, height: 36 }} />
                      : <div className="rounded flex-shrink-0 flex items-center justify-center"
                          style={{ width: 36, height: 36, background: '#E8E0E4', color: '#5A4050', fontSize: 14, fontFamily: "'Cormorant Garamond',serif" }}>
                          {p.name.slice(0, 1)}
                        </div>}
                    <div className="min-w-0 flex-1">
                      <div className="text-caption truncate" style={{ color: '#1A1218' }}>{p.name}</div>
                      <div className="text-micro" style={{ color: '#9A7080' }}>{p.brand ?? '—'}</div>
                    </div>
                    {compat === 'match' && <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#2E7A4A' }} />}
                    {compat === 'avoid' && <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#C04040' }} />}
                    {compat === 'neutral' && <span className="text-micro" style={{ color: '#C8B4BC' }}>—</span>}
                  </div>
                );
              })}
            </div>
            <p className="text-micro" style={{ color: '#B09898' }}>✓ 適合 · ✗ 建議避免 · — 需更多資訊</p>
          </div>
        )}

        {result?.notes && <p className="text-micro text-center" style={{ color: '#B09898' }}>⚠️ {result.notes}</p>}
      </div>
    );
  }

  return null;
}
