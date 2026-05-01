import { NextResponse } from 'next/server';
import {
  getServerSupabase,
  getServiceSupabase,
  requireStoreOwnershipBySlug
} from '@/lib/app';

const BUCKET = 'product-images';

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

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function fallbackPlanConfig(businessType: string, planType: string) {
  if (planType === 'free') {
    return {
      product_limit: 10,
      image_limit_kb: businessType === 'restaurant' ? 300 : 100,
      photo_count_limit: 3
    };
  }

  if (businessType === 'restaurant') {
    if (planType === 'standard') return { product_limit: 100, image_limit_kb: 300, photo_count_limit: 100 };
    if (planType === 'plus') return { product_limit: 300, image_limit_kb: 300, photo_count_limit: 300 };
    return { product_limit: 50, image_limit_kb: 300, photo_count_limit: 50 };
  }

  if (planType === 'standard') return { product_limit: 100, image_limit_kb: 100, photo_count_limit: 40 };
  if (planType === 'plus') return { product_limit: 300, image_limit_kb: 100, photo_count_limit: 120 };
  return { product_limit: 50, image_limit_kb: 100, photo_count_limit: 20 };
}

async function getPlan(service: ReturnType<typeof getServiceSupabase>, businessType: string, planType: string) {
  const fallback = fallbackPlanConfig(businessType, planType);

  const { data } = await service
    .from('plan_configs')
    .select('product_limit, image_limit_kb, photo_count_limit')
    .eq('business_type', businessType)
    .eq('plan_type', planType)
    .maybeSingle();

  if (!data) return fallback;

  return {
    product_limit: Number(data.product_limit || fallback.product_limit),
    image_limit_kb: Number(data.image_limit_kb || fallback.image_limit_kb),
    photo_count_limit: Number(data.photo_count_limit || fallback.photo_count_limit)
  };
}

async function getUsage(service: ReturnType<typeof getServiceSupabase>, storeId: string) {
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

function storePayload(store: any) {
  return {
    id: store.id,
    slug: store.slug,
    name: store.name || '',
    business_type: store.business_type || 'sari_sari',
    plan_type: store.plan_type || 'free',
    status: store.status || 'active',
    owner_name: store.owner_name || '',
    owner_phone: store.owner_phone || '',
    location: store.location || '',
    promo_banner: store.promo_banner || ''
  };
}

function checkLockedFeatures({
  planType,
  isBestSeller,
  isFeatured,
  promoLabel
}: {
  planType: string;
  isBestSeller: boolean;
  isFeatured: boolean;
  promoLabel: string;
}) {
  if (planType !== 'free') return null;

  if (isBestSeller || isFeatured || promoLabel !== 'none') {
    return 'Upgrade your plan to unlock more features and increase your sales.';
  }

  return null;
}

async function uploadImage({
  service,
  storeSlug,
  file
}: {
  service: ReturnType<typeof getServiceSupabase>;
  storeSlug: string;
  file: File | null;
}) {
  if (!file || file.size === 0) {
    return { image_url: null as string | null, image_path: null as string | null };
  }

  const clean = safeFileName(file.name).replace(/\.[^/.]+$/, '');
  const path = `${storeSlug}/${Date.now()}-${crypto.randomUUID()}-${clean || 'image'}`;
  const bytes = await file.arrayBuffer();

  const { error } = await service.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: file.type || 'image/webp',
      upsert: false
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = service.storage.from(BUCKET).getPublicUrl(path);

  return {
    image_url: data.publicUrl,
    image_path: path
  };
}

async function removeImage(service: ReturnType<typeof getServiceSupabase>, imagePath?: string | null) {
  if (!imagePath) return;
  await service.storage.from(BUCKET).remove([imagePath]);
}

function parseBulkItems(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(',');
      const priceText = parts.pop()?.trim() || '';
      const name = parts.join(',').trim();
      const price = Number(priceText);

      return { name, price };
    })
    .filter((item) => item.name && Number.isFinite(item.price) && item.price >= 0);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') || '').trim();

  if (!slug) {
    return NextResponse.json({ authenticated: false, error: 'Missing slug.' }, { status: 400 });
  }

  const service = getServiceSupabase();

  const { data: store, error: storeError } = await service
    .from('stores')
    .select('id, slug, name, business_type, plan_type, status, owner_name, owner_phone, location, promo_banner')
    .eq('slug', slug)
    .maybeSingle();

  if (storeError) {
    return NextResponse.json({ authenticated: false, error: storeError.message }, { status: 500 });
  }

  if (!store) {
    return NextResponse.json({ authenticated: false, error: 'Store not found.' }, { status: 200 });
  }

  const safeStore = storePayload(store);
  const plan = await getPlan(service, safeStore.business_type, safeStore.plan_type);
  const usage = await getUsage(service, safeStore.id);

  if (safeStore.status !== 'active') {
    return NextResponse.json({
      authenticated: false,
      store: safeStore,
      plan,
      usage,
      error: 'This store is suspended.'
    });
  }

  const supabase = await getServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

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
    return NextResponse.json({
      authenticated: false,
      store: safeStore,
      plan,
      usage,
      error: adminError.message
    }, { status: 500 });
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

  const { data: paymentRequests } = await service
    .from('payment_requests')
    .select('id, plan_type, payment_method, reference_number, proof_image_url, status, created_at')
    .eq('store_id', safeStore.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (productsError) {
    return NextResponse.json({
      authenticated: true,
      store: safeStore,
      plan,
      usage,
      error: productsError.message
    }, { status: 500 });
  }

  return NextResponse.json({
    authenticated: true,
    store: safeStore,
    adminUser,
    plan,
    usage,
    products: products || [],
    paymentRequests: paymentRequests || []
  });
}

