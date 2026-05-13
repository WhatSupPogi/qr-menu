import 'server-only';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_cache, revalidateTag } from 'next/cache';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type BusinessType =
  | 'sari_sari'
  | 'restaurant'
  | 'bar'
  | 'coffee_shop'
  | 'cosmetics'
  | 'retail'
  | 'pharmacy'
  | 'electronics'
  | 'clothing'
  | 'other';
export type PlanType = 'free' | 'basic' | 'standard' | 'plus' | 'unli';
export type StoreStatus = 'active' | 'suspended';

export const BUSINESS_TYPE_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: 'sari_sari', label: 'Store' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar' },
  { value: 'coffee_shop', label: 'Coffee Shop' },
  { value: 'cosmetics', label: 'Cosmetics' },
  { value: 'retail', label: 'Retail' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'other', label: 'Other' }
];

export function isBusinessType(value: string): value is BusinessType {
  return BUSINESS_TYPE_OPTIONS.some((option) => option.value === value);
}

export function businessTypeLabel(value?: string) {
  return BUSINESS_TYPE_OPTIONS.find((option) => option.value === value)?.label || 'Store';
}

export function defaultCategoryNamesForBusinessType(value: string) {
  if (value === 'restaurant') return ['Meals', 'Drinks', 'Desserts', 'Specials', 'Others'];
  if (value === 'bar') return ['Beer', 'Cocktails', 'Wine', 'Pulutan', 'Promos', 'Others'];
  if (value === 'coffee_shop') return ['Coffee', 'Non-Coffee', 'Frappe', 'Tea', 'Pastries', 'Others'];
  if (value === 'cosmetics') return ['Skincare', 'Makeup', 'Hair Care', 'Perfume', 'Body Care', 'Others'];
  if (value === 'retail') return ['Featured', 'New Arrivals', 'Best Sellers', 'Essentials', 'Others'];
  if (value === 'pharmacy') return ['Medicine', 'Vitamins', 'Personal Care', 'First Aid', 'Others'];
  if (value === 'electronics') return ['Accessories', 'Gadgets', 'Chargers', 'Audio', 'Others'];
  if (value === 'clothing') return ['Men', 'Women', 'Kids', 'Accessories', 'Others'];
  if (value === 'other') return ['Featured', 'Products', 'Services', 'Others'];
  return ['Drinks', 'Snacks', 'Noodles', 'Canned Goods', 'Toiletries', 'Others'];
}

export type StoreRow = {
  id: string;
  name: string;
  slug: string;
  business_type: BusinessType;
  plan_type: PlanType;
  owner_name: string;
  owner_phone: string;
  location: string;
  monthly_price: number;
  status: StoreStatus;
  promo_banner: string | null;
  created_at: string;
};

export type ProductRow = {
  id: string;
  store_id: string;
  name: string;
  price: number;
  image_url: string | null;
  image_path: string | null;
  in_stock: boolean;
  is_best_seller: boolean;
  is_featured: boolean;
  promo_label: 'none' | 'HOT' | 'SALE' | 'NEW';
  is_combo: boolean;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type PlanConfigRow = {
  id: string;
  business_type: BusinessType;
  plan_type: PlanType;
  product_limit: number;
  image_limit_kb: number;
  photo_count_limit: number;
};

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items) {
        items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      }
    }
  });
}

export function getBrowserSupabase() {
  return createBrowserClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'));
}

export function getServiceSupabase() {
  return createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 50);
}

export async function getClientIp() {
  const h = await headers();
  return (h.get('x-forwarded-for') || h.get('x-real-ip') || '0.0.0.0').split(',')[0].trim();
}

export function hashText(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function signSessionToken(token: string) {
  return crypto.createHmac('sha256', env('MASTER_SESSION_SECRET')).update(token).digest('hex');
}

export async function requireMasterSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get('master_session')?.value;
  if (!raw) redirect('/master/login');
  const supabase = getServiceSupabase();
  const tokenHash = signSessionToken(raw);
  const { data } = await supabase
    .from('master_admin_sessions')
    .select('id, expires_at')
    .eq('session_token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (!data) {
    cookieStore.delete('master_session');
    redirect('/master/login');
  }
  return { supabase, sessionId: data.id };
}

