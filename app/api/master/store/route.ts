import QRCode from 'qrcode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { slugify, requireMasterSession, writeMasterAction, getBaseUrl, hashText } from '@/lib/app';

function service() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function GET(request: Request) {
  await requireMasterSession();
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  const target = `${getBaseUrl()}/store/${slug}`;
  const buffer = await QRCode.toBuffer(target, { width: 600, margin: 2 });
  await writeMasterAction('download_qr', { slug, target });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${slug}-qr.png"`,
    },
  });
}

export async function POST(request: Request) {
  await requireMasterSession();
  const supabase = service();
  const form = await request.formData();
  const mode = String(form.get('mode') || 'create');
  const origin = new URL(request.url).origin;

  if (mode === 'status') {
    const store_id = String(form.get('store_id') || '');
    const status = String(form.get('status') || '');
    await supabase.from('stores').update({ status }).eq('id', store_id);
    await writeMasterAction('update_store_status', { store_id, status });
    return NextResponse.redirect(new URL('/master', origin));
  }

  if (mode === 'plan') {
    const store_id = String(form.get('store_id') || '');
    const plan_type = String(form.get('plan_type') || '');
    await supabase.from('stores').update({ plan_type }).eq('id', store_id);
    await writeMasterAction('update_store_plan', { store_id, plan_type });
    return NextResponse.redirect(new URL('/master', origin));
  }

  const name = String(form.get('name') || '').trim();
  const business_type = String(form.get('business_type') || 'sari_sari');
  const plan_type = String(form.get('plan_type') || 'basic');
  const owner_name = String(form.get('owner_name') || '').trim();
  const owner_phone = String(form.get('owner_phone') || '').trim();
  const location = String(form.get('location') || '').trim();
  const monthly_price = Number(form.get('monthly_price') || 0);
  const admin_email = String(form.get('admin_email') || '').trim().toLowerCase();
  const admin_password = String(form.get('admin_password') || '').trim();

  let slug = slugify(name);
  const { data: existing } = await supabase.from('stores').select('slug').eq('slug', slug).maybeSingle();
  if (existing) slug = `${slug}-${Math.floor(Date.now() / 1000)}`;

  const { data: store, error } = await supabase
    .from('stores')
    .insert({ name, slug, business_type, plan_type, owner_name, owner_phone, location, monthly_price, status: 'active' })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (admin_email && admin_password) {
    const { data: createdUser, error: authError } = await supabase.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: { store_slug: slug }
    });
    if (!authError && createdUser.user) {
      await supabase.from('admin_users').insert({ store_id: store.id, auth_id: createdUser.user.id, role: 'owner' });
    }
  }

  await writeMasterAction('create_store', { store_id: store.id, slug, admin_email: admin_email || null, password_hash: admin_password ? hashText(admin_password) : null });
  return NextResponse.redirect(new URL('/master', origin));
}
