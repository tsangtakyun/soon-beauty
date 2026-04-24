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
      <section className="fini-page-hero fini-page-hero-compact">
        <div className="fini-page-hero-copy">
          <p className="fini-section-kicker">Account & Care</p>
          <h1 className="fini-dash-title">設定</h1>
          <p className="fini-dash-sub">管理帳戶、查看收藏使用量，同時保持你的 beauty space 整潔有序。</p>
        </div>
      </section>

      <section className="fini-section-panel p-5">
        <h2 className="fini-section-title mb-3" style={{ fontSize: 20 }}>帳戶</h2>
        <div className="space-y-3 text-caption">
          <div className="flex justify-between">
            <span style={{ color: '#8D786B' }}>電郵</span>
            <span style={{ color: '#2F2620' }}>{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#8D786B' }}>方案</span>
            <span style={{ color: '#2F2620' }} className="capitalize">
              {profile?.tier === 'free' ? '免費' : profile?.tier}
            </span>
          </div>
        </div>
      </section>

      <section className="fini-section-panel p-5">
        <h2 className="fini-section-title mb-3" style={{ fontSize: 20 }}>使用量</h2>
        <div className="flex justify-between text-caption mb-2">
          <span style={{ color: '#8D786B' }}>產品數量</span>
          <span style={{ color: '#2F2620', fontWeight: 500 }}>{total} / {limit}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#EFE2D4' }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #A67C52 0%, #C69A6B 100%)' }}
          />
        </div>
        {percent >= 80 && profile?.tier === 'free' && (
          <p className="text-micro mt-3" style={{ color: '#A56B46' }}>
            差唔多去到上限，之後可以升級到 Pro 解鎖無限制。
          </p>
        )}
      </section>

      {/* Actions */}
      <SettingsActions />

      <p className="text-micro text-center pt-4" style={{ color: '#A28C7B' }}>
        Neaty Beauty · Phase 1 MVP
      </p>
    </div>
  );
}