export async function writeMasterAction(actionType: string, details: Record<string, unknown>) {
  const cookieStore = await cookies();
  const raw = cookieStore.get('master_session')?.value;
  const supabase = getServiceSupabase();
  const tokenHash = raw ? signSessionToken(raw) : null;
  const { data: session } = tokenHash
    ? await supabase.from('master_admin_sessions').select('id').eq('session_token_hash', tokenHash).maybeSingle()
    : { data: null as { id: string } | null };
  await supabase.from('admin_action_logs').insert({
    session_id: session?.id ?? null,
    action_type: actionType,
    details,
    ip_address: await getClientIp()
  });
}

export async function validateMasterLoginAllowed(username: string) {
  const supabase = getServiceSupabase();
  const ip = await getClientIp();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('master_admin_login_attempts')
    .select('success')
    .eq('username', username)
    .eq('ip_address', ip)
    .gte('created_at', tenMinutesAgo);
  const failedCount = (data || []).filter((row) => !row.success).length;
  if (failedCount >= 5) {
    return { ok: false, message: 'Too many login attempts. Please try again later.' };
  }
  return { ok: true, ip, failedCount };
}

export async function recordMasterLoginAttempt(username: string, success: boolean) {
  const supabase = getServiceSupabase();
  await supabase.from('master_admin_login_attempts').insert({
    username,
    success,
    ip_address: await getClientIp()
  });
}

export async function createMasterSession() {
  const cookieStore = await cookies();
  const supabase = getServiceSupabase();
  const raw = crypto.randomBytes(32).toString('hex');
  const session_token_hash = signSessionToken(raw);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('master_admin_sessions')
    .insert({ session_token_hash, expires_at: expiresAt, ip_address: await getClientIp() })
    .select('id')
    .single();
  if (error) throw error;
  cookieStore.set('master_session', raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt)
  });
  return data.id;
}

export async function destroyMasterSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get('master_session')?.value;
  if (raw) {
    const supabase = getServiceSupabase();
    await supabase.from('master_admin_sessions').delete().eq('session_token_hash', signSessionToken(raw));
  }
  cookieStore.delete('master_session');
}

export async function requireStoreOwnershipBySlug(slug: string) {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false as const, reason: 'Please sign in first.' };

  const { data: store } = await supabase
    .from('stores')
    .select('id, slug, name, business_type, plan_type, status, owner_name, owner_phone, location, promo_banner')
    .eq('slug', slug)
    .maybeSingle();

  if (!store) return { ok: false as const, reason: 'Store not found.' };

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('store_id, role')
    .eq('auth_id', user.id)
    .eq('store_id', store.id)
    .maybeSingle();

  if (!adminUser) return { ok: false as const, reason: 'You do not have access to this store.' };
  if (store.status !== 'active') return { ok: false as const, reason: 'This store is suspended.' };

  return { ok: true as const, supabase, user, store, adminUser };
}

export async function getPlanConfigByStoreId(supabase: SupabaseClient, storeId: string) {
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('business_type, plan_type')
    .eq('id', storeId)
    .single();
  if (storeError) throw storeError;

  const { data: plan, error: planError } = await supabase
    .from('plan_configs')
    .select('*')
    .eq('business_type', store.business_type)
    .eq('plan_type', store.plan_type)
    .single();
  if (planError) throw planError;
  return plan as PlanConfigRow;
}

export async function getStoreUsage(supabase: SupabaseClient, storeId: string) {
  const [{ count: productCount }, { count: imageCount }] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('store_id', storeId),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('store_id', storeId).not('image_url', 'is', null)
  ]);
  return { productCount: productCount || 0, imageCount: imageCount || 0 };
}

export function getFileExtFromMime(type: string) {
  if (type === 'image/webp') return 'webp';
  if (type === 'image/png') return 'png';
  if (type === 'image/jpeg') return 'jpg';
  return 'webp';
}

