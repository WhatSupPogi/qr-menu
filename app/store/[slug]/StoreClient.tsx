'use client';

import { useMemo, useState } from 'react';

type StoreData = {
  id: string;
  name: string;
  slug: string;
  owner_phone: string | null;
  location: string | null;
  status: string;
  promo_banner?: string | null;
};

type ProductData = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  in_stock: boolean;
  is_best_seller: boolean;
  is_featured: boolean;
  promo_label: string;
  is_combo: boolean;
  description: string | null;
  display_order: number;
  created_at: string;
};

function money(value: number) {
  return `₱${Number(value || 0).toFixed(2)}`;
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f1f5f9',
    color: '#0f172a',
    padding: '16px',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
  },
  shell: {
    width: '100%',
    maxWidth: '1100px',
    margin: '0 auto'
  },
  hero: {
    background: '#0f172a',
    color: 'white',
    borderRadius: '28px',
    padding: '24px',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)'
  },
  eyebrow: {
    margin: 0,
    color: '#bae6fd',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.22em',
    textTransform: 'uppercase'
  },
  title: {
    margin: '12px 0 0',
    fontSize: 'clamp(34px, 9vw, 56px)',
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: '-0.04em'
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '16px'
  },
  metaPill: {
    background: 'rgba(255,255,255,0.12)',
    color: '#e2e8f0',
    borderRadius: '999px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: 700
  },
  promo: {
    marginTop: '18px',
    background: '#0284c7',
    borderRadius: '18px',
    padding: '14px 16px',
    color: '#ffffff',
    fontWeight: 900,
    fontSize: '17px',
    boxShadow: '0 10px 25px rgba(2,132,199,0.22)'
  },
  searchBox: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    marginTop: '16px',
    background: 'rgba(255,255,255,0.96)',
    border: '1px solid #e2e8f0',
    borderRadius: '22px',
    padding: '12px',
    boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
    backdropFilter: 'blur(8px)'
  },
  searchInput: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: '18px',
    padding: '15px 16px',
    fontSize: '18px',
    fontWeight: 700,
    outline: 'none',
    background: '#ffffff',
    color: '#0f172a'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: '16px',
    marginTop: '18px'
  },
  empty: {
    background: '#ffffff',
    border: '1px dashed #cbd5e1',
    borderRadius: '24px',
    padding: '32px',
    textAlign: 'center',
    color: '#64748b',
    fontWeight: 800
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '26px',
    overflow: 'hidden',
    boxShadow: '0 10px 28px rgba(15,23,42,0.08)'
  },
  cardOut: {
    opacity: 0.58
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4 / 3',
    background: '#e2e8f0',
    overflow: 'hidden'
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },
  noImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    fontWeight: 800
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(15,23,42,0.68)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 900
  },
  body: {
    padding: '16px'
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px'
  },
  badge: {
    borderRadius: '999px',
    padding: '7px 10px',
    fontSize: '11px',
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: '0.03em'
  },
  featuredBadge: {
    background: '#0f172a',
    color: '#ffffff'
  },
  bestBadge: {
    background: '#fef3c7',
    color: '#92400e'
  },
  promoBadge: {
    background: '#ffe4e6',
    color: '#be123c'
  },
  comboBadge: {
    background: '#e0f2fe',
    color: '#0369a1'
  },
  productHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px'
  },
  productName: {
    margin: 0,
    fontSize: '22px',
    lineHeight: 1.12,
    fontWeight: 900,
    letterSpacing: '-0.02em'
  },
  price: {
    flexShrink: 0,
    background: '#f1f5f9',
    borderRadius: '16px',
    padding: '10px 12px',
    fontSize: '18px',
    fontWeight: 900
  },
  description: {
    margin: '12px 0 0',
    color: '#475569',
    fontSize: '15px',
    lineHeight: 1.45
  },
  stock: {
    display: 'inline-flex',
    marginTop: '14px',
    borderRadius: '999px',
    padding: '7px 10px',
    fontSize: '12px',
    fontWeight: 900
  },
  inStock: {
    background: '#dcfce7',
    color: '#15803d'
  },
  outStock: {
    background: '#ffe4e6',
    color: '#be123c'
  }
};

export default function StoreClient({
  store,
  products
}: {
  store: StoreData;
  products: ProductData[];
}) {
  const [search, setSearch] = useState('');

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return products;

    return products.filter((product) => product.name.toLowerCase().includes(keyword));
  }, [products, search]);

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <header style={styles.hero}>
          <p style={styles.eyebrow}>QR Menu</p>
          <h1 style={styles.title}>{store.name}</h1>

          <div style={styles.meta}>
            {store.location ? <span style={styles.metaPill}>{store.location}</span> : null}
            {store.owner_phone ? <span style={styles.metaPill}>{store.owner_phone}</span> : null}
          </div>

          {store.promo_banner ? (
            <div style={styles.promo}>{store.promo_banner}</div>
          ) : null}
        </header>

        <section style={styles.searchBox}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by item name"
            autoComplete="off"
            style={styles.searchInput}
          />
        </section>

        <section style={styles.grid}>
          {filteredProducts.length === 0 ? (
            <div style={styles.empty}>No matching items found.</div>
          ) : (
            filteredProducts.map((product) => (
              <article
                key={product.id}
                style={{
                  ...styles.card,
                  ...(!product.in_stock ? styles.cardOut : {})
                }}
              >
                <div style={styles.imageWrap}>
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={styles.image}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div style={styles.noImage}>No Image</div>
                  )}

                  {!product.in_stock ? (
                    <div style={styles.overlay}>Out of Stock</div>
                  ) : null}
                </div>

                <div style={styles.body}>
                  <div style={styles.badgeRow}>
                    {product.is_featured ? (
                      <span style={{ ...styles.badge, ...styles.featuredBadge }}>FEATURED</span>
                    ) : null}

                    {product.is_best_seller ? (
                      <span style={{ ...styles.badge, ...styles.bestBadge }}>BEST SELLER</span>
                    ) : null}

                    {product.promo_label && product.promo_label !== 'none' ? (
                      <span style={{ ...styles.badge, ...styles.promoBadge }}>
                        {product.promo_label}
                      </span>
                    ) : null}

                    {product.is_combo ? (
                      <span style={{ ...styles.badge, ...styles.comboBadge }}>COMBO</span>
                    ) : null}
                  </div>

                  <div style={styles.productHead}>
                    <h2 style={styles.productName}>{product.name}</h2>
                    <strong style={styles.price}>{money(product.price)}</strong>
                  </div>

                  {product.description ? (
                    <p style={styles.description}>{product.description}</p>
                  ) : null}

                  <div
                    style={{
                      ...styles.stock,
                      ...(product.in_stock ? styles.inStock : styles.outStock)
                    }}
                  >
                    {product.in_stock ? 'In Stock' : 'Out of Stock'}
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
