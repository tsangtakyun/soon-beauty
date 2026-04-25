import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ColorProfile, Product } from '@/types/database';

const ANALYSIS_SCHEMA = {
  name: 'personal_color_report',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      season: { type: 'string', enum: ['spring', 'summer', 'autumn', 'winter'] },
      season_confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      warm_cool: { type: 'string', enum: ['warm', 'cool', 'neutral'] },
      skin_depth: { type: 'string', enum: ['fair', 'light', 'medium', 'tan', 'deep'] },
      undertone: { type: 'string', enum: ['yellow', 'pink', 'olive', 'neutral'] },
      season_description: { type: 'string' },
      overall_impression: { type: 'string' },
      celebrity_references: {
        type: 'array',
        items: { type: 'string' },
      },
      key_traits: {
        type: 'array',
        items: { type: 'string' },
      },
      suitable_shades: {
        type: 'object',
        additionalProperties: false,
        properties: {
          lip: { type: 'array', items: { type: 'string' } },
          blush: { type: 'array', items: { type: 'string' } },
          eyeshadow: { type: 'array', items: { type: 'string' } },
          foundation: { type: 'array', items: { type: 'string' } },
        },
        required: ['lip', 'blush', 'eyeshadow', 'foundation'],
      },
      avoid_shades: {
        type: 'array',
        items: { type: 'string' },
      },
      scores: {
        type: 'object',
        additionalProperties: false,
        properties: {
          warmth: { type: 'integer', minimum: 1, maximum: 5 },
          contrast: { type: 'integer', minimum: 1, maximum: 5 },
          clarity: { type: 'integer', minimum: 1, maximum: 5 },
        },
        required: ['warmth', 'contrast', 'clarity'],
      },
      color_samples: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            label: { type: 'string' },
            hex: { type: 'string' },
          },
          required: ['label', 'hex'],
        },
      },
      recommendations: {
        type: 'object',
        additionalProperties: false,
        properties: {
          best_colors: { type: 'array', items: { type: 'string' } },
          secondary_colors: { type: 'array', items: { type: 'string' } },
          avoid_colors: { type: 'array', items: { type: 'string' } },
          base_makeup: { type: 'array', items: { type: 'string' } },
          blush: { type: 'array', items: { type: 'string' } },
          eyeshadow: { type: 'array', items: { type: 'string' } },
          lip: { type: 'array', items: { type: 'string' } },
          hair_colors: { type: 'array', items: { type: 'string' } },
          nail_colors: { type: 'array', items: { type: 'string' } },
          clothing_colors: { type: 'array', items: { type: 'string' } },
          jewelry_metals: { type: 'array', items: { type: 'string' } },
          jewelry_styles: { type: 'array', items: { type: 'string' } },
          quick_tips: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'best_colors',
          'secondary_colors',
          'avoid_colors',
          'base_makeup',
          'blush',
          'eyeshadow',
          'lip',
          'hair_colors',
          'nail_colors',
          'clothing_colors',
          'jewelry_metals',
          'jewelry_styles',
          'quick_tips',
        ],
      },
      notes: { type: 'string' },
      photo_observation: { type: ['string', 'null'] },
    },
    required: [
      'season',
      'season_confidence',
      'warm_cool',
      'skin_depth',
      'undertone',
      'season_description',
      'overall_impression',
      'celebrity_references',
      'key_traits',
      'suitable_shades',
      'avoid_shades',
      'scores',
      'color_samples',
      'recommendations',
      'notes',
      'photo_observation',
    ],
  },
} as const;

type VeinColor = 'blue_purple' | 'green' | 'unclear';
type JewelryPref = 'gold' | 'silver' | 'both';
type UndertonePref = 'yellow' | 'pink' | 'olive' | 'unclear';
type ContrastPref = 'soft' | 'balanced' | 'high';
type SunReaction = 'burns_easy' | 'tan_easy' | 'both' | 'unclear';
type AnalysisMode = 'guided' | 'quick';

type ColorAnalysisResult = Omit<ColorProfile, 'analysed_at'> & {
  season_confidence: 'high' | 'medium' | 'low';
  overall_impression: string;
  key_traits: string[];
  scores: NonNullable<ColorProfile['scores']>;
  recommendations: NonNullable<ColorProfile['recommendations']>;
  notes: string;
  photo_observation: string | null;
};

function getPublicUrl(supabase: Awaited<ReturnType<typeof createClient>>, filePath: string) {
  return supabase.storage.from('product-photos').getPublicUrl(filePath).data.publicUrl;
}

