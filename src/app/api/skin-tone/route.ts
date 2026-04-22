import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `你係一個專業個人色彩分析師，擅長四季色彩理論（Personal Color Analysis）。
用戶會提供手腕相片同臉部相片，以及靜脈顏色同飾物偏好答案。

Return PURE JSON（唔好任何其他文字）：

{
  "season": "autumn",
  "season_confidence": "medium",
  "warm_cool": "warm",
  "skin_depth": "medium",
  "undertone": "olive",
  "season_description": "秋季型嘅你適合大地色系、暖橙、暖棕、橄欖綠。",
  "suitable_shades": {
    "lip": ["磚紅", "珊瑚", "焦糖", "暖橙"],
    "blush": ["暖橙", "桃粉", "磚橙"],
    "eyeshadow": ["大地色", "暖棕", "橄欖", "金棕"],
    "foundation": ["暖調W色號", "黃底色"]
  },
  "avoid_shades": ["冷粉紅", "冷紫", "銀色系", "冰藍"],
  "lama_message": "你係秋季型！大地色係你嘅最佳拍檔 🍂",
  "notes": "相片光線偏暖，結果僅供參考"
}

season: spring / summer / autumn / winter
season_confidence: high / medium / low
warm_cool: warm / cool / neutral
skin_depth: fair / light / medium / tan / deep

═══════════════════════════════
底色（undertone）判斷——非常重要
═══════════════════════════════

pink（冷粉紅底）：皮膚帶粉紅/玫瑰調，靜脈明顯偏藍/紫，曬後易紅，銀飾更靚。Summer/Winter型。

yellow（暖黃底）：皮膚帶明顯黃調但唔帶綠，靜脈偏綠，曬後變金啡，金飾更靚。Spring型。

olive（橄欖底）：皮膚帶黃綠調，係黃底+輕微綠調混合。靜脈通常藍綠混色。即使淺膚色都有輕微灰綠底色。曬後變橄欖綠。金銀都OK但金色稍好。常見於亞洲人、地中海膚色，Autumn型最多。判斷關鍵：手腕皮膚係咪有輕微灰綠調？

neutral（中性底）：黃底同粉紅底混合，金銀都適合。

⚠️ 重要：亞洲人橄欖底（olive）極容易被誤判為pink，因為臉部有時帶紅潤。請以手腕皮膚底色為準，唔好被臉部紅潤誤導。如果靜脈係藍綠混色、皮膚有灰綠調，應判為olive而非pink。

判斷優先次序：
1. 手腕相片皮膚底色（最客觀）
2. 靜脈顏色
3. 飾物偏好
4. 最後參考臉部相片

lama_message用廣東話，親切有趣，針對季節型給一句建議。`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { wristData, faceData, mediaType, veinColor, jewelryPref, undertonePref } = body;
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

    const undertoneContext = undertonePref && undertonePref !== 'unclear'
      ? `【用家自選底色：${undertonePref === 'yellow' ? '黃調' : undertonePref === 'pink' ? '粉紅調' : '橄欖/灰綠調'}】→ 用家自己了解自己膚色，undertone必須設為「${undertonePref}」，呢個係最高優先級，唔可以靠相片推翻。`
      : '【用家底色：唔確定】→ 靠相片同其他指標判斷底色。';

    const systemWithVein = SYSTEM_PROMPT + `

${veinContext}
${jewelryContext}
${undertoneContext}

綜合判斷規則（重要）：
1. 用家問卷答案（底色+靜脈+飾物）係主要判斷依據
2. 相片（手腕+臉部白紙）係double check工具
3. 如果相片同問卷一致 → 高信心，season_confidence填"high"
4. 如果相片同問卷不一致 → 仍然跟問卷答案，但season_confidence填"medium"，並在notes說明差異（例如：「用家自選橄欖底，但手腕相片似乎偏黃，建議再次確認」）
5. 用家自選底色係最高優先，相片唔可以推翻問卷答案

分析策略：第一張係手腕相，用於輔助判斷底色同冷暖調；第二張係臉部相（用家手持白紙校準色溫），用於判斷膚色深淺（skin_depth）。如果臉部相有白紙，請以白紙作為白色參考點校正色溫。`;

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

    // Save AI's original photo-based undertone before override
    const photoUndertone = result.undertone;
    const photoWarmCool = result.warm_cool;

    // ── Hard override: user questionnaire takes priority ──
    if (undertonePref && undertonePref !== 'unclear') {
      result.undertone = undertonePref;
    }

    const veinWarm = veinColor === 'green';
    const veinCool = veinColor === 'blue_purple';
    const jewelryWarm = jewelryPref === 'gold';
    const jewelryCool = jewelryPref === 'silver';

    if (veinWarm && jewelryWarm) {
      result.warm_cool = 'warm';
      if (result.season === 'summer' || result.season === 'winter') {
        result.season = result.skin_depth === 'fair' || result.skin_depth === 'light' ? 'spring' : 'autumn';
      }
    } else if (veinCool && jewelryCool) {
      result.warm_cool = 'cool';
      if (result.season === 'spring' || result.season === 'autumn') {
        result.season = result.skin_depth === 'deep' || result.skin_depth === 'tan' ? 'winter' : 'summer';
      }
    }

    // ── Photo observation note ──
    const undertoneLabels: Record<string, string> = {
      yellow: '黃調', pink: '粉紅調', olive: '橄欖/灰綠調', neutral: '中性'
    };
    const warmCoolLabels: Record<string, string> = {
      warm: '暖調', cool: '冷調', neutral: '中性'
    };

    const undertoneChanged = undertonePref && undertonePref !== 'unclear' && photoUndertone !== undertonePref;
    const warmCoolChanged = ((veinWarm && jewelryWarm) || (veinCool && jewelryCool)) && photoWarmCool !== result.warm_cool;

    if (undertoneChanged || warmCoolChanged) {
      const observations = [];
      if (undertoneChanged) {
        observations.push(`底色似乎偏${undertoneLabels[photoUndertone] ?? photoUndertone}（你選擇了${undertoneLabels[undertonePref!]}）`);
      }
      if (warmCoolChanged) {
        observations.push(`冷暖調似乎偏${warmCoolLabels[photoWarmCool] ?? photoWarmCool}（問卷顯示${warmCoolLabels[result.warm_cool]}）`);
      }
      result.photo_observation = `根據相片觀察：${observations.join('，')}。如有疑問建議諮詢專業個人色彩分析師確認。`;
    } else {
      result.photo_observation = null;
    }

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
