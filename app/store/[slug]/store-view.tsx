'use client';

import { useMemo, useState } from 'react';

type StoreData = {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  plan_type: string;
  location: string;
  status: string;
};

type ProductData = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  in_stock: boolean;
};

export default function StoreView({
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
    <main className="container store-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <h1 className="hero-title">{store.name}</h1>
          <p className="hero-text">{store.location}</p>
        </div>
        <div className="search-box">
          <label htmlFor="store-search" className="sr-only">Search items</label>
          <input
            id="store-search"
            className="input search-input"
            placeholder="Search items"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section className="section-head">
        <div>
          <h2 className="section-title">Items</h2>
          <p className="muted section-text">
            {filteredProducts.length} item{filteredProducts.length === 1 ? '' : 's'} shown
          </p>
        </div>
      </section>

      {filteredProducts.length === 0 ? (
        <div className="card empty-state">
          <strong>No matching items found.</strong>
          <p className="muted" style={{ margin: 0 }}>Try a different product name.</p>
        </div>
      ) : (
        <div className="products public-products">
          {filteredProducts.map((product) => (
            <article className="product-card public-card" key={product.id}>
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="product-image"
                />
              ) : (
                <div className="product-image product-image-empty">
                  <span className="muted">No Image</span>
                </div>
              )}

              <div className="product-body">
                <div className="product-top">
                  <h3 className="product-name">{product.name}</h3>
                  <div className="price-tag">₱ {Number(product.price).toFixed(2)}</div>
                </div>

                <div>
                  {product.in_stock ? (
                    <span className="badge ok">In Stock</span>
                  ) : (
                    <span className="badge warn">Out of Stock</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
