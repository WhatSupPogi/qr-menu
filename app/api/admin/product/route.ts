import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import {
  createProductWithOptionalImage,
  deleteProductAndImage,
  getPlanConfigByStoreId,
  getStoreUsage,
  requireStoreOwnershipBySlug,
  updateProductWithOptionalImage
} from '@/lib/app';

type PromoLabel = 'none' | 'HOT' | 'SALE' | 'NEW';

function normalizePromoLabel(value: FormDataEntryValue | null): PromoLabel {
  const label = String(value || 'none').trim().toUpperCase();
  if (label === 'HOT' || label === 'SALE' || label === 'NEW') return label;
  return 'none';
}

function normalizeDescription(value: FormDataEntryValue | null) {
  const text = String(value || '').trim();
  return text ? text.slice(0, 240) : null;
}

function normalizeDisplayOrder(value: FormDataEntryValue | null) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.floor(num));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || '';
  const owned = await requireStoreOwnershipBySlug(slug);

  if (!owned.ok) {
    return NextResponse.json({ authenticated: false, error: owned.reason });
  }

  const [plan, usage, planOptionsResult, productsResult] = await Promise.all([
    getPlanConfigByStoreId(owned.supabase, owned.store.id),
    getStoreUsage(owned.supabase, owned.store.id),
    owned.supabase
      .from('plan_configs')
      .select('business_type, plan_type, product_limit, image_limit_kb, photo_count_limit')
      .eq('business_type', owned.store.business_type)
      .order('product_limit', { ascending: true }),
    owned.supabase
      .from('products')
      .select('id, name, price, image_url, in_stock, is_best_seller, is_featured, promo_label, is_combo, description, display_order')
      .eq('store_id', owned.store.id)
      .order('is_featured', { ascending: false })
      .order('is_best_seller', { ascending: false })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
  ]);

  return NextResponse.json({
    authenticated: true,
    store: owned.store,
    products: productsResult.data || [],
    plan,
    planOptions: planOptionsResult.data || [],
    usage
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const slug = String(form.get('slug') || '');
  const mode = String(form.get('mode') || 'create');
  const owned = await requireStoreOwnershipBySlug(slug);

  if (!owned.ok) {
    return NextResponse.json({ error: owned.reason }, { status: 403 });
  }

  try {
    if (mode === 'banner') {
      const promoBanner = String(form.get('promo_banner') || '').trim().slice(0, 160) || null;
      const { error } = await owned.supabase
        .from('stores')
        .update({ promo_banner: promoBanner })
        .eq('id', owned.store.id);

      if (error) throw error;
      revalidateTag(`store:${slug}`, 'max');
      return NextResponse.json({ ok: true });
    }

    if (mode === 'delete') {
      const productId = String(form.get('product_id') || '');
      await deleteProductAndImage({ slug, storeId: owned.store.id, productId });
      return NextResponse.json({ ok: true });
    }

    const name = String(form.get('name') || '').trim();
    const price = Number(form.get('price') || 0);
    const inStock = String(form.get('in_stock') || 'true') === 'true';
    const isBestSeller = String(form.get('is_best_seller') || 'false') === 'true';
    const isFeatured = String(form.get('is_featured') || 'false') === 'true';
    const promoLabel = normalizePromoLabel(form.get('promo_label'));
    const isCombo = String(form.get('is_combo') || 'false') === 'true';
    const description = normalizeDescription(form.get('description'));
    const displayOrder = normalizeDisplayOrder(form.get('display_order'));
    const image = form.get('image');
    const imageFile = image instanceof File && image.size > 0 ? image : null;

    if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    if (Number.isNaN(price) || price < 0) return NextResponse.json({ error: 'Please enter a valid price.' }, { status: 400 });

    const productPayload = {
      slug,
      storeId: owned.store.id,
      name,
      price,
      inStock,
      isBestSeller,
      isFeatured,
      promoLabel,
      isCombo,
      description,
      displayOrder,
      imageFile
    };

    if (mode === 'update') {
      const productId = String(form.get('product_id') || '');
      await updateProductWithOptionalImage({ ...productPayload, productId });
      return NextResponse.json({ ok: true });
    }

    await createProductWithOptionalImage(productPayload);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Request failed.' }, { status: 400 });
  }
}
