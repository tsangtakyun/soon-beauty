import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function fetchPublicImageAsBlob(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('未能讀取自拍圖片');
  }
  return await response.blob();
}

function buildDemoPrompt(params: {
  seasonLabel: string;
  colors: string[];
  kind: 'good' | 'bad';
}) {
  const { seasonLabel, colors, kind } = params;
  const toneLine =
    kind === 'good'
      ? '請保留人物五官與自然感，將畫面處理成更顯氣色、更清透、更有精神的穿色示範。'
      : '請保留人物五官與自然感，將畫面處理成略顯沉、略顯灰、氣色較弱的不適合穿色示範，但不要醜化人物。';

  return [
    `這是一張個人色彩分析示範圖，季節型為 ${seasonLabel}。`,
    `請生成 ${kind === 'good' ? '適合色' : '不太適合色'} 示範卡。`,
    `指定服裝顏色：${colors.join('、')}。`,
    toneLine,
    '人物需保持原本髮型、表情與臉部特徵。',
    '構圖請為正方形 1:1，上半身或胸像即可。',
    '背景乾淨簡單，像個人色彩報告卡用圖。',
    '不要加入任何文字、邊框、拼貼或額外物件。',
  ].join('\n');
}

async function generateOne(params: {
  openAiKey: string;
  imageBlob: Blob;
  colors: string[];
  kind: 'good' | 'bad';
  seasonLabel: string;
}) {
  const { openAiKey, imageBlob, colors, kind, seasonLabel } = params;
  const formData = new FormData();
  formData.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2');
  formData.append('prompt', buildDemoPrompt({ seasonLabel, colors, kind }));
  formData.append('size', '1024x1024');
  formData.append('quality', 'medium');
  formData.append('image', imageBlob, 'skin-tone-selfie.jpg');

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
    },
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? '生成示範卡失敗');
  }

  const base64Image = payload?.data?.[0]?.b64_json;
  if (!base64Image) {
    throw new Error('OpenAI 未返回圖片資料');
  }

  return Buffer.from(base64Image, 'base64');
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
      selfieUrl,
      seasonLabel,
      goodColors,
      badColors,
    }: {
      selfieUrl?: string | null;
      seasonLabel?: string;
      goodColors?: string[];
      badColors?: string[];
    } = body;

    if (!selfieUrl || !seasonLabel) {
      return NextResponse.json({ error: '缺少自拍或季節資料。' }, { status: 400 });
    }

    const imageBlob = await fetchPublicImageAsBlob(selfieUrl);
    const good = (goodColors ?? []).slice(0, 2);
    const bad = (badColors ?? []).slice(0, 2);

    if (good.length === 0 || bad.length === 0) {
      return NextResponse.json({ error: '缺少示範顏色資料。' }, { status: 400 });
    }

    const variants = await Promise.all([
      ...good.map(async (color) => ({
        label: color,
        kind: 'good' as const,
        image: await generateOne({
          openAiKey: process.env.OPENAI_API_KEY!,
          imageBlob,
          colors: [color],
          kind: 'good',
          seasonLabel,
        }),
      })),
      ...bad.map(async (color) => ({
        label: color,
        kind: 'bad' as const,
        image: await generateOne({
          openAiKey: process.env.OPENAI_API_KEY!,
          imageBlob,
          colors: [color],
          kind: 'bad',
          seasonLabel,
        }),
      })),
    ]);

    const uploads = await Promise.all(
      variants.map(async (variant) => {
        const filePath = `${user.id}/skin-tone-demos/${Date.now()}-${variant.kind}-${crypto.randomUUID()}.png`;
        const { error } = await supabase.storage.from('product-photos').upload(filePath, variant.image, {
          contentType: 'image/png',
          upsert: true,
        });

        if (error) throw new Error(error.message);

        const imageUrl = supabase.storage.from('product-photos').getPublicUrl(filePath).data.publicUrl;
        return {
          kind: variant.kind,
          label: variant.label,
          imageUrl,
        };
      })
    );

    return NextResponse.json({
      good: uploads.filter((item) => item.kind === 'good'),
      bad: uploads.filter((item) => item.kind === 'bad'),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
