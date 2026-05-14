'use client';

import { useMemo, useState } from 'react';

type StoreData = {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  status: string;
  promo_banner?: string | null;
  public_contact_enabled: boolean;
  public_contact_label: string | null;
  public_contact_type: string;
  public_contact_value: string | null;
};

type ProductData = {
  id: string;
  category_id: string | null;
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

type CategoryData = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
};

function money(value: number) {
  return `PHP ${Number(value || 0).toFixed(2)}`;
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #f7faf6 0%, #edf4ec 100%)',
    color: '#172019',
    padding: '12px',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
  },
  shell: {
    width: '100%',
    maxWidth: '980px',
    margin: '0 auto'
  },
  hero: {
    background: 'linear-gradient(135deg, #1f4233 0%, #2f6b4f 100%)',
    color: '#ffffff',
    borderRadius: '18px',
    padding: '22px',
    border: '1px solid rgba(255,255,255,0.14)',
    boxShadow: '0 18px 42px rgba(36, 75, 58, 0.24)'
  },
  eyebrow: {
    margin: 0,
    color: '#cde8d4',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase'
  },
  title: {
    margin: '12px 0 0',
    fontSize: '38px',
    lineHeight: 1.05,
    fontWeight: 900,
    letterSpacing: 0,
    overflowWrap: 'anywhere'
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '16px'
  },
  metaPill: {
    background: 'rgba(255,255,255,0.16)',
    color: '#edf7f0',
    borderRadius: '999px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: 700
  },
  promo: {
    marginTop: '18px',
    background: '#f0b45a',
    borderRadius: '14px',
    padding: '15px 16px',
    color: '#172019',
    fontWeight: 900,
    fontSize: '17px',
    lineHeight: 1.35,
    boxShadow: '0 12px 28px rgba(240,180,90,0.25)'
  },
  contactButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '16px',
    background: '#ffffff',
    color: '#244b3a',
    borderRadius: '999px',
    minHeight: '48px',
    padding: '13px 18px',
    fontWeight: 900,
    fontSize: '16px',
    textDecoration: 'none',
    boxShadow: '0 12px 26px rgba(23,32,25,0.16)'
  },
  searchBox: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    marginTop: '16px',
    background: 'rgba(255,255,255,0.96)',
    border: '1px solid #dfe5dd',
    borderRadius: '16px',
    padding: '12px',
    boxShadow: '0 8px 20px rgba(23,32,25,0.08)',
    backdropFilter: 'blur(8px)'
  },
  searchInput: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #ccd6cc',
    borderRadius: '12px',
    padding: '15px 16px',
    fontSize: '17px',
    fontWeight: 700,
    outline: 'none',
    background: '#ffffff',
    color: '#172019'
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    padding: '4px 0 2px',
    marginTop: '14px'
  },
  tab: {
    border: '1px solid #cbd5e1',
    borderRadius: '999px',
    minHeight: '40px',
    padding: '9px 14px',
    background: '#ffffff',
    color: '#33443a',
    fontWeight: 900,
    whiteSpace: 'nowrap',
    cursor: 'pointer'
  },
  tabActive: {
    borderColor: '#244b3a',
    background: '#244b3a',
    color: '#ffffff'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '14px',
    marginTop: '14px'
  },
  summary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginTop: '14px',
    color: '#536258',
    fontSize: '14px',
    fontWeight: 800
  },
  empty: {
    background: '#ffffff',
    border: '1px dashed #cbd5e1',
    borderRadius: '16px',
    padding: '32px',
    textAlign: 'center',
    color: '#64748b',
    fontWeight: 800
  },
  card: {
    background: '#ffffff',
    border: '1px solid #dfe5dd',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 12px 30px rgba(23,32,25,0.08)'
  },
  cardOut: {
    opacity: 0.58
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1 / 1',
    background: '#e7ede5',
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
    padding: '15px'
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
    letterSpacing: 0
  },
  featuredBadge: {
    background: '#244b3a',
    color: '#ffffff'
  },
  bestBadge: {
    background: '#fff2cc',
    color: '#7a4c0f'
  },
  promoBadge: {
    background: '#ffe4dc',
    color: '#9d3d2c'
  },
  comboBadge: {
    background: '#e4f4ea',
    color: '#286245'
  },
  productHead: {
    display: 'grid',
    gap: '10px'
  },
  productName: {
    margin: 0,
    fontSize: '21px',
    lineHeight: 1.15,
    fontWeight: 900,
    letterSpacing: 0
  },
  price: {
    background: '#eef7f0',
    borderRadius: '999px',
    padding: '10px 12px',
    fontSize: '18px',
    fontWeight: 900,
    width: 'fit-content'
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
    background: '#dff3e5',
    color: '#286245'
  },
  outStock: {
    background: '#ffe4e6',
    color: '#be123c'
  }
};

function defaultContactLabel(type: string) {
  if (type === 'messenger') return 'Message Us';
  if (type === 'facebook') return 'Visit Facebook';
  if (type === 'phone') return 'Call Store';
  return 'Contact Store';
}

function getContactLink(store: StoreData) {
  const type = store.public_contact_type;
  const value = (store.public_contact_value || '').trim();

  if (!store.public_contact_enabled || type === 'none' || !value) return null;

  return {
    href: type === 'phone' ? `tel:${value}` : value,
    label: (store.public_contact_label || '').trim() || defaultContactLabel(type),
    external: type !== 'phone'
  };
}

export default function StoreClient({
  store,
  products,
  categories
}: {
  store: StoreData;
  products: ProductData[];
  categories: CategoryData[];
}) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const contactLink = getContactLink(store);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const categoryFiltered = activeCategory === 'all'
      ? products
      : products.filter((product) => product.category_id === activeCategory);

    if (!keyword) return categoryFiltered;

    return categoryFiltered.filter((product) => product.name.toLowerCase().includes(keyword));
  }, [activeCategory, products, search]);

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <header style={styles.hero}>
          <p style={styles.eyebrow}>QR Menu</p>
          <h1 style={styles.title}>{store.name}</h1>

          <div style={styles.meta}>
            {store.location ? <span style={styles.metaPill}>{store.location}</span> : null}
          </div>

          {store.promo_banner ? (
            <div style={styles.promo}>{store.promo_banner}</div>
          ) : null}

          {contactLink ? (
            <a
              href={contactLink.href}
              target={contactLink.external ? '_blank' : undefined}
              rel={contactLink.external ? 'noreferrer' : undefined}
              style={styles.contactButton}
            >
              {contactLink.label}
            </a>
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

          {categories.length > 0 ? (
            <div style={styles.tabs}>
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                style={{
                  ...styles.tab,
                  ...(activeCategory === 'all' ? styles.tabActive : {})
                }}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  style={{
                    ...styles.tab,
                    ...(activeCategory === category.id ? styles.tabActive : {})
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <div style={styles.summary}>
          <span>{filteredProducts.length === 1 ? '1 item available' : `${filteredProducts.length} items available`}</span>
          {activeCategory !== 'all' ? <span>Filtered</span> : null}
        </div>

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
