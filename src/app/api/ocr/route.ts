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
  expiry_warning: boolean;
  suggested_category: string | null;
  matched_category_id?: string;
  confidence: {
    name: Confidence;
    brand: Confidence;
    pao_months: Confidence;
    expiry_date: Confidence;
  };
  notes: string | null;
};

type IngredientsResult = {
  inci_list: string[];
  key_ingredients: { name: string; benefit: string; concern?: string }[];
  concerns: string[];
  suitable_for: string[];
  avoid_if: string[];
  overall_rating: 'gentle' | 'moderate' | 'active' | 'unknown';
};

const CATEGORY_LIST = [
  '卸妝','潔面','爽膚水','精華','面霜','眼霜','防曬','面膜','唇部護理','其他面部護理',
  '妝前底霜','粉底','遮瑕','定妝','提亮／高光','腮紅','修容','眉毛',
  '眼影','眼線','睫毛膏','唇妝','其他彩妝',
  '沐浴','身體乳','護手霜','香水','頭髮護理','指甲油','其他身體護理',
];

const TODAY = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

const OCR_SYSTEM_PROMPT = `你係一個化妝品/護膚品產品資料抽取專家。用戶會提供最多3張產品包裝嘅相：
1. front — 產品正面，有產品名同品牌
2. bottom — 產品底部，有批號/日期
3. expiry — 到期日標示

Return PURE JSON（唔好有任何其他文字、markdown、code fence）：

{
  "name": "產品名（唔包品牌）",
  "brand": "品牌名",
  "pao_months": 12,
  "pao_source": "seen",
  "visible_date": "2027-03-15",
  "visible_date_is_future": true,
  "batch_code": "批號",
  "production_date": null,
  "production_date_confidence": "none",
  "production_date_reasoning": null,
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
日期處理邏輯（最重要）
═══════════════════════════════

今日日期係 ${TODAY}。

**包裝上嘅日期：**
- 將所有見到嘅日期填入 visible_date（YYYY-MM-DD格式）
- visible_date_is_future：呢個日期係咪在今日之後？true/false
- 如果見到嘅日期係今日之後 → 就係過期日，唔需要推算，直接用
- 如果見到嘅日期係今日之前 → 唔確定係生產日定過期日，忽略，改用批號推算
- 如果完全冇日期 → 用批號推算

**批號推算生產日期：**
- P&G（H&S、Pantene、Olay）：YYDDD或YYWW格式
- L'Oréal集團：BYYYYDDD格式
- Unilever：年月日組合
- Estée Lauder集團：字母+數字
- 日本品牌：直接印生產年月
- 韓國品牌：直接印日期
- 推算出嚟嘅生產日期必須係今日之前，否則係判斷錯誤要重試
- 如果YYWW格式推算係未來，試交換YY同WW再推算

**PAO：**
- 搵開蓋罐仔圖示、文字"After opening X months"、"開封後X個月"等
- 搵唔到 → 根據產品類別估算（精華/面霜12M、眼影24M、睫毛膏3-6M、沐浴/洗髮24-36M）
- pao_source: "seen"（見到）或 "estimated"（估算）

**分類建議：**
- 潤唇膏、護唇精華、唇膜、護唇油，優先歸類為「唇部護理」
- 只有明顯帶色、以妝效為主嘅唇部產品，先歸類為「唇妝」
- 從以下揀最合適：${CATEGORY_LIST.join('、')}`;

