import QRCode from 'qrcode';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  defaultCategoryNamesForBusinessType,
  hashText,
  isBusinessType,
  requireMasterSession,
  slugify,
  writeMasterAction
} from '@/lib/app';

function service() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

function cleanText(value: FormDataEntryValue | null) {
  return String(value || '').trim();
}

async function ensureDefaultCategories(
  supabase: ReturnType<typeof service>,
  storeId: string,
  businessType: string
) {
  const names = defaultCategoryNamesForBusinessType(businessType);
  const rows = names.map((name, index) => ({
    store_id: storeId,
    name,
    slug: slugify(name) || 'others',
    display_order: index,
    is_active: true
  }));

  const { error } = await supabase
    .from('store_categories')
    .upsert(rows, { onConflict: 'store_id,slug', ignoreDuplicates: true });

  if (error) throw error;
}

export async function GET(request: Request) {
  await requireMasterSession();

  const url = new URL(request.url);
  const slug = cleanText(url.searchParams.get('slug'));

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  const target = `${url.origin}/store/${encodeURIComponent(slug)}`;
  const buffer = await QRCode.toBuffer(target, { width: 600, margin: 2 });
  const body = new Uint8Array(buffer);

  await writeMasterAction('download_qr', { slug, target });

  return new Response(body, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${slug}-qr.png"`,
      'Content-Length': String(body.byteLength),
      'Cache-Control': 'no-store'
    }
  });
}

