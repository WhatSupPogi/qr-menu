import { NextResponse } from 'next/server';
import {
  createProductWithOptionalImage,
  deleteProductAndImage,
  getServerSupabase,
  getServiceSupabase,
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

function fallbackPlanConfig(businessType: string, planType: string) {
  if (businessType === 'restaurant') {
    if (planType === 'standard') {
      return { product_limit: 100, image_limit_kb: 500, photo_count_limit: 100 };
    }

    if (planType === 'plus') {
      return { product_limit: 300, image_limit_kb: 700, photo_count_limit: 300 };
    }

    return { product_limit: 50, image_limit_kb: 300, photo_count_limit: 50 };
  }

  if (planType === 'standard') {
    return { product_limit: 100, image_limit_kb: 100, photo_count_limit: 40 };
  }

  if (planType === 'plus') {
    return { product_limit: 300, image_limit_kb: 150, photo_count_limit: 120 };
  }

  return { product_limit: 50, image_limit_kb: 100, photo_count_limit: 20 };
}

async function getSafePlanConfig(service: ReturnType<typeof getServiceSupabase>, businessType: string, planType: string) {
  const fallback = fallbackPlanConfig(businessType, planType);

  const { data, error } = await service
    .from('plan_configs')
    .select('product_limit, image_limit_kb, photo_count_limit')
    .eq('business_type', businessType)
    .eq('plan_type', planType)
    .maybeSingle();

  if (error || !data) {
    return fallback;
  }

  return {
    product_limit: Number(data.product_limit || fallback.product_limit),
    image_limit_kb: Number(data.image_limit_kb || fallback.image_limit_kb),
    photo_count_limit: Number(data.photo_count_limit || fallback.photo_count_limit)
  };
}

async function getSafeUsage(service: ReturnType<typeof getServiceSupabase>, storeId: string) {
  const { count: productCount } = await service
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId);

  const { count: imageCount } = await service
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .not('image_url', 'is', null);

  return {
    productCount: productCount || 0,
    imageCount: imageCount || 0
  };
}

function publicStorePayload(store: any) {
  return {
    id: store.id,
    slug: store.slug,
    name: store.name || '',
    business_type: store.business_type || 'sari_sari',
    plan_type: store.plan_type || 'basic',
    status: store.status || 'active',
    owner_name: store.owner_name || '',
    owner_phone: store.owner_phone || '',
    location: store.location || '',
    promo_banner: store.promo_banner || ''
  };
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

  const safeStore = publicStorePayload(store);

  if (safeStore.status !== 'active') {
    return NextResponse.json(
      { authenticated: false, store: safeStore, error: 'This store is suspended.' },
      { status: 200 }
    );
  }

  const supabase = await getServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  const plan = await getSafePlanConfig(service, safeStore.business_type, safeStore.plan_type);
  const usage = await getSafeUsage(service, safeStore.id);

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      store: safeStore,
      plan,
      usage
    });
  }

  const { data: adminUser, error: adminError } = await service
    .from('admin_users')
    .select('store_id, role')
    .eq('auth_id', user.id)
    .eq('store_id', safeStore.id)
    .maybeSingle();

  if (adminError) {
    return NextResponse.json(
      { authenticated: false, store: safeStore, plan, usage, error: adminError.message },
      { status: 500 }
    );
  }

  if (!adminUser) {
    return NextResponse.json({
      authenticated: false,
      store: safeStore,
      plan,
      usage,
      error: 'Please sign in with this store account.'
    });
  }

  const { data: products, error: productsError } = await service
    .from('products')
    .select(
      'id, store_id, name, price, image_url, image_path, in_stock, is_best_seller, is_featured, promo_label, is_combo, description, display_order, created_at, updated_at'
    )
    .eq('store_id', safeStore.id)
    .order('is_featured', { ascending: false })
    .order('is_best_seller', { ascending: false })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (productsError) {
    return NextResponse.json(
      { authenticated: true, store: safeStore, plan, usage, error: productsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    store: safeStore,
    adminUser,
    plan,
    usage,
    products: products || []
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
