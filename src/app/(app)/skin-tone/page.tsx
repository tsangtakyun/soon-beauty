import { createClient } from '@/lib/supabase/server';
import SkinToneClient from '@/components/SkinToneClient';
import type { ColorProfile, Product } from '@/types/database';

export default async function SkinTonePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('color_profile')
    .eq('id', user.id)
    .single();

  // Fetch products with shade/color info for matching
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['in_use', 'unopened'])
    .order('name');

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="fini-dash-title">色彩分析</h1>
        <p className="fini-dash-sub">你可以揀快速 AI 分析，或者保留進階問答分析；兩邊最後都會整理成同一份個人色彩分析報告。</p>
      </div>
      <SkinToneClient
        existingProfile={(profile?.color_profile as ColorProfile | null) ?? null}
        products={(products as Product[] | null) ?? []}
      />
    </div>
  );
}
