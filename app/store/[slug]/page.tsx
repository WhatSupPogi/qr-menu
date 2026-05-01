import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import StoreClient from './StoreClient';

export const revalidate = 300;

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  owner_phone: string | null;
  location: string | null;
  status: string;
  promo_banner?: string | null;
};

type ProductRow = {
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

function getPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Missing public Supabase environment variables.');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

const getCachedPublicStore = unstable_cache(
  async (slug: string) => {
    const supabase = getPublicSupabase();

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, slug, owner_phone, location, status, promo_banner')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle();

    if (storeError) {
      throw new Error(storeError.message);
    }

    if (!store) {
      return null;
    }

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(
        'id, name, price, image_url, in_stock, is_best_seller, is_featured, promo_label, is_combo, description, display_order, created_at'
      )
      .eq('store_id', store.id)
      .order('is_featured', { ascending: false })
      .order('is_best_seller', { ascending: false })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (productsError) {
      throw new Error(productsError.message);
    }

    return {
      store: store as StoreRow,
      products: (products || []) as ProductRow[]
    };
  },
  ['public-store-page-v2'],
  {
    revalidate: 300
  }
);

export default async function PublicStorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCachedPublicStore(slug);

  if (!data) {
    notFound();
  }

  return <StoreClient store={data.store} products={data.products} />;
}
