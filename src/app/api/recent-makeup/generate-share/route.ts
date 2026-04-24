import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  buildMakeupSharePrompt,
  DEFAULT_MAKEUP_SHARE_TEMPLATE_ID,
  getMakeupShareOutputSize,
  type MakeupShareTemplate,
} from '@/lib/recent-makeup-share';
import type { Product } from '@/types/database';

async function fetchPublicImageAsBlob(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('未能讀取自拍圖片');
  }
  return await response.blob();
}

function base64ImageToBlob(base64: string, mediaType: string) {
  const imageBuffer = Buffer.from(base64, 'base64');
  return new Blob([imageBuffer], { type: mediaType });
}

function getUploadFilename(mediaType?: string) {
  if (mediaType === 'image/png') return 'selfie.png';
  if (mediaType === 'image/webp') return 'selfie.webp';
  return 'selfie.jpg';
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
      return NextResponse.json(
        { error: '尚未設定 OPENAI_API_KEY，未能生成分享圖。' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      templateId,
      title,
      notes,
      selfieUrl,
      base64,
      mediaType,
      logId,
      selectedProducts,
    }: {
      templateId?: MakeupShareTemplate['id'];
      title?: string | null;
      notes?: string | null;
      selfieUrl?: string | null;
      base64?: string;
      mediaType?: string;
      logId?: string | null;
      selectedProducts?: Array<Pick<Product, 'name' | 'brand'>>;
    } = body;

    const finalTemplateId = templateId ?? DEFAULT_MAKEUP_SHARE_TEMPLATE_ID;

    const preview = buildMakeupSharePrompt({
      templateId: finalTemplateId,
      title: title ?? null,
      notes: notes ?? null,
      selfieUrl: selfieUrl ?? null,
      selectedProducts: selectedProducts ?? [],
    });

    const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
    let openAiResponse: Response;

    if (base64 || selfieUrl) {
      const blobMediaType = mediaType || 'image/jpeg';
      const selfieBlob = base64
        ? base64ImageToBlob(base64, blobMediaType)
        : await fetchPublicImageAsBlob(selfieUrl!);
      const filename = getUploadFilename(selfieBlob.type || blobMediaType);
      const formData = new FormData();
      formData.append('model', model);
      formData.append('prompt', preview.prompt);
      formData.append('size', getMakeupShareOutputSize(finalTemplateId));
      formData.append('quality', 'medium');
      formData.append('image', selfieBlob, filename);

      openAiResponse = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      });
    } else {
      openAiResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: preview.prompt,
          size: getMakeupShareOutputSize(finalTemplateId),
          quality: 'medium',
        }),
      });
    }

    const payload = await openAiResponse.json();
    if (!openAiResponse.ok) {
      return NextResponse.json(
        { error: payload?.error?.message ?? '生成分享圖失敗。' },
        { status: openAiResponse.status }
      );
    }

    const base64Image = payload?.data?.[0]?.b64_json;
    if (!base64Image) {
      return NextResponse.json({ error: 'OpenAI 未返回圖片資料。' }, { status: 500 });
    }

    const imageBuffer = Buffer.from(base64Image, 'base64');
    const filePath = `${user.id}/makeup-shares/${Date.now()}-${finalTemplateId}.png`;

    const { error: uploadError } = await supabase.storage.from('product-photos').upload(filePath, imageBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from('product-photos').getPublicUrl(filePath);
    const imageUrl = publicUrlData.publicUrl;

    if (logId) {
      await supabase
        .from('recent_makeup_logs')
        .update({
          share_image_url: imageUrl,
          share_template_id: finalTemplateId,
        })
        .eq('id', logId)
        .eq('user_id', user.id);
    }

    return NextResponse.json({
      imageUrl,
      filePath,
      model,
      template: preview.template,
      savedToLog: Boolean(logId),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
