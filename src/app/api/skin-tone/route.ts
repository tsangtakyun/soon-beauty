import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `你係一個專業個人色彩顧問（Personal Color Analyst）。用戶會提供一張臉部相片，相片入面有一張白紙作色溫校準參考。

你嘅任務：
1. 先識別相片入面嘅白紙區域，用佢校正光線色溫偏差
2. 基於校正後嘅膚色，分析用戶屬於四季色彩嘅邊一型
3. 提供具體嘅彩妝色系建議

Return PURE JSON（唔好任何其他文字、markdown、code fence）：

{
  "calibration_note": "白紙校準說明（例如：相片整體偏暖，已校正約500K色溫）",
  "season": "Spring",
  "season_cn": "春季型",
  "season_desc": "明亮清新，如春日般溫暖活潑",
  "tone": "Warm",
  "tone_cn": "暖調",
  "depth": "Light",
  "depth_cn": "淺色",
  "undertone": "Yellow",
  "undertone_cn": "黃調",
  "confidence": "high",
  "analysis": "詳細分析說明（繁體中文，3-4句）",
  "makeup_recommendations": {
    "foundation": "建議粉底色號方向，例如：偏黃調N20-W25",
    "blush": ["珊瑚", "桃粉", "暖橙"],
    "lipstick": ["珊瑚紅", "裸粉", "橙調紅"],
    "eyeshadow": ["大地色", "暖棕", "金銅"],
    "contour": "暖棕色修容"
  },
  "colors_to_avoid": ["冷紫", "藍調粉紅", "灰調裸色"],
  "celebrity_reference": "相似色季嘅名人參考（港台明星優先，例如：楊千嬅、林志玲）",
  "tips": "一句個人化購物貼士（繁體中文，親切口吻）"
}

四季分型標準：
- Spring（春季型）：暖調+淺色，黃/金底色，明亮有活力。適合：珊瑚、桃粉、暖橙、駝色
- Summer（夏季型）：冷調+淺色，粉/藍底色，柔和優雅。適合：玫瑰粉、薰衣草、藍粉、冷裸色
- Autumn（秋季型）：暖調+深色，橄欖/棕底色，成熟豐富。適合：磚紅、南瓜橙、橄欖綠、深棕
- Winter（冬季型）：冷調+深色，粉紅/藍底色，對比強烈。適合：正紅、寶藍、純白、炭灰

色溫校準方法：
- 白紙應係相片中最白嘅區域
- 如果白紙偏黃：相片偏暖，膚色比視覺更冷
- 如果白紙偏藍：相片偏冷，膚色比視覺更暖
- 如果白紙接近純白：光線準確，無需大幅校準

重要：
- confidence: "high"=清楚分析到, "medium"=有點不確定, "low"=光線太差或角度問題
- 如果冇見到白紙，calibration_note寫「未見到白紙，分析準確度可能受光線影響」
- 所有建議用繁體中文`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { image, mediaType } = body;

    if (!image) return NextResponse.json({ error: 'Image required' }, { status: 400 });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType ?? 'image/jpeg',
              data: image,
            },
          },
          {
            type: 'text',
            text: '請分析呢張相片嘅膚色，注意相片中嘅白紙作色溫校準。Return JSON結果。',
          },
        ],
      }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response' }, { status: 500 });
    }

    const cleaned = textBlock.text
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Parse failed', raw: cleaned }, { status: 500 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
