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
  overall_impression: string;
  key_traits: string[];
  notes: string;
  photo_observation?: string | null;
};
type VeinColor = 'blue_purple' | 'green' | 'unclear';
type Stage = 'landing' | 'vein' | 'jewelry' | 'undertone' | 'contrast' | 'sun' | 'selfie' | 'analyzing' | 'result';
type JewelryPref = 'gold' | 'silver' | 'both';
type UndertonePref = 'yellow' | 'pink' | 'olive' | 'unclear';
type ContrastPref = 'soft' | 'balanced' | 'high';
type SunReaction = 'burns_easy' | 'tan_easy' | 'both' | 'unclear';
type AnalysisMethod = 'guided' | 'quick';

const STAGE_INDEX: Record<Exclude<Stage, 'landing' | 'analyzing' | 'result'>, number> = {
  vein: 1,
  jewelry: 2,
  undertone: 3,
  contrast: 4,
  sun: 5,
  selfie: 6,
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
  if (/^#?[0-9a-fA-F]{6}$/.test(name)) {
    return name.startsWith('#') ? name : `#${name}`;
  }
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

function getContrastHint(pref: ContrastPref | null) {
  if (pref === 'soft') return '你通常更襯柔和、霧面、低對比配色，太黑白分明反而搶咗你個人感。';
  if (pref === 'high') return '你通常可以撐得起明顯對比感，清晰度高嘅顏色更容易令你醒神。';
  if (pref === 'balanced') return '你應該落喺中間值，最適合乾淨但唔過份強烈嘅配色。';
  return '對比感會影響你襯唔襯得起黑白、深淺撞色，以及妝容清晰度。';
}

function getSunHint(pref: SunReaction | null) {
  if (pref === 'burns_easy') return '通常偏冷或偏淺底色機會較高，建議留意灰粉、冷柔色會唔會更自然。';
  if (pref === 'tan_easy') return '通常偏暖或偏金調機會較高，奶茶、焦糖、大地色往往更和諧。';
  if (pref === 'both') return '你可能落喺中間值，最後要靠自拍同其他答案一齊綜合判斷。';
  return '曬後反應可以幫手補足冷暖調與膚色深淺判斷。';
}

function getQuestionProgress(stage: Exclude<Stage, 'landing' | 'analyzing' | 'result'>) {
  return Math.round((STAGE_INDEX[stage] / 6) * 100);
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
            <div className="tone-kicker">Step {STAGE_INDEX[stage]} / 6</div>
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
  captureMode = 'user',
}: {
  title: string;
  subtitle: string;
  instruction: string;
  tip: string;
  note: string;
  onCapture: (data: string, url: string) => void;
  onBack: () => void;
  previewLabel: string;
  captureMode?: 'user' | 'environment';
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
        capture={captureMode}
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
  const [method, setMethod] = useState<AnalysisMethod>('guided');
  const [veinColor, setVeinColor] = useState<VeinColor | null>(null);
  const [jewelryPref, setJewelryPref] = useState<JewelryPref | null>(null);
  const [undertonePref, setUndertonePref] = useState<UndertonePref | null>(null);
  const [contrastPref, setContrastPref] = useState<ContrastPref | null>(null);
  const [sunReaction, setSunReaction] = useState<SunReaction | null>(null);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(existingProfile?.selfie_url ?? null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [profile, setProfile] = useState<ColorProfile | null>(existingProfile);
  const [error, setError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoCards, setDemoCards] = useState<{
    good: Array<{ label: string; imageUrl: string }>;
    bad: Array<{ label: string; imageUrl: string }>;
  } | null>(null);

  async function analyse(photoData?: string, photoUrl?: string, requestedMethod?: AnalysisMethod) {
    const finalSelfieData = photoData ?? selfieData;
    const finalMethod = requestedMethod ?? method;
    if (!finalSelfieData) return;
    if (finalMethod === 'guided' && (!veinColor || !jewelryPref || !undertonePref || !contrastPref || !sunReaction)) return;

    setStage('analyzing');
    setError(null);

    try {
      const response = await fetch('/api/skin-tone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selfieData: finalSelfieData,
          mediaType: 'image/jpeg',
          analysisMode: finalMethod,
          veinColor,
          jewelryPref,
          undertonePref,
          contrastPref,
          sunReaction,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? '分析失敗');

      setResult(data.result);
      setProfile(data.result);
      setMethod(finalMethod);
      setSelfieData(finalSelfieData);
      setSelfiePreviewUrl(data.result.selfie_url ?? photoUrl ?? selfiePreviewUrl ?? null);
      setStage('result');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : '分析失敗');
      setStage('selfie');
    }
  }

  function restart() {
    setResult(null);
    setError(null);
    setVeinColor(null);
    setJewelryPref(null);
    setUndertonePref(null);
    setContrastPref(null);
    setSunReaction(null);
    setSelfieData(null);
    setSelfiePreviewUrl(null);
    setDemoCards(null);
    setDemoError(null);
    setMethod('guided');
    setStage('landing');
  }

  async function generateDemoCards() {
    if (!profile?.selfie_url) return;

    setDemoLoading(true);
    setDemoError(null);

    try {
      const response = await fetch('/api/skin-tone/generate-demo-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selfieUrl: profile.selfie_url,
          seasonLabel: SEASON_CONFIG[profile.season].label,
          goodColors: profile.recommendations?.best_colors ?? Object.values(profile.suitable_shades).flat(),
          badColors: profile.recommendations?.avoid_colors ?? profile.avoid_shades,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? '未能生成 GOOD / BAD 示範卡');
      }

      setDemoCards(data);
    } catch (issue) {
      setDemoError(issue instanceof Error ? issue.message : '未能生成 GOOD / BAD 示範卡');
    } finally {
      setDemoLoading(false);
    }
  }

  if (stage === 'landing') {
    return (
      <div className="space-y-5">
        <section className="tone-hero">
          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-5">
              <div className="tone-kicker">Personal Color Studio</div>
              <h2 className="tone-display max-w-xl">俾你自己揀分析方式，最後都整理成同一份個人色彩報告。</h2>
              <p className="tone-body max-w-xl">
                如果想快，可以直接用自然自拍做 `快速 AI 分析`；如果想更細緻，就保留 `進階問答分析`。兩邊最後都會輸出同一種報告格式。
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => {
                    setMethod('quick');
                    setStage('selfie');
                  }}
                  className="rounded-[30px] border border-[#e8d9dd] bg-white p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(176,96,112,0.12)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f6ecef] text-[#b06070]">
                    <ScanFace className="h-6 w-6" />
                  </div>
                  <div className="mt-4 text-[18px] font-medium text-[#1a1218]">快速 AI 分析</div>
                  <p className="mt-2 text-sm leading-6 text-[#7a6068]">
                    只需一張自然光素顏自拍，AI 直接推斷膚色、明度、對比度與季節型。
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#b06070]">
                    直接開始
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>

                <button
                  onClick={() => {
                    setMethod('guided');
                    setStage('vein');
                  }}
                  className="rounded-[30px] border border-[#e8d9dd] bg-[#fffaf8] p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(176,96,112,0.12)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8efe4] text-[#d27b43]">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="mt-4 text-[18px] font-medium text-[#1a1218]">進階問答分析</div>
                  <p className="mt-2 text-sm leading-6 text-[#7a6068]">
                    保留五條問題，再配合自然自拍，適合想做得更細緻、更穩陣嘅用家。
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#b06070]">
                    問答後分析
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                {existingProfile && (
                  <button onClick={() => setStage('result')} className="btn-secondary">
                    查看上次結果
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: <ScanFace className="h-5 w-5" />, title: '快速入口', desc: '一張自拍即可開始，完成率更高。' },
                  { icon: <Sparkles className="h-5 w-5" />, title: '進階入口', desc: '保留問答補充線索，分析會更細。' },
                  { icon: <Palette className="h-5 w-5" />, title: '同一份報告', desc: '最後都會整理成同一種個人色彩報告。' },
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
              <div className="tone-kicker">How To Choose</div>
              <div className="mt-3 space-y-3">
                {[
                  ['快速 AI 分析', '最適合想先試結果、唔想答太多問題嘅用家。'],
                  ['進階問答分析', '最適合已經對自己膚色有感覺，想加多幾條線索再判斷。'],
                  ['分析結果一致化', '無論由邊個入口進入，最後都會變成同一份色彩報告頁。'],
                  ['之後可比較準確度', '日後可以再睇用家偏好同結果一致性，慢慢定主方法。'],
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
          description="之後交俾自拍同其他答案一齊綜合判斷。"
        />

        <button onClick={() => setStage('contrast')} disabled={!undertonePref} className="btn-primary mt-2 w-full sm:w-auto">
          下一步
          <ChevronRight className="ml-1 h-4 w-4" />
        </button>
      </QuestionShell>
    );
  }

  if (stage === 'contrast') {
    return (
      <QuestionShell
        stage="contrast"
        title="你覺得自己更襯柔和色，定係有明顯對比感嘅配色？"
        body="呢題會幫我哋判斷你嘅對比度。有人襯得起黑白分明，有人反而更適合奶茶、霧粉、低對比。"
        onBack={() => setStage('undertone')}
        aside={
          <>
            <div className="tone-kicker">Contrast Reading</div>
            <h3 className="mt-2 text-[22px] font-medium text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              對比感會影響你襯色力度
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#7a6068]">{getContrastHint(contrastPref)}</p>
          </>
        }
      >
        <OptionCard
          selected={contrastPref === 'soft'}
          onClick={() => setContrastPref('soft')}
          lead={<span>☁️</span>}
          title="偏柔和"
          description="奶茶、豆沙、霧面感配色通常更自然，太硬朗反而容易搶人。"
        />
        <OptionCard
          selected={contrastPref === 'balanced'}
          onClick={() => setContrastPref('balanced')}
          lead={<span>⚖️</span>}
          title="中等平衡"
          description="既可以駕馭柔和色，亦可以撐起少量清晰度，屬於最百搭一型。"
        />
        <OptionCard
          selected={contrastPref === 'high'}
          onClick={() => setContrastPref('high')}
          lead={<span>⚡</span>}
          title="對比感高"
          description="黑白、深淺撞色或輪廓清晰嘅妝容通常更令你醒神。"
        />

        <button onClick={() => setStage('sun')} disabled={!contrastPref} className="btn-primary mt-2 w-full sm:w-auto">
          下一步
          <ChevronRight className="ml-1 h-4 w-4" />
        </button>
      </QuestionShell>
    );
  }

  if (stage === 'sun') {
    return (
      <QuestionShell
        stage="sun"
        title="你平時曬太陽之後，皮膚比較容易點樣反應？"
        body="曬後反應可以幫我哋補足冷暖調、膚色深淺同整體明度判斷。憑平時印象揀最接近即可。"
        onBack={() => setStage('contrast')}
        aside={
          <>
            <div className="tone-kicker">Sun Reaction</div>
            <h3 className="mt-2 text-[22px] font-medium text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              曬後狀態都係重要線索
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#7a6068]">{getSunHint(sunReaction)}</p>
          </>
        }
      >
        <OptionCard
          selected={sunReaction === 'burns_easy'}
          onClick={() => setSunReaction('burns_easy')}
          lead={<span>🌤️</span>}
          title="容易泛紅 / 曬傷"
          description="通常先變紅，再慢慢退，唔係好容易直接曬成健康古銅色。"
        />
        <OptionCard
          selected={sunReaction === 'tan_easy'}
          onClick={() => setSunReaction('tan_easy')}
          lead={<span>🌞</span>}
          title="容易曬成啡金色"
          description="通常比較快有小麥或金調感，整體較少紅腫。"
        />
        <OptionCard
          selected={sunReaction === 'both'}
          onClick={() => setSunReaction('both')}
          lead={<span>🌗</span>}
          title="兩種都會"
          description="有時會先紅，再慢慢變深色，或者視乎季節同時都有。"
        />
        <OptionCard
          selected={sunReaction === 'unclear'}
          onClick={() => setSunReaction('unclear')}
          lead={<span>🤍</span>}
          title="唔太記得"
          description="唔緊要，自拍同前面幾題已經足夠提供好多線索。"
        />

        <button onClick={() => setStage('selfie')} disabled={!sunReaction} className="btn-primary mt-2 w-full sm:w-auto">
          上傳自然自拍
          <ChevronRight className="ml-1 h-4 w-4" />
        </button>
      </QuestionShell>
    );
  }

  if (stage === 'selfie') {
    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-[24px] border border-[#f1d5cc] bg-[#fff6f2] p-4 text-sm leading-6 text-[#a45c35]">
            {error}
          </div>
        )}
        <ImageCapture
          subtitle={method === 'quick' ? '快速 AI 分析' : 'Step 6 / 6'}
          title={method === 'quick' ? '上傳一張自然光素顏自拍' : '上傳一張自然自拍'}
          instruction={
            method === 'quick'
              ? '請喺自然光下上傳正面素顏自拍，盡量唔好開美顏、濾鏡或太重妝。AI 會直接根據相片推斷膚色、瞳色、髮色、明度與整體氣質。'
              : '請喺自然光下上傳正面自拍，盡量唔好開美顏、濾鏡或太重妝。呢張相會用作整體膚色、明度、清晰度同氣質分析。'
          }
          tip={
            method === 'quick'
              ? '快速分析會更加依賴光線條件，所以請盡量避開黃燈、逆光、濾鏡、化妝同強烈反光。'
              : '背景簡單啲會更好，最好見到完整面部輪廓，避免逆光、偏黃燈光或過度修圖。'
          }
          note={
            method === 'quick'
              ? '呢張自拍會成為分析報告主圖；如果之後覺得想再精準啲，可以改用進階問答分析。'
              : '呢張自拍會成為分析報告主圖，所以建議用你覺得最自然、最接近日常真實膚色嘅一張。'
          }
          onCapture={(data, url) => {
            setSelfieData(data);
            setSelfiePreviewUrl(url);
            void analyse(data, url, method);
          }}
          onBack={() => setStage(method === 'quick' ? 'landing' : 'sun')}
          previewLabel="自拍預覽"
          captureMode="user"
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
          {method === 'quick'
            ? '會直接根據自然自拍整理出季節型、色板、避雷色同整體搭配方向。正常大約 15 至 20 秒完成。'
            : '會同時參考五條問卷答案同自然自拍，整理出季節型、色板、避雷色同整體搭配方向。正常大約 15 至 20 秒完成。'}
        </p>
        <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
          {(method === 'quick'
            ? [
                '讀取自然自拍，估算膚色、髮色、瞳色與整體明度',
                '由影像推斷冷暖調、對比度、清晰度與氣質方向',
                '整理成實用配色、避雷色同延伸建議',
              ]
            : [
                '綜合五條問卷線索，建立冷暖調與對比度輪廓',
                '讀取自然自拍，補足膚色深淺與清晰度判斷',
                '整理成實用配色、避雷色同延伸建議',
              ]).map((item) => (
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
      season_confidence: profile.season_confidence ?? 'medium',
      overall_impression: profile.overall_impression ?? `你嘅整體氣質最適合走 ${config.short} 色板。`,
      key_traits: profile.key_traits ?? [],
      notes: profile.notes ?? '分析結果已同步到你的色彩檔案。',
      photo_observation: null,
      scores: profile.scores ?? { warmth: 3, contrast: 3, clarity: 3 },
    } satisfies AnalysisResult;

    const paletteSections = Object.entries(profile.suitable_shades).map(([category, shades]) => ({
      key: category,
      label: ({ lip: '唇妝', blush: '腮紅', eyeshadow: '眼影', foundation: '底妝' } as Record<string, string>)[category] ?? category,
      shades,
    }));

    const reportPalette = profile.recommendations?.best_colors?.length
      ? profile.recommendations.best_colors
      : Object.values(profile.suitable_shades).flat().slice(0, 8);

    const secondaryPalette = profile.recommendations?.secondary_colors ?? [];
    const avoidPalette = profile.recommendations?.avoid_colors ?? profile.avoid_shades;

    const reportCards = [
      ['暖色調', latestResult.scores?.warmth ?? 3],
      ['對比度', latestResult.scores?.contrast ?? 3],
      ['清晰度', latestResult.scores?.clarity ?? 3],
    ] as const;
    const colorSamples = profile.color_samples ?? [];

    return (
      <div className="space-y-5">
        <section className="tone-result-hero" style={{ background: config.glow }}>
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div className="overflow-hidden rounded-[32px] border border-white/50 bg-white/70 p-3 backdrop-blur-sm">
              {selfiePreviewUrl ? (
                <img
                  src={selfiePreviewUrl}
                  alt="色彩分析自拍"
                  className="aspect-square w-full rounded-[26px] object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-[26px] bg-[#fff6f3] text-sm text-[#8b6a60]">
                  等你下次上傳自然自拍，報告會顯示喺呢度。
                </div>
              )}
            </div>

            <div>
              <div>
                <div className="tone-kicker">Personal Color Report</div>
                <div className="mt-3 inline-flex items-center gap-3 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-medium text-[#1a1218] backdrop-blur-sm">
                  <span className="text-xl">{config.emoji}</span>
                  {config.label}
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-[#7a6068]">{CONFIDENCE_LABELS[latestResult.season_confidence]}</span>
                </div>

                <h2 className="tone-display mt-4 max-w-xl">{latestResult.overall_impression}</h2>
                <p className="tone-body mt-5 max-w-xl">{profile.season_description}</p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={restart} className="btn-secondary">
                  重新分析
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="tone-panel p-5 sm:p-6">
          <div className="tone-kicker">Report Summary</div>
          <h3 className="mt-2 text-[28px] leading-none text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            分析摘要
          </h3>

          <div className="mt-5 space-y-4">
            <div className="rounded-[26px] border border-[#eee3e1] bg-[#fffdfc] p-5 text-sm leading-7 text-[#5f464f]">
              {profile.season_description}
            </div>

            {latestResult.key_traits?.length ? (
              <div className="flex flex-wrap gap-2.5">
                {latestResult.key_traits.map((trait) => (
                  <span
                    key={trait}
                    className="inline-flex rounded-full border border-[#e6dbd4] bg-[#fff9f4] px-3 py-2 text-sm text-[#6e545c]"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              {reportCards.map(([label, score]) => (
                <div key={label} className="rounded-[24px] border border-[#ece2dc] bg-white p-4">
                  <div className="text-sm font-medium text-[#1a1218]">{label}</div>
                  <div className="mt-3 flex gap-2">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <span
                        key={`${label}-${index}`}
                        className="h-3 w-3 rounded-full"
                        style={{ background: index < score ? config.accent : '#f0e4df' }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 text-2xl font-medium text-[#5c4035]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {score} / 5
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {profile.analysis_method === 'quick' && colorSamples.length > 0 && (
          <section className="tone-panel p-5 sm:p-6">
            <div className="tone-kicker">AI Color Reading</div>
            <h3 className="mt-2 text-[28px] leading-none text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              自拍讀取到的色值
            </h3>
            <p className="mt-3 text-sm leading-6 text-[#7a6068]">
              呢一版會先由 AI 讀取你自拍入面嘅膚色、髮色、瞳色與唇色，再結合四季色彩理論做分析。
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {colorSamples.map((sample) => (
                <div key={`${sample.label}-${sample.hex}`} className="rounded-[24px] border border-[#ece2dc] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block h-12 w-12 rounded-2xl border border-black/5"
                      style={{ background: getSwatchColor(sample.hex) }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#1a1218]">{sample.label}</div>
                      <div className="mt-1 text-sm text-[#8b6d72]">{sample.hex.toUpperCase()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="tone-panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="tone-kicker">Best Colors</div>
              <h3 className="mt-2 text-[28px] leading-none text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                最佳色彩推薦
              </h3>
            </div>
          </div>

          <div className="mt-5 rounded-[28px] border border-[#eee3e1] bg-[#fffdfc] p-4">
            <div className="flex flex-wrap gap-4">
              {reportPalette.map((shade) => (
                <div key={shade} className="flex min-w-[82px] flex-col items-center gap-2 text-center">
                  <span
                    className="inline-block h-14 w-14 rounded-full border border-black/5"
                    style={{ background: getSwatchColor(shade) }}
                  />
                  <span className="text-sm text-[#5f464f]">{shade}</span>
                </div>
              ))}
            </div>
            {latestResult.notes ? (
              <p className="mt-4 text-sm leading-6 text-[#7a6068]">{latestResult.notes}</p>
            ) : null}
          </div>
        </section>

        {secondaryPalette.length > 0 && (
          <section className="tone-panel p-5 sm:p-6">
            <div className="tone-kicker">Also Works</div>
            <h3 className="mt-2 text-[24px] leading-none text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              可延伸嘗試
            </h3>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {secondaryPalette.map((shade) => (
                <span
                  key={shade}
                  className="inline-flex items-center gap-2 rounded-full border border-[#eee3e1] bg-white px-3 py-2 text-sm text-[#5f464f]"
                >
                  <span className="inline-block h-5 w-5 rounded-full border border-black/5" style={{ background: getSwatchColor(shade) }} />
                  {shade}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="tone-panel tone-panel-soft p-5 sm:p-6">
          <div className="tone-kicker">Avoid List</div>
          <h3 className="mt-2 text-[24px] leading-none text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            先避開呢啲色
          </h3>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {avoidPalette.map((shade) => (
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="tone-kicker">Color Demo</div>
              <h3 className="mt-2 text-[28px] leading-none text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                GOOD / BAD 顏色示範
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#7a6068]">
                用你嘅自然自拍生成顏色示範卡，幫你更直觀理解咩色會令你更有氣色。
              </p>
            </div>
            <button onClick={generateDemoCards} className="btn-primary" disabled={demoLoading || !profile.selfie_url}>
              {demoLoading ? '生成中...' : '生成示範卡'}
            </button>
          </div>

          {demoError && (
            <div className="mt-4 rounded-[20px] border border-[#f1d5cc] bg-[#fff6f2] p-4 text-sm leading-6 text-[#a45c35]">
              {demoError}
            </div>
          )}

          {demoCards ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[28px] border border-[#f1d2cb] bg-[#fff9f7] p-4">
                <div className="mb-3 text-lg font-medium text-[#d17266]">GOOD 適合的色彩</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {demoCards.good.map((item) => (
                    <div key={`good-${item.label}`} className="rounded-[22px] bg-white p-3">
                      <img src={item.imageUrl} alt={item.label} className="aspect-square w-full rounded-[18px] object-cover" />
                      <div className="mt-3 text-center text-sm font-medium text-[#5f464f]">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-[#d8dfee] bg-[#f9fbff] p-4">
                <div className="mb-3 text-lg font-medium text-[#5d7aa6]">BAD 不太適合的色彩</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {demoCards.bad.map((item) => (
                    <div key={`bad-${item.label}`} className="rounded-[22px] bg-white p-3">
                      <img src={item.imageUrl} alt={item.label} className="aspect-square w-full rounded-[18px] object-cover" />
                      <div className="mt-3 text-center text-sm font-medium text-[#5f464f]">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-dashed border-[#deccb9] bg-[#fffdf9] p-5 text-sm leading-6 text-[#8b725c]">
              生成後會顯示 2 張適合色與 2 張不太適合色示範卡，全部都會以 1:1 形式顯示。
            </div>
          )}
        </section>

        <section className="tone-panel p-5 sm:p-6">
          <div className="tone-kicker">Makeup Guide</div>
          <h3 className="mt-2 text-[28px] leading-none text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            彩妝建議
          </h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {paletteSections.map((section) => (
              <div key={section.key} className="rounded-[24px] border border-[#eee3e1] bg-[#fffdfc] p-4">
                <div className="mb-3 text-sm font-medium text-[#1a1218]">{section.label}</div>
                <div className="space-y-2">
                  {section.shades.map((shade) => (
                    <div key={shade} className="inline-flex items-center gap-2 rounded-full border border-[#eee3e1] bg-white px-3 py-2 text-sm text-[#5f464f]">
                      <span className="inline-block h-4 w-4 rounded-full border border-black/5" style={{ background: getSwatchColor(shade) }} />
                      {shade}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {profile.recommendations && (
          <>
            <section className="tone-panel p-5 sm:p-6">
              <div className="tone-kicker">Hair & Style</div>
              <h3 className="mt-2 text-[24px] leading-none text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                髮色與飾物建議
              </h3>
              <div className="mt-5 space-y-4 text-sm leading-6 text-[#5f464f]">
                <div>
                  <div className="mb-2 font-medium text-[#1a1218]">推薦髮色</div>
                  <div className="flex flex-wrap gap-2.5">
                    {profile.recommendations.hair_colors.map((item) => (
                      <span key={item} className="rounded-full bg-[#fff8f2] px-3 py-2">{item}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 font-medium text-[#1a1218]">金屬與飾物</div>
                  <div className="flex flex-wrap gap-2.5">
                    {[...profile.recommendations.jewelry_metals, ...profile.recommendations.jewelry_styles].map((item) => (
                      <span key={item} className="rounded-full bg-[#fff8f2] px-3 py-2">{item}</span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="tone-panel p-5 sm:p-6">
              <div className="tone-kicker">Daily Styling</div>
              <h3 className="mt-2 text-[24px] leading-none text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                穿搭與小提醒
              </h3>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-2 text-sm font-medium text-[#1a1218]">服裝色彩</div>
                  <div className="flex flex-wrap gap-2.5">
                    {profile.recommendations.clothing_colors.map((item) => (
                      <span key={item} className="rounded-full bg-[#fff8f2] px-3 py-2 text-sm text-[#5f464f]">{item}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-[#1a1218]">整體小提醒</div>
                  <div className="space-y-2">
                    {profile.recommendations.quick_tips.map((tip) => (
                      <div key={tip} className="rounded-[18px] bg-[#fffdfc] p-3 text-sm leading-6 text-[#5f464f]">
                        {tip}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        <section className="tone-panel p-5 sm:p-6">
          <div className="tone-kicker">Your Products</div>
          <h3 className="mt-2 text-[28px] leading-none text-[#1a1218]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            用你現有庫存對照
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#7a6068]">
            會根據產品備註入面嘅「色系」標籤去判斷。如果之後你想，我可以再幫你將呢套匹配邏輯做得更完整。
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

        <section className="tone-panel p-5 sm:p-6">
              <div className="tone-kicker">Reading Notes</div>
              <div className="mt-4 space-y-3">
                {(profile.analysis_method === 'quick'
                  ? [
                      ['分析方式', '快速 AI 分析'],
                      ['自然自拍', '直接由自拍推斷膚色、髮色、瞳色與整體對比感'],
                      ['適用情況', '想先快速知道季節型與色板方向'],
                    ]
                  : [
                      ['問卷線索', `靜脈：${veinColor === 'blue_purple' ? '藍 / 紫' : veinColor === 'green' ? '綠色' : veinColor === 'unclear' ? '不確定' : '未提供'}`],
                      ['飾物偏好', jewelryPref === 'gold' ? '金色更襯' : jewelryPref === 'silver' ? '銀色更襯' : jewelryPref === 'both' ? '兩者都可以' : '未提供'],
                      ['自評底色', undertonePref ? (undertonePref === 'yellow' ? '黃調' : undertonePref === 'pink' ? '粉紅調' : undertonePref === 'olive' ? '橄欖 / 灰綠調' : '唔確定') : '未提供'],
                      ['對比感', contrastPref === 'soft' ? '偏柔和' : contrastPref === 'balanced' ? '中等平衡' : contrastPref === 'high' ? '對比感高' : '未提供'],
                      ['曬後反應', sunReaction === 'burns_easy' ? '容易泛紅 / 曬傷' : sunReaction === 'tan_easy' ? '容易曬成啡金色' : sunReaction === 'both' ? '兩種都會' : sunReaction === 'unclear' ? '不確定' : '未提供'],
                    ]).map(([label, value]) => (
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
    );
  }

  return null;
}
