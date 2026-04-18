import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus, Search } from 'lucide-react';
import { formatDaysLabel, getExpiryStatus, STATUS_COLORS } from '@/lib/utils';
import type { ProductWithExpiry, Category } from '@/types/database';

type SearchParams = {
  filter?: 'all' | 'expiring' | 'expired' | 'in_use' | 'unopened';
  category?: string;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filter = params.filter ?? 'all';
  const categoryId = params.category;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Build query
  let query = supabase
    .from('products_with_expiry')
    .select('*')
    .eq('user_id', user.id);

  if (filter === 'expiring') {
    query = query
      .in('status', ['unopened', 'in_use'])
      .not('days_until_expiry', 'is', null)
      .lte('days_until_expiry', 30)
      .gte('days_until_expiry', 0);
  } else if (filter === 'expired') {
    query = query
      .in('status', ['unopened', 'in_use'])
      .not('days_until_expiry', 'is', null)
      .lt('days_until_expiry', 0);
  } else if (filter === 'in_use') {
    query = query.eq('status', 'in_use');
  } else if (filter === 'unopened') {
    query = query.eq('status', 'unopened');
  } else {
    query = query.in('status', ['unopened', 'in_use']);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  query = query.order('days_until_expiry', { ascending: true, nullsFirst: false });

  const { data: products } = await query;
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order');

  const list = (products as ProductWithExpiry[] | null) ?? [];
  const cats = (categories as Category[] | null) ?? [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-heading text-ink-900">我嘅產品</h1>
          <p className="text-caption text-ink-500">{list.length} 件產品</p>
        </div>
        <Link href="/products/scan" className="btn-primary">
          <Plus className="w-4 h-4 mr-1" />
          加產品
        </Link>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        <FilterPill href="/products" label="全部" active={filter === 'all' && !categoryId} />
        <FilterPill href="/products?filter=expiring" label="快過期" active={filter === 'expiring'} />
        <FilterPill href="/products?filter=expired" label="已過期" active={filter === 'expired'} />
        <FilterPill href="/products?filter=in_use" label="使用中" active={filter === 'in_use'} />
        <FilterPill href="/products?filter=unopened" label="未開封" active={filter === 'unopened'} />
      </div>

      {/* Category chips */}
      {cats.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {cats.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.id}`}
              className={`
                inline-flex items-center px-3 py-1.5 rounded-full text-caption font-medium
                whitespace-nowrap transition-all
                ${categoryId === cat.id
                  ? 'ring-2 ring-offset-1 ring-ink-400'
                  : 'hover:opacity-80'
                }
              `}
              style={{
                backgroundColor: cat.color,
                color: '#35332E',
              }}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Product list */}
      {list.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-ink-100 mx-auto mb-4 flex items-center justify-center">
            <Search className="w-6 h-6 text-ink-400" />
          </div>
          <p className="text-body text-ink-700 mb-1">未有產品符合條件</p>
          <p className="text-caption text-ink-500 mb-4">
            {filter === 'all' ? '開始加你第一件產品' : '試下揀其他filter'}
          </p>
          {filter === 'all' && (
            <Link href="/products/new" className="btn-primary">
              加第一件產品
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        inline-flex items-center px-3.5 py-1.5 rounded-full text-caption font-medium
        whitespace-nowrap transition-colors
        ${active
          ? 'bg-ink-900 text-white'
          : 'bg-white text-ink-700 border border-ink-200 hover:bg-ink-50'
        }
      `}
    >
      {label}
    </Link>
  );
}

function ProductCard({ product }: { product: ProductWithExpiry }) {
  const status = getExpiryStatus(product.days_until_expiry);
  const statusColor = STATUS_COLORS[status];

  return (
    <Link
      href={`/products/${product.id}`}
      className="card p-4 flex items-center gap-3 hover:shadow-float transition-shadow"
    >
      <div
        className="w-12 h-12 rounded flex-shrink-0 flex items-center justify-center text-ink-700 font-display text-title"
        style={{ backgroundColor: product.category_color ?? '#EEEEEE' }}
      >
        {product.name.slice(0, 1)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-body font-medium text-ink-900 truncate">
            {product.name}
          </span>
          {product.status === 'in_use' && (
            <span className="text-micro px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded flex-shrink-0">
              使用中
            </span>
          )}
          {product.status === 'unopened' && (
            <span className="text-micro px-1.5 py-0.5 bg-ink-100 text-ink-600 rounded flex-shrink-0">
              未開封
            </span>
          )}
        </div>
        <div className="text-micro text-ink-500 truncate">
          {[product.brand, product.category_name].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>

      <div className={`text-caption font-medium px-2.5 py-1 rounded ${statusColor} flex-shrink-0`}>
        {formatDaysLabel(product.days_until_expiry)}
      </div>
    </Link>
  );
}