async function uploadAnalysisSelfie(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  base64: string;
  mediaType?: string;
}) {
  const { supabase, userId, base64, mediaType } = params;
  const imageBuffer = Buffer.from(base64, 'base64');
  const extension = mediaType === 'image/png' ? 'png' : mediaType === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `${userId}/skin-tone/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from('product-photos').upload(filePath, imageBuffer, {
    contentType: mediaType ?? 'image/jpeg',
    upsert: true,
  });

  if (error) throw new Error(error.message);
  return getPublicUrl(supabase, filePath);
}

function questionSummary(params: {
  analysisMode?: AnalysisMode;
  veinColor?: VeinColor;
  jewelryPref?: JewelryPref;
  undertonePref?: UndertonePref;
  contrastPref?: ContrastPref;
  sunReaction?: SunReaction;
}) {
  const { analysisMode, veinColor, jewelryPref, undertonePref, contrastPref, sunReaction } = params;

  return [
    `分析模式：${analysisMode === 'quick' ? '快速 AI 分析（只用自然自拍）' : '進階問答分析（自拍 + 五條問題）'}`,
    `靜脈顏色：${veinColor === 'blue_purple' ? '藍 / 紫' : veinColor === 'green' ? '綠色' : '不確定'}`,
    `飾物偏好：${jewelryPref === 'gold' ? '金色更襯' : jewelryPref === 'silver' ? '銀色更襯' : '金銀都可'}`,
    `自評底色：${undertonePref === 'yellow' ? '黃調' : undertonePref === 'pink' ? '粉紅調' : undertonePref === 'olive' ? '橄欖 / 灰綠調' : '不確定'}`,
    `整體對比感：${contrastPref === 'soft' ? '偏柔和' : contrastPref === 'high' ? '對比感高' : '中等平衡'}`,
    `曬太陽反應：${sunReaction === 'burns_easy' ? '容易泛紅曬傷' : sunReaction === 'tan_easy' ? '容易曬成啡金色' : sunReaction === 'both' ? '兩種都會' : '不確定'}`,
  ].join('\n');
}

function buildPrompt(summary: string) {
  return [
    '你是一位專業個人色彩分析師，熟悉亞洲膚色、四季色彩理論與實際彩妝搭配。',
    '請根據用戶的問卷與自然光自拍，回傳一份可直接用於美容報告頁的分析結果。',
    '輸出時請務必遵守 JSON schema，不要輸出任何額外文字。',
    '分析要求：',
    '1. 如果有問卷答案，請以問卷答案優先，自拍負責校正與補足觀察；如果是快速 AI 分析模式，請只根據自然自拍做謹慎判斷，並在 notes 說明限制。',
    '2. 圖片是自然自拍，只能用於推斷膚色、明度、清晰度、對比感與整體氣質，不可捏造不存在的細節。',
    '3. 請額外輸出 color_samples，至少包含：前額膚色、臉頰膚色、頸部膚色、自然髮色、瞳孔顏色、唇色；hex 請使用 #RRGGBB 格式。',
    '4. 所有推薦色與避開色請用繁體中文常用色名。',
    '5. suitable_shades 與 recommendations 要可以直接用於前端報告卡。',
    '6. overall_impression 用一至兩句繁體中文書面語，描述整體氣質。',
    '7. celebrity_references 請提供 2 至 3 個可作氣質或風格參考的女藝人 / 女明星名字，偏向東亞藝人，語氣保守，不要聲稱長相相似，只可作風格聯想。',
    '8. notes 要簡短說明分析限制，例如光線、自拍角度或彩妝干擾。',
    '9. photo_observation 如沒有特別需要提醒，回 null。',
    '問卷摘要：',
    summary,
  ].join('\n');
}

function normalizeAnalysis(result: ColorAnalysisResult, selfieUrl: string | null): ColorProfile {
  return {
    analysis_method: undefined,
    season: result.season,
    warm_cool: result.warm_cool,
    skin_depth: result.skin_depth,
    undertone: result.undertone,
    suitable_shades: result.suitable_shades,
    avoid_shades: result.avoid_shades,
    season_description: result.season_description,
    analysed_at: new Date().toISOString(),
    selfie_url: selfieUrl,
    season_confidence: result.season_confidence,
    overall_impression: result.overall_impression,
    celebrity_references: result.celebrity_references,
    key_traits: result.key_traits,
    notes: result.notes,
    photo_observation: result.photo_observation,
    scores: result.scores,
    color_samples: result.color_samples,
    recommendations: result.recommendations,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: '尚未設定 OPENAI_API_KEY。' }, { status: 500 });
    }

    const body = await request.json();
    const {
      selfieData,
      mediaType,
      analysisMode,
      veinColor,
      jewelryPref,
      undertonePref,
      contrastPref,
      sunReaction,
    }: {
      selfieData?: string | null;
      mediaType?: string;
      analysisMode?: AnalysisMode;
      veinColor?: VeinColor;
      jewelryPref?: JewelryPref;
      undertonePref?: UndertonePref;
      contrastPref?: ContrastPref;
      sunReaction?: SunReaction;
    } = body;

    if (!selfieData) {
      return NextResponse.json({ error: '需要先提供自然自拍。' }, { status: 400 });
    }

    const mode = analysisMode ?? 'guided';

    if (
      mode === 'guided' &&
      (!veinColor || !jewelryPref || !undertonePref || !contrastPref || !sunReaction)
    ) {
      return NextResponse.json({ error: '進階問答分析需要完整提供五條答案與自拍。' }, { status: 400 });
    }

    const selfieUrl = await uploadAnalysisSelfie({
      supabase,
      userId: user.id,
      base64: selfieData,
      mediaType: mediaType ?? 'image/jpeg',
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_ANALYSIS_MODEL || 'gpt-4.1',
        max_tokens: 2200,
        messages: [
          {
            role: 'system',
            content: buildPrompt(
              questionSummary({
                analysisMode: mode,
                veinColor,
                jewelryPref,
                undertonePref,
                contrastPref,
                sunReaction,
              })
            ),
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '以下是一張自然光自拍，請結合問卷內容完成個人色彩分析。',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType ?? 'image/jpeg'};base64,${selfieData}`,
                },
              },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: ANALYSIS_SCHEMA,
        },
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.error?.message ?? 'OpenAI 分析失敗。' },
        { status: response.status }
      );
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: '未收到分析結果。' }, { status: 500 });
    }

    const parsed =
      typeof content === 'string'
        ? JSON.parse(content)
        : JSON.parse(
            Array.isArray(content)
              ? content.find((item: { type?: string }) => item.type === 'text')?.text ?? '{}'
              : '{}'
          );

    const profile = normalizeAnalysis(parsed as ColorAnalysisResult, selfieUrl);
    profile.analysis_method = mode;

    await supabase
      .from('profiles')
      .update({
        color_profile: profile,
      })
      .eq('id', user.id);

    return NextResponse.json({ result: profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
