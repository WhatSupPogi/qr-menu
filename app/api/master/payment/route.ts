import { NextResponse } from 'next/server';
import { getServiceSupabase, requireMasterSession, writeMasterAction } from '@/lib/app';

const text = (v: FormDataEntryValue | null) => String(v || '').trim();

export async function POST(request: Request) {
  await requireMasterSession();
  const form = await request.formData();
  const action = text(form.get('action'));
  const request_id = text(form.get('request_id'));
  const origin = new URL(request.url).origin;

  if (!request_id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid payment action.' }, { status: 400 });
  }

  const service = getServiceSupabase();
  const { data: payment, error: readError } = await service
    .from('payment_requests')
    .select('id, store_id, plan_type, status')
    .eq('id', request_id)
    .maybeSingle();

  if (readError || !payment) {
    return NextResponse.json({ error: readError?.message || 'Payment request not found.' }, { status: 404 });
  }

  if (action === 'approve') {
    const storeUpdate = await service.from('stores').update({ plan_type: payment.plan_type, status: 'active' }).eq('id', payment.store_id);
    if (storeUpdate.error) return NextResponse.json({ error: storeUpdate.error.message }, { status: 400 });

    const paymentUpdate = await service.from('payment_requests').update({ status: 'approved' }).eq('id', request_id);
    if (paymentUpdate.error) return NextResponse.json({ error: paymentUpdate.error.message }, { status: 400 });

    await writeMasterAction('approve_payment_request', { request_id, store_id: payment.store_id, plan_type: payment.plan_type });
    return NextResponse.redirect(new URL('/master', origin));
  }

  const reject = await service.from('payment_requests').update({ status: 'rejected' }).eq('id', request_id);
  if (reject.error) return NextResponse.json({ error: reject.error.message }, { status: 400 });

  await writeMasterAction('reject_payment_request', { request_id, store_id: payment.store_id, plan_type: payment.plan_type });
  return NextResponse.redirect(new URL('/master', origin));
}
