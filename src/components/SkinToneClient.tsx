'use client';

import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  Palette,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Upload,
  XCircle,
} from 'lucide-react';
import type { ColorProfile, Product } from '@/types/database';

type SuitableShades = ColorProfile['suitable_shades'];
type AnalysisResult = ColorProfile & {
  season_confidence: 'high' | 'medium' | 'low';
  lama_message: string;
  notes: string;
  photo_observation?: string | null;
};
type VeinColor = 'blue_purple' | 'green' | 'unclear';
type Stage = 'landing' | 'vein' | 'jewelry' | 'undertone' | 'wrist' | 'face' | 'analyzing' | 'result';
type JewelryPref = 'gold' | 'silver' | 'both';
type UndertonePref = 'yellow' | 'pink' | 'olive' | 'unclear';

const STAGE_INDEX: Record<Exclude<Stage, 'landing' | 'analyzing' | 'result'>, number> = {
  vein: 1,
  jewelry: 2,
  undertone: 3,
  wrist: 4,
  face: 5,
};

const SEASON_CONFIG: Record<ColorProfile['season'], {
  label: string;
  short: string;
  emoji: string;
  glow: string;
  panel: string;
  ink: string;
  border: string;
  accent: string;
}> = {
  spring: {
    label: 'Spring 春季型',
    short: '春季型',
    emoji: '🌸',
    glow: 'linear-gradient(135deg, #fff4dc 0%, #ffe1bf 52%, #ffd1bf 100%)',
    panel: '#fff6ea',
    ink: '#8f4f1f',
    border: '#efcfaa',
    accent: '#f5a15c',
  },
  summer: {
    label: 'Summer 夏季型',
    short: '夏季型',
    emoji: '🪻',
    glow: 'linear-gradient(135deg, #f4f1ff 0%, #e8ddff 48%, #dbe8ff 100%)',
    panel: '#f4f1ff',
    ink: '#6352a4',
    border: '#d8cef6',
    accent: '#8c7ae6',
  },
  autumn: {
    label: 'Autumn 秋季型',
    short: '秋季型',
    emoji: '🍂',
    glow: 'linear-gradient(135deg, #fff4eb 0%, #ffd9bf 48%, #f6c58b 100%)',
    panel: '#fff3ea',
    ink: '#944e28',
    border: '#efc7ad',
    accent: '#d27b43',
  },
  winter: {
    label: 'Winter 冬季型',
    short: '冬季型',
    emoji: '❄️',
    glow: 'linear-gradient(135deg, #eef5ff 0%, #d9e5ff 48%, #d9d8ff 100%)',
    panel: '#eef4ff',
    ink: '#314b8d',
    border: '#c7d4f1',
    accent: '#6387e6',
  },
};

const TONE_LABELS: Record<ColorProfile['warm_cool'], string> = {
  warm: '暖調',
  cool: '冷調',
  neutral: '中性調',
};

const UNDERTONE_LABELS: Record<ColorProfile['undertone'], string> = {
  yellow: '黃底',
  pink: '粉紅底',
  olive: '橄欖底',
  neutral: '中性底',
};

const DEPTH_LABELS: Record<ColorProfile['skin_depth'], string> = {
  fair: '白皙',
  light: '偏白',
  medium: '中等',
  tan: '小麥',
  deep: '深色',
};

const CONFIDENCE_LABELS: Record<AnalysisResult['season_confidence'], string> = {
  high: '高信心',
  medium: '中等信心',
  low: '初步判斷',
};

const SHADE_SWATCHES: Record<string, string> = {
  珊瑚: '#f28c79',
  珊瑚粉: '#f5a08b',
  磚紅: '#a94e3f',
  焦糖: '#b87646',
  暖橙: '#db8a44',
  桃粉: '#ef9a93',
  磚橙: '#c86e46',
  大地色: '#92714d',
  暖棕: '#8a5d40',
  橄欖: '#7b7a45',
  金棕: '#9e723c',
  冷粉紅: '#d183b5',
  冷紫: '#8a6ab9',
  銀色系: '#b5bccd',
  冰藍: '#8eb9e8',
  豆沙: '#9c6d72',
  玫瑰: '#c06c86',
  酒紅: '#81364f',
  裸粉: '#d3a39f',
  梅子: '#7a445f',
  藕粉: '#c69ab0',
  香檳: '#d5b98d',
  米杏: '#d7b49b',
  可可: '#6f4a3a',
};

