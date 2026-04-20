import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

type Confidence = 'high' | 'medium' | 'low' | 'none';

type OcrResult = {
  name: string | null;
  brand: string | null;
  pao_months: number | null;
  pao_source: 'seen' | 'estimated' | null;
  expiry_date: string | null;
  batch_code: string | null;
  production_date: string | null;
  production_date_confidence: Confidence;
  production_date_reasoning: string | null;
  computed_expiry_date: string | null;
  computed_expiry_reasoning: string | null;
  suggested_category: string | null;
  confidence: {
    name: Confidence;
    brand: Confidence;
    pao_months: Confidence;
    expiry_date: Confidence;
  };
  notes: string | null;
};

// 分類名稱列表（同DB一致）
const CATEGORY_LIST = [
  '卸妝','潔面','爽膚水','精華','面霜','眼霜','防曬','面膜','其他面部護理',
  '妝前底霜','粉底','遮瑕','定妝','提亮／高光','腮紅','修容','眉毛',
  '眼影','眼線','睫毛膏','唇妝','其他彩妝',
  '沐浴','身體乳','護手霜','香水','頭髮護理','其他身體護理',
];

const SYSTEM_PROMPT = `你係一個化妝品/護膚品產品資料抽取專家。用戶會提供最多3張產品包裝嘅相：

1. **front** — 產品正面，有產品名同品牌
2. **bottom** — 產品底部，有PAO符號同批號
3. **expiry** — 到期日標示

Return PURE JSON（唔好有任何其他文字、markdown、code fence）：

{
  "name": "產品名（唔包品牌）",
  "brand": "品牌名",
  "pao_months": 12,
  "pao_source": "seen",
  "expiry_date": "2027-03-15",
  "batch_code": "批號",
  "production_date": "2024-09-01",
  "production_date_confidence": "medium",
  "production_date_reasoning": "推算說明",
  "computed_expiry_date": "2025-09-01",
  "computed_expiry_reasoning": "計算說明",
  "suggested_category": "精華",
  "confidence": {
    "name": "high",
    "brand": "high",
    "pao_months": "medium",
    "expiry_date": "none"
  },
  "notes": "其他觀察"
}

═══════════════════════════════
PAO 識別規則（最重要，請仔細閱讀）
═══════════════════════════════

PAO = Period After Opening，即開封後保質期。

**PAO符號形式（全部都要識別）：**
- 開蓋罐仔圖示內寫住數字：6M、12M、18M、24M、36M
- 文字形式："After opening use within 12 months"
- 簡寫："12 Months"、"12 mths"、"Use within 12M"
- 中文："開封後12個月內使用"、"开封后请于12个月内用完"
- 日文："開封後12ヶ月以内に使用"
- 韓文："개봉 후 12개월"
- 數字+M/m：任何包裝上孤立出現嘅"6M""12M""24M"等

**PAO搵唔到時嘅處理：**
如果相片中真係搵唔到任何PAO標示，根據產品類型估算：
- 精華、面霜、眼霜：12個月
- 防曬：12個月
- 洗面奶、潔面：12個月
- 面膜（片裝）：3年（未開封），開封即用
- 唇膏、唇彩：12-24個月
- 眼影、腮紅（乾粉）：24個月
- 睫毛膏：3-6個月
- 沐浴、洗髮：24-36個月
- 香水：36個月以上

估算時：pao_months填估算值，pao_source填"estimated"，confidence.pao_months填"low"

**見到PAO時：** pao_source填"seen"，confidence.pao_months填"high"或"medium"

═══════════════════════════════
分類建議規則
═══════════════════════════════

根據產品名稱同品牌，從以下列表揀最合適嘅一個：
${CATEGORY_LIST.join('、')}

例子：
- "Water Sleeping Mask" → 面膜
- "Moisture Surge Moisturizer" → 面霜
- "Retinol Serum" → 精華
- "Foundation" / "BB Cream" → 粉底
- "Eyeshadow Palette" → 眼影
- "Lipstick" / "Lip Tint" → 唇妝
- "Shampoo" / "Conditioner" → 頭髮護理
- "Body Lotion" → 身體乳
- "Sunscreen" / "SPF" → 防曬
- "Blush" → 腮紅
- "Mascara" → 睫毛膏

唔確定就填null。

═══════════════════════════════
批號解碼規則
═══════════════════════════════
- P&G（H&S、Pantene、Olay、SK-II）：YYDDD或YYWW格式
- L'Oréal集團（L'Oréal、Maybelline、Garnier、Kiehl's、Lancome）：BYYYYDDD格式
- Unilever（Dove、Vaseline）：年月日組合
- Estée Lauder集團（MAC、Clinique、Bobbi Brown）：字母+數字
- 日本品牌（Shiseido、KOSÉ）：直接印生產年月
- 韓國品牌（Innisfree、Laneige、COSRX）：直接印日期

═══════════════════════════════
過期日推算
═══════════════════════════════
- production_date + pao_months = computed_expiry_date
- 格式：YYYY-MM-DD
- computed_expiry_reasoning用繁體中文解釋

**⚠️ 生產日期必須係過去（非常重要）：**
- 生產日期絕對唔可以係未來日期，必須早於今日
- 如果推算出嚟係未來，代表年份同週數判斷反咗，要交換重試
- 例如批號「2723」：試「YY=27,WW=23 → 2027年第23週」→ 係未來 → 錯！改試「YY=23,WW=27 → 2023年第27週」→ 係過去 → 正確
- 如果兩種解讀都係過去，揀更近期（更大年份）嗰個
- 如果完全判斷唔到令結果係過去，填null + confidence="none"，唔好亂估未來日期

**重要規則：**
- 睇唔到就填null，PAO除外（估算）
- expiry_date只係包裝上印嘅，唔係計算出嚟嘅
- notes用繁體中文`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const images: { type: string; data: string; mediaType: string }[] = body.images;

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'At least one image required' }, { status: 400 });
    }

    const content: Anthropic.Messages.ContentBlockParam[] = [];
    for (const img of images) {
      content.push({ type: 'text', text: `[${img.type.toUpperCase()}]` });
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/webp',
          data: img.data,
        },
      });
    }
    content.push({ type: 'text', text: '請分析以上相片，return JSON結果（只return JSON）。' });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from Claude' }, { status: 500 });
    }

    const cleaned = textBlock.text
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    let result: OcrResult;
    try {
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Failed to parse response', raw: cleaned }, { status: 500 });
    }

    // Server-side: match suggested_category to user's actual category list
    if (result.suggested_category) {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)
        .not('parent_id', 'is', null); // only leaf categories

      const matched = cats?.find((c) =>
        c.name === result.suggested_category ||
        c.name.includes(result.suggested_category!) ||
        result.suggested_category!.includes(c.name)
      );
      (result as OcrResult & { matched_category_id?: string }).matched_category_id = matched?.id ?? undefined;
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
