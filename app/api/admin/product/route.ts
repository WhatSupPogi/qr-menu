import { NextResponse } from 'next/server';
import {
  createProductWithOptionalImage,
  deleteProductAndImage,
  getPlanConfigByStoreId,
  getServerSupabase,
  getServiceSupabase,
  getStoreUsage,
  requireStoreOwnershipBySlug,
  updateProductWithOptionalImage
} from '@/lib/app';

function cleanPromoLabel(value: FormDataEntryValue | null) {
  const label = String(value || 'none').trim().toUpperCase();
  if (label === 'HOT' || label === 'SALE' || label === 'NEW') return label;
  return 'none';
}

function toBool(value: FormDataEntryValue | null) {
  return value === 'on' || value === 'true' || value === '1';
}

function toNumber(value: FormDataEntryValue | null) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') || '').trim();

  if (!slug) {
    return NextResponse.json(
      { authenticated: false, error: 'Missing slug.' },
      { status: 400 }
    );
  }

  const service = getServiceSupabase();

  const { data: store, error: storeError } = await service
    .from('stores')
    .select('id, slug, name, business_type, plan_type, status, owner_name, owner_phone, location, promo_banner')
    .eq('slug', slug)
    .maybeSingle();

  if (storeError) {
    return NextResponse.json(
      { authenticated: false, error: storeError.message },
      { status: 500 }
    );
  }

  if (!store) {
    return NextResponse.json(
      { authenticated: false, error: 'Store not found.' },
      { status: 200 }
    );
  }

  if (store.status !== 'active') {
    return NextResponse.json(
      { authenticated: false, error: 'This store is suspended.' },
      { status: 200 }
    );
  }

  const supabase = await getServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  const publicStore = {
    id: store.id,
    slug: store.slug,
    name: store.name,
    business_type: store.business_type,
    plan_type: store.plan_type,
    status: store.status,
    owner_name: store.owner_name,
    owner_phone: store.owner_phone,
    location: store.location,
    promo_banner: store.promo_banner || ''
  };

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      store: publicStore
    });
  }

  const { data: adminUser, error: adminError } = await service
    .from('admin_users')
    .select('store_id, role')
    .eq('auth_id', user.id)
    .eq('store_id', store.id)
    .maybeSingle();

  if (adminError) {
    return NextResponse.json(
      { authenticated: false, error: adminError.message },
      { status: 500 }
    );
  }

  if (!adminUser) {
    return NextResponse.json({
      authenticated: false,
      store: publicStore,
      error: 'Please sign in with this store account.'
    });
  }

  const [plan, usage, productsResult] = await Promise.all([
    getPlanConfigByStoreId(service, store.id),
    getStoreUsage(service, store.id),
    service
      .from('products')
      .select(
        'id, store_id, name, price, image_url, image_path, in_stock, is_best_seller, is_featured, promo_label, is_combo, description, display_order, created_at, updated_at'
      )
      .eq('store_id', store.id)
      .order('is_featured', { ascending: false })
      .order('is_best_seller', { ascending: false })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
  ]);

  if (productsResult.error) {
    return NextResponse.json(
      { authenticated: true, error: productsResult.error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    store: publicStore,
    adminUser,
    plan,
    usage,
    products: productsResult.data || []
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const mode = String(form.get('mode') || 'create');
  const slug = String(form.get('slug') || '').trim();

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug.' }, { status: 400 });
  }

  const owned = await requireStoreOwnershipBySlug(slug);

  if (!owned.ok) {
    return NextResponse.json({ error: owned.reason }, { status: 403 });
  }

  if (mode === 'promo_banner') {
    const promoBanner = String(form.get('promo_banner') || '').trim().slice(0, 180);

    const { error } = await owned.supabase
      .from('stores')
      .update({ promo_banner: promoBanner })
      .eq('id', owned.store.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  if (mode === 'delete') {
    const productId = String(form.get('product_id') || '').trim();

    if (!productId) {
      return NextResponse.json({ error: 'Missing product id.' }, { status: 400 });
    }

    await deleteProductAndImage({
      slug,
      storeId: owned.store.id,
      productId
    });

    return NextResponse.json({ ok: true });
  }

  const name = String(form.get('name') || '').trim();
  const price = Number(form.get('price') || 0);
  const inStock = String(form.get('in_stock') || 'true') === 'true';
  const imageFile = form.get('image') as File | null;
  const isBestSeller = toBool(form.get('is_best_seller'));
  const isFeatured = toBool(form.get('is_featured'));
  const promoLabel = cleanPromoLabel(form.get('promo_label'));
  const isCombo = toBool(form.get('is_combo'));
  const description = String(form.get('description') || '').trim().slice(0, 250);
  const displayOrder = toNumber(form.get('display_order'));

  if (!name) {
    return NextResponse.json({ error: 'Item name is required.' }, { status: 400 });
  }

  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: 'Price must be valid.' }, { status: 400 });
  }

  if (mode === 'update') {
    const productId = String(form.get('product_id') || '').trim();

    if (!productId) {
      return NextResponse.json({ error: 'Missing product id.' }, { status: 400 });
    }

    await updateProductWithOptionalImage({
      slug,
      storeId: owned.store.id,
      productId,
      name,
      price,
      inStock,
      imageFile,
      isBestSeller,
      isFeatured,
      promoLabel,
      isCombo,
      description,
      displayOrder
    });

    return NextResponse.json({ ok: true });
  }

  await createProductWithOptionalImage({
    slug,
    storeId: owned.store.id,
    name,
    price,
    inStock,
    imageFile,
    isBestSeller,
    isFeatured,
    promoLabel,
    isCombo,
    description,
    displayOrder
  });

  return NextResponse.json({ ok: true });
}
