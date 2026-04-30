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

function formatPrice(price: number) {
  return `₱ ${Number(price || 0).toFixed(2)}`;
}

function getBusinessLabel(type: string) {
  if (type === 'restaurant') return 'Restaurant Menu';
  return 'Sari-Sari Store Menu';
}

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

  const featuredCount = products.filter((item) => item.is_featured || item.is_best_seller).length;

  return (
    <main className="modern-store-page">
      <section className="modern-store-hero">
        <div className="hero-glow" />

        <div className="hero-content">
          <div className="hero-chip">QR Menu</div>
          <h1>{store.name}</h1>
          <p className="hero-subtitle">{getBusinessLabel(store.business_type)}</p>

          <div className="hero-meta-row">
            {store.location ? <span>{store.location}</span> : null}
            {store.owner_phone ? <span>{store.owner_phone}</span> : null}
          </div>
        </div>
      </section>

      <section className="modern-store-body">
        {store.promo_banner ? (
          <div className="modern-promo-banner">
            <span className="promo-dot" />
            <strong>{store.promo_banner}</strong>
          </div>
        ) : null}

        <div className="modern-search-card">
          <div className="search-icon">⌕</div>
          <input
            aria-label="Search menu"
            placeholder="Search menu"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="modern-summary">
          <div>
            <strong>{filteredProducts.length}</strong>
            <span>Items</span>
          </div>
          <div>
            <strong>{featuredCount}</strong>
            <span>Special Picks</span>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <section className="modern-empty">
            <div className="empty-icon">🍽️</div>
            <h2>No matching items found.</h2>
            <p>Try another item name.</p>
          </section>
        ) : (
          <section className="modern-menu-list">
            {filteredProducts.map((product) => (
              <article className={`modern-menu-card ${!product.in_stock ? 'out-card' : ''}`} key={product.id}>
                <div className="modern-image-wrap">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} />
                  ) : (
                    <div className="modern-no-image">
                      <span>No Image</span>
                    </div>
                  )}

                  {!product.in_stock ? (
                    <div className="sold-out-cover">Out of Stock</div>
                  ) : null}
                </div>

                <div className="modern-card-content">
                  <div className="modern-badges">
                    {product.is_featured ? <span className="badge-featured">FEATURED</span> : null}
                    {product.is_best_seller ? <span className="badge-best">BEST SELLER</span> : null}
                    {product.promo_label && product.promo_label !== 'none' ? (
                      <span className={`badge-promo badge-${product.promo_label.toLowerCase()}`}>
                        {product.promo_label}
                      </span>
                    ) : null}
                    {product.is_combo ? <span className="badge-combo">COMBO</span> : null}
                  </div>

                  <div className="modern-name-row">
                    <h2>{product.name}</h2>
                    <div className="modern-price">{formatPrice(product.price)}</div>
                  </div>

                  {product.description ? (
                    <p className="modern-description">{product.description}</p>
                  ) : (
                    <p className="modern-description muted-description">Tap to view price and availability.</p>
                  )}

                  <div className="modern-status-row">
                    {product.in_stock ? (
                      <span className="stock-in">Available now</span>
                    ) : (
                      <span className="stock-out">Not available</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </section>

      <style jsx>{`
        .modern-store-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top right, rgba(37, 99, 235, 0.14), transparent 28rem),
            linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
          color: #0f172a;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .modern-store-hero {
          position: relative;
          overflow: hidden;
          padding: 28px 18px 24px;
          background:
            linear-gradient(135deg, #0f172a 0%, #172554 52%, #1d4ed8 100%);
          color: white;
          border-bottom-left-radius: 30px;
          border-bottom-right-radius: 30px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
        }

        .hero-glow {
          position: absolute;
          width: 180px;
          height: 180px;
          right: -40px;
          top: -60px;
          background: rgba(255, 255, 255, 0.18);
          border-radius: 999px;
          filter: blur(2px);
        }

        .hero-content {
          position: relative;
          max-width: 960px;
          margin: 0 auto;
        }

        .hero-chip {
          display: inline-flex;
          align-items: center;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.2);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .modern-store-hero h1 {
          margin: 0;
          font-size: clamp(34px, 8vw, 64px);
          line-height: 0.95;
          letter-spacing: -0.06em;
          font-weight: 950;
        }

        .hero-subtitle {
          margin: 14px 0 0;
          font-size: 17px;
          color: rgba(255, 255, 255, 0.82);
          font-weight: 600;
        }

        .hero-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
        }

        .hero-meta-row span {
          display: inline-flex;
          padding: 9px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.13);
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
          font-weight: 700;
        }

        .modern-store-body {
          width: min(960px, calc(100% - 28px));
          margin: -14px auto 0;
          padding-bottom: 34px;
          position: relative;
          z-index: 2;
        }

        .modern-promo-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 15px;
          background: linear-gradient(135deg, #fef3c7, #ffedd5);
          border: 1px solid #fed7aa;
          color: #7c2d12;
          border-radius: 20px;
          box-shadow: 0 12px 26px rgba(251, 146, 60, 0.13);
          margin-bottom: 12px;
        }

        .promo-dot {
          width: 10px;
          height: 10px;
          background: #f97316;
          border-radius: 999px;
          box-shadow: 0 0 0 5px rgba(249, 115, 22, 0.12);
          flex: 0 0 auto;
        }

        .modern-search-card {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 22px;
          padding: 13px 15px;
          box-shadow: 0 14px 35px rgba(15, 23, 42, 0.09);
          backdrop-filter: blur(14px);
          position: sticky;
          top: 8px;
          z-index: 10;
        }

        .search-icon {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 23px;
          font-weight: 900;
        }

        .modern-search-card input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          font-size: 17px;
          color: #0f172a;
          font-weight: 700;
        }

        .modern-search-card input::placeholder {
          color: #94a3b8;
          font-weight: 600;
        }

        .modern-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin: 14px 0;
        }

        .modern-summary div {
          background: white;
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 20px;
          padding: 14px;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
        }

        .modern-summary strong {
          display: block;
          font-size: 24px;
          line-height: 1;
          font-weight: 950;
        }

        .modern-summary span {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-size: 13px;
          font-weight: 800;
        }

        .modern-menu-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .modern-menu-card {
          overflow: hidden;
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 26px;
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.09);
        }

        .modern-image-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          background: #e2e8f0;
          overflow: hidden;
        }

        .modern-image-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .modern-no-image {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
          color: #64748b;
          font-weight: 800;
        }

        .sold-out-cover {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          background: rgba(15, 23, 42, 0.65);
          color: white;
          font-weight: 950;
          font-size: 18px;
          letter-spacing: -0.02em;
        }

        .modern-card-content {
          padding: 15px;
        }

        .modern-badges {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .modern-badges span {
          display: inline-flex;
          align-items: center;
          min-height: 25px;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.03em;
        }

        .badge-featured {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .badge-best {
          background: #dcfce7;
          color: #166534;
        }

        .badge-promo {
          background: #fee2e2;
          color: #b91c1c;
        }

        .badge-sale {
          background: #ffedd5;
          color: #c2410c;
        }

        .badge-new {
          background: #f3e8ff;
          color: #7e22ce;
        }

        .badge-combo {
          background: #fef3c7;
          color: #92400e;
        }

        .modern-name-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .modern-name-row h2 {
          margin: 0;
          font-size: 20px;
          line-height: 1.12;
          letter-spacing: -0.04em;
          font-weight: 950;
        }

        .modern-price {
          white-space: nowrap;
          color: #1d4ed8;
          font-size: 18px;
          font-weight: 950;
        }

        .modern-description {
          margin: 10px 0 0;
          color: #475569;
          font-size: 14px;
          line-height: 1.45;
          font-weight: 600;
        }

        .muted-description {
          color: #94a3b8;
        }

        .modern-status-row {
          margin-top: 14px;
        }

        .stock-in,
        .stock-out {
          display: inline-flex;
          padding: 8px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
        }

        .stock-in {
          background: #f0fdf4;
          color: #15803d;
        }

        .stock-out {
          background: #f1f5f9;
          color: #64748b;
        }

        .out-card {
          opacity: 0.75;
        }

        .modern-empty {
          margin-top: 18px;
          padding: 36px 18px;
          background: white;
          border: 1px dashed rgba(148, 163, 184, 0.55);
          border-radius: 26px;
          text-align: center;
          color: #475569;
        }

        .empty-icon {
          font-size: 36px;
          margin-bottom: 8px;
        }

        .modern-empty h2 {
          margin: 0;
          color: #0f172a;
          font-size: 22px;
          font-weight: 950;
        }

        .modern-empty p {
          margin: 8px 0 0;
          font-weight: 700;
        }

        @media (max-width: 720px) {
          .modern-store-hero {
            padding: 26px 16px 50px;
          }

          .modern-store-body {
            width: min(100% - 20px, 520px);
            margin-top: -32px;
          }

          .modern-menu-list {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .modern-menu-card {
            display: grid;
            grid-template-columns: 128px minmax(0, 1fr);
            border-radius: 23px;
          }

          .modern-image-wrap {
            height: 100%;
            aspect-ratio: auto;
            min-height: 160px;
          }

          .modern-card-content {
            padding: 13px 13px 12px;
          }

          .modern-name-row {
            display: block;
          }

          .modern-name-row h2 {
            font-size: 19px;
          }

          .modern-price {
            margin-top: 7px;
            font-size: 20px;
          }

          .modern-description {
            font-size: 13px;
            margin-top: 8px;
          }

          .modern-badges {
            margin-bottom: 9px;
            gap: 5px;
          }

          .modern-badges span {
            font-size: 9px;
            padding: 5px 7px;
            min-height: 22px;
          }
        }

        @media (max-width: 420px) {
          .modern-store-page {
            background: #f8fafc;
          }

          .modern-store-hero h1 {
            font-size: 42px;
          }

          .modern-summary {
            gap: 8px;
          }

          .modern-menu-card {
            grid-template-columns: 118px minmax(0, 1fr);
          }

          .modern-image-wrap {
            min-height: 154px;
          }
        }
      `}</style>
    </main>
  );
}
