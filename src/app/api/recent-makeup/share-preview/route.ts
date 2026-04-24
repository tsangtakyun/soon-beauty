import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildMakeupSharePrompt } from '@/lib/recent-makeup-share';
import type { Product } from '@/types/database';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      templateId,
      title,
      notes,
      selfieUrl,
      selectedProducts,
    }: {
      templateId: 'product-catalog' | 'annotated-breakdown';
      title?: string | null;
      notes?: string | null;
      selfieUrl?: string | null;
      selectedProducts?: Array<Pick<Product, 'name' | 'brand'>>;
    } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'Template required' }, { status: 400 });
    }

    const preview = buildMakeupSharePrompt({
      templateId,
      title: title ?? null,
      notes: notes ?? null,
      selfieUrl: selfieUrl ?? null,
      selectedProducts: selectedProducts ?? [],
    });

    return NextResponse.json({
      preview,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
