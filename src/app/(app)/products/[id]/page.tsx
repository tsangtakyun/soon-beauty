import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, MapPin, Calendar, Clock, StickyNote, DollarSign } from 'lucide-react';
import { formatDate, formatDaysLabel, getExpiryStatus, STATUS_COLORS } from '@/lib/utils';
import type { ProductWithExpiry } from '@/types/database';
import ProductActions from '@/components/ProductActions';

type IngredientsAnalysis = {
  inci_list?: string[];
  key_ingredients?: { name: string; benefit: string; concern?: string }[];
  concerns?: string[];
  suitable_for?: string[];
  avoid_if?: string[];
  overall_rating?: 'gentle' | 'moderate' | 'active' | 'unknown';
};

const RATING_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  gentle:   { label: '溫和',   color: '#2E7A4A', bg: '#E8F4EC' },
  moderate: { label: '中等',   color: '#C06030', bg: '#FDF0E8' },
  active:   { label: '活性成份多', color: '#3A68B0', bg: '#E8F0FB' },
  unknown:  { label: '未知',   color: '#9A7080', bg: '#F0E8EC' },
};

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
  const ingredients = product.ingredients_analysis as IngredientsAnalysis | null;
  const ratingCfg = ingredients?.overall_rating ? RATING_CONFIG[ingredients.overall_rating] : null;

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
      <Link href="/products" className="inline-flex items-center gap-1 text-caption text-ink-500 hover:text-ink-800">
        <ArrowLeft className="w-4 h-4" />返回
      </Link>

      {/* Product header */}
      <div className="card overflow-hidden">
        {/* Photo */}
        {product.photo_url && (
          <div className="relative w-full" style={{ height: 220 }}>
            <Image
              src={product.photo_url}
              alt={product.name}
              fill
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
          </div>
        )}

        <div className="p-5"
          style={{
            background: product.category_color
              ? `linear-gradient(135deg, ${product.category_color}30, white)`
              : undefined,
          }}
        >
          <div className="flex items-start gap-4 mb-4">
            {!product.photo_url && (
              <div className="w-14 h-14 rounded-md flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: product.category_color ?? '#EEEEEE', fontFamily: "'Cormorant Garamond',serif",
                  fontSize: 24, color: '#5A4050' }}>
                {product.name.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-micro text-ink-500 mb-1">{product.category_name ?? '未分類'}</div>
              <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 400, color: '#1A1218', lineHeight: 1.2 }}>
                {product.name}
              </h1>
              {product.brand && <p className="text-caption mt-1" style={{ color: '#7A6068' }}>{product.brand}</p>}
            </div>
          </div>
          <div className={`inline-block px-3 py-1.5 rounded text-caption font-medium ${statusColor}`}>
            {formatDaysLabel(product.days_until_expiry)}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="card p-5 space-y-4">
        <InfoRow icon={<Clock className="w-4 h-4" />} label="狀態" value={statusLabel(product.status)} />
        {product.opened_date && (
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="開封日" value={formatDate(product.opened_date)} />
        )}
        {product.pao_months && (
          <InfoRow icon={<Clock className="w-4 h-4" />} label="PAO" value={`${product.pao_months} 個月`} />
        )}
        {product.expiry_date && (
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="包裝到期日" value={formatDate(product.expiry_date)} />
        )}
        {product.effective_expiry_date && (
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="實際到期日"
            value={formatDate(product.effective_expiry_date)} highlight />
        )}
        {product.location && (
          <InfoRow icon={<MapPin className="w-4 h-4" />} label="位置" value={product.location} />
        )}
        {(product as ProductWithExpiry & { price?: number; currency?: string }).price && (
          <InfoRow icon={<DollarSign className="w-4 h-4" />} label="購買價格"
            value={`${(product as ProductWithExpiry & { currency?: string }).currency ?? 'HKD'} ${(product as ProductWithExpiry & { price?: number }).price}`} />
        )}
        {product.notes && (
          <InfoRow icon={<StickyNote className="w-4 h-4" />} label="備註" value={product.notes} />
        )}
      </div>

      {/* Ingredients analysis */}
      {ingredients && (ingredients.key_ingredients?.length || ingredients.concerns?.length) ? (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, color: '#1A1218' }}>
              成份分析
            </h2>
            {ratingCfg && (
              <span className="text-micro px-2.5 py-1 rounded-full font-medium"
                style={{ background: ratingCfg.bg, color: ratingCfg.color }}>
                {ratingCfg.label}
              </span>
            )}
          </div>

          {/* Key ingredients */}
          {ingredients.key_ingredients && ingredients.key_ingredients.length > 0 && (
            <div className="space-y-2">
              <div className="text-micro font-medium" style={{ color: '#9A7080', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                主要成份
              </div>
              {ingredients.key_ingredients.map((ing, i) => (
                <div key={i} className="p-3 rounded-md" style={{ background: '#F5F0F2' }}>
                  <div className="text-caption font-medium" style={{ color: '#1A1218' }}>{ing.name}</div>
                  <div className="text-micro mt-0.5" style={{ color: '#7A6068' }}>{ing.benefit}</div>
                  {ing.concern && (
                    <div className="text-micro mt-1" style={{ color: '#C06030' }}>⚠️ {ing.concern}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Concerns */}
          {ingredients.concerns && ingredients.concerns.length > 0 && (
            <div className="p-3 rounded-md" style={{ background: '#FDF0E8', border: '0.5px solid #F0D4B8' }}>
              <div className="text-micro font-medium mb-1" style={{ color: '#C06030' }}>注意事項</div>
              <div className="text-caption" style={{ color: '#C06030' }}>
                {ingredients.concerns.join(' · ')}
              </div>
            </div>
          )}

          {/* Suitable for */}
          {ingredients.suitable_for && ingredients.suitable_for.length > 0 && (
            <div className="space-y-1">
              <div className="text-micro" style={{ color: '#9A7080' }}>適合膚質</div>
              <div className="flex flex-wrap gap-1.5">
                {ingredients.suitable_for.map((s) => (
                  <span key={s} className="text-micro px-2 py-0.5 rounded-full"
                    style={{ background: '#E8F4EC', color: '#2E7A4A' }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Avoid if */}
          {ingredients.avoid_if && ingredients.avoid_if.length > 0 && (
            <div className="space-y-1">
              <div className="text-micro" style={{ color: '#9A7080' }}>以下情況請避免</div>
              <div className="flex flex-wrap gap-1.5">
                {ingredients.avoid_if.map((s) => (
                  <span key={s} className="text-micro px-2 py-0.5 rounded-full"
                    style={{ background: '#FDF0E8', color: '#C06030' }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* INCI list */}
          {ingredients.inci_list && ingredients.inci_list.length > 0 && (
            <details className="group">
              <summary className="text-micro cursor-pointer" style={{ color: '#B09898' }}>
                查看完整成份表（{ingredients.inci_list.length} 項）
              </summary>
              <p className="text-micro mt-2 leading-relaxed" style={{ color: '#9A7080' }}>
                {ingredients.inci_list.join(', ')}
              </p>
            </details>
          )}
        </div>
      ) : null}

      {/* Actions */}
      <ProductActions product={product} />
    </div>
  );
}

function InfoRow({ icon, label, value, highlight }: {
  icon: React.ReactNode; label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded flex-shrink-0 flex items-center justify-center"
        style={{ background: '#F0E4E8', color: '#9A7080' }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-micro" style={{ color: '#9A7080' }}>{label}</div>
        <div className="text-body" style={{ color: highlight ? '#B06070' : '#1A1218', fontWeight: highlight ? 500 : 400 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { unopened: '未開封', in_use: '使用中', finished: '已用完', discarded: '已棄置' };
  return map[status] ?? status;
}
