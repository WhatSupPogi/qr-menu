import { NextResponse } from 'next/server';
import { getServiceSupabase, requireStoreOwnershipBySlug } from '@/lib/app';

const BUCKET = 'payment-proofs';

function cleanText(value: FormDataEntryValue | null) {
  return String(value || '').trim();
}

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function validPlan(plan: string) {
  return plan === 'basic' || plan === 'standard' || plan === 'plus';
}

function validMethod(method: string) {
  return method === 'GCash' || method === 'GoTyme' || method === 'Bank';
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const slug = cleanText(form.get('slug'));
    const planType = cleanText(form.get('plan_type'));
    const paymentMethod = cleanText(form.get('payment_method'));
    const referenceNumber = cleanText(form.get('reference_number'));
    const proofFile = form.get('proof') as File | null;

    if (!slug) {
      return NextResponse.json({ error: 'Missing store.' }, { status: 400 });
    }

    if (!validPlan(planType)) {
      return NextResponse.json({ error: 'Please select a paid plan.' }, { status: 400 });
    }

    if (!validMethod(paymentMethod)) {
      return NextResponse.json({ error: 'Please select a payment method.' }, { status: 400 });
    }

    if (!referenceNumber) {
      return NextResponse.json({ error: 'Reference number is required.' }, { status: 400 });
    }

    const owned = await requireStoreOwnershipBySlug(slug);

    if (!owned.ok) {
      return NextResponse.json({ error: owned.reason }, { status: 403 });
    }

    const service = getServiceSupabase();
    let proofImageUrl: string | null = null;
    let proofImagePath: string | null = null;

    if (proofFile && proofFile.size > 0) {
      if (!proofFile.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Please upload an image proof.' }, { status: 400 });
      }

      if (proofFile.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Proof image must be under 5MB.' }, { status: 400 });
      }

      const extension = safeFileName(proofFile.name).split('.').pop() || 'jpg';
      proofImagePath = `${slug}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const bytes = await proofFile.arrayBuffer();

      const { error: uploadError } = await service.storage
        .from(BUCKET)
        .upload(proofImagePath, bytes, {
          contentType: proofFile.type || 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 400 });
      }

      const { data } = service.storage.from(BUCKET).getPublicUrl(proofImagePath);
      proofImageUrl = data.publicUrl;
    }

    const { error } = await service.from('payment_requests').insert({
      store_id: owned.store.id,
      plan_type: planType,
      payment_method: paymentMethod,
      reference_number: referenceNumber,
      proof_image_url: proofImageUrl,
      proof_image_path: proofImagePath,
      status: 'pending'
    });

    if (error) {
      if (proofImagePath) {
        await service.storage.from(BUCKET).remove([proofImagePath]);
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not submit payment.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