function getSwatchColor(name: string) {
  const exact = SHADE_SWATCHES[name];
  if (exact) return exact;
  if (name.includes('粉')) return '#d7a0b6';
  if (name.includes('橙')) return '#d98a4d';
  if (name.includes('棕')) return '#8a6348';
  if (name.includes('紅')) return '#b25452';
  if (name.includes('紫')) return '#8770bc';
  if (name.includes('藍')) return '#7fa8d9';
  if (name.includes('綠') || name.includes('橄欖')) return '#7f8b55';
  if (name.includes('金')) return '#caa267';
  return '#d8c3c7';
}

function parseProductShade(notes: string | null) {
  return (notes ?? '').match(/色系：(.+)/)?.[1]?.trim() ?? null;
}

function getCompat(product: Product, profile: ColorProfile): 'match' | 'avoid' | 'neutral' {
  const shade = parseProductShade(product.notes);
  if (!shade) return 'neutral';
  const suitable = Object.values(profile.suitable_shades).flat();
  if (suitable.some((value) => shade.includes(value) || value.includes(shade))) return 'match';
  if (profile.avoid_shades.some((value) => shade.includes(value) || value.includes(shade))) return 'avoid';
  return 'neutral';
}

function getJewelryHint(pref: JewelryPref | null) {
  if (pref === 'gold') return '金色飾物通常會令你更有光澤';
  if (pref === 'silver') return '銀色飾物通常會令你更顯清透';
  if (pref === 'both') return '金銀都可駕馭，通常代表底色更中性';
  return '完成問卷後，AI 會一齊參考飾物偏好。';
}

function getUndertoneHint(pref: UndertonePref | null) {
  if (pref === 'yellow') return '你偏向暖黃感，裸色與暖杏色通常更容易襯到。';
  if (pref === 'pink') return '你偏向粉紅底，偏灰粉與莓果色通常更有氣色。';
  if (pref === 'olive') return '你可能係亞洲人常見嘅橄欖底，選色重點係避開過灰或過螢光。';
  if (pref === 'unclear') return '唔緊要，等 AI 幫你綜合相片同問卷判斷。';
  return '底色判斷會直接影響粉底、胭脂同唇色建議。';
}

function getQuestionProgress(stage: Exclude<Stage, 'landing' | 'analyzing' | 'result'>) {
  return Math.round((STAGE_INDEX[stage] / 5) * 100);
}

