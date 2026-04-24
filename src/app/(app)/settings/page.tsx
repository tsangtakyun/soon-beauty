import { createClient } from '@/lib/supabase/server';
import SettingsActions from '@/components/SettingsActions';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: statsData } = await supabase.rpc('user_product_stats', {
    target_user_id: user.id,
  });
  const stats = statsData?.[0];
  const total = stats?.total_count ?? 0;
  const limit = profile?.item_limit ?? 100;
  const percent = Math.min(100, (total / limit) * 100);

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
      <h1 className="font-display text-heading text-ink-900">設定</h1>

      {/* Account */}
      <section className="card p-5">
        <h2 className="text-title font-medium text-ink-900 mb-3">帳戶</h2>
        <div className="space-y-2 text-caption">
          <div className="flex justify-between">
            <span className="text-ink-500">電郵</span>
            <span className="text-ink-900">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-500">方案</span>
            <span className="text-ink-900 capitalize">
              {profile?.tier === 'free' ? '免費' : profile?.tier}
            </span>
          </div>
        </div>
      </section>

      {/* Usage */}
      <section className="card p-5">
        <h2 className="text-title font-medium text-ink-900 mb-3">使用量</h2>
        <div className="flex justify-between text-caption mb-2">
          <span className="text-ink-500">產品數量</span>
          <span className="text-ink-900 font-medium">{total} / {limit}</span>
        </div>
        <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        {percent >= 80 && profile?.tier === 'free' && (
          <p className="text-micro text-brand-600 mt-3">
            差唔多去到上限，之後可以升級到 Pro 解鎖無限制。
          </p>
        )}
      </section>

      {/* Actions */}
      <SettingsActions />

      <p className="text-micro text-ink-400 text-center pt-4">
        Neaty Beauty · Phase 1 MVP
      </p>
    </div>
  );
}
