import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus, AlertTriangle, Package, Clock, CheckCircle2 } from 'lucide-react';
import { formatDaysLabel, getExpiryStatus, STATUS_COLORS } from '@/lib/utils';
import type { ProductWithExpiry } from '@/types/database';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch stats
  const { data: statsData } = await supabase.rpc('user_product_stats', {
    target_user_id: user.id,
  });
  const stats = statsData?.[0];

  // Fetch expiring-soon products (next 30 days, not finished)
  const { data: expiringSoon } = await supabase
    .from('products_with_expiry')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['unopened', 'in_use'])
    .not('days_until_expiry', 'is', null)
    .lte('days_until_expiry', 30)
    .order('days_until_expiry', { ascending: true })
    .limit(5);

  const products = (expiringSoon as ProductWithExpiry[] | null) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-heading text-ink-900">你好</h1>
          <p className="text-caption text-ink-500">睇下你嘅美容倉庫</p>
        </div>
        <Link href="/products/scan" className="btn-primary">
          <Plus className="w-4 h-4 mr-1" />
          加產品
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Package className="w-4 h-4" />}
          label="總數"
          value={stats?.total_count ?? 0}
          color="bg-ink-100 text-ink-700"
        />
        <StatCard
          icon={<Clock className="w-4 h-4" />}
          label="使用中"
          value={stats?.in_use_count ?? 0}
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="快過期"
          value={stats?.expiring_soon_count ?? 0}
          color="bg-amber-50 text-amber-700"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="已用完"
          value={stats?.finished_count ?? 0}
          color="bg-green-50 text-green-700"
        />
      </div>

      {/* Expiring soon */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-title text-ink-900">就嚟過期</h2>
          <Link href="/products?filter=expiring" className="text-caption text-brand-600 hover:text-brand-700">
            睇晒 →
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-caption text-ink-500">
              {stats?.total_count === 0
                ? '仲未加產品。撳「加產品」開始～'
                : '未有快過期嘅產品，繼續保持 ✨'}
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
  icon,
  label,
  value,
  color,
}: {
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
        <div
          className="w-10 h-10 rounded flex-shrink-0"
          style={{ backgroundColor: product.category_color ?? '#EEEEEE' }}
        />
        <div className="min-w-0">
          <div className="text-body font-medium text-ink-900 truncate">
            {product.name}
          </div>
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