function QuestionShell({
  stage,
  title,
  body,
  children,
  onBack,
  aside,
}: {
  stage: Exclude<Stage, 'landing' | 'analyzing' | 'result'>;
  title: string;
  body: string;
  children: React.ReactNode;
  onBack: () => void;
  aside: React.ReactNode;
}) {
  const progress = getQuestionProgress(stage);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="tone-panel p-6 sm:p-7">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <div className="tone-kicker">Step {STAGE_INDEX[stage]} / 5</div>
            <h2 className="tone-title mt-2">{title}</h2>
            <p className="tone-body mt-2 max-w-xl">{body}</p>
          </div>
          <div className="tone-progress-ring">
            <span>{progress}%</span>
          </div>
        </div>

        <div className="mb-5 h-2 overflow-hidden rounded-full bg-[#f2e5e8]">
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #b06070 0%, #dd9269 100%)' }}
          />
        </div>

        <div className="space-y-3">{children}</div>

        <button onClick={onBack} className="mt-6 inline-flex items-center gap-2 text-sm" style={{ color: '#9a7080' }}>
          <ArrowLeft className="h-4 w-4" />
          返回上一題
        </button>
      </div>

      <aside className="tone-panel tone-panel-soft p-5 sm:p-6">
        {aside}
      </aside>
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  title,
  description,
  lead,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  lead: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-[28px] border p-4 text-left transition-all duration-200"
      style={{
        borderColor: selected ? '#b06070' : '#e8d9dd',
        background: selected ? 'linear-gradient(180deg, #fff6f8 0%, #fff0f3 100%)' : '#ffffff',
        boxShadow: selected ? '0 18px 36px rgba(176, 96, 112, 0.14)' : 'none',
      }}
    >
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f6ecef] text-xl">
          {lead}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[15px] font-medium text-[#1a1218]">{title}</div>
            {selected && (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#b06070] px-2 text-xs font-medium text-white">
                已選
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-[#7a6068]">{description}</p>
        </div>
      </div>
    </button>
  );
}

function ImageCapture({
  title,
  subtitle,
  instruction,
  tip,
  note,
  onCapture,
  onBack,
  previewLabel,
}: {
  title: string;
  subtitle: string;
  instruction: string;
  tip: string;
  note: string;
  onCapture: (data: string, url: string) => void;
  onBack: () => void;
  previewLabel: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const image = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 1200;
      let { width, height } = image;

      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(image, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      URL.revokeObjectURL(objectUrl);
      setPreviewData(dataUrl.split(',')[1]);
      setPreviewUrl(dataUrl);
    };
    image.src = objectUrl;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
      <div className="tone-panel p-6 sm:p-7">
        <div className="tone-kicker">{subtitle}</div>
        <h2 className="tone-title mt-2">{title}</h2>
        <p className="tone-body mt-2 max-w-xl">{instruction}</p>

        <div className="mt-5 rounded-[28px] border border-[#efe0df] bg-[#fdf8f7] p-4 text-sm leading-6 text-[#7a6068]">
          <div className="font-medium text-[#1a1218]">拍攝小貼士</div>
          <p className="mt-1">{tip}</p>
        </div>

        <div className="mt-5 rounded-[32px] border border-dashed border-[#dbc5cc] bg-white p-4 sm:p-5">
          {previewUrl ? (
            <div className="space-y-4">
              <img src={previewUrl} alt={previewLabel} className="max-h-[340px] w-full rounded-[24px] object-cover" />
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => {
                    setPreviewUrl(null);
                    setPreviewData(null);
                  }}
                  className="btn-secondary w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重拍一次
                </button>
                <button
                  onClick={() => previewData && onCapture(previewData, previewUrl)}
                  className="btn-primary w-full"
                >
                  使用呢張相
                  <ChevronRight className="ml-1 h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => camRef.current?.click()}
                className="tone-upload-option"
              >
                <Camera className="h-6 w-6" />
                <span>即刻拍照</span>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="tone-upload-option"
              >
                <Upload className="h-6 w-6" />
                <span>上傳相片</span>
              </button>
            </div>
          )}
        </div>

        <button onClick={onBack} className="mt-6 inline-flex items-center gap-2 text-sm" style={{ color: '#9a7080' }}>
          <ArrowLeft className="h-4 w-4" />
          返回上一題
        </button>
      </div>

      <aside className="tone-panel tone-panel-soft p-5 sm:p-6">
        <div className="tone-kicker">Before You Shoot</div>
        <h3 className="mt-2 text-[22px] font-medium text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          令分析更準嘅關鍵
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#7a6068]">{note}</p>

        <div className="mt-5 space-y-3">
          {[
            '盡量用自然光，避免黃燈、偏藍 LED 或濾鏡。',
            '鏡頭保持乾淨，畫面唔好過近，以免膚色偏移。',
            '如果有化濃妝，建議卸走底妝後再拍一次。',
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl bg-white/80 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#b06070]" />
              <p className="text-sm leading-6 text-[#644c55]">{item}</p>
            </div>
          ))}
        </div>
      </aside>

      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])}
      />
    </div>
  );
}

