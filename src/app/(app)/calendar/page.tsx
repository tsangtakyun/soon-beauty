import { createClient } from '@/lib/supabase/server';
import CalendarClient from '@/components/CalendarClient';
import type { Product } from '@/types/database';

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['in_use', 'unopened'])
    .order('name');

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="fini-page-hero fini-page-hero-compact">
        <div className="fini-page-hero-copy">
          <p className="fini-section-kicker">Daily Ritual</p>
        <h1 className="fini-dash-title">使用日曆</h1>
        <p className="fini-dash-sub">記錄每日用過的產品，追蹤使用習慣。</p>
        </div>
      </section>
      <CalendarClient products={(products as Product[] | null) ?? []} />
    </div>
  );
}
