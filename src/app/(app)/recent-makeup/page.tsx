import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import RecentMakeupForm from '@/components/RecentMakeupForm';
import type { Product, RecentMakeupLog, Category, Profile } from '@/types/database';

export default async function RecentMakeupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: products }, { data: logs }, { data: categories }, { data: profile }] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('recent_makeup_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true }),
    supabase.from('profiles').select('tier').eq('id', user.id).single(),
  ]);

  return (
    <div className="space-y-5 animate-fade-in">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-caption text-ink-500 hover:text-ink-800">
        <ArrowLeft className="w-4 h-4" />
        返回個人首頁
      </Link>

      <section className="fini-page-hero fini-page-hero-compact">
        <div className="fini-page-hero-copy">
          <p className="fini-section-kicker">妝容記錄</p>
          <h1 className="fini-dash-title">最近化妝</h1>
          <p className="fini-dash-sub">
            將自拍、妝容與使用產品整理在同一頁，之後回看當日搭配會更直覺。
          </p>
        </div>
      </section>

      <RecentMakeupForm
        products={(products as Product[] | null) ?? []}
        logs={(logs as RecentMakeupLog[] | null) ?? []}
        categories={(categories as Category[] | null) ?? []}
        profile={(profile as Pick<Profile, 'tier'> | null) ?? null}
      />
    </div>
  );
}
