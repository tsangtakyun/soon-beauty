import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus, FlaskConical } from 'lucide-react';
import { formatDaysLabel, getExpiryStatus, STATUS_COLORS } from '@/lib/utils';
import type { ProductWithExpiry } from '@/types/database';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: statsData } = await supabase.rpc('user_product_stats', {
    target_user_id: user.id,
  });
  const stats = statsData?.[0];

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

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="fini-dash-title">您好</h1>
          <p className="fini-dash-sub">查看您的美容倉庫</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
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

      {/* Stat cards — each a distinct colour */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="總數"
          value={stats?.total_count ?? 0}
          bg="#F0EAF4" color="#7A5090" border="#D8C8E8"
        />
        <StatCard
          label="使用中"
          value={stats?.in_use_count ?? 0}
          bg="#E8F0FB" color="#3A68B0" border="#C4D8F4"
        />
        <StatCard
          label="即將過期"
          value={stats?.expiring_soon_count ?? 0}
          bg="#FDF0E8" color="#C06030" border="#F0D4B8"
        />
        <StatCard
          label="已用完"
          value={stats?.finished_count ?? 0}
          bg="#E8F4EC" color="#2E7A4A" border="#B8DEC4"
        />
      </div>

      {/* Expiring soon list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="fini-section-title">即將過期</h2>
          <Link href="/products?filter=expiring" className="fini-section-link">
            查看全部 →
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-caption" style={{ color: '#9A7080' }}>
              {(stats?.total_count ?? 0) === 0
                ? '尚未新增任何產品，請點擊「新增產品」開始。'
                : '目前沒有即將過期的產品，請繼續保持。✨'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <ProductRow key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label, value, bg, color, border,
}: {
  label: string; value: number; bg: string; color: string; border: string;
}) {
  return (
    <div
      className="rounded-md p-4"
      style={{ background: bg, border: `0.5px solid ${border}` }}
    >
      <div
        className="font-display leading-none mb-1"
        style={{ fontSize: 32, color, fontWeight: 500 }}
      >
        {value}
      </div>
      <div className="text-micro" style={{ color, opacity: 0.75 }}>{label}</div>
    </div>
  );
}

function ProductRow({ product }: { product: ProductWithExpiry }) {
  const status = getExpiryStatus(product.days_until_expiry);
  const statusColor = STATUS_COLORS[status];

  return (
    <Link
      href={`/products/${product.id}`}
      className="card p-3 flex items-center gap-3 hover:shadow-float transition-shadow"
    >
      {/* Thumbnail */}
      {product.photo_url ? (
        <img
          src={product.photo_url}
          alt={product.name}
          className="flex-shrink-0 rounded object-cover"
          style={{ width: 44, height: 44 }}
        />
      ) : (
        <div
          className="flex-shrink-0 rounded flex items-center justify-center font-display text-title"
          style={{
            width: 44, height: 44,
            backgroundColor: product.category_color ?? '#E8E0E4',
            color: '#5A4050',
            fontSize: 18,
          }}
        >
          {product.name.slice(0, 1)}
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="text-body font-medium truncate" style={{ color: '#1A1218' }}>
          {product.name}
        </div>
        <div className="text-micro truncate" style={{ color: '#9A7080' }}>
          {product.brand ?? product.category_name ?? '—'}
        </div>
      </div>

      {/* Expiry badge */}
      <div className={`text-caption font-medium px-2.5 py-1 rounded flex-shrink-0 ${statusColor}`}>
        {formatDaysLabel(product.days_until_expiry)}
      </div>
    </Link>
  );
}
