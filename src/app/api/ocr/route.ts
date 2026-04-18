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
  expiry_date: string | null; // YYYY-MM-DD
  batch_code: string | null;
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

你嘅任務係抽取以下資料，return PURE JSON（唔好有任何其他文字、markdown、code fence）：

{
  "name": "產品名，只抽產品自己嘅名唔好包品牌",
  "brand": "品牌名",
  "pao_months": 12,  // 整數，唔確定就null
  "expiry_date": "2027-03-15",  // YYYY-MM-DD格式，唔確定就null
  "batch_code": "批號",
  "confidence": {
    "name": "high" | "medium" | "low" | "none",
    "brand": "high" | "medium" | "low" | "none",
    "pao_months": "high" | "medium" | "low" | "none",
    "expiry_date": "high" | "medium" | "low" | "none"
  },
  "notes": "如果有任何有用嘅額外觀察（例如產品類別、特殊警告），寫喺度"
}

**重要規則：**
- 睇唔到就填null，千祈唔好估（錯data比冇data更差）
- 產品名保留原文（英文就英文、日文就日文、中文就中文）
- PAO icon可能係開蓋嘅罐仔icon入面寫"6M"、"12M"、"24M"等，"M"代表months
- 批號通常喺底部，係一串數字或字母，例如"24L0123"
- 到期日可能標成"EXP 2027/03" 或 "BBE 03 2027" 或 "2027.03.15"，如果只有年月就用該月15日
- confidence要honest —睇得清楚就high，模糊就low
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
