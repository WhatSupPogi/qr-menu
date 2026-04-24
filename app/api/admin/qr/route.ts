import QRCode from 'qrcode';
import { NextResponse } from 'next/server';
import { requireStoreOwnershipBySlug } from '@/lib/app';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') || '').trim();

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  const owned = await requireStoreOwnershipBySlug(slug);

  if (!owned.ok) {
    return NextResponse.json({ error: owned.reason }, { status: 403 });
  }

  const target = `${url.origin}/store/${encodeURIComponent(slug)}`;
  const buffer = await QRCode.toBuffer(target, { width: 600, margin: 2 });
  const body = new Uint8Array(buffer);

  return new Response(body, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${slug}-qr.png"`,
      'Content-Length': String(body.byteLength),
      'Cache-Control': 'no-store'
    }
  });
}
