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
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-950">
      <section className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-200">QR Menu</p>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            {store.name}
          </h1>

          <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-200">
            {store.location ? (
              <span className="rounded-full bg-white/10 px-3 py-1">
                {store.location}
              </span>
            ) : null}
            {store.owner_phone ? (
              <span className="rounded-full bg-white/10 px-3 py-1">
                {store.owner_phone}
              </span>
            ) : null}
          </div>

          {store.promo_banner ? (
            <div className="mt-5 rounded-2xl bg-sky-500 px-4 py-3 text-base font-black text-white shadow">
              {store.promo_banner}
            </div>
          ) : null}
        </div>

        <div className="sticky top-0 z-10 mt-4 rounded-2xl bg-white/95 p-3 shadow-sm backdrop-blur">
          <label htmlFor="menu-search" className="sr-only">
            Search items
          </label>
          <input
            id="menu-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by item name"
            autoComplete="off"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-lg font-semibold outline-none ring-sky-300 transition focus:ring-4"
          />
        </div>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 sm:col-span-2 lg:col-span-3">
              No matching items found.
            </div>
          ) : (
            filteredProducts.map((product) => (
              <article
                className={`overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 ${
                  !product.in_stock ? 'opacity-60' : ''
                }`}
                key={product.id}
              >
                <div className="relative aspect-[4/3] bg-slate-200">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500">
                      No Image
                    </div>
                  )}

                  {!product.in_stock ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/65 text-lg font-black text-white">
                      Out of Stock
                    </div>
                  ) : null}
                </div>

                <div className="p-4">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {product.is_featured ? (
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                        FEATURED
                      </span>
                    ) : null}
                    {product.is_best_seller ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                        BEST SELLER
                      </span>
                    ) : null}
                    {product.promo_label && product.promo_label !== 'none' ? (
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700">
                        {product.promo_label}
                      </span>
                    ) : null}
                    {product.is_combo ? (
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">
                        COMBO
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-black leading-tight">
                      {product.name}
                    </h2>
                    <strong className="shrink-0 rounded-2xl bg-slate-100 px-3 py-2 text-lg font-black">
                      {money(product.price)}
                    </strong>
                  </div>

                  {product.description ? (
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      {product.description}
                    </p>
                  ) : null}

                  <div
                    className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                      product.in_stock
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
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