function ResultTag({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/50 bg-white/70 p-4 backdrop-blur-sm">
      <div className="text-[11px] uppercase tracking-[0.22em] text-[#86646d]">{label}</div>
      <div className="mt-2 text-[15px] font-medium text-[#1a1218]">{value}</div>
    </div>
  );
}

function ProductMatchList({ products, profile }: { products: Product[]; profile: ColorProfile }) {
  const grouped = useMemo(() => {
    const match = [];
    const avoid = [];
    const neutral = [];

    for (const product of products) {
      const compat = getCompat(product, profile);
      const shade = parseProductShade(product.notes);
      const entry = { product, shade };
      if (compat === 'match') match.push(entry);
      else if (compat === 'avoid') avoid.push(entry);
      else neutral.push(entry);
    }

    return { match, avoid, neutral };
  }, [products, profile]);

  const sections = [
    { key: 'match', label: '最襯你', items: grouped.match, icon: <CheckCircle2 className="h-4 w-4 text-[#2f7d4e]" />, bg: '#eef9f1' },
    { key: 'avoid', label: '建議避開', items: grouped.avoid, icon: <XCircle className="h-4 w-4 text-[#b84a58]" />, bg: '#fff1f1' },
    { key: 'neutral', label: '仲未夠資料', items: grouped.neutral, icon: <span className="text-sm text-[#9a7080]">—</span>, bg: '#faf7f7' },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.key} className="rounded-[28px] border border-[#ede2e1] bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#1a1218]">
            {section.icon}
            {section.label}
            <span className="text-xs font-normal text-[#9a7080]">{section.items.length} 件</span>
          </div>

          {section.items.length === 0 ? (
            <p className="text-sm leading-6 text-[#8e727a]">目前未有產品落喺呢個分類。</p>
          ) : (
            <div className="space-y-2">
              {section.items.slice(0, 5).map(({ product, shade }) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-[22px] p-3"
                  style={{ background: section.bg }}
                >
                  {product.photo_url ? (
                    <img
                      src={product.photo_url}
                      alt={product.name}
                      className="h-11 w-11 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e9dde0] text-sm font-medium text-[#6a4f57]">
                      {product.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[#1a1218]">{product.name}</div>
                    <div className="truncate text-xs text-[#8f7279]">
                      {[product.brand, shade ? `色系：${shade}` : null].filter(Boolean).join(' · ') || '未有色系標籤'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function SkinToneClient({
  existingProfile,
  products,
}: {
  existingProfile: ColorProfile | null;
  products: Product[];
}) {
  const [stage, setStage] = useState<Stage>(existingProfile ? 'result' : 'landing');
  const [veinColor, setVeinColor] = useState<VeinColor | null>(null);
  const [jewelryPref, setJewelryPref] = useState<JewelryPref | null>(null);
  const [undertonePref, setUndertonePref] = useState<UndertonePref | null>(null);
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
      const response = await fetch('/api/skin-tone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wristData,
          faceData,
          mediaType: 'image/jpeg',
          veinColor,
          jewelryPref,
          undertonePref,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? '分析失敗');

      setResult(data.result);
      setProfile(data.result);
      setStage('result');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : '分析失敗');
      setStage('face');
    }
  }

  function restart() {
    setResult(null);
    setError(null);
    setVeinColor(null);
    setJewelryPref(null);
    setUndertonePref(null);
    setWristData(null);
    setFaceData(null);
    setStage('landing');
  }

  if (stage === 'landing') {
    return (
      <div className="space-y-5">
        <section className="tone-hero">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="tone-kicker">Personal Color Studio</div>
              <h2 className="tone-display max-w-xl">重做你嘅膚色分析流程，唔止分四季，仲直接幫你揀色。</h2>
              <p className="tone-body max-w-xl">
                呢個版本會先收集問卷，再用手腕同臉部相片交叉判斷，最後將結果整理成實用配色板、避雷色，同你現有產品嘅適合度。
              </p>

              <div className="flex flex-wrap gap-3">
                <button onClick={() => setStage('vein')} className="btn-primary">
                  開始分析
                  <ChevronRight className="ml-1 h-4 w-4" />
                </button>
                {existingProfile && (
                  <button onClick={() => setStage('result')} className="btn-secondary">
                    查看上次結果
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: <Sparkles className="h-5 w-5" />, title: '三重驗證', desc: '問卷 + 手腕 + 臉部白紙校色' },
                  { icon: <Palette className="h-5 w-5" />, title: '實用配色', desc: '唇色、腮紅、眼影同粉底方向' },
                  { icon: <ScanFace className="h-5 w-5" />, title: '產品匹配', desc: '即時檢查你現有庫存有冇撞色' },
                ].map((item) => (
                  <div key={item.title} className="tone-mini-card">
                    <div className="tone-mini-icon">{item.icon}</div>
                    <div className="text-sm font-medium text-[#1a1218]">{item.title}</div>
                    <p className="mt-1 text-sm leading-6 text-[#7a6068]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="tone-panel p-5 sm:p-6">
              <div className="tone-kicker">What You’ll Get</div>
              <div className="mt-3 space-y-3">
                {[
                  ['你的季節型 + 冷暖調', '唔止得一個 label，會一齊睇膚色深淺同底色。'],
                  ['個人色板', '每類彩妝都有建議色系，可以直接拎去揀貨。'],
                  ['避雷提醒', '顏色一眼睇到，唔使再靠記憶。'],
                  ['產品庫對照', '幫你搵出最襯你同最易顯灰嘅產品。'],
                ].map(([title, desc], index) => (
                  <div key={title} className="flex items-start gap-3 rounded-[26px] bg-[#fffaf8] p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b06070] text-sm font-medium text-white">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#1a1218]">{title}</div>
                      <p className="mt-1 text-sm leading-6 text-[#7a6068]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (stage === 'vein') {
    return (
      <QuestionShell
        stage="vein"
        title="自然光下，你手腕靜脈偏咩色？"
        body="靜脈顏色通常係判斷冷暖調最快嘅線索。搵窗邊自然光，將手腕輕輕翻轉就可以。"
        onBack={() => setStage('landing')}
        aside={
          <>
            <div className="tone-kicker">How To Check</div>
            <h3 className="mt-2 text-[22px] font-medium text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              用肉眼先做第一輪判斷
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#7a6068]">
              如果你見到明顯藍紫，通常偏冷；如果偏綠，通常偏暖；藍綠都有就可能係中性或橄欖底。
            </p>
          </>
        }
      >
        <OptionCard
          selected={veinColor === 'blue_purple'}
          onClick={() => setVeinColor('blue_purple')}
          lead={<span>🫐</span>}
          title="藍色或紫色"
          description="通常傾向冷調，粉紅、莓果、偏灰粉調產品會較自然。"
        />
        <OptionCard
          selected={veinColor === 'green'}
          onClick={() => setVeinColor('green')}
          lead={<span>🍃</span>}
          title="綠色"
          description="通常傾向暖調，大地、蜜桃、暖橙、焦糖色系會更有氣色。"
        />
        <OptionCard
          selected={veinColor === 'unclear'}
          onClick={() => setVeinColor('unclear')}
          lead={<span>🌫️</span>}
          title="唔清楚 / 藍綠都有"
          description="唔緊要，後面仲有相片同其他問題補足判斷。"
        />

        <button onClick={() => setStage('jewelry')} disabled={!veinColor} className="btn-primary mt-2 w-full sm:w-auto">
          下一步
          <ChevronRight className="ml-1 h-4 w-4" />
        </button>
      </QuestionShell>
    );
  }

  if (stage === 'jewelry') {
    return (
      <QuestionShell
        stage="jewelry"
        title="你戴金色定銀色飾物通常更精神？"
        body="飾物偏好可以幫 AI 確認你係偏暖、偏冷，定係中性底。唔需要太學術，只要憑平時感覺揀就得。"
        onBack={() => setStage('vein')}
        aside={
          <>
            <div className="tone-kicker">Quick Reading</div>
            <h3 className="mt-2 text-[22px] font-medium text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              飾物偏好透露你嘅溫度感
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#7a6068]">{getJewelryHint(jewelryPref)}</p>
          </>
        }
      >
        <OptionCard
          selected={jewelryPref === 'gold'}
          onClick={() => setJewelryPref('gold')}
          lead={<span>🥇</span>}
          title="金色更襯"
          description="黃金、玫瑰金會令你面色更柔和、有光澤。"
        />
        <OptionCard
          selected={jewelryPref === 'silver'}
          onClick={() => setJewelryPref('silver')}
          lead={<span>🥈</span>}
          title="銀色更襯"
          description="白銀、白金會令你輪廓更清爽，膚色更乾淨。"
        />
        <OptionCard
          selected={jewelryPref === 'both'}
          onClick={() => setJewelryPref('both')}
          lead={<span>✨</span>}
          title="兩種都可以"
          description="你可能偏中性，之後會靠相片同底色問題再細分。"
        />

        <button onClick={() => setStage('undertone')} disabled={!jewelryPref} className="btn-primary mt-2 w-full sm:w-auto">
          下一步
          <ChevronRight className="ml-1 h-4 w-4" />
        </button>
      </QuestionShell>
    );
  }

  if (stage === 'undertone') {
    return (
      <QuestionShell
        stage="undertone"
        title="如果要你形容自己底色，最接近邊一種？"
        body="如果你已經試過好多粉底，呢題通常會好有幫助。唔肯定亦都無問題，可以留俾 AI 綜合判斷。"
        onBack={() => setStage('jewelry')}
        aside={
          <>
            <div className="tone-kicker">Undertone Clue</div>
            <h3 className="mt-2 text-[22px] font-medium text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              底色會直接影響你嘅色板
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#7a6068]">{getUndertoneHint(undertonePref)}</p>
          </>
        }
      >
        <OptionCard
          selected={undertonePref === 'yellow'}
          onClick={() => setUndertonePref('yellow')}
          lead={<span>🟡</span>}
          title="黃調"
          description="整體偏暖黃，曬後容易變金啡色，暖杏、奶茶、焦糖系通常好襯。"
        />
        <OptionCard
          selected={undertonePref === 'pink'}
          onClick={() => setUndertonePref('pink')}
          lead={<span>🩷</span>}
          title="粉紅調"
          description="皮膚有粉玫瑰感，曬後容易泛紅，灰粉、莓果、冷豆沙通常更自然。"
        />
        <OptionCard
          selected={undertonePref === 'olive'}
          onClick={() => setUndertonePref('olive')}
          lead={<span>🫒</span>}
          title="橄欖 / 灰綠調"
          description="常見於亞洲膚色，粉底容易覺得太黃或太粉，適合更中性偏暖嘅選色。"
        />
        <OptionCard
          selected={undertonePref === 'unclear'}
          onClick={() => setUndertonePref('unclear')}
          lead={<span>🤍</span>}
          title="唔肯定"
          description="之後交俾相片判斷，系統會先根據手腕底色再交叉核對。"
        />

        <button onClick={() => setStage('wrist')} disabled={!undertonePref} className="btn-primary mt-2 w-full sm:w-auto">
          開始影相
          <ChevronRight className="ml-1 h-4 w-4" />
        </button>
      </QuestionShell>
    );
  }

  if (stage === 'wrist') {
    return (
      <ImageCapture
        subtitle="Step 4 / 5"
        title="拍攝手腕內側"
        instruction="將手腕放鬆，喺自然光下影到手腕內側皮膚同靜脈。呢張相主要用嚟判斷底色同冷暖調。"
        tip="最好唔好開美肌或 HDR，鏡頭離皮膚約 20-30cm，避免過近變色。"
        note="手腕相對臉部少咗胭脂、唇色、泛紅干擾，會更容易睇到底色，所以我哋將佢放喺高優先級。"
        onCapture={(data) => {
          setWristData(data);
          setStage('face');
        }}
        onBack={() => setStage('undertone')}
        previewLabel="手腕預覽"
      />
    );
  }

  if (stage === 'face') {
    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-[24px] border border-[#f1d5cc] bg-[#fff6f2] p-4 text-sm leading-6 text-[#a45c35]">
            {error}
          </div>
        )}
        <ImageCapture
          subtitle="Step 5 / 5"
          title="拍攝臉部正面"
          instruction="請手持一張白紙放近面頰或下巴，喺自然光下正面拍攝。白紙可以幫助 AI 校正光線色溫，同時判斷你嘅膚色深淺。"
          tip="素顏或淡妝最好，白紙要一齊入鏡，避免逆光同太重陰影。"
          note="呢張相唔係單獨決定結果，而係用嚟交叉比對整體膚色深淺、明度同面部偏紅情況。"
          onCapture={(data) => {
            setFaceData(data);
            void analyse();
          }}
          onBack={() => setStage('wrist')}
          previewLabel="臉部預覽"
        />
      </div>
    );
  }

  if (stage === 'analyzing') {
    return (
      <div className="tone-panel px-6 py-10 text-center sm:px-10 sm:py-14">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f7e8ed] text-[#b06070] animate-pulse">
          <Sparkles className="h-8 w-8" />
        </div>
        <h2 className="tone-title mt-5">AI 正喺幫你交叉分析膚色</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[#7a6068]">
          會同時參考問卷、手腕底色、臉部相片同白紙校色結果。正常大約 15 至 20 秒完成。
        </p>
        <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
          {[
            '確認靜脈與飾物偏好有冇互相支持',
            '比對手腕底色同面部明度',
            '整理成實用配色、避雷色同產品匹配',
          ].map((item) => (
            <div key={item} className="rounded-[24px] bg-[#fff8fa] p-4 text-sm leading-6 text-[#7a6068]">
              <div className="mb-2 h-1.5 w-10 rounded-full bg-[#b06070]" />
              {item}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (stage === 'result' && profile) {
    const config = SEASON_CONFIG[profile.season];
    const latestResult = result ?? {
      ...profile,
      season_confidence: 'medium',
      lama_message: `${config.short}通常會同你幾夾，之後可以用下面色板慢慢試真身效果。`,
      notes: '分析結果已同步到你的色彩檔案。',
      photo_observation: null,
    } satisfies AnalysisResult;

    const paletteSections = Object.entries(profile.suitable_shades).map(([category, shades]) => ({
      key: category,
      label: ({ lip: '唇妝', blush: '腮紅', eyeshadow: '眼影', foundation: '底妝' } as Record<string, string>)[category] ?? category,
      shades,
    }));

    return (
      <div className="space-y-5">
        <section className="tone-result-hero" style={{ background: config.glow }}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="tone-kicker">Your Color Direction</div>
              <div className="mt-3 inline-flex items-center gap-3 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-medium text-[#1a1218] backdrop-blur-sm">
                <span className="text-xl">{config.emoji}</span>
                {config.label}
                <span className="rounded-full bg-white px-3 py-1 text-xs text-[#7a6068]">{CONFIDENCE_LABELS[latestResult.season_confidence]}</span>
              </div>

              <h2 className="tone-display mt-4 max-w-xl">你嘅整體氣質最適合走 {config.short} 色板。</h2>
              <p className="tone-body mt-3 max-w-xl">{profile.season_description}</p>

              <div className="mt-5 rounded-[28px] border border-white/55 bg-white/78 p-4 text-sm leading-7 text-[#5d424b] backdrop-blur-sm">
                {latestResult.lama_message}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={restart} className="btn-secondary">
                重新分析
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ResultTag label="冷暖調" value={TONE_LABELS[profile.warm_cool]} />
            <ResultTag label="膚色深淺" value={DEPTH_LABELS[profile.skin_depth]} />
            <ResultTag label="底色" value={UNDERTONE_LABELS[profile.undertone]} />
            <ResultTag label="分析時間" value={profile.analysed_at ? new Date(profile.analysed_at).toLocaleDateString('zh-HK') : '剛剛完成'} />
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-5">
            <section className="tone-panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="tone-kicker">Personal Palette</div>
                  <h3 className="mt-2 text-[28px] leading-none text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    你最值得先試嘅色
                  </h3>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {paletteSections.map((section) => (
                  <div key={section.key} className="rounded-[28px] border border-[#eee3e1] bg-[#fffdfc] p-4">
                    <div className="mb-3 text-sm font-medium text-[#1a1218]">{section.label}</div>
                    <div className="flex flex-wrap gap-2.5">
                      {section.shades.map((shade) => (
                        <div key={shade} className="inline-flex items-center gap-2 rounded-full border border-[#eee3e1] bg-white px-3 py-2">
                          <span
                            className="inline-block h-5 w-5 rounded-full border border-black/5"
                            style={{ background: getSwatchColor(shade) }}
                          />
                          <span className="text-sm text-[#5f464f]">{shade}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="tone-panel p-5 sm:p-6">
              <div className="tone-kicker">Your Products</div>
              <h3 className="mt-2 text-[28px] leading-none text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                用你現有庫存對照
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#7a6068]">
                依家會根據產品備註入面嘅「色系」標籤去判斷。如果之後你想，我可以再幫你將呢套匹配邏輯做得更完整。
              </p>

              <div className="mt-5">
                {products.length > 0 ? (
                  <ProductMatchList products={products} profile={profile} />
                ) : (
                  <div className="rounded-[28px] bg-[#faf6f5] p-5 text-sm leading-6 text-[#8e727a]">
                    你而家未有可對照產品。新增產品並加上色系標籤後，呢度會即時變成一份個人化 colour audit。
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="tone-panel tone-panel-soft p-5 sm:p-6">
              <div className="tone-kicker">Avoid List</div>
              <h3 className="mt-2 text-[24px] leading-none text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                先避開呢啲色
              </h3>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {profile.avoid_shades.map((shade) => (
                  <span
                    key={shade}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm"
                    style={{ borderColor: '#e4d2d6', background: '#fff8fa', color: '#7b5e66' }}
                  >
                    <span className="inline-block h-4 w-4 rounded-full" style={{ background: getSwatchColor(shade) }} />
                    {shade}
                  </span>
                ))}
              </div>
            </section>

            <section className="tone-panel p-5 sm:p-6">
              <div className="tone-kicker">Reading Notes</div>
              <div className="mt-4 space-y-3">
                {[
                  ['問卷線索', `靜脈：${veinColor === 'blue_purple' ? '藍 / 紫' : veinColor === 'green' ? '綠色' : veinColor === 'unclear' ? '不確定' : '未提供'}`],
                  ['飾物偏好', jewelryPref === 'gold' ? '金色更襯' : jewelryPref === 'silver' ? '銀色更襯' : jewelryPref === 'both' ? '兩者都可以' : '未提供'],
                  ['自評底色', undertonePref ? (undertonePref === 'yellow' ? '黃調' : undertonePref === 'pink' ? '粉紅調' : undertonePref === 'olive' ? '橄欖 / 灰綠調' : '唔確定') : '未提供'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[22px] bg-[#fffdfc] p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[#9b7e86]">{label}</div>
                    <div className="mt-2 text-sm leading-6 text-[#5f464f]">{value}</div>
                  </div>
                ))}
              </div>

              {latestResult.photo_observation && (
                <div className="mt-4 rounded-[22px] border border-[#f0d9ca] bg-[#fff7f0] p-4 text-sm leading-6 text-[#8b5a39]">
                  {latestResult.photo_observation}
                </div>
              )}

              {latestResult.notes && (
                <div className="mt-4 rounded-[22px] border border-[#eadbdd] bg-[#fffafb] p-4 text-sm leading-6 text-[#86646d]">
                  {latestResult.notes}
                </div>
              )}

              <div className="mt-4 rounded-[22px] bg-[#1e1820] p-4 text-sm leading-6 text-[#f8eef1]">
                結果已自動同步到你嘅色彩檔案。之後做產品掃描或分析時，可以用呢份 profile 做配色參考。
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
