'use client';

import { useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '@/lib/client';

type StoreInfo = {
  id: string;
  slug: string;
  name: string;
  business_type: string;
  plan_type: string;
  status: string;
  owner_name: string;
  owner_phone: string;
  location: string;
  promo_banner?: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  in_stock: boolean;
  is_best_seller?: boolean;
  is_featured?: boolean;
  promo_label?: string;
  is_combo?: boolean;
  description?: string | null;
  display_order?: number;
};

type PlanInfo = {
  product_limit: number;
  image_limit_kb: number;
  photo_count_limit: number;
};

type DashboardData = {
  authenticated: boolean;
  store?: StoreInfo;
  products?: Product[];
  plan?: PlanInfo;
  usage?: {
    productCount: number;
    imageCount: number;
  };
  error?: string;
};

const EMPTY_FORM = {
  name: '',
  price: '',
  in_stock: 'true',
  display_order: '0',
  promo_label: 'none',
  description: '',
  is_featured: false,
  is_best_seller: false,
  is_combo: false
};

const DEFAULT_PLAN: PlanInfo = {
  product_limit: 50,
  image_limit_kb: 100,
  photo_count_limit: 20
};

function formatPlanName(plan?: string) {
  if (!plan) return 'Basic';
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export default function StoreAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [bannerText, setBannerText] = useState('');
  const supabase = useMemo(() => getBrowserSupabase(), []);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  async function load() {
    if (!slug) return;
    setLoading(true);
    setMessage('');
    setError('');

    const res = await fetch(`/api/admin/product?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
    const json = await res.json();

    setData(json);
    setBannerText(json?.store?.promo_banner || '');
    setLoading(false);
  }

  useEffect(() => {
    if (slug) load();
  }, [slug]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      return;
    }

    setMessage('Signed in successfully.');
    await load();
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMessage('Signed out.');
    setEditingId(null);
    setFormValues(EMPTY_FORM);
    await load();
  }

  function resetForm() {
    setEditingId(null);
    setFormValues(EMPTY_FORM);
    const fileInput = document.getElementById('image') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  }

  async function saveBanner(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    const form = new FormData();
    form.set('mode', 'promo_banner');
    form.set('slug', slug);
    form.set('promo_banner', bannerText);

    const res = await fetch('/api/admin/product', { method: 'POST', body: form });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || 'Could not save banner.');
      return;
    }

    setMessage('Promo banner saved.');
    await load();
  }

  async function submitProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);

    const form = new FormData(e.currentTarget);
    form.set('slug', slug);
    form.set('mode', editingId ? 'update' : 'create');
    if (editingId) form.set('product_id', editingId);

    const res = await fetch('/api/admin/product', { method: 'POST', body: form });
    const json = await res.json();

    setSaving(false);

    if (!res.ok) {
      setError(json.error || 'Could not save this item.');
      return;
    }

    resetForm();
    setMessage(editingId ? 'Item updated successfully.' : 'Item added successfully.');
    await load();
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setFormValues({
      name: product.name || '',
      price: String(product.price || ''),
      in_stock: product.in_stock ? 'true' : 'false',
      display_order: String(product.display_order || 0),
      promo_label: product.promo_label || 'none',
      description: product.description || '',
      is_featured: Boolean(product.is_featured),
      is_best_seller: Boolean(product.is_best_seller),
      is_combo: Boolean(product.is_combo)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function removeProduct(id: string) {
    const confirmed = window.confirm('Delete this item?');
    if (!confirmed) return;

    setError('');
    setMessage('');

    const form = new FormData();
    form.set('mode', 'delete');
    form.set('slug', slug);
    form.set('product_id', id);

    const res = await fetch('/api/admin/product', { method: 'POST', body: form });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || 'Could not delete this item.');
      return;
    }

    if (editingId === id) resetForm();
    setMessage('Item deleted.');
    await load();
  }

  const products = data?.products || [];
  const filteredProducts = useMemo(() => {
    const keyword = productSearch.trim().toLowerCase();
    if (!keyword) return products;
    return products.filter((product) => product.name.toLowerCase().includes(keyword));
  }, [products, productSearch]);

  if (loading) {
    return (
      <main className="container">
        <div className="card">Loading...</div>
      </main>
    );
  }

  if (!data?.authenticated) {
    return (
      <main className="container narrow-container">
        <div className="card form-card">
          <div className="page-intro">
            <h1 className="page-title">Store Admin</h1>
            <p className="muted">Sign in to manage your items.</p>
          </div>

          {data?.store?.name ? <div className="notice">Store: {data.store.name}</div> : null}
          {data?.error ? <div className="error">{data.error}</div> : null}
          {error ? <div className="error">{error}</div> : null}
          {message ? <div className="success">{message}</div> : null}

          <form className="grid" onSubmit={signIn}>
            <div>
              <label>Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label>Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button className="button" type="submit">Sign In</button>
          </form>
        </div>
      </main>
    );
  }

  const plan = data.plan || DEFAULT_PLAN;
  const store = data.store;
  const productLimit = Number(plan.product_limit || DEFAULT_PLAN.product_limit);
  const imageLimitKb = Number(plan.image_limit_kb || DEFAULT_PLAN.image_limit_kb);
  const imageLimit = Number(plan.photo_count_limit || DEFAULT_PLAN.photo_count_limit);
  const productCount = Number(data.usage?.productCount || 0);
  const imageCount = Number(data.usage?.imageCount || 0);

  const productBlocked = !editingId && productCount >= productLimit;
  const imageBlocked = imageCount >= imageLimit;

  return (
    <main className="container admin-shell">
      <section className="header-card">
        <div>
          <h1 className="page-title" style={{ marginBottom: 6 }}>
            {store?.name || slug}
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Add, update, and manage your items in one place.
          </p>
        </div>

        <div className="inline-actions wrap-actions">
          <a className="button secondary fit-button" href={`/store/${slug}`} target="_blank" rel="noreferrer">
            Open Store Page
          </a>

          <a className="button secondary fit-button" href={`/api/admin/qr?slug=${encodeURIComponent(slug)}`}>
            Download QR
          </a>

          <button className="button secondary fit-button" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <div className="card stat-card">
          <div className="muted">Current Plan</div>
          <div className="kpi small-kpi">{formatPlanName(store?.plan_type)}</div>
        </div>

        <div className="card stat-card">
          <div className="muted">Items</div>
          <div className="kpi small-kpi">{productCount}/{productLimit}</div>
        </div>

        <div className="card stat-card">
          <div className="muted">Images</div>
          <div className="kpi small-kpi">{imageCount}/{imageLimit}</div>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Plan Options</h2>
        <p className="muted">Your current plan controls item and image limits.</p>
        <div className="grid grid-3">
          <div className="notice">Plan: {formatPlanName(store?.plan_type)}</div>
          <div className="notice">Item limit: {productLimit}</div>
          <div className="notice">Image limit: {imageLimit} images / {imageLimitKb}KB each</div>
        </div>
      </section>

      <section className="card form-card">
        <h2 className="section-title">Store Promo Banner</h2>
        <p className="muted section-text">Show one short message at the top of your public menu.</p>

        <form onSubmit={saveBanner} className="grid">
          <div>
            <label>Promo Banner</label>
            <input
              className="input"
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              placeholder="Today only: Free delivery nearby!"
              maxLength={180}
            />
          </div>
          <button className="button" type="submit">Save Banner</button>
        </form>
      </section>

      <div className="notice">
        Image limit: {imageLimitKb}KB. Images are saved as WebP. Old files are cleaned automatically.
      </div>

      {message ? <div className="success">{message}</div> : null}
      {error ? <div className="error">{error}</div> : null}

      <section className="card form-card">
        <div className="section-head compact-head">
          <div>
            <h2 className="section-title">{editingId ? 'Edit Item' : 'Add Item'}</h2>
            <p className="muted section-text">
              Use badges to push items customers should notice first.
            </p>
          </div>
        </div>

        <form id="product-form" className="grid grid-2" onSubmit={submitProduct}>
          <div>
            <label>Item Name</label>
            <input
              name="name"
              className="input"
              value={formValues.name}
              onChange={(e) => setFormValues((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label>Price</label>
            <input
              name="price"
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={formValues.price}
              onChange={(e) => setFormValues((prev) => ({ ...prev, price: e.target.value }))}
              required
            />
          </div>

          <div>
            <label>Display Order</label>
            <input
              name="display_order"
              className="input"
              type="number"
              step="1"
              value={formValues.display_order}
              onChange={(e) => setFormValues((prev) => ({ ...prev, display_order: e.target.value }))}
            />
          </div>

          <div>
            <label>Promo Label</label>
            <select
              name="promo_label"
              className="select"
              value={formValues.promo_label}
              onChange={(e) => setFormValues((prev) => ({ ...prev, promo_label: e.target.value }))}
            >
              <option value="none">None</option>
              <option value="HOT">HOT</option>
              <option value="SALE">SALE</option>
              <option value="NEW">NEW</option>
            </select>
          </div>

          <div>
            <label>Upload Image</label>
            <input id="image" name="image" className="input" type="file" accept="image/*" />
          </div>

          <div>
            <label>Stock Status</label>
            <select
              name="in_stock"
              className="select"
              value={formValues.in_stock}
              onChange={(e) => setFormValues((prev) => ({ ...prev, in_stock: e.target.value }))}
            >
              <option value="true">In Stock</option>
              <option value="false">Out of Stock</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <textarea
              name="description"
              className="input"
              value={formValues.description}
              onChange={(e) => setFormValues((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Example: Burger + Fries + Drink"
              rows={3}
            />
          </div>

          <label className="check-card">
            <input
              name="is_featured"
              type="checkbox"
              checked={formValues.is_featured}
              onChange={(e) => setFormValues((prev) => ({ ...prev, is_featured: e.target.checked }))}
            />
            <strong>Featured</strong>
            <span>Show near the top.</span>
          </label>

          <label className="check-card">
            <input
              name="is_best_seller"
              type="checkbox"
              checked={formValues.is_best_seller}
              onChange={(e) => setFormValues((prev) => ({ ...prev, is_best_seller: e.target.checked }))}
            />
            <strong>Best Seller</strong>
            <span>Show a strong badge.</span>
          </label>

          <label className="check-card">
            <input
              name="is_combo"
              type="checkbox"
              checked={formValues.is_combo}
              onChange={(e) => setFormValues((prev) => ({ ...prev, is_combo: e.target.checked }))}
            />
            <strong>Combo</strong>
            <span>Use for bundle offers.</span>
          </label>

          {productBlocked ? (
            <div className="error" style={{ gridColumn: '1 / -1' }}>
              Your item limit has been reached for this plan.
            </div>
          ) : null}

          {imageBlocked ? (
            <div className="notice" style={{ gridColumn: '1 / -1' }}>
              Your image limit has been reached. You can still edit text, price, badges, or stock.
            </div>
          ) : null}

          <div className="inline-actions" style={{ gridColumn: '1 / -1' }}>
            <button className="button fit-button" type="submit" disabled={productBlocked || saving}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Item'}
            </button>

            {editingId ? (
              <button className="button secondary fit-button" type="button" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title">Your Items</h2>
            <p className="muted section-text">Featured items show first. Best sellers show next.</p>
          </div>
          <div className="search-wrap">
            <label htmlFor="admin-search" className="sr-only">Search items</label>
            <input
              id="admin-search"
              className="input"
              placeholder="Search items"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <strong>No items found.</strong>
            <p className="muted" style={{ margin: 0 }}>Add a new item or change your search.</p>
          </div>
        ) : (
          <div className="products admin-products">
            {filteredProducts.map((product) => (
              <article className="product-card admin-card" key={product.id}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="product-image" />
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

                  <div className="badge-row">
                    {product.is_featured ? <span className="badge promo">FEATURED</span> : null}
                    {product.is_best_seller ? <span className="badge best">BEST SELLER</span> : null}
                    {product.promo_label && product.promo_label !== 'none' ? (
                      <span className="badge promo">{product.promo_label}</span>
                    ) : null}
                    {product.is_combo ? <span className="badge combo">COMBO</span> : null}
                    {product.in_stock ? <span className="badge ok">In Stock</span> : <span className="badge warn">Out of Stock</span>}
                  </div>

                  {product.description ? <p className="muted">{product.description}</p> : null}

                  <div className="inline-actions">
                    <button className="button secondary fit-button" onClick={() => startEdit(product)}>
                      Edit
                    </button>
                    <button className="button danger fit-button" onClick={() => removeProduct(product.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
