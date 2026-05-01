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
    <main className="public-page">
      <section className="public-hero">
        <div>
          <h1>{store.name}</h1>

          <div className="public-meta">
            {store.location ? <span>{store.location}</span> : null}
            {store.owner_phone ? <span>{store.owner_phone}</span> : null}
          </div>
        </div>

        {store.promo_banner ? (
          <div className="promo-banner">
            {store.promo_banner}
          </div>
        ) : null}
      </section>

      <section className="public-search-card">
        <label htmlFor="menu-search">Search items</label>
        <input
          id="menu-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by item name"
          autoComplete="off"
        />
      </section>

      <section className="public-products">
        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            No matching items found.
          </div>
        ) : (
          filteredProducts.map((product) => (
            <article className={`public-product-card ${!product.in_stock ? 'is-out' : ''}`} key={product.id}>
              <div className="public-product-image-wrap">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="public-product-image"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="public-product-no-image">
                    No Image
                  </div>
                )}

                {!product.in_stock ? (
                  <div className="stock-overlay">
                    Out of Stock
                  </div>
                ) : null}
              </div>

              <div className="public-product-body">
                <div className="public-badges">
                  {product.is_featured ? <span className="badge promo">FEATURED</span> : null}
                  {product.is_best_seller ? <span className="badge best">BEST SELLER</span> : null}
                  {product.promo_label && product.promo_label !== 'none' ? (
                    <span className="badge promo">{product.promo_label}</span>
                  ) : null}
                  {product.is_combo ? <span className="badge combo">COMBO</span> : null}
                </div>

                <div className="public-product-main">
                  <h2>{product.name}</h2>
                  <strong>{money(product.price)}</strong>
                </div>

                {product.description ? (
                  <p>{product.description}</p>
                ) : null}

                <div className={product.in_stock ? 'stock-text ok' : 'stock-text warn'}>
                  {product.in_stock ? 'In Stock' : 'Out of Stock'}
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
