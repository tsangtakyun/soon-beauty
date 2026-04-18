import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus, AlertTriangle, Package, Clock, CheckCircle2 } from 'lucide-react';
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

  // 即將過期：90日內
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-heading text-ink-900">您好</h1>
          <p className="text-caption text-ink-500">查看您的美容倉庫</p>
        </div>
        <Link href="/products/scan" className="btn-primary">
          <Plus className="w-4 h-4 mr-1" />
          新增產品
        </Link>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Package className="w-4 h-4" />}    label="總數"     value={stats?.total_count ?? 0}         color="bg-ink-100 text-ink-700" />
        <StatCard icon={<Clock className="w-4 h-4" />}      label="使用中"   value={stats?.in_use_count ?? 0}        color="bg-blue-50 text-blue-700" />
        <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="即將過期" value={stats?.expiring_soon_count ?? 0} color="bg-amber-50 text-amber-700" />
        <StatCard icon={<CheckCircle2 className="w-4 h-4" />}  label="已用完"   value={stats?.finished_count ?? 0}      color="bg-green-50 text-green-700" />
      </div>

      {/* 即將過期清單 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-title text-ink-900">即將過期</h2>
          <Link href="/products?filter=expiring" className="text-caption text-brand-600 hover:text-brand-700">
            查看全部 →
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-caption text-ink-500">
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

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="card p-4">
      <div className={`inline-flex w-8 h-8 rounded items-center justify-center mb-2 ${color}`}>
        {icon}
      </div>
      <div className="font-display text-heading text-ink-900 leading-none">{value}</div>
      <div className="text-micro text-ink-500 mt-1">{label}</div>
    </div>
  );
}

function ProductRow({ product }: { product: ProductWithExpiry }) {
  const status = getExpiryStatus(product.days_until_expiry);
  const statusColor = STATUS_COLORS[status];

  return (
    <Link
      href={`/products/${product.id}`}
      className="card p-4 flex items-center justify-between hover:shadow-float transition-shadow"
    >
      <div className="flex items-center gap-3 min-w-0">
        {product.photo_url ? (
          <img
            src={product.photo_url}
            alt={product.name}
            className="w-10 h-10 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center font-display text-title text-ink-700"
            style={{ backgroundColor: product.category_color ?? '#EEEEEE' }}
          >
            {product.name.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-body font-medium text-ink-900 truncate">{product.name}</div>
          <div className="text-micro text-ink-500 truncate">
            {product.brand ?? product.category_name ?? '—'}
          </div>
        </div>
      </div>
      <div className={`text-caption font-medium px-2.5 py-1 rounded ${statusColor} flex-shrink-0 ml-3`}>
        {formatDaysLabel(product.days_until_expiry)}
      </div>
    </Link>
  );
}
