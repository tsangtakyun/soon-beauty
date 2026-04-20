import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

type OcrImage = {
  /** 'front' | 'bottom' | 'expiry' */
  type: 'front' | 'bottom' | 'expiry';
  /** base64 string without data URI prefix */
  data: string;
  /** e.g. 'image/jpeg' */
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
};

type OcrResult = {
  name: string | null;
  brand: string | null;
  pao_months: number | null;
  expiry_date: string | null;
  batch_code: string | null;
  production_date: string | null;
  production_date_confidence: 'high' | 'medium' | 'low' | 'none';
  production_date_reasoning: string | null;
  computed_expiry_date: string | null;
  computed_expiry_reasoning: string | null;
  confidence: {
    name: 'high' | 'medium' | 'low' | 'none';
    brand: 'high' | 'medium' | 'low' | 'none';
    pao_months: 'high' | 'medium' | 'low' | 'none';
    expiry_date: 'high' | 'medium' | 'low' | 'none';
  };
  notes: string | null;
};

const SYSTEM_PROMPT = `你係一個化妝品/護膚品產品資料抽取專家。用戶會提供最多3張產品包裝嘅相：

1. **front** — 產品正面，有產品名同品牌
2. **bottom** — 產品底部，通常有PAO icon（開蓋icon，入面寫住數字例如6M/12M/24M）同批號/生產日期
3. **expiry** — 到期日標示（有啲產品有，有啲冇）

你嘅任務係抽取以下資料，同時根據批號推算生產日期，再用生產日期+PAO推算過期日子。Return PURE JSON（唔好有任何其他文字、markdown、code fence）：

{
  "name": "產品名，只抽產品自己嘅名唔好包品牌",
  "brand": "品牌名",
  "pao_months": 12,
  "expiry_date": "2027-03-15",
  "batch_code": "批號原文",
  "production_date": "2024-09-01",
  "production_date_confidence": "medium",
  "production_date_reasoning": "根據P&G批號格式推算...",
  "computed_expiry_date": "2025-09-01",
  "computed_expiry_reasoning": "生產日期2024-09-01 + PAO 12個月 = 2025-09-01",
  "confidence": {
    "name": "high",
    "brand": "high",
    "pao_months": "medium",
    "expiry_date": "none"
  },
  "notes": "其他有用嘅觀察"
}

**批號解碼規則（重要）：**
- P&G品牌（Head & Shoulders、Pantene、Olay、SK-II、Gillette等）：通常用YYDDD格式（年份+天數）或YYWW（年份+週數）
- L'Oréal集團（L'Oréal、Maybelline、Garnier、Kiehl's、Lancome等）：通常用BYYYYDDD格式
- Unilever（Dove、Vaseline、TRESemmé等）：通常用年月日組合
- Estée Lauder集團（MAC、Clinique、Bobbi Brown等）：通常用字母+數字組合代表年月
- 日本品牌（Shiseido、KOSÉ、Kanebo等）：通常直接印生產年月
- 韓國品牌（Innisfree、Laneige、COSRX等）：通常直接印日期
- 如果唔確定品牌嘅batch code格式，誠實講low confidence，唔好亂估

**過期日推算規則：**
- 如果有production_date同pao_months → computed_expiry_date = production_date + pao_months
- 如果只有production_date冇pao_months → 根據產品類別估算常見PAO（精華/面霜12M、防曬12M、唇膏12-24M），並列明係估算
- 如果production_date推算唔到 → computed_expiry_date填null
- computed_expiry_date格式：YYYY-MM-DD
- computed_expiry_reasoning用繁體中文解釋計算過程

**重要規則：**
- 睇唔到就填null，千祈唔好亂估（錯data比冇data更差）
- expiry_date只係包裝上印嘅到期日，唔係計算出嚟嘅
- computed_expiry_date係根據生產日期推算嘅，同expiry_date係兩回事
- confidence要honest — 睇得清楚就high，模糊就low
- notes用繁體中文寫`;

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const images: OcrImage[] = body.images;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'At least one image is required' },
        { status: 400 }
      );
    }

    // Build message content: each image labelled by its type
    const content: Anthropic.Messages.ContentBlockParam[] = [];

    for (const img of images) {
      content.push({
        type: 'text',
        text: `[${img.type.toUpperCase()}]`,
      });
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mediaType,
          data: img.data,
        },
      });
    }

    content.push({
      type: 'text',
      text: '請分析以上相片，return JSON結果（只return JSON，唔好其他嘢）。',
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    });

    // Extract text
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'No text response from Claude' },
        { status: 500 }
      );
    }

    // Parse JSON (strip code fences defensively just in case)
    const cleaned = textBlock.text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let result: OcrResult;
    try {
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse Claude response', raw: cleaned },
        { status: 500 }
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