export function safePathFromUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = '/storage/v1/object/public/product-images/';
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export async function convertImageToWebP(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const input = Buffer.from(arrayBuffer);
  const output = await sharp(input).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  return output;
}

export async function createProductWithOptionalImage(params: {
  slug: string;
  storeId: string;
  name: string;
  price: number;
  inStock: boolean;
  isBestSeller: boolean;
  isFeatured: boolean;
  promoLabel: 'none' | 'HOT' | 'SALE' | 'NEW';
  isCombo: boolean;
  description: string | null;
  displayOrder: number;
  imageFile?: File | null;
}) {
  const supabase = getServiceSupabase();
  const browserSafeSupabase = await getServerSupabase();
  const plan = await getPlanConfigByStoreId(browserSafeSupabase, params.storeId);
  const usage = await getStoreUsage(browserSafeSupabase, params.storeId);

  if (usage.productCount >= plan.product_limit) {
    throw new Error('Product limit reached for this plan.');
  }

  let uploadedPath: string | null = null;
  let productId: string | null = null;

  try {
    const { data: product, error: createError } = await browserSafeSupabase
      .from('products')
      .insert({
        store_id: params.storeId,
        name: params.name,
        price: params.price,
        in_stock: params.inStock,
        is_best_seller: params.isBestSeller,
        is_featured: params.isFeatured,
        promo_label: params.promoLabel,
        is_combo: params.isCombo,
        description: params.description,
        display_order: params.displayOrder,
        image_url: null,
        image_path: null
      })
      .select('id')
      .single();
    if (createError) throw createError;
    productId = product.id;

    if (params.imageFile && params.imageFile.size > 0) {
      if (usage.imageCount >= plan.photo_count_limit) throw new Error('Image limit reached for this plan.');
      const sizeKb = Math.ceil(params.imageFile.size / 1024);
      if (sizeKb > plan.image_limit_kb) throw new Error(`Image is too large. Limit: ${plan.image_limit_kb}KB.`);
      const webp = await convertImageToWebP(params.imageFile);
      const webpKb = Math.ceil(webp.length / 1024);
      if (webpKb > plan.image_limit_kb) throw new Error(`Image is still too large after optimization. Limit: ${plan.image_limit_kb}KB.`);

      uploadedPath = `${params.slug}/${productId}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(uploadedPath, webp, {
        upsert: false,
        contentType: 'image/webp',
        cacheControl: '31536000'
      });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(uploadedPath);
      const { error: updateError } = await browserSafeSupabase
        .from('products')
        .update({ image_url: publicUrlData.publicUrl, image_path: uploadedPath })
        .eq('id', productId)
        .eq('store_id', params.storeId);
      if (updateError) throw updateError;
    }

    revalidateTag(`store:${params.slug}`, 'max');
    return { ok: true };
  } catch (error) {
    if (uploadedPath) {
      await supabase.storage.from('product-images').remove([uploadedPath]);
    }
    if (productId) {
      await browserSafeSupabase.from('products').delete().eq('id', productId).eq('store_id', params.storeId);
    }
    throw error;
  }
}

export async function updateProductWithOptionalImage(params: {
  slug: string;
  storeId: string;
  productId: string;
  name: string;
  price: number;
  inStock: boolean;
  isBestSeller: boolean;
  isFeatured: boolean;
  promoLabel: 'none' | 'HOT' | 'SALE' | 'NEW';
  isCombo: boolean;
  description: string | null;
  displayOrder: number;
  imageFile?: File | null;
}) {
  const service = getServiceSupabase();
  const supabase = await getServerSupabase();
  const plan = await getPlanConfigByStoreId(supabase, params.storeId);
  const usage = await getStoreUsage(supabase, params.storeId);
  const { data: existing, error: existingError } = await supabase
    .from('products')
    .select('id, image_url, image_path')
    .eq('id', params.productId)
    .eq('store_id', params.storeId)
    .single();
  if (existingError) throw existingError;

  let newPath: string | null = null;
  try {
    let image_url = existing.image_url;
    let image_path = existing.image_path || safePathFromUrl(existing.image_url);

    if (params.imageFile && params.imageFile.size > 0) {
      const replacingWithoutOldImage = !existing.image_url;
      if (replacingWithoutOldImage && usage.imageCount >= plan.photo_count_limit) throw new Error('Image limit reached for this plan.');
      const sizeKb = Math.ceil(params.imageFile.size / 1024);
      if (sizeKb > plan.image_limit_kb) throw new Error(`Image is too large. Limit: ${plan.image_limit_kb}KB.`);
      const webp = await convertImageToWebP(params.imageFile);
      const webpKb = Math.ceil(webp.length / 1024);
      if (webpKb > plan.image_limit_kb) throw new Error(`Image is still too large after optimization. Limit: ${plan.image_limit_kb}KB.`);

      newPath = `${params.slug}/${params.productId}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`;
      const { error: uploadError } = await service.storage.from('product-images').upload(newPath, webp, {
        upsert: false,
        contentType: 'image/webp',
        cacheControl: '31536000'
      });
      if (uploadError) throw uploadError;
      const { data: publicData } = service.storage.from('product-images').getPublicUrl(newPath);
      image_url = publicData.publicUrl;
      image_path = newPath;
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({
        name: params.name,
        price: params.price,
        in_stock: params.inStock,
        is_best_seller: params.isBestSeller,
        is_featured: params.isFeatured,
        promo_label: params.promoLabel,
        is_combo: params.isCombo,
        description: params.description,
        display_order: params.displayOrder,
        image_url,
        image_path
      })
      .eq('id', params.productId)
      .eq('store_id', params.storeId);
    if (updateError) throw updateError;

    if (newPath && existing.image_path) {
      await service.storage.from('product-images').remove([existing.image_path]);
    }

    revalidateTag(`store:${params.slug}`, 'max');
    return { ok: true };
  } catch (error) {
    if (newPath) {
      await service.storage.from('product-images').remove([newPath]);
    }
    throw error;
  }
}

export async function deleteProductAndImage(params: { slug: string; storeId: string; productId: string }) {
  const service = getServiceSupabase();
  const supabase = await getServerSupabase();
  const { data: product, error: findError } = await supabase
    .from('products')
    .select('image_path, image_url')
    .eq('id', params.productId)
    .eq('store_id', params.storeId)
    .single();
  if (findError) throw findError;

  const imagePath = product.image_path || safePathFromUrl(product.image_url);
  const { error: deleteError } = await supabase.from('products').delete().eq('id', params.productId).eq('store_id', params.storeId);
  if (deleteError) throw deleteError;
  if (imagePath) {
    await service.storage.from('product-images').remove([imagePath]);
  }
  revalidateTag(`store:${params.slug}`, 'max');
  return { ok: true };
}

export const getPublicStoreCached = (slug: string) =>
  unstable_cache(
    async () => {
      const supabase = getServiceSupabase();
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id, name, slug, business_type, plan_type, location, status, promo_banner')
        .eq('slug', slug)
        .eq('status', 'active')
        .single();
      if (storeError) return null;

      const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, name, price, image_url, in_stock, is_best_seller, is_featured, promo_label, is_combo, description, display_order, created_at')
        .eq('store_id', store.id)
        .order('is_featured', { ascending: false })
        .order('is_best_seller', { ascending: false })
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (productError) throw productError;
      return { store, products };
    },
    [`public-store-${slug}`],
    { revalidate: 300, tags: [`store:${slug}`] }
  )();

export async function listMasterStores() {
  const supabase = getServiceSupabase();
  const [{ data: stores, error }, { data: attempts }, { data: actions }] = await Promise.all([
    supabase.from('stores').select('*').order('created_at', { ascending: false }),
    supabase.from('master_admin_login_attempts').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('admin_action_logs').select('*').order('created_at', { ascending: false }).limit(30)
  ]);
  if (error) throw error;
  return { stores: (stores || []) as StoreRow[], attempts: attempts || [], actions: actions || [] };
}
