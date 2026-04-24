import Link from 'next/link';
import Image from 'next/image';
import { Award, Camera, Cog, Palette, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDaysLabel, getExpiryStatus, STATUS_COLORS } from '@/lib/utils';
import type { Product, ProductWithExpiry, RecentMakeupLog } from '@/types/database';

function getCaretakerMessage({
  expiredCount,
  expiringCount,
  newProductsCount,
  watchlistCount,
}: {
  expiredCount: number;
  expiringCount: number;
  newProductsCount: number;
  watchlistCount: number;
}) {
  if (expiredCount > 0) {
    return `有 ${expiredCount} 件產品已經過期，建議你今日先處理佢哋。`;
  }
  if (expiringCount > 0) {
    return `有 ${expiringCount} 件產品快到期，記得優先用返佢哋。`;
  }
  if (watchlistCount > 0) {
    return `鐵皮清單而家有 ${watchlistCount} 件產品，今個月慢慢推進就啱。`;
  }
  if (newProductsCount > 0) {
    return `最近新增咗 ${newProductsCount} 件產品，記得為佢哋補齊分類同使用狀態。`;
  }
  return '而家收藏狀態幾整齊，可以慢慢檢查今日想用邊幾件。';
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    { data: profile },
    { data: statsData },
    { data: expiringSoon },
    { data: allProductsData },
    { data: latestProducts },
    { data: watchlistProducts },
    { data: recentMakeupLogs },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.rpc('user_product_stats', { target_user_id: user.id }),
    supabase
      .from('products_with_expiry')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['unopened', 'in_use'])
      .not('days_until_expiry', 'is', null)
      .lte('days_until_expiry', 90)
      .order('days_until_expiry', { ascending: true })
      .limit(4),
    supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .eq('on_watchlist', true)
      .in('status', ['unopened', 'in_use', 'finished'])
      .order('updated_at', { ascending: false }),
    supabase
      .from('recent_makeup_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const stats = statsData?.[0] ?? {
    total_count: 0,
    expiring_soon_count: 0,
    expired_count: 0,
    in_use_count: 0,
    unopened_count: 0,
    finished_count: 0,
  };

  const expiringProducts = (expiringSoon as ProductWithExpiry[] | null) ?? [];
  const allProducts = (allProductsData as Product[] | null) ?? [];
  const newlyAddedProducts = (latestProducts as Product[] | null) ?? [];
  const watchlist = (watchlistProducts as Product[] | null) ?? [];
  const recentMakeup = (recentMakeupLogs?.[0] as RecentMakeupLog | undefined) ?? null;

  const latestAddedThisWeek = newlyAddedProducts.filter(
    (product) => new Date(product.created_at) >= sevenDaysAgo
  );
  const finishedWatchlistCount = watchlist.filter((product) => product.status === 'finished').length;
  const activeWatchlistCount = watchlist.filter((product) => product.status !== 'finished').length;
  const makeupProducts = recentMakeup
    ? allProducts.filter((product) => recentMakeup.used_product_ids.includes(product.id))
    : [];

  const caretakerMessage = getCaretakerMessage({
    expiredCount: stats.expired_count ?? 0,
    expiringCount: stats.expiring_soon_count ?? 0,
    newProductsCount: latestAddedThisWeek.length,
    watchlistCount: activeWatchlistCount,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="fini-dash-home-hero">
        <div className="fini-dash-home-copy">
          <p className="fini-section-kicker">Beauty Home</p>
          <h1 className="fini-dash-title">個人首頁</h1>
          <p className="fini-dash-sub">
            {profile?.display_name ? `${profile.display_name}，` : ''}
            呢度會幫你睇住產品狀態、鐵皮進度，同埋最近妝容記錄。
          </p>
        </div>
      </section>

      <div className="fini-dash-top-row">
        <section className="fini-dash-home-mascot-shell">
          <div className="fini-dash-home-bubble fini-dash-home-bubble-floating">
            <p className="fini-lama-greeting-text">{caretakerMessage}</p>
          </div>
          <div className="fini-dash-home-peek-wrap">
            <Image src="/brand/cat-peek.png" alt="Neaty Beauty 管家貓咪" width={320} height={190} />
          </div>
        </section>

        <section className="fini-section-panel">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="fini-section-kicker">Beauty Journal</p>
              <h2 className="fini-section-title">最近化妝</h2>
            </div>
            <Link href="/recent-makeup" className="fini-section-link">查看全部</Link>
          </div>

          {recentMakeup ? (
            <div className="fini-dash-makeup-card">
              <div className="fini-dash-makeup-thumb">
                {recentMakeup.selfie_url ? (
                  <img src={recentMakeup.selfie_url} alt={recentMakeup.title ?? '最近化妝自拍'} className="fini-dash-makeup-thumb-image" />
                ) : (
                  <div className="fini-dash-makeup-thumb-empty">
                    <Image src="/brand/cat-sit-hero.png" alt="" width={120} height={120} />
                  </div>
                )}
              </div>
              <div className="space-y-3 min-w-0">
                <div>
                  <div className="text-body font-medium" style={{ color: '#2F2620' }}>
                    {recentMakeup.title || '最近妝容'}
                  </div>
                  <div className="text-micro mt-1" style={{ color: '#9D8777' }}>
                    {new Date(recentMakeup.created_at).toLocaleDateString('zh-HK')}
                  </div>
                </div>
                {recentMakeup.notes && (
                  <p className="text-caption" style={{ color: '#7A6656', lineHeight: 1.8 }}>
                    {recentMakeup.notes}
                  </p>
                )}
                <div className="fini-dash-tag-row">
                  {makeupProducts.length > 0 ? (
                    makeupProducts.map((product) => (
                      <span key={product.id} className="fini-dash-tag">
                        {product.name}
                      </span>
                    ))
                  ) : (
                    <span className="fini-dash-tag">未附產品</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="fini-empty-state p-5">
              <p className="text-caption mb-3" style={{ color: '#8D786B' }}>
                仲未有最近化妝紀錄。記低自拍同產品組合之後，以後回看會方便好多。
              </p>
              <Link href="/recent-makeup" className="fini-btn-analyze">
                <Camera className="w-4 h-4" />
                開始記錄
              </Link>
            </div>
          )}
        </section>
      </div>

      <div className="fini-dash-action-grid">
        <QuickActionCard
          href="/skin-tone"
          title="膚色分析"
          body={profile?.color_profile ? '已完成個人色彩檔案，可再查看建議。' : '重新查看或補做你的個人色彩分析。'}
          icon={<Palette className="w-4 h-4" />}
        />
        <QuickActionCard
          href="/recent-makeup"
          title="最近化妝"
          body={recentMakeup ? '已經有最近妝容紀錄，可以回看自拍與產品。' : '加入自拍與產品紀錄，建立自己的妝容日誌。'}
          icon={<Camera className="w-4 h-4" />}
        />
        <QuickActionCard
          href="/settings"
          title="設定"
          body="管理名稱、語言與帳戶偏好。"
          icon={<Cog className="w-4 h-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="fini-section-panel">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="fini-section-kicker">My Products</p>
              <h2 className="fini-section-title">需要處理的產品</h2>
            </div>
            <Link href="/products" className="fini-section-link">查看全部</Link>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <DashboardMetric label="快將過期" value={stats.expiring_soon_count ?? 0} tone="amber" />
            <DashboardMetric label="已過期" value={stats.expired_count ?? 0} tone="rose" />
            <DashboardMetric label="使用中" value={stats.in_use_count ?? 0} tone="sage" />
            <DashboardMetric label="總收藏" value={stats.total_count ?? 0} tone="cream" />
          </div>

          {expiringProducts.length === 0 ? (
            <div className="fini-empty-state p-5">
              <p className="text-caption" style={{ color: '#8D786B' }}>
                目前冇快到期產品，狀態幾穩陣。
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {expiringProducts.map((product) => (
                <ProductRow key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        <section className="fini-section-panel">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="fini-section-kicker">New In</p>
              <h2 className="fini-section-title">最近新增產品</h2>
            </div>
            <Link href="/products/scan" className="fini-btn-add">
              <Plus className="w-4 h-4" />
              新增產品
            </Link>
          </div>

          {newlyAddedProducts.length === 0 ? (
            <div className="fini-empty-state p-5">
              <p className="text-caption" style={{ color: '#8D786B' }}>
                仲未有產品，撳「新增產品」開始整理第一件收藏。
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {newlyAddedProducts.map((product) => (
                <SimpleProductRow key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="fini-section-panel fini-dash-pan-panel">
        <div className="flex items-center justify-between mb-4">
          <div className="fini-dash-pan-head">
            <p className="fini-section-kicker">Project Pan</p>
            <h2 className="fini-section-title">鐵皮計劃情況</h2>
          </div>
          <Link href="/empty-bottle" className="fini-section-link">查看計劃</Link>
        </div>

        <div className="fini-dash-pan-metrics">
          <DashboardMetric label="清單進行中" value={activeWatchlistCount} tone="rose" />
          <DashboardMetric label="已交鐵皮" value={finishedWatchlistCount} tone="sage" />
        </div>

        <div className="space-y-2">
          {watchlist.filter((product) => product.status !== 'finished').slice(0, 3).map((product) => (
            <SimpleProductRow key={product.id} product={product} eyebrow="鐵皮清單" />
          ))}
          {watchlist.filter((product) => product.status !== 'finished').length === 0 && (
            <div className="fini-empty-state p-5">
              <p className="text-caption" style={{ color: '#8D786B' }}>
                目前仲未設定鐵皮清單，可以去鐵皮計劃頁面加入想優先用完嘅產品。
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function QuickActionCard({
  href,
  title,
  body,
  icon,
}: {
  href: string;
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="fini-dash-quick-card">
      <span className="fini-dash-quick-icon">{icon}</span>
      <span className="fini-dash-quick-title">{title}</span>
      <span className="fini-dash-quick-body">{body}</span>
    </Link>
  );
}

function DashboardMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'cream' | 'amber' | 'rose' | 'sage';
}) {
  const palette = {
    cream: { bg: '#FBF4EA', border: '#E8DACA', color: '#8A6A52' },
    amber: { bg: '#FFF1E5', border: '#F0DCC3', color: '#B97840' },
    rose: { bg: '#F8EEEC', border: '#E8D7D5', color: '#9A6B68' },
    sage: { bg: '#EEF3EA', border: '#D7E1D1', color: '#66806A' },
  }[tone];

  return (
    <div className="fini-stat-card" style={{ background: palette.bg, borderColor: palette.border }}>
      <div className="fini-stat-card-top" style={{ color: palette.color }}>
        <span>{label}</span>
      </div>
      <div className="font-display leading-none mb-1" style={{ fontSize: 34, color: palette.color, fontWeight: 500 }}>
        {value}
      </div>
    </div>
  );
}

function ProductRow({ product }: { product: ProductWithExpiry }) {
  const status = getExpiryStatus(product.days_until_expiry);
  const statusColor = STATUS_COLORS[status];
  return (
    <Link href={`/products/${product.id}`} className="fini-product-row">
      {product.photo_url ? (
        <img
          src={product.photo_url}
          alt={product.name}
          className="flex-shrink-0 rounded-[18px] object-cover"
          style={{ width: 52, height: 52 }}
        />
      ) : (
        <div
          className="flex-shrink-0 rounded-[18px] flex items-center justify-center font-display"
          style={{ width: 52, height: 52, background: product.category_color ?? '#E8E0E4', color: '#5A4050', fontSize: 20 }}
        >
          {product.name.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-body font-medium truncate" style={{ color: '#2F2620' }}>
          {product.name}
        </div>
        <div className="text-micro truncate" style={{ color: '#8D786B' }}>
          {product.brand ?? product.category_name ?? '—'}
        </div>
      </div>
      <div className={`text-caption font-medium px-3 py-1.5 rounded-full flex-shrink-0 ${statusColor}`}>
        {formatDaysLabel(product.days_until_expiry)}
      </div>
    </Link>
  );
}

function SimpleProductRow({
  product,
  eyebrow,
}: {
  product: Product;
  eyebrow?: string;
}) {
  return (
    <Link href={`/products/${product.id}`} className="fini-product-row">
      {product.photo_url ? (
        <img
          src={product.photo_url}
          alt={product.name}
          className="flex-shrink-0 rounded-[18px] object-cover"
          style={{ width: 52, height: 52 }}
        />
      ) : (
        <div
          className="flex-shrink-0 rounded-[18px] flex items-center justify-center font-display"
          style={{ width: 52, height: 52, background: '#E8E0E4', color: '#5A4050', fontSize: 20 }}
        >
          {product.name.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="text-micro mb-1" style={{ color: '#A28C7B' }}>
            {eyebrow}
          </div>
        )}
        <div className="text-body font-medium truncate" style={{ color: '#2F2620' }}>
          {product.name}
        </div>
        <div className="text-micro truncate" style={{ color: '#8D786B' }}>
          {product.brand ?? '—'}
        </div>
      </div>
      <span className="text-micro" style={{ color: '#9D8777' }}>
        {new Date(product.created_at).toLocaleDateString('zh-HK')}
      </span>
    </Link>
  );
}
