import { NextResponse } from 'next/server';
import { getServiceSupabase, requireMasterSession, writeMasterAction } from '@/lib/app';

function cleanText(value: FormDataEntryValue | null) {
  return String(value || '').trim();
}

export async function POST(request: Request) {
  await requireMasterSession();

  const form = await request.formData();
  const action = cleanText(form.get('action'));
  const requestId = cleanText(form.get('request_id'));
  const origin = new URL(request.url).origin;

  if (!requestId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid payment action.' }, { status: 400 });
  }

  const service = getServiceSupabase();

  const { data: payment, error: readError } = await service
    .from('payment_requests')
    .select('id, store_id, plan_type, status')
    .eq('id', requestId)
    .maybeSingle();

  if (readError || !payment) {
    return NextResponse.json({ error: readError?.message || 'Payment request not found.' }, { status: 404 });
  }

  if (action === 'approve') {
    const { error: storeError } = await service
      .from('stores')
      .update({
        plan_type: payment.plan_type,
        status: 'active'
      })
      .eq('id', payment.store_id);

    if (storeError) {
      return NextResponse.json({ error: storeError.message }, { status: 400 });
    }

    const { error: paymentError } = await service
      .from('payment_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 400 });
    }

    await writeMasterAction('approve_payment_request', {
      request_id: requestId,
      store_id: payment.store_id,
      plan_type: payment.plan_type
    });

    return NextResponse.redirect(new URL('/master', origin));
  }

  const { error: rejectError } = await service
    .from('payment_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);

  if (rejectError) {
    return NextResponse.json({ error: rejectError.message }, { status: 400 });
  }

  await writeMasterAction('reject_payment_request', {
    request_id: requestId,
    store_id: payment.store_id,
    plan_type: payment.plan_type
  });

  return NextResponse.redirect(new URL('/master', origin));
}
