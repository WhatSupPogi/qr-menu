import { NextResponse } from 'next/server';
import { getServiceSupabase, requireStoreOwnershipBySlug } from '@/lib/app';

const BUCKET = 'payment-proofs';
const text = (v: FormDataEntryValue | null) => String(v || '').trim();
const safe = (name: string) => name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const slug = text(form.get('slug'));
    const plan_type = text(form.get('plan_type'));
    const payment_method = text(form.get('payment_method'));
    const reference_number = text(form.get('reference_number'));
    const proof = form.get('proof') as File | null;

    if (!slug) return NextResponse.json({ error: 'Missing store.' }, { status: 400 });
    if (!['basic', 'standard', 'plus'].includes(plan_type)) return NextResponse.json({ error: 'Please select a paid plan.' }, { status: 400 });
    if (!['GCash', 'GoTyme', 'Bank'].includes(payment_method)) return NextResponse.json({ error: 'Please select a payment method.' }, { status: 400 });
    if (!reference_number) return NextResponse.json({ error: 'Reference number is required.' }, { status: 400 });

    const owned = await requireStoreOwnershipBySlug(slug);
    if (!owned.ok) return NextResponse.json({ error: owned.reason }, { status: 403 });

    const service = getServiceSupabase();
    let proof_image_url: string | null = null;
    let proof_image_path: string | null = null;

    if (proof && proof.size > 0) {
      if (!proof.type.startsWith('image/')) return NextResponse.json({ error: 'Please upload an image proof.' }, { status: 400 });
      if (proof.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Proof image must be under 5MB.' }, { status: 400 });

      const ext = safe(proof.name).split('.').pop() || 'jpg';
      proof_image_path = `${slug}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const bytes = await proof.arrayBuffer();
      const upload = await service.storage.from(BUCKET).upload(proof_image_path, bytes, { contentType: proof.type || 'image/jpeg', upsert: false });
      if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 400 });
      proof_image_url = service.storage.from(BUCKET).getPublicUrl(proof_image_path).data.publicUrl;
    }

    const { error } = await service.from('payment_requests').insert({
      store_id: owned.store.id,
      plan_type,
      payment_method,
      reference_number,
      proof_image_url,
      proof_image_path,
      status: 'pending'
    });

    if (error) {
      if (proof_image_path) await service.storage.from(BUCKET).remove([proof_image_path]);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not submit payment.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