export async function POST(request: Request) {
  try {
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

    const service = getServiceSupabase();

    if (mode === 'promo_banner') {
      const promoBanner = String(form.get('promo_banner') || '').trim().slice(0, 180);

      const { error } = await service
        .from('stores')
        .update({ promo_banner: promoBanner })
        .eq('id', owned.store.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (mode === 'bulk_create') {
      const store = storePayload(owned.store);
      const plan = await getPlan(service, store.business_type, store.plan_type);
      const usage = await getUsage(service, store.id);
      const bulkText = String(form.get('bulk_items') || '');
      const items = parseBulkItems(bulkText);

      if (items.length === 0) {
        return NextResponse.json({ error: 'Please add items using: Item name, price' }, { status: 400 });
      }

      if (usage.productCount + items.length > plan.product_limit) {
        return NextResponse.json({ error: 'Upgrade your plan to add more items.' }, { status: 400 });
      }

      const { error } = await service.from('products').insert(
        items.map((item, index) => ({
          store_id: store.id,
          name: item.name,
          price: item.price,
          in_stock: true,
          display_order: usage.productCount + index + 1,
          promo_label: 'none',
          is_best_seller: false,
          is_featured: false,
          is_combo: false,
          description: ''
        }))
      );

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, count: items.length });
    }

    if (mode === 'delete') {
      const productId = String(form.get('product_id') || '').trim();

      if (!productId) {
        return NextResponse.json({ error: 'Missing product id.' }, { status: 400 });
      }

      const { data: product } = await service
        .from('products')
        .select('image_path')
        .eq('id', productId)
        .eq('store_id', owned.store.id)
        .maybeSingle();

      await removeImage(service, product?.image_path);

      const { error } = await service
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('store_id', owned.store.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
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

    const store = storePayload(owned.store);
    const plan = await getPlan(service, store.business_type, store.plan_type);
    const usage = await getUsage(service, store.id);

    const lockedMessage = checkLockedFeatures({
      planType: store.plan_type,
      isBestSeller,
      isFeatured,
      promoLabel
    });

    if (lockedMessage) {
      return NextResponse.json({ error: lockedMessage }, { status: 400 });
    }

    if (mode !== 'update' && usage.productCount >= plan.product_limit) {
      return NextResponse.json({ error: 'Upgrade your plan to add more items.' }, { status: 400 });
    }

    if (imageFile && imageFile.size > 0) {
      const kb = Math.ceil(imageFile.size / 1024);

      if (kb > plan.image_limit_kb) {
        return NextResponse.json({ error: `Image is too large after optimization. Limit is ${plan.image_limit_kb}KB.` }, { status: 400 });
      }

      if (mode !== 'update' && usage.imageCount >= plan.photo_count_limit) {
        return NextResponse.json({ error: 'Upgrade your plan to add more images.' }, { status: 400 });
      }
    }

    if (mode === 'update') {
      const productId = String(form.get('product_id') || '').trim();

      if (!productId) {
        return NextResponse.json({ error: 'Missing product id.' }, { status: 400 });
      }

      const { data: currentProduct } = await service
        .from('products')
        .select('image_path')
        .eq('id', productId)
        .eq('store_id', store.id)
        .maybeSingle();

      const uploaded = await uploadImage({ service, storeSlug: slug, file: imageFile });

      const updatePayload: Record<string, any> = {
        name,
        price,
        in_stock: inStock,
        is_best_seller: isBestSeller,
        is_featured: isFeatured,
        promo_label: promoLabel,
        is_combo: isCombo,
        description,
        display_order: displayOrder
      };

      if (uploaded.image_url && uploaded.image_path) {
        updatePayload.image_url = uploaded.image_url;
        updatePayload.image_path = uploaded.image_path;
      }

      const { error } = await service
        .from('products')
        .update(updatePayload)
        .eq('id', productId)
        .eq('store_id', store.id);

      if (error) {
        await removeImage(service, uploaded.image_path);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (uploaded.image_path) {
        await removeImage(service, currentProduct?.image_path);
      }

      return NextResponse.json({ ok: true });
    }

    const uploaded = await uploadImage({ service, storeSlug: slug, file: imageFile });

    const { error } = await service
      .from('products')
      .insert({
        store_id: store.id,
        name,
        price,
        image_url: uploaded.image_url,
        image_path: uploaded.image_path,
        in_stock: inStock,
        is_best_seller: isBestSeller,
        is_featured: isFeatured,
        promo_label: promoLabel,
        is_combo: isCombo,
        description,
        display_order: displayOrder
      });

    if (error) {
      await removeImage(service, uploaded.image_path);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save this item.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
