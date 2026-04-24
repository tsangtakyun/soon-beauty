import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { Plus, FlaskConical, Sparkles, Package2 } from 'lucide-react';
import { formatDaysLabel, getExpiryStatus, STATUS_COLORS } from '@/lib/utils';
import type { ProductWithExpiry } from '@/types/database';

// Lama says different things based on situation
function getLamaMessage(stats: {
  total_count: number;
  expiring_soon_count: number;
  expired_count: number;
  in_use_count: number;
}): string {
  if (stats.total_count === 0) {
    return '你好呀！我係 Lama～ 快啲加你的第一件化妝品，我幫你好好看管！';
  }
  if (stats.expired_count > 0) {
    return `唔好意思要提你，有 ${stats.expired_count} 件產品已經過期啦！快啲處理一下，我幫你keep住記錄～`;
  }
  if (stats.expiring_soon_count > 0) {
    return `留意一下，有 ${stats.expiring_soon_count} 件產品快過期啦！要快啲用完佢哋呀～`;
  }
  if (stats.in_use_count > 3) {
    return `你而家有 ${stats.in_use_count} 件產品開緊，我已經幫你全部記錄好喇！`;
  }
  return `我已經幫你整理好你的 ${stats.total_count} 件化妝品啦！有咩需要隨時叫我～`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: statsData } = await supabase.rpc('user_product_stats', {
    target_user_id: user.id,
  });
  const stats = statsData?.[0] ?? {
    total_count: 0,
    expiring_soon_count: 0,
    expired_count: 0,
    in_use_count: 0,
    unopened_count: 0,
    finished_count: 0,
  };

  const { data: expiringSoon } = await supabase
    .from('products_with_expiry')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['unopened', 'in_use'])
    .not('days_until_expiry', 'is', null)
    .lte('days_until_expiry', 90)
    .order('days_until_expiry', { ascending: true })
    .limit(5);

  const products = (expiringSoon as ProductWithExpiry[] | null) ?? [];
  const lamaMsg = getLamaMessage(stats);

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="fini-page-hero">
        <div className="fini-page-hero-copy">
          <p className="fini-section-kicker">Today In Your Beauty Home</p>
          <h1 className="fini-dash-title">慢慢整理，靚靚用完。</h1>
          <p className="fini-dash-sub">Neaty Beauty 會幫你留意快到期產品、整理正在使用中嘅收藏，同埋保留每次完成嘅小成就。</p>

          <div className="fini-page-hero-actions">
            <Link href="/analyze" className="fini-btn-analyze">
              <FlaskConical style={{ width: 14, height: 14 }} />
              分析成份
            </Link>
            <Link href="/products/scan" className="fini-btn-add">
              <Plus style={{ width: 14, height: 14 }} />
              新增產品
            </Link>
          </div>
        </div>

        <div className="fini-page-hero-illustration">
          <div className="fini-page-hero-mascot">
            <Image src="/lama.svg" alt="Neaty Beauty 品牌貓咪角色" width={104} height={136} />
          </div>
          <div className="fini-page-hero-bubble">
            <p className="fini-lama-greeting-text">{lamaMsg}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="總收藏" value={stats.total_count ?? 0} accent="cream" icon={<Package2 className="h-4 w-4" />} />
        <StatCard label="使用中" value={stats.in_use_count ?? 0} accent="blush" icon={<Sparkles className="h-4 w-4" />} />
        <StatCard label="即將過期" value={stats.expiring_soon_count ?? 0} accent="amber" icon={<FlaskConical className="h-4 w-4" />} />
        <StatCard label="已用完" value={stats.finished_count ?? 0} accent="sage" icon={<Plus className="h-4 w-4" />} />
      </div>

      <section className="fini-section-panel">
        <div className="flex items-center justify-between mb-3">
          <h2 className="fini-section-title">即將過期</h2>
          <Link href="/products?filter=expiring" className="fini-section-link">查看全部 →</Link>
        </div>

        {products.length === 0 ? (
          <div className="fini-empty-state">
            <p className="text-caption" style={{ color: '#8D786B' }}>
              {(stats.total_count ?? 0) === 0
                ? '尚未新增任何產品，點擊「新增產品」開始。'
                : '目前沒有即將過期的產品，繼續保持！✨'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => <ProductRow key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, accent, icon }: {
  label: string;
  value: number;
  accent: 'cream' | 'blush' | 'amber' | 'sage';
  icon: React.ReactNode;
}) {
  const styles = {
    cream: { bg: '#FBF4EA', border: '#E8DACA', color: '#8A6A52' },
    blush: { bg: '#F8EEEC', border: '#E8D7D5', color: '#9A6B68' },
    amber: { bg: '#FFF1E5', border: '#F0DCC3', color: '#B97840' },
    sage: { bg: '#EEF3EA', border: '#D7E1D1', color: '#66806A' },
  }[accent];

  return (
    <div className="fini-stat-card" style={{ background: styles.bg, borderColor: styles.border }}>
      <div className="fini-stat-card-top" style={{ color: styles.color }}>
        <span>{label}</span>
        <span className="fini-stat-card-icon">{icon}</span>
      </div>
      <div className="font-display leading-none mb-1" style={{ fontSize: 36, color: styles.color, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function ProductRow({ product }: { product: ProductWithExpiry }) {
  const status = getExpiryStatus(product.days_until_expiry);
  const statusColor = STATUS_COLORS[status];
  return (
    <Link href={`/products/${product.id}`} className="fini-product-row">
      {product.photo_url ? (
        <img src={product.photo_url} alt={product.name}
          className="flex-shrink-0 rounded-[18px] object-cover" style={{ width: 52, height: 52 }} />
      ) : (
        <div className="flex-shrink-0 rounded-[18px] flex items-center justify-center font-display"
          style={{ width: 52, height: 52, background: product.category_color ?? '#E8E0E4', color: '#5A4050', fontSize: 20 }}>
          {product.name.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-body font-medium truncate" style={{ color: '#2F2620' }}>{product.name}</div>
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
