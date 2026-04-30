'use client';

import { useMemo, useState } from 'react';

type StoreInfo = {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  plan_type: string;
  location: string;
  owner_phone: string;
  promo_banner: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  in_stock: boolean;
  is_best_seller: boolean;
  is_featured: boolean;
  promo_label: string;
  is_combo: boolean;
  description: string;
  display_order: number;
  created_at: string;
};

export default function StoreView({
  store,
  products
}: {
  store: StoreInfo;
  products: Product[];
}) {
  const [search, setSearch] = useState('');

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const sorted = [...products].sort((a, b) => {
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      if (a.is_best_seller !== b.is_best_seller) return a.is_best_seller ? -1 : 1;
      if (a.display_order !== b.display_order) return a.display_order - b.display_order;
      return String(b.created_at).localeCompare(String(a.created_at));
    });

    if (!keyword) return sorted;

    return sorted.filter((product) => product.name.toLowerCase().includes(keyword));
  }, [products, search]);

  return (
    <main className="store-page">
      <section className="store-hero">
        <div>
          <p className="eyebrow">QR Menu</p>
          <h1>{store.name}</h1>
          {store.location ? <p>{store.location}</p> : null}
        </div>
      </section>

      {store.promo_banner ? (
        <section className="promo-banner">
          {store.promo_banner}
        </section>
      ) : null}

      <section className="store-search">
        <label htmlFor="menu-search" className="sr-only">Search items</label>
        <input
          id="menu-search"
          className="input"
          placeholder="Search menu"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      {filteredProducts.length === 0 ? (
        <section className="empty-state">
          <strong>No matching items found.</strong>
          <p>Try another item name.</p>
        </section>
      ) : (
        <section className="menu-grid">
          {filteredProducts.map((product) => (
            <article className={`menu-card ${!product.in_stock ? 'is-muted' : ''}`} key={product.id}>
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="menu-image" />
              ) : (
                <div className="menu-image menu-image-empty">No Image</div>
              )}

              <div className="menu-content">
                <div className="badge-row">
                  {product.is_featured ? <span className="badge promo">FEATURED</span> : null}
                  {product.is_best_seller ? <span className="badge best">BEST SELLER</span> : null}
                  {product.promo_label && product.promo_label !== 'none' ? (
                    <span className="badge promo">{product.promo_label}</span>
                  ) : null}
                  {product.is_combo ? <span className="badge combo">COMBO</span> : null}
                  {!product.in_stock ? <span className="badge warn">Out of Stock</span> : null}
                </div>

                <h2>{product.name}</h2>

                {product.description ? (
                  <p className="menu-description">{product.description}</p>
                ) : null}

                <div className="menu-price">₱ {Number(product.price).toFixed(2)}</div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
