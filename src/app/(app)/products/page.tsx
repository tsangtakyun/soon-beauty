import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus, Search, FlaskConical } from 'lucide-react';
import { formatDaysLabel, getExpiryStatus, STATUS_COLORS } from '@/lib/utils';
import type { ProductWithExpiry, Category } from '@/types/database';

type SearchParams = {
  filter?: 'all' | 'expiring' | 'expired' | 'in_use' | 'unopened';
  category?: string;
  group?: string;
};

const GROUP_LABELS: Record<string, string> = {
  face:   '面部護理',
  makeup: '彩妝',
  body:   '身體護理',
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filter     = params.filter   ?? 'all';
  const categoryId = params.category;
  const groupFilter = params.group;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch all categories (to build group structure)
  const { data: allCats } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order');
  const cats = (allCats as Category[] | null) ?? [];

  // Parents and children
  const parents  = cats.filter((c) => !c.parent_id);
  const children = cats.filter((c) =>  c.parent_id);

  // Fetch products with expiry
  let query = supabase
    .from('products_with_expiry')
    .select('*')
    .eq('user_id', user.id);

  if (filter === 'expiring') {
    query = query.in('status', ['unopened','in_use']).not('days_until_expiry','is',null).lte('days_until_expiry',90).gte('days_until_expiry',0);
  } else if (filter === 'expired') {
    query = query.in('status', ['unopened','in_use']).not('days_until_expiry','is',null).lt('days_until_expiry',0);
  } else if (filter === 'in_use') {
    query = query.eq('status','in_use');
  } else if (filter === 'unopened') {
    query = query.eq('status','unopened');
  } else {
    query = query.in('status', ['unopened','in_use']);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  query = query.order('days_until_expiry', { ascending: true, nullsFirst: false });

  const { data: products } = await query;
  const list = (products as ProductWithExpiry[] | null) ?? [];

  // Figure out which category IDs have products (via primary OR tags)
  const catIdsWithProducts = new Set<string>();
  list.forEach((p) => {
    if (p.category_id) catIdsWithProducts.add(p.category_id);
    const tags = (p as typeof p & { tags?: string[] | null }).tags;
    if (tags) tags.forEach((t) => catIdsWithProducts.add(t));
  });

  // When filtering by category, also include products where it's a tag
  const filteredList = categoryId
    ? list.filter((p) => {
        if (p.category_id === categoryId) return true;
        const tags = (p as typeof p & { tags?: string[] | null }).tags;
        return tags?.includes(categoryId) ?? false;
      })
    : list;

  // Build group → children structure, only showing cats with products (unless filtered)
  const showAll = filter !== 'all' || categoryId;
  const groups = parents
    .filter((p) => p.group_name) // only real group parents
    .filter((p) => !groupFilter || p.group_name === groupFilter)
    .map((parent) => {
      const kids = children.filter((c) => {
        if (c.parent_id !== parent.id) return false;
        // hide empty categories unless a filter is active
        if (!showAll && !catIdsWithProducts.has(c.id)) return false;
        return true;
      });
      return { parent, kids };
    })
    .filter((g) => g.kids.length > 0 || showAll);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="fini-dash-title">我的產品</h1>
          <p className="fini-dash-sub">共 {list.length} 件產品</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/analyze" className="fini-btn-analyze">
            <FlaskConical style={{ width: 14, height: 14 }} />
            分析
          </Link>
          <Link href="/products/scan" className="fini-btn-add">
            <Plus style={{ width: 14, height: 14 }} />
            新增
          </Link>
        </div>
      </div>

      {/* Expiry filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        <FilterPill href="/products"                  label="全部"     active={filter==='all' && !categoryId && !groupFilter} />
        <FilterPill href="/products?filter=expiring"  label="即將過期" active={filter==='expiring'} />
        <FilterPill href="/products?filter=expired"   label="已過期"   active={filter==='expired'} />
        <FilterPill href="/products?filter=in_use"    label="使用中"   active={filter==='in_use'} />
        <FilterPill href="/products?filter=unopened"  label="未開封"   active={filter==='unopened'} />
      </div>

      {/* Group filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        <FilterPill href="/products" label="所有類別" active={!groupFilter} small />
        {Object.entries(GROUP_LABELS).map(([key, label]) => (
          <FilterPill
            key={key}
            href={`/products?group=${key}`}
            label={label}
            active={groupFilter === key}
            small
          />
        ))}
      </div>

      {/* Product list — grouped */}
      {list.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-ink-100 mx-auto mb-4 flex items-center justify-center">
            <Search className="w-6 h-6 text-ink-400" />
          </div>
          <p className="text-body mb-1" style={{ color: '#1A1218' }}>沒有符合條件的產品</p>
          <p className="text-caption mb-4" style={{ color: '#9A7080' }}>
            {filter === 'all' ? '請新增您的第一件產品' : '請嘗試其他篩選條件'}
          </p>
          {filter === 'all' && (
            <Link href="/products/scan" className="btn-primary">新增第一件產品</Link>
          )}
        </div>
      ) : filter === 'all' && !categoryId ? (
        // Grouped view
        <div className="space-y-6">
          {groups.map(({ parent, kids }) => {
            const groupProducts = filteredList.filter((p) => kids.some((k) => k.id === p.category_id ||
              ((p as typeof p & { tags?: string[] | null }).tags ?? []).includes(k.id)));
            if (groupProducts.length === 0 && !showAll) return null;
            return (
              <section key={parent.id}>
                {/* Group header */}
                <div
                  className="flex items-center gap-2 mb-2 px-1 py-1.5 rounded-md"
                  style={{ background: parent.color + '60' }}
                >
                  <span className="text-caption font-medium" style={{ color: '#1A1218', letterSpacing: '0.04em' }}>
                    {parent.name}
                  </span>
                  <span className="text-micro" style={{ color: '#9A7080' }}>
                    {groupProducts.length} 件
                  </span>
                </div>

                {/* Sub-category chips with products */}
                <div className="flex gap-2 flex-wrap mb-3">
                  {kids
                    .filter((k) => catIdsWithProducts.has(k.id))
                    .map((k) => {
                      const count = list.filter((p) =>
                        p.category_id === k.id ||
                        ((p as typeof p & { tags?: string[] | null }).tags ?? []).includes(k.id)
                      ).length;
                      return (
                        <Link
                          key={k.id}
                          href={`/products?category=${k.id}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption transition-all ${
                            categoryId === k.id ? 'ring-2 ring-offset-1 ring-ink-400' : 'hover:opacity-80'
                          }`}
                          style={{ background: k.color, color: '#3A2830' }}
                        >
                          {k.name}
                          <span
                            className="text-micro rounded-full px-1.5"
                            style={{ background: 'rgba(0,0,0,0.1)' }}
                          >
                            {count}
                          </span>
                        </Link>
                      );
                    })}
                </div>

                {/* Products under this group — show if primary OR tag matches */}
                <div className="space-y-2">
                  {groupProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            );
          })}

          {/* Products with no category or unknown parent */}
          {(() => {
            const uncategorised = list.filter(
              (p) => !p.category_id || !kids_set(groups).has(p.category_id ?? '')
            );
            if (uncategorised.length === 0) return null;
            return (
              <section>
                <div className="flex items-center gap-2 mb-2 px-1 py-1.5 rounded-md" style={{ background: '#F0EEE8' }}>
                  <span className="text-caption font-medium" style={{ color: '#1A1218' }}>未分類</span>
                  <span className="text-micro" style={{ color: '#9A7080' }}>{uncategorised.length} 件</span>
                </div>
                <div className="space-y-2">
                  {uncategorised.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </section>
            );
          })()}
        </div>
      ) : (
        // Flat view (when filtered)
        <div className="space-y-2">
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

function kids_set(groups: { kids: Category[] }[]) {
  const s = new Set<string>();
  groups.forEach((g) => g.kids.forEach((k) => s.add(k.id)));
  return s;
}

function FilterPill({ href, label, active, small }: {
  href: string; label: string; active: boolean; small?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full whitespace-nowrap transition-colors ${
        small ? 'px-3 py-1 text-micro' : 'px-3.5 py-1.5 text-caption'
      } ${
        active
          ? 'text-white'
          : 'bg-white text-ink-700 border border-ink-200 hover:bg-ink-50'
      }`}
      style={active ? { background: '#1A1218' } : {}}
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
      className="card p-3 flex items-center gap-3 hover:shadow-float transition-shadow"
    >
      {product.photo_url ? (
        <img
          src={product.photo_url}
          alt={product.name}
          className="flex-shrink-0 rounded object-cover"
          style={{ width: 44, height: 44 }}
        />
      ) : (
        <div
          className="flex-shrink-0 rounded flex items-center justify-center font-display"
          style={{
            width: 44, height: 44,
            background: product.category_color ?? '#E8E0E4',
            color: '#5A4050', fontSize: 18,
          }}
        >
          {product.name.slice(0, 1)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="text-body font-medium truncate" style={{ color: '#1A1218' }}>
          {product.name}
        </div>
        <div className="text-micro truncate" style={{ color: '#9A7080' }}>
          {[product.brand, product.category_name].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>

      <div className={`text-caption font-medium px-2.5 py-1 rounded flex-shrink-0 ${statusColor}`}>
        {formatDaysLabel(product.days_until_expiry)}
      </div>
    </Link>
  );
}
