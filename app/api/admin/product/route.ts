import { NextResponse } from 'next/server';
import { createProductWithOptionalImage, deleteProductAndImage, getPlanConfigByStoreId, getStoreUsage, requireStoreOwnershipBySlug, updateProductWithOptionalImage } from '@/lib/app';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || '';
  const owned = await requireStoreOwnershipBySlug(slug);

  if (!owned.ok) {
    return NextResponse.json({ authenticated: false, error: owned.reason });
  }

  const [plan, usage, productsResult] = await Promise.all([
    getPlanConfigByStoreId(owned.supabase, owned.store.id),
    getStoreUsage(owned.supabase, owned.store.id),
    owned.supabase.from('products').select('id, name, price, image_url, in_stock').eq('store_id', owned.store.id).order('created_at', { ascending: false })
  ]);

  return NextResponse.json({
    authenticated: true,
    store: owned.store,
    products: productsResult.data || [],
    plan,
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
    if (mode === 'delete') {
      const productId = String(form.get('product_id') || '');
      await deleteProductAndImage({ slug, storeId: owned.store.id, productId });
      return NextResponse.json({ ok: true });
    }

    const name = String(form.get('name') || '').trim();
    const price = Number(form.get('price') || 0);
    const inStock = String(form.get('in_stock') || 'true') === 'true';
    const image = form.get('image');
    const imageFile = image instanceof File && image.size > 0 ? image : null;

    if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    if (Number.isNaN(price) || price < 0) return NextResponse.json({ error: 'Please enter a valid price.' }, { status: 400 });

    if (mode === 'update') {
      const productId = String(form.get('product_id') || '');
      await updateProductWithOptionalImage({ slug, storeId: owned.store.id, productId, name, price, inStock, imageFile });
      return NextResponse.json({ ok: true });
    }

    await createProductWithOptionalImage({ slug, storeId: owned.store.id, name, price, inStock, imageFile });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Request failed.' }, { status: 400 });
  }
}
