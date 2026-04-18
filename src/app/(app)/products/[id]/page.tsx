import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, MapPin, Calendar, Clock, StickyNote } from 'lucide-react';
import { formatDate, formatDaysLabel, getExpiryStatus, STATUS_COLORS } from '@/lib/utils';
import type { ProductWithExpiry } from '@/types/database';
import ProductActions from '@/components/ProductActions';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('products_with_expiry')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!data) notFound();

  const product = data as ProductWithExpiry;
  const status = getExpiryStatus(product.days_until_expiry);
  const statusColor = STATUS_COLORS[status];

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-caption text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </Link>

      {/* Product header */}
      <div
        className="card p-6 relative overflow-hidden"
        style={{
          background: product.category_color
            ? `linear-gradient(135deg, ${product.category_color}40, white)`
            : undefined,
        }}
      >
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-md flex-shrink-0"
            style={{ backgroundColor: product.category_color ?? '#EEEEEE' }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-micro text-ink-500 mb-1">
              {product.category_name ?? '未分類'}
            </div>
            <h1 className="font-display text-heading text-ink-900 leading-tight">
              {product.name}
            </h1>
            {product.brand && (
              <p className="text-caption text-ink-600 mt-1">{product.brand}</p>
            )}
          </div>
        </div>

        <div className={`inline-block px-3 py-1.5 rounded text-caption font-medium ${statusColor}`}>
          {formatDaysLabel(product.days_until_expiry)}
        </div>
      </div>

      {/* Info grid */}
      <div className="card p-5 space-y-4">
        <InfoRow
          icon={<Clock className="w-4 h-4" />}
          label="狀態"
          value={statusLabel(product.status)}
        />

        {product.opened_date && (
          <InfoRow
            icon={<Calendar className="w-4 h-4" />}
            label="開封日"
            value={formatDate(product.opened_date)}
          />
        )}

        {product.pao_months && (
          <InfoRow
            icon={<Clock className="w-4 h-4" />}
            label="PAO"
            value={`${product.pao_months} 個月`}
          />
        )}

        {product.expiry_date && (
          <InfoRow
            icon={<Calendar className="w-4 h-4" />}
            label="包裝到期日"
            value={formatDate(product.expiry_date)}
          />
        )}

        {product.effective_expiry_date && (
          <InfoRow
            icon={<Calendar className="w-4 h-4" />}
            label="實際到期日"
            value={formatDate(product.effective_expiry_date)}
            highlight
          />
        )}

        {product.location && (
          <InfoRow
            icon={<MapPin className="w-4 h-4" />}
            label="位置"
            value={product.location}
          />
        )}

        {product.notes && (
          <InfoRow
            icon={<StickyNote className="w-4 h-4" />}
            label="備註"
            value={product.notes}
          />
        )}
      </div>

      {/* Actions */}
      <ProductActions product={product} />
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded bg-ink-100 text-ink-600 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-micro text-ink-500">{label}</div>
        <div className={`text-body ${highlight ? 'font-medium text-brand-600' : 'text-ink-900'}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case 'unopened': return '未開封';
    case 'in_use': return '使用中';
    case 'finished': return '已用完';
    case 'discarded': return '已棄置';
    default: return status;
  }
}
