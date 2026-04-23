import { notFound } from 'next/navigation';
import { getPublicStoreCached } from '@/lib/app';
import StoreView from './store-view';

export const revalidate = 300;

export default async function PublicStorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicStoreCached(slug);

  if (!data) notFound();

  return <StoreView store={data.store} products={data.products} />;
}
