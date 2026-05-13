'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getBrowserSupabase } from '@/lib/client';

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

const EMPTY_CONTACT_FORM = {
  public_contact_enabled: false,
  public_contact_label: '',
  public_contact_type: 'none',
  public_contact_value: ''
};

const MAX_IMAGE_WIDTH = 800;

function titleCase(value?: string) {
  if (!value) return 'Free';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getImageLimitKb(businessType?: string, planLimit?: number) {
  if (businessType === 'restaurant') return 300;
  if (businessType === 'bar') return 500;
  return planLimit || 100;
}

function readImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image.'));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not optimize image.'));
          return;
        }

        resolve(blob);
      },
      'image/webp',
      quality
    );
  });
}

async function optimizeImage(file: File, maxKb: number) {
  const image = await readImage(file);

  let width = image.width;
  let height = image.height;

  if (width > MAX_IMAGE_WIDTH) {
    const ratio = MAX_IMAGE_WIDTH / width;
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not optimize image.');
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > maxKb * 1024 && quality > 0.28) {
    quality -= 0.07;
    blob = await canvasToBlob(canvas, quality);
  }

  const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  return new File([blob], `${baseName || 'menu-image'}.webp`, {
    type: 'image/webp',
    lastModified: Date.now()
  });
}

export default function StoreAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkItems, setBulkItems] = useState('');
  const [bannerText, setBannerText] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT_FORM);
  const [optimizedImage, setOptimizedImage] = useState<File | null>(null);
  const [imageMessage, setImageMessage] = useState('Image will be automatically optimized.');
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const supabase = useMemo(() => getBrowserSupabase(), []);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  async function load() {
    if (!slug) return;
    setLoading(true);
    setError('');
    setMessage('');

    const res = await fetch(`/api/admin/product?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
    const json = await res.json();

    setData(json);
    setBannerText(json?.store?.promo_banner || '');
    setContactForm({
      public_contact_enabled: Boolean(json?.store?.public_contact_enabled),
      public_contact_label: json?.store?.public_contact_label || '',
      public_contact_type: json?.store?.public_contact_type || 'none',
      public_contact_value: json?.store?.public_contact_value || ''
    });
    setLoading(false);
  }

  useEffect(() => {
    if (slug) load();
  }, [slug]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      return;
    }

    await load();
  }

  async function signOut() {
    await supabase.auth.signOut();
    await load();
  }

  function showUpgrade(messageText?: string) {
    if (messageText) setMessage(messageText);
    setUpgradeOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetImage() {
    setOptimizedImage(null);
    setImageMessage('Image will be automatically optimized.');
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }

  async function handleImage(file?: File | null) {
    if (!file) return;
    setError('');
    setImageMessage('Optimizing image automatically...');

    try {
      const limitKb = getImageLimitKb(data?.store?.business_type, data?.plan?.image_limit_kb);
      const optimized = await optimizeImage(file, limitKb);

      setOptimizedImage(optimized);
      setImageMessage(
        `Image optimized successfully. Final size: ${(optimized.size / 1024).toFixed(1)}KB WebP. Original size: ${(file.size / 1024).toFixed(1)}KB.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not optimize image.');
      resetImage();
    }
  }

  async function submitProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setMessage('');

    const form = new FormData(e.currentTarget);
    form.set('slug', slug);
    form.set('mode', editingId ? 'update' : 'create');
    if (editingId) form.set('product_id', editingId);

    form.delete('image');
    if (optimizedImage) form.set('image', optimizedImage);

    const res = await fetch('/api/admin/product', { method: 'POST', body: form });
    const json = await res.json();

    if (!res.ok) {
      const text = json.error || 'Could not save this item.';
      setError(text);
      if (text.toLowerCase().includes('upgrade')) showUpgrade(text);
      return;
    }

    const sizeMessage = optimizedImage ? ` Final image size: ${(optimizedImage.size / 1024).toFixed(1)}KB.` : '';
    setFormValues(EMPTY_FORM);
    setEditingId(null);
    resetImage();
    setMessage(`${editingId ? 'Item updated successfully.' : 'Item added successfully.'}${sizeMessage}`);
    await load();
  }

  async function submitBulk(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    const form = new FormData();
    form.set('mode', 'bulk_create');
    form.set('slug', slug);
    form.set('bulk_items', bulkItems);

    const res = await fetch('/api/admin/product', { method: 'POST', body: form });
    const json = await res.json();

    if (!res.ok) {
      const text = json.error || 'Could not add items.';
      setError(text);
      if (text.toLowerCase().includes('upgrade')) showUpgrade(text);
      return;
    }

    setBulkItems('');
    setMessage(`${json.count || 0} items added successfully.`);
    await load();
  }

  async function saveBanner(e: React.FormEvent) {
    e.preventDefault();
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

  async function saveContactButton(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    const form = new FormData();
    form.set('mode', 'public_contact');
    form.set('slug', slug);
    form.set('public_contact_enabled', contactForm.public_contact_enabled ? 'true' : 'false');
    form.set('public_contact_label', contactForm.public_contact_label);
    form.set('public_contact_type', contactForm.public_contact_type);
    form.set('public_contact_value', contactForm.public_contact_value);

    const res = await fetch('/api/admin/product', { method: 'POST', body: form });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || 'Could not save contact button.');
      return;
    }

    setMessage('Contact button saved.');
    await load();
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    const form = new FormData();
    form.set('slug', slug);
    form.set('plan_type', selectedPlan);
    form.set('payment_method', paymentMethod);
    form.set('reference_number', referenceNumber);
    if (paymentProof) form.set('proof', paymentProof);

    const res = await fetch('/api/admin/payment', { method: 'POST', body: form });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || 'Could not submit payment.');
      return;
    }

    setMessage('Payment submitted. Please wait for approval.');
    setReferenceNumber('');
    setPaymentProof(null);
    await load();
  }

  function editProduct(product: Product) {
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
    resetImage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteProduct(id: string) {
    if (!window.confirm('Delete this item?')) return;

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

    await load();
  }

  if (loading) {
    return <main className="container"><div className="card">Loading...</div></main>;
  }

  if (!data?.authenticated) {
    return (
      <main className="container narrow-container">
        <section className="card form-card">
          <h1 className="page-title">Store Admin</h1>
          {data?.store?.name ? <div className="notice">Store: {data.store.name}</div> : null}
          {data?.error ? <div className="error">{data.error}</div> : null}
          {error ? <div className="error">{error}</div> : null}

          <form className="grid" onSubmit={signIn}>
            <label>
              Email
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>

            <label>
              Password
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>

            <button className="button" type="submit">Sign In</button>
          </form>
        </section>
      </main>
    );
  }

  const store = data.store;
  const plan = data.plan || { product_limit: 10, image_limit_kb: 100, photo_count_limit: 3 };
  const usage = data.usage || { productCount: 0, imageCount: 0 };
  const products = data.products || [];
  const paymentRequests = data.paymentRequests || [];
  const isFree = store?.plan_type === 'free';
  const filteredProducts = products.filter((p: Product) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="container admin-shell">
      <section className="header-card">
        <div>
          <h1 className="page-title">{store?.name || slug}</h1>
          <p className="muted">Set up your QR menu in 3 minutes.</p>
        </div>

        <div className="inline-actions wrap-actions">
          <a className="button secondary fit-button" href={`/store/${slug}`} target="_blank" rel="noreferrer">Open Store Page</a>
          <a className="button secondary fit-button" href={`/api/admin/qr?slug=${encodeURIComponent(slug)}`}>Download QR</a>
          <button className="button secondary fit-button" type="button" onClick={signOut}>Sign Out</button>
        </div>
      </section>

      {message ? <div className="success">{message}</div> : null}
      {error ? <div className="error">{error}</div> : null}

      <section className="card">
        <h2 className="section-title">3-Minute Setup</h2>
        <div className="grid grid-3">
          <div className="notice">Step 1: Add store info</div>
          <div className="notice">Step 2: Add items</div>
          <div className="notice">Step 3: Download QR code</div>
        </div>
      </section>

      <section className="stats-grid">
        <div className="card stat-card">
          <div className="muted">Current Plan</div>
          <div className="kpi small-kpi">{titleCase(store?.plan_type)}</div>
        </div>
        <div className="card stat-card">
          <div className="muted">Items</div>
          <div className="kpi small-kpi">{usage.productCount}/{plan.product_limit}</div>
        </div>
        <div className="card stat-card">
          <div className="muted">Images</div>
          <div className="kpi small-kpi">{usage.imageCount}/{plan.photo_count_limit}</div>
        </div>
      </section>

      {isFree ? (
        <section className="card upgrade-card">
          <h2 className="section-title">Free Plan</h2>
          <p className="muted">You can add up to 10 items. Upgrade to unlock Best Seller, Featured items, Promo Labels, and more items.</p>
          <button className="button" type="button" onClick={() => showUpgrade('Upgrade your plan to unlock more features and increase your sales.')}>
            Upgrade Plan
          </button>
        </section>
      ) : (
        <section className="card upgrade-card">
          <h2 className="section-title">Need more sales tools?</h2>
          <p className="muted">Upgrade anytime to get more item space and stronger selling features.</p>
          <button className="button secondary" type="button" onClick={() => showUpgrade('Upgrade your plan to unlock more features and increase your sales.')}>
            Upgrade Plan
          </button>
        </section>
      )}

      {upgradeOpen ? (
        <section className="card form-card">
          <h2 className="section-title">Upgrade Plan</h2>
          <p className="muted">Upgrade your plan via GCash / GoTyme / Bank Transfer.</p>
          <div className="notice">Send payment and upload proof below.</div>

          <form className="grid grid-2" onSubmit={submitPayment}>
            <label>
              Selected Plan
              <select className="select" value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="plus">Plus</option>
              </select>
            </label>

            <label>
              Payment Method
              <select className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="GCash">GCash</option>
                <option value="GoTyme">GoTyme</option>
                <option value="Bank">Bank</option>
              </select>
            </label>

            <label>
              Reference Number
              <input className="input" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} required />
            </label>

            <label>
              Upload Proof
              <input className="input" type="file" accept="image/*" onChange={(e) => setPaymentProof(e.target.files?.[0] || null)} />
            </label>

            <button className="button" type="submit">Submit Payment</button>
          </form>

          {paymentRequests.length > 0 ? (
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRequests.map((request: any) => (
                    <tr key={request.id}>
                      <td>{request.plan_type}</td>
                      <td>{request.payment_method}</td>
                      <td>{request.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="card">
        <h2 className="section-title">QR Usage Guide</h2>
        <div className="grid grid-3">
          <div className="notice">Place QR on your counter</div>
          <div className="notice">Post QR on Facebook</div>
          <div className="notice">Tell customers: Scan to view items</div>
        </div>
      </section>

      <section className="card form-card">
        <h2 className="section-title">Store Promo Banner</h2>
        <form className="grid" onSubmit={saveBanner}>
          <label>
            Promo Banner
            <input className="input" value={bannerText} onChange={(e) => setBannerText(e.target.value)} placeholder="Today only: Free delivery nearby!" />
          </label>
          <button className="button" type="submit">Save Banner</button>
        </form>
      </section>

      <section className="card form-card">
        <h2 className="section-title">Customer Contact Button</h2>
        <p className="muted">Let customers contact your store from the QR menu.</p>
        <form className="grid grid-2" onSubmit={saveContactButton}>
          <label className="check-card">
            <input
              type="checkbox"
              checked={contactForm.public_contact_enabled}
              onChange={(e) => setContactForm((prev) => ({ ...prev, public_contact_enabled: e.target.checked }))}
            />
            <strong>Enable Contact Button</strong>
            <span>Show a contact button on your public menu.</span>
          </label>

          <label>
            Button Label
            <input
              className="input"
              maxLength={30}
              value={contactForm.public_contact_label}
              onChange={(e) => setContactForm((prev) => ({ ...prev, public_contact_label: e.target.value }))}
              placeholder="Message Us"
            />
          </label>

          <label>
            Contact Type
            <select
              className="select"
              value={contactForm.public_contact_type}
              onChange={(e) => setContactForm((prev) => ({ ...prev, public_contact_type: e.target.value }))}
            >
              <option value="none">None</option>
              <option value="messenger">Messenger</option>
              <option value="facebook">Facebook Page</option>
              <option value="phone">Phone Call</option>
              <option value="link">Custom Link</option>
            </select>
          </label>

          <label>
            Contact Value
            <input
              className="input"
              maxLength={300}
              value={contactForm.public_contact_value}
              onChange={(e) => setContactForm((prev) => ({ ...prev, public_contact_value: e.target.value }))}
              placeholder="Messenger/Facebook URL, phone number, or contact link"
            />
          </label>

          <button className="button" type="submit">Save Contact Button</button>
        </form>
      </section>

      <section className="card form-card">
        <h2 className="section-title">{editingId ? 'Edit Item' : 'Add Item'}</h2>
        <p className="muted">Photo is optional. For common products, name and price are enough. You can add photos later.</p>

        <form className="grid grid-2" onSubmit={submitProduct}>
          <label>
            Item Name
            <input className="input" name="name" value={formValues.name} onChange={(e) => setFormValues((prev) => ({ ...prev, name: e.target.value }))} required />
          </label>

          <label>
            Price
            <input className="input" name="price" type="number" min="0" step="0.01" value={formValues.price} onChange={(e) => setFormValues((prev) => ({ ...prev, price: e.target.value }))} required />
          </label>

          <label>
            Display Order
            <input className="input" name="display_order" type="number" value={formValues.display_order} onChange={(e) => setFormValues((prev) => ({ ...prev, display_order: e.target.value }))} />
          </label>

          <label>
            Stock Status
            <select className="select" name="in_stock" value={formValues.in_stock} onChange={(e) => setFormValues((prev) => ({ ...prev, in_stock: e.target.value }))}>
              <option value="true">In Stock</option>
              <option value="false">Out of Stock</option>
            </select>
          </label>

          <div style={{ gridColumn: '1 / -1' }}>
            <label>Image</label>
            <div className="inline-actions wrap-actions" style={{ marginTop: 8 }}>
              <button className="button secondary fit-button" type="button" onClick={() => galleryInputRef.current?.click()}>
                Upload from Gallery
              </button>
              <button className="button secondary fit-button" type="button" onClick={() => cameraInputRef.current?.click()}>
                Take Photo
              </button>
              {optimizedImage ? (
                <button className="button secondary fit-button" type="button" onClick={resetImage}>
                  Clear Image
                </button>
              ) : null}
            </div>

            <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImage(e.target.files?.[0])} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleImage(e.target.files?.[0])} />

            <div className="notice" style={{ marginTop: 10 }}>{imageMessage}</div>
          </div>

          <label>
            Promo Label
            <select className="select" name="promo_label" value={formValues.promo_label} onChange={(e) => setFormValues((prev) => ({ ...prev, promo_label: e.target.value }))} disabled={isFree}>
              <option value="none">None</option>
              <option value="HOT">HOT</option>
              <option value="SALE">SALE</option>
              <option value="NEW">NEW</option>
            </select>
          </label>

          <label style={{ gridColumn: '1 / -1' }}>
            Description
            <textarea className="input" name="description" value={formValues.description} onChange={(e) => setFormValues((prev) => ({ ...prev, description: e.target.value }))} rows={3} />
          </label>

          <label className="check-card">
            <input name="is_featured" type="checkbox" checked={formValues.is_featured} disabled={isFree} onChange={(e) => setFormValues((prev) => ({ ...prev, is_featured: e.target.checked }))} />
            <strong>Featured</strong>
            <span>{isFree ? 'Upgrade required' : 'Show near the top'}</span>
          </label>

          <label className="check-card">
            <input name="is_best_seller" type="checkbox" checked={formValues.is_best_seller} disabled={isFree} onChange={(e) => setFormValues((prev) => ({ ...prev, is_best_seller: e.target.checked }))} />
            <strong>Best Seller</strong>
            <span>{isFree ? 'Upgrade required' : 'Show a strong badge'}</span>
          </label>

          <label className="check-card">
            <input name="is_combo" type="checkbox" checked={formValues.is_combo} onChange={(e) => setFormValues((prev) => ({ ...prev, is_combo: e.target.checked }))} />
            <strong>Combo</strong>
            <span>Use for bundle offers</span>
          </label>

          <div className="inline-actions" style={{ gridColumn: '1 / -1' }}>
            <button className="button" type="submit">{editingId ? 'Save Changes' : 'Add Item'}</button>
            {editingId ? (
              <button className="button secondary" type="button" onClick={() => { setEditingId(null); setFormValues(EMPTY_FORM); resetImage(); }}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="card form-card">
        <h2 className="section-title">Bulk Add Items</h2>
        <p className="muted">Add many items fast. Format: Item name, price</p>
        <form className="grid" onSubmit={submitBulk}>
          <textarea
            className="input"
            rows={7}
            placeholder={'Coke 1.5L, 95\nSprite 1.5L, 90\nLucky Me Pancit Canton, 18'}
            value={bulkItems}
            onChange={(e) => setBulkItems(e.target.value)}
          />
          <button className="button" type="submit">Add Items</button>
        </form>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title">Your Items</h2>
            <p className="muted">Search and manage your menu.</p>
          </div>
          <input className="input" placeholder="Search items" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {filteredProducts.length === 0 ? (
          <div className="empty-state">No items found.</div>
        ) : (
          <div className="products admin-products">
            {filteredProducts.map((product: Product) => (
              <article className="product-card admin-card" key={product.id}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="product-image" />
                ) : (
                  <div className="product-image product-image-empty"><span className="muted">No Image</span></div>
                )}

                <div className="product-body">
                  <h3>{product.name}</h3>
                  <div className="price-tag">₱ {Number(product.price).toFixed(2)}</div>
                  <div className="badge-row">
                    {product.is_featured ? <span className="badge promo">FEATURED</span> : null}
                    {product.is_best_seller ? <span className="badge best">BEST SELLER</span> : null}
                    {product.promo_label && product.promo_label !== 'none' ? <span className="badge promo">{product.promo_label}</span> : null}
                    {product.is_combo ? <span className="badge combo">COMBO</span> : null}
                    {product.in_stock ? <span className="badge ok">In Stock</span> : <span className="badge warn">Out of Stock</span>}
                  </div>
                  {product.description ? <p className="muted">{product.description}</p> : null}
                  <div className="inline-actions">
                    <button className="button secondary fit-button" onClick={() => editProduct(product)}>Edit</button>
                    <button className="button danger fit-button" onClick={() => deleteProduct(product.id)}>Delete</button>
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