const INGREDIENTS_SYSTEM_PROMPT = `你係一個化妝品成份分析專家。分析產品包裝上嘅成份表（INCI list）。

Return PURE JSON：
{
  "inci_list": ["Aqua", "Glycerin", ...],
  "key_ingredients": [
    {"name": "Retinol", "benefit": "抗衰老、促進細胞更新", "concern": "孕婦避免使用"},
    {"name": "Niacinamide", "benefit": "美白、收毛孔"}
  ],
  "concerns": ["含酒精，敏感肌慎用", "含香料"],
  "suitable_for": ["油性肌", "混合肌"],
  "avoid_if": ["孕婦", "對水楊酸敏感"],
  "overall_rating": "gentle"
}

overall_rating: gentle（溫和）/ moderate（中等）/ active（活性成份多）/ unknown（睇唔清）
用繁體中文寫benefit、concern、concerns、suitable_for、avoid_if。`;

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

    // Build content for OCR (front + bottom + expiry only)
    const ocrContent: Array<
      | { type: 'text'; text: string }
      | {
          type: 'image';
          source: {
            type: 'base64';
            media_type: 'image/jpeg' | 'image/png' | 'image/webp';
            data: string;
          };
        }
    > = [];
    const ingredientsImage = images.find((img) => img.type === 'ingredients');
    const ocrImages = images.filter((img) => img.type !== 'ingredients');

    for (const img of ocrImages) {
      ocrContent.push({ type: 'text', text: `[${img.type.toUpperCase()}]` });
      ocrContent.push({
        type: 'image',
        source: { type: 'base64', media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/webp', data: img.data },
      });
    }
    ocrContent.push({ type: 'text', text: '請分析以上相片，return JSON結果（只return JSON）。' });

    // Build ingredients content
    const ingContent: Array<
      | { type: 'text'; text: string }
      | {
          type: 'image';
          source: {
            type: 'base64';
            media_type: 'image/jpeg' | 'image/png' | 'image/webp';
            data: string;
          };
        }
    > = [];
    if (ingredientsImage) {
      ingContent.push({ type: 'text', text: '[INGREDIENTS]' });
      ingContent.push({
        type: 'image',
        source: { type: 'base64', media_type: ingredientsImage.mediaType as 'image/jpeg' | 'image/png' | 'image/webp', data: ingredientsImage.data },
      });
      ingContent.push({ type: 'text', text: '請分析成份表，return JSON結果（只return JSON）。' });
    } else {
      // No ingredients image — use product info from OCR images to estimate
      for (const img of ocrImages.slice(0, 1)) {
        ingContent.push({ type: 'text', text: '[FRONT]' });
        ingContent.push({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/webp', data: img.data },
        });
      }
      ingContent.push({ type: 'text', text: '相片中可能未有完整成份表。請根據你識別到嘅產品名稱、品牌、類型，估算呢類產品常見嘅成份同注意事項。在inci_list填入常見成份，key_ingredients填入主要成份功效，concerns填入注意事項。return JSON結果（只return JSON）。' });
    }

    // Run OCR + Ingredients analysis in parallel
    const [ocrResponse, ingredientsResponse] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1200,
        system: OCR_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: ocrContent }],
      }),
      anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1200,
        system: INGREDIENTS_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: ingContent }],
      }),
    ]);

    // Parse OCR
    const ocrText = ocrResponse.content.find((b) => b.type === 'text');
    if (!ocrText || ocrText.type !== 'text') {
      return NextResponse.json({ error: 'No OCR response' }, { status: 500 });
    }
    const ocrCleaned = ocrText.text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    let rawOcr: Record<string, unknown>;
    try { rawOcr = JSON.parse(ocrCleaned); }
    catch { return NextResponse.json({ error: 'Failed to parse OCR', raw: ocrCleaned }, { status: 500 }); }

    // Parse Ingredients
    const ingText = ingredientsResponse.content.find((b) => b.type === 'text');
    let ingredientsResult: IngredientsResult | null = null;
    if (ingText && ingText.type === 'text') {
      try {
        const ingCleaned = ingText.text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        ingredientsResult = JSON.parse(ingCleaned);
      } catch { ingredientsResult = null; }
    }

    // Apply date logic
    const visibleDate = rawOcr.visible_date as string | null;
    const visibleDateIsFuture = rawOcr.visible_date_is_future as boolean | null;
    const productionDate = rawOcr.production_date as string | null;
    const paoMonths = rawOcr.pao_months as number | null;

    let expiry_date: string | null = null;
    let computed_expiry_date: string | null = null;
    let computed_expiry_reasoning: string | null = null;
    let expiry_warning = false;

    if (visibleDate && visibleDateIsFuture) {
      // Clear future date → direct expiry, no calculation needed
      expiry_date = visibleDate;
    } else {
      // No clear future date → use batch code production date
      if (productionDate) {
        const prodDateObj = new Date(productionDate);
        if (paoMonths) {
          const expDate = new Date(prodDateObj);
          expDate.setMonth(expDate.getMonth() + paoMonths);
          computed_expiry_date = expDate.toISOString().split('T')[0];
          computed_expiry_reasoning = `生產日期 ${productionDate} + PAO ${paoMonths}個月 = ${computed_expiry_date}`;
        } else {
          // Default 5 years for unopened products
          const expDate = new Date(prodDateObj);
          expDate.setFullYear(expDate.getFullYear() + 5);
          computed_expiry_date = expDate.toISOString().split('T')[0];
          computed_expiry_reasoning = `生產日期 ${productionDate} + 未開封預設保質期5年 = ${computed_expiry_date}`;
        }
      }
    }

    // Check if computed expiry is in the past → warning
    if (computed_expiry_date && computed_expiry_date < TODAY) {
      expiry_warning = true;
    }

    // Match category
    let matched_category_id: string | undefined;
    if (rawOcr.suggested_category) {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)
        .not('parent_id', 'is', null);
      const matched = cats?.find((c) =>
        c.name === rawOcr.suggested_category ||
        c.name.includes(rawOcr.suggested_category as string) ||
        (rawOcr.suggested_category as string).includes(c.name)
      );
      matched_category_id = matched?.id;
    }

    // Get user's color profile for makeup compatibility check
    const { data: profile } = await supabase
      .from('profiles')
      .select('color_profile')
      .eq('id', user.id)
      .single();
    const colorProfile = profile?.color_profile ?? null;

    const result: OcrResult = {
      name: rawOcr.name as string | null,
      brand: rawOcr.brand as string | null,
      pao_months: paoMonths,
      pao_source: rawOcr.pao_source as 'seen' | 'estimated' | null,
      expiry_date,
      batch_code: rawOcr.batch_code as string | null,
      production_date: productionDate,
      production_date_confidence: rawOcr.production_date_confidence as Confidence ?? 'none',
      production_date_reasoning: rawOcr.production_date_reasoning as string | null,
      computed_expiry_date,
      computed_expiry_reasoning,
      expiry_warning,
      suggested_category: rawOcr.suggested_category as string | null,
      matched_category_id,
      confidence: rawOcr.confidence as OcrResult['confidence'] ?? { name: 'none', brand: 'none', pao_months: 'none', expiry_date: 'none' },
      notes: rawOcr.notes as string | null,
    };

    return NextResponse.json({
      result,
      ingredients: ingredientsResult,
      color_profile: colorProfile,
    });
  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
