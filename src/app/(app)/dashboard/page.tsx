import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { Plus, FlaskConical } from 'lucide-react';
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

      {/* Lama greeting card */}
      <div className="fini-lama-greeting">
        <div className="fini-lama-greeting-img">
          <Image src="/lama.svg" alt="Lama" width={80} height={106} />
        </div>
        <div className="fini-lama-greeting-bubble">
          <p className="fini-lama-greeting-text">{lamaMsg}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 justify-end">
        <Link href="/analyze" className="fini-btn-analyze">
          <FlaskConical style={{ width: 14, height: 14 }} />
          分析成份
        </Link>
        <Link href="/products/scan" className="fini-btn-add">
          <Plus style={{ width: 14, height: 14 }} />
          新增產品
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="總數"     value={stats.total_count ?? 0}         bg="#F0EAF4" color="#7A5090" border="#D8C8E8"/>
        <StatCard label="使用中"   value={stats.in_use_count ?? 0}        bg="#E8F0FB" color="#3A68B0" border="#C4D8F4"/>
        <StatCard label="即將過期" value={stats.expiring_soon_count ?? 0} bg="#FDF0E8" color="#C06030" border="#F0D4B8"/>
        <StatCard label="已用完"   value={stats.finished_count ?? 0}      bg="#E8F4EC" color="#2E7A4A" border="#B8DEC4"/>
      </div>

      {/* Expiring soon */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="fini-section-title">即將過期</h2>
          <Link href="/products?filter=expiring" className="fini-section-link">查看全部 →</Link>
        </div>

        {products.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-caption" style={{ color: '#9A7080' }}>
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

function StatCard({ label, value, bg, color, border }: {
  label: string; value: number; bg: string; color: string; border: string;
}) {
  return (
    <div className="rounded-md p-4" style={{ background: bg, border: `0.5px solid ${border}` }}>
      <div className="font-display leading-none mb-1" style={{ fontSize: 32, color, fontWeight: 500 }}>{value}</div>
      <div className="text-micro" style={{ color, opacity: 0.75 }}>{label}</div>
    </div>
  );
}

function ProductRow({ product }: { product: ProductWithExpiry }) {
  const status = getExpiryStatus(product.days_until_expiry);
  const statusColor = STATUS_COLORS[status];
  return (
    <Link href={`/products/${product.id}`} className="card p-3 flex items-center gap-3 hover:shadow-float transition-shadow">
      {product.photo_url ? (
        <img src={product.photo_url} alt={product.name}
          className="flex-shrink-0 rounded object-cover" style={{ width: 44, height: 44 }} />
      ) : (
        <div className="flex-shrink-0 rounded flex items-center justify-center font-display"
          style={{ width: 44, height: 44, background: product.category_color ?? '#E8E0E4', color: '#5A4050', fontSize: 18 }}>
          {product.name.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-body font-medium truncate" style={{ color: '#1A1218' }}>{product.name}</div>
        <div className="text-micro truncate" style={{ color: '#9A7080' }}>
          {product.brand ?? product.category_name ?? '—'}
        </div>
      </div>
      <div className={`text-caption font-medium px-2.5 py-1 rounded flex-shrink-0 ${statusColor}`}>
        {formatDaysLabel(product.days_until_expiry)}
      </div>
    </Link>
  );
}
