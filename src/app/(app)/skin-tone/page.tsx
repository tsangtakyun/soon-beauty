import { createClient } from '@/lib/supabase/server';
import SkinToneClient from '@/components/SkinToneClient';
import type { Product } from '@/types/database';

export default async function SkinTonePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch products with shade/color info for matching
  const { data: products } = await supabase
    .from('products')
    .select('id, name, brand, photo_url, notes, category_id')
    .eq('user_id', user.id)
    .in('status', ['in_use', 'unopened'])
    .order('name');

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="fini-dash-title">色彩分析</h1>
        <p className="fini-dash-sub">AI 分析你的膚色，找出最適合你的彩妝色系。</p>
      </div>
      <SkinToneClient products={(products as Product[] | null) ?? []} />
    </div>
  );
}
