import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus, Search, FlaskConical } from 'lucide-react';
import { formatDaysLabel, getExpiryStatus, STATUS_COLORS } from '@/lib/utils';
import type { ProductWithExpiry, Category } from '@/types/database';

type SearchParams = {
  filter?: 'all' | 'expiring' | 'expired' | 'in_use' | 'unopened';
  category?: string;
  group?: string;
  sort?: 'expiry' | 'newest' | 'name';
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
  const filter      = params.filter   ?? 'all';
  const categoryId  = params.category;
  const groupFilter = params.group;
  const sort        = params.sort ?? 'expiry';

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

  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (sort === 'name') {
    query = query.order('name', { ascending: true });
  } else {
    query = query.order('days_until_expiry', { ascending: true, nullsFirst: false });
  }

  const { data: products } = await query;
  const list = (products as ProductWithExpiry[] | null) ?? [];

  const rawParams: Record<string, string | undefined> = {
    filter: filter !== 'all' ? filter : undefined,
    category: categoryId,
    group: groupFilter,
    sort: sort !== 'expiry' ? sort : undefined,
  };
  const catIdsWithProducts = new Set<string>();
  list.forEach((p) => {
    if (p.category_id) catIdsWithProducts.add(p.category_id);
    if (p.tags) p.tags.forEach((t: string) => catIdsWithProducts.add(t));
  });

  // When filtering by category, also include products where it's a tag
  const filteredList = categoryId
    ? list.filter((p) => {
        if (p.category_id === categoryId) return true;
        return p.tags?.includes(categoryId) ?? false;
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
      <section className="fini-page-hero fini-page-hero-compact">
        <div className="fini-page-hero-copy">
          <p className="fini-section-kicker">Beauty Library</p>
          <h1 className="fini-dash-title">我的產品</h1>
          <p className="fini-dash-sub">共 {list.length} 件產品，按分類、狀態同節奏慢慢整理。</p>
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
      </section>

      <div className="fini-section-panel space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        <FilterPill href="/products"                  label="全部"     active={filter==='all' && !categoryId && !groupFilter} />
        <FilterPill href="/products?filter=expiring"  label="即將過期" active={filter==='expiring'} />
        <FilterPill href="/products?filter=expired"   label="已過期"   active={filter==='expired'} />
        <FilterPill href="/products?filter=in_use"    label="使用中"   active={filter==='in_use'} />
        <FilterPill href="/products?filter=unopened"  label="未開封"   active={filter==='unopened'} />
      </div>

      <div className="flex gap-2 items-center overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        <span className="text-micro flex-shrink-0" style={{ color: '#8D786B' }}>排序：</span>
        <FilterPill href={buildHref(rawParams, { sort: 'expiry' })}   label="快過期優先" active={sort === 'expiry'} small />
        <FilterPill href={buildHref(rawParams, { sort: 'newest' })}   label="最新加入"   active={sort === 'newest'} small />
        <FilterPill href={buildHref(rawParams, { sort: 'name' })}     label="名稱"       active={sort === 'name'}   small />
      </div>

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
      </div>

      {list.length === 0 ? (
        <div className="fini-empty-state p-12 text-center">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#F2E6D9' }}>
            <Search className="w-6 h-6" style={{ color: '#8A6A52' }} />
          </div>
          <p className="text-body mb-1" style={{ color: '#2F2620' }}>沒有符合條件的產品</p>
          <p className="text-caption mb-4" style={{ color: '#8D786B' }}>
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
            const groupProducts = filteredList.filter((p) => kids.some((k) =>
              k.id === p.category_id || (p.tags ?? []).includes(k.id)
            ));
            if (groupProducts.length === 0 && !showAll) return null;
            return (
              <section key={parent.id}>
                <div
                  className="fini-group-header"
                  style={{ background: `linear-gradient(180deg, ${parent.color}55 0%, #fffaf5 100%)` }}
                >
                  <span className="text-caption font-medium" style={{ color: '#2F2620', letterSpacing: '0.04em' }}>
                    {parent.name}
                  </span>
                  <span className="text-micro" style={{ color: '#8D786B' }}>
                    {groupProducts.length} 件
                  </span>
                </div>

                <div className="flex gap-2 flex-wrap mb-3">
                  {kids
                    .filter((k) => catIdsWithProducts.has(k.id))
                    .map((k) => {
                      const count = list.filter((p) =>
                        p.category_id === k.id || (p.tags ?? []).includes(k.id)
                      ).length;
                      return (
                        <Link
                          key={k.id}
                          href={`/products?category=${k.id}`}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-caption transition-all ${
                            categoryId === k.id ? 'ring-2 ring-offset-1 ring-[#B79572]' : 'hover:opacity-80'
                          }`}
                          style={{ background: `${k.color}B0`, color: '#4A372E', border: '1px solid rgba(255,255,255,0.55)' }}
                        >
                          {k.name}
                          <span
                            className="text-micro rounded-full px-1.5"
                            style={{ background: 'rgba(255,255,255,0.55)' }}
                          >
                            {count}
                          </span>
                        </Link>
                      );
                    })}
                </div>

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
                <div className="fini-group-header" style={{ background: 'linear-gradient(180deg, #F4ECE3 0%, #fffaf5 100%)' }}>
                  <span className="text-caption font-medium" style={{ color: '#2F2620' }}>未分類</span>
                  <span className="text-micro" style={{ color: '#8D786B' }}>{uncategorised.length} 件</span>
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

function buildHref(current: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const merged = { ...current, ...overrides };
  const params = Object.entries(merged)
    .filter(([, v]) => v !== undefined && v !== 'expiry') // 'expiry' is default, omit it
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `/products${params ? `?${params}` : ''}`;
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
      className={`inline-flex items-center rounded-full whitespace-nowrap transition-colors border ${
        small ? 'px-3 py-1 text-micro' : 'px-3.5 py-1.5 text-caption'
      } ${
        active
          ? 'text-white'
          : 'bg-white text-ink-700 border-[#E7D8CA] hover:bg-[#FBF4EA]'
      }`}
      style={active ? { background: 'linear-gradient(180deg, #A67C52 0%, #8A6A52 100%)', borderColor: '#8A6A52' } : { color: '#6E594B' }}
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
      className="fini-product-row"
    >
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
          style={{
            width: 52, height: 52,
            background: product.category_color ?? '#E8E0E4',
            color: '#5A4050', fontSize: 18,
          }}
        >
          {product.name.slice(0, 1)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="text-body font-medium truncate" style={{ color: '#2F2620' }}>
          {product.name}
        </div>
        <div className="text-micro truncate" style={{ color: '#8D786B' }}>
          {[product.brand, product.category_name].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>

      <div className={`text-caption font-medium px-3 py-1.5 rounded-full flex-shrink-0 ${statusColor}`}>
        {formatDaysLabel(product.days_until_expiry)}
      </div>
    </Link>
  );
}
