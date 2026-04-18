import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type IngredientConcern = {
  name: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
};

type IngredientHighlight = {
  name: string;
  benefit: string;
};

type ConflictItem = {
  product_name: string;
  this_ingredient: string;
  existing_ingredient: string;
  advice: string;
  severity: 'high' | 'medium';
};

export type AnalysisResult = {
  product_name: string | null;
  brand: string | null;
  ingredients_detected: string[];
  concerns: IngredientConcern[];
  highlights: IngredientHighlight[];
  conflicts: ConflictItem[];
  recommendation: 'buy' | 'caution' | 'avoid';
  recommendation_reason: string;
  skin_type_notes: {
    oily: string | null;
    dry: string | null;
    sensitive: string | null;
    combination: string | null;
  };
  ocr_confidence: 'high' | 'medium' | 'low';
  disclaimer: string;
};

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(existingProducts: { name: string; brand: string | null; notes: string | null }[]) {
  const productContext = existingProducts.length > 0
    ? `
用戶現有產品庫（用作衝突分析）：
${existingProducts.map((p, i) => `${i + 1}. ${p.brand ? `${p.brand} - ` : ''}${p.name}`).join('\n')}

請根據以上產品分析是否有成份衝突。常見衝突例子：
- Vitamin C (Ascorbic Acid) + Retinol/Retinoids → 建議分開早晚使用
- AHA/BHA (果酸/水楊酸) + Retinol → 會過度刺激皮膚
- Niacinamide + 高濃度Vitamin C → 可能降低效果（低濃度影響不大）
- 多個含有高濃度Alcohol的產品 → 可能過度乾燥
- 多個含有香料(Fragrance)的產品 → 增加致敏風險
`
    : '用戶尚未有產品庫，只需分析產品本身。';

  return `你係一位專業的化妝品成份分析師，熟悉INCI（國際化妝品成份命名）系統。
用戶會提供化妝品成份表的相片，請分析成份並提供購買建議。

${productContext}

請return PURE JSON（不要有任何其他文字、markdown、code fence）：

{
  "product_name": "如果相片有產品名稱就填，否則null",
  "brand": "如果相片有品牌就填，否則null",
  "ingredients_detected": ["成份1", "成份2", "..."],
  "concerns": [
    {
      "name": "成份名稱（保留INCI原文，附中文）",
      "reason": "為什麼需要注意，用繁體中文說明",
      "severity": "high/medium/low"
    }
  ],
  "highlights": [
    {
      "name": "優質成份名稱",
      "benefit": "功效說明，用繁體中文"
    }
  ],
  "conflicts": [
    {
      "product_name": "用戶現有產品名稱",
      "this_ingredient": "此產品的成份",
      "existing_ingredient": "現有產品的成份（如已知）",
      "advice": "建議如何搭配使用，用繁體中文",
      "severity": "high/medium"
    }
  ],
  "recommendation": "buy/caution/avoid",
  "recommendation_reason": "綜合建議理由，2-3句，用繁體中文書面語",
  "skin_type_notes": {
    "oily": "油性肌膚的注意事項，如不適用填null",
    "dry": "乾性肌膚的注意事項，如不適用填null",
    "sensitive": "敏感肌膚的注意事項，如不適用填null",
    "combination": "混合性肌膚的注意事項，如不適用填null"
  },
  "ocr_confidence": "high/medium/low（成份表識別的準確度）",
  "disclaimer": "此分析僅供參考，並非專業皮膚科意見。個人皮膚反應因人而異，如有疑問請諮詢皮膚科醫生。"
}

重要規則：
- ingredients_detected 只列出你清楚識別到的成份，唔確定就唔列
- concerns 只列出真正值得注意的，唔要為列而列
- highlights 列出3-5個最值得關注的優質成份
- recommendation: "buy"=整體良好可以考慮, "caution"=有需要注意的地方, "avoid"=有明顯問題建議避免
- 用繁體中文書面語，不要用口語
- ocr_confidence 反映你讀到的成份表完整程度`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const images: { data: string; mediaType: string }[] = body.images;

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'At least one image required' }, { status: 400 });
    }

    // 拎用戶現有產品（in_use + unopened）做衝突分析
    const { data: userProducts } = await supabase
      .from('products')
      .select('name, brand, notes')
      .eq('user_id', user.id)
      .in('status', ['unopened', 'in_use'])
      .limit(30);

    const existingProducts = userProducts ?? [];

    // Build message content
    const content: Anthropic.Messages.ContentBlockParam[] = [];

    images.forEach((img, i) => {
      content.push({
        type: 'text',
        text: i === 0 ? '[成份表相片 1]' : `[成份表相片 ${i + 1}]`,
      });
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/webp',
          data: img.data,
        },
      });
    });

    content.push({
      type: 'text',
      text: '請分析以上成份表，return JSON結果（只return JSON，不要其他內容）。',
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: buildSystemPrompt(existingProducts),
      messages: [{ role: 'user', content }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const cleaned = textBlock.text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let result: AnalysisResult;
    try {
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response', raw: cleaned },
        { status: 500 }
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Analyze ingredients error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
