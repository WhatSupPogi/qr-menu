import { notFound } from 'next/navigation';
import { getServiceSupabase } from '@/lib/app';
import StoreView from './store-view';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

function normalizeStore(store: any) {
  return {
    id: store.id,
    name: store.name || '',
    slug: store.slug || '',
    business_type: store.business_type || 'sari_sari',
    plan_type: store.plan_type || 'basic',
    location: store.location || '',
    owner_phone: store.owner_phone || '',
    promo_banner: store.promo_banner || ''
  };
}

function normalizeProduct(product: any) {
  return {
    id: product.id,
    name: product.name || '',
    price: Number(product.price || 0),
    image_url: product.image_url || null,
    in_stock: Boolean(product.in_stock),
    is_best_seller: Boolean(product.is_best_seller),
    is_featured: Boolean(product.is_featured),
    promo_label: product.promo_label || 'none',
    is_combo: Boolean(product.is_combo),
    description: product.description || '',
    display_order: Number(product.display_order || 0),
    created_at: product.created_at || ''
  };
}

export default async function PublicStorePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = getServiceSupabase();

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, name, slug, business_type, plan_type, location, owner_phone, status, promo_banner')
    .eq('slug', slug)
    .maybeSingle();

  if (storeError) {
    return (
      <main className="store-page">
        <section className="store-hero">
          <h1>Menu is not available</h1>
          <p>Please try again later.</p>
        </section>
      </main>
    );
  }

  if (!store || store.status !== 'active') {
    notFound();
  }

  const { data: products, error: productError } = await supabase
    .from('products')
    .select(
      'id, name, price, image_url, in_stock, is_best_seller, is_featured, promo_label, is_combo, description, display_order, created_at'
    )
    .eq('store_id', store.id)
    .order('is_featured', { ascending: false })
    .order('is_best_seller', { ascending: false })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (productError) {
    return (
      <main className="store-page">
        <section className="store-hero">
          <h1>{store.name}</h1>
          <p>Menu items could not load. Please run the database update and try again.</p>
        </section>
      </main>
    );
  }

  return (
    <StoreView
      store={normalizeStore(store)}
      products={(products || []).map(normalizeProduct)}
    />
  );
}