export async function POST(request: Request) {
  await requireMasterSession();

  const supabase = service();
  const form = await request.formData();
  const mode = cleanText(form.get('mode')) || 'create';
  const origin = new URL(request.url).origin;

  if (mode === 'status') {
    const store_id = cleanText(form.get('store_id'));
    const status = cleanText(form.get('status'));

    if (!store_id || !['active', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status update.' }, { status: 400 });
    }

    const { error } = await supabase.from('stores').update({ status }).eq('id', store_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await writeMasterAction('update_store_status', { store_id, status });
    return NextResponse.redirect(new URL('/master', origin));
  }

  if (mode === 'plan') {
    const store_id = cleanText(form.get('store_id'));
    const plan_type = cleanText(form.get('plan_type'));

    if (!store_id || !['free', 'basic', 'standard', 'plus'].includes(plan_type)) {
      return NextResponse.json({ error: 'Invalid plan update.' }, { status: 400 });
    }

    const { error } = await supabase.from('stores').update({ plan_type }).eq('id', store_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await writeMasterAction('update_store_plan', { store_id, plan_type });
    return NextResponse.redirect(new URL('/master', origin));
  }

  if (mode === 'update_store') {
    const store_id = cleanText(form.get('store_id'));
    const business_type = cleanText(form.get('business_type')) || 'sari_sari';
    const name = cleanText(form.get('name'));
    const owner_name = cleanText(form.get('owner_name'));
    const owner_phone = cleanText(form.get('owner_phone'));
    const location = cleanText(form.get('location'));
    const monthly_price = Number(form.get('monthly_price') || 0);
    const promo_banner = cleanText(form.get('promo_banner')).slice(0, 180);

    if (!store_id || !isBusinessType(business_type) || !name || !owner_name || !owner_phone || !location) {
      return NextResponse.json({ error: 'Missing store information.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('stores')
      .update({ name, business_type, owner_name, owner_phone, location, monthly_price, promo_banner })
      .eq('id', store_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await ensureDefaultCategories(supabase, store_id, business_type);
    await writeMasterAction('update_store_info', { store_id, business_type });
    return NextResponse.redirect(new URL('/master', origin));
  }

  if (mode === 'update_login') {
    const store_id = cleanText(form.get('store_id'));
    const admin_email = cleanText(form.get('admin_email')).toLowerCase();
    const admin_password = cleanText(form.get('admin_password'));

    if (!store_id || !admin_email) {
      return NextResponse.json({ error: 'Admin email is required.' }, { status: 400 });
    }

    const { data: currentAdmin } = await supabase
      .from('admin_users')
      .select('auth_id')
      .eq('store_id', store_id)
      .maybeSingle();

    if (currentAdmin?.auth_id) {
      const updatePayload: { email: string; password?: string; email_confirm?: boolean } = {
        email: admin_email,
        email_confirm: true
      };

      if (admin_password) updatePayload.password = admin_password;

      const { error: updateError } = await supabase.auth.admin.updateUserById(currentAdmin.auth_id, updatePayload);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
    } else {
      if (!admin_password) {
        return NextResponse.json({ error: 'Password is required for a new admin account.' }, { status: 400 });
      }

      const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
        email: admin_email,
        password: admin_password,
        email_confirm: true
      });

      if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });

      if (createdUser.user) {
        const { error: linkError } = await supabase
          .from('admin_users')
          .insert({ store_id, auth_id: createdUser.user.id, role: 'owner' });

        if (linkError) return NextResponse.json({ error: linkError.message }, { status: 400 });
      }
    }

    await writeMasterAction('update_store_login', {
      store_id,
      admin_email,
      password_hash: admin_password ? hashText(admin_password) : null
    });

    return NextResponse.redirect(new URL('/master', origin));
  }

  if (mode === 'delete_store') {
    const store_id = cleanText(form.get('store_id'));

    if (!store_id) {
      return NextResponse.json({ error: 'Missing store id.' }, { status: 400 });
    }

    const { data: products } = await supabase
      .from('products')
      .select('image_path')
      .eq('store_id', store_id)
      .not('image_path', 'is', null);

    const imagePaths = (products || [])
      .map((row: any) => row.image_path)
      .filter(Boolean);

    if (imagePaths.length > 0) {
      await supabase.storage.from('product-images').remove(imagePaths);
    }

    const { data: admins } = await supabase
      .from('admin_users')
      .select('auth_id')
      .eq('store_id', store_id);

    const authIds = (admins || [])
      .map((row: any) => row.auth_id)
      .filter(Boolean);

    const { error } = await supabase.from('stores').delete().eq('id', store_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    for (const authId of authIds) {
      await supabase.auth.admin.deleteUser(authId);
    }

    await writeMasterAction('delete_store', { store_id });
    return NextResponse.redirect(new URL('/master', origin));
  }

  const name = cleanText(form.get('name'));
  const business_type = cleanText(form.get('business_type')) || 'sari_sari';
  const plan_type = cleanText(form.get('plan_type')) || 'basic';
  const owner_name = cleanText(form.get('owner_name'));
  const owner_phone = cleanText(form.get('owner_phone'));
  const location = cleanText(form.get('location'));
  const monthly_price = Number(form.get('monthly_price') || 0);
  const admin_email = cleanText(form.get('admin_email')).toLowerCase();
  const admin_password = cleanText(form.get('admin_password'));

  if (!name || !isBusinessType(business_type) || !owner_name || !owner_phone || !location) {
    return NextResponse.json({ error: 'Missing required store fields.' }, { status: 400 });
  }

  let slug = slugify(name);
  const { data: existing } = await supabase.from('stores').select('slug').eq('slug', slug).maybeSingle();
  if (existing) slug = `${slug}-${Math.floor(Date.now() / 1000)}`;

  const { data: store, error } = await supabase
    .from('stores')
    .insert({
      name,
      slug,
      business_type,
      plan_type,
      owner_name,
      owner_phone,
      location,
      monthly_price,
      status: 'active'
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  try {
    await ensureDefaultCategories(supabase, store.id, business_type);
  } catch (categoryError) {
    return NextResponse.json({
      error: categoryError instanceof Error ? categoryError.message : 'Could not create default categories.'
    }, { status: 400 });
  }

  if (admin_email && admin_password) {
    const { data: createdUser, error: authError } = await supabase.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: { store_slug: slug }
    });

    if (!authError && createdUser.user) {
      await supabase.from('admin_users').insert({
        store_id: store.id,
        auth_id: createdUser.user.id,
        role: 'owner'
      });
    }
  }

  await writeMasterAction('create_store', {
    store_id: store.id,
    slug,
    admin_email: admin_email || null,
    password_hash: admin_password ? hashText(admin_password) : null
  });

  return NextResponse.redirect(new URL('/master', origin));
}
