import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `你係一個專業個人色彩分析師，擅長四季色彩理論（Personal Color Analysis）。
用戶會提供一張臉部相片，你需要分析佢嘅個人色彩。

重要提示：相片光線會影響準確度，請客觀分析，並在notes說明任何不確定因素。

Return PURE JSON（唔好任何其他文字）：

{
  "season": "autumn",
  "season_confidence": "medium",
  "warm_cool": "warm",
  "skin_depth": "medium",
  "undertone": "yellow",
  "season_description": "秋季型嘅你適合大地色系、暖橙、暖棕、橄欖綠。避免冷粉紅、冷藍調。",
  "suitable_shades": {
    "lip": ["磚紅", "珊瑚", "焦糖", "暖橙"],
    "blush": ["暖橙", "桃粉", "磚橙"],
    "eyeshadow": ["大地色", "暖棕", "橄欖", "金棕"],
    "foundation": ["暖調W色號", "黃底色"]
  },
  "avoid_shades": ["冷粉紅", "冷紫", "銀色系", "冰藍"],
  "lama_message": "你係秋季型！大地色係你嘅最佳拍檔，磚紅唇色會令你好靚 🍂",
  "notes": "相片光線偏暖，結果僅供參考"
}

season: spring / summer / autumn / winter
season_confidence: high / medium / low
warm_cool: warm / cool / neutral
skin_depth: fair / light / medium / tan / deep
undertone: pink / yellow / olive / neutral
lama_message用廣東話，親切有趣，針對季節型給一句建議。`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { wristData, faceData, mediaType, veinColor, jewelryPref } = body;
    if (!wristData || !faceData) return NextResponse.json({ error: 'Both wrist and face images required' }, { status: 400 });

    const veinContext = veinColor === 'blue_purple'
      ? '【靜脈顏色：藍/紫色】→ 冷調（Cool undertone），季節型必須係Summer或Winter。'
      : veinColor === 'green'
      ? '【靜脈顏色：綠色】→ 暖調（Warm undertone），季節型必須係Spring或Autumn。'
      : '【靜脈顏色：睇唔清楚】→ 靠相片判斷。';

    const jewelryContext = jewelryPref === 'gold'
      ? '【飾物偏好：金色更好睇】→ 強烈支持暖調（Warm），季節型傾向Spring或Autumn。'
      : jewelryPref === 'silver'
      ? '【飾物偏好：銀色更好睇】→ 強烈支持冷調（Cool），季節型傾向Summer或Winter。'
      : '【飾物偏好：兩個都OK】→ 可能係中性底，靠其他指標判斷。';

    const systemWithVein = SYSTEM_PROMPT + `

${veinContext}
${jewelryContext}

綜合判斷規則：
- 靜脈同飾物兩個都指向同一方向 → 高信心，以此為準
- 靜脈同飾物指向不同方向 → 靠手腕相片判斷底色作最終決定
- 靜脈係最客觀指標，優先於相片視覺判斷

分析策略：第一張係手腕相，用於判斷底色（undertone）同冷暖調；第二張係臉部相（用家手持白紙校準色溫），用於判斷膚色深淺（skin_depth）。如果臉部相有白紙，請以白紙作為白色參考點校正色溫。`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system: systemWithVein,
      messages: [{ role: 'user', content: [
        { type: 'text', text: '[手腕內側相片 — 判斷底色同冷暖調]' },
        { type: 'image', source: { type: 'base64', media_type: mediaType ?? 'image/jpeg', data: wristData } },
        { type: 'text', text: '[臉部正面相片 — 判斷膚色深淺]' },
        { type: 'image', source: { type: 'base64', media_type: mediaType ?? 'image/jpeg', data: faceData } },
        { type: 'text', text: '請根據以上兩張相片及靜脈顏色資訊，分析個人色彩，return JSON。' },
      ]}],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return NextResponse.json({ error: 'No response' }, { status: 500 });

    const cleaned = textBlock.text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const result = JSON.parse(cleaned);

    // Save color profile
    await supabase.from('profiles').update({
      color_profile: {
        season: result.season,
        warm_cool: result.warm_cool,
        skin_depth: result.skin_depth,
        undertone: result.undertone,
        suitable_shades: result.suitable_shades,
        avoid_shades: result.avoid_shades,
        season_description: result.season_description,
        analysed_at: new Date().toISOString(),
      },
    }).eq('id', user.id);

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
