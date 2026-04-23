import { NextResponse } from 'next/server';
import { createMasterSession, recordMasterLoginAttempt, validateMasterLoginAllowed, writeMasterAction } from '@/lib/app';

export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get('username') || '').trim();
  const password = String(form.get('password') || '');
  const origin = new URL(request.url).origin;

  const gate = await validateMasterLoginAllowed(username);
  if (!gate.ok) {
    await recordMasterLoginAttempt(username, false);
    return NextResponse.redirect(new URL(`/master/login?error=${encodeURIComponent(gate.message)}`, origin));
  }

  const valid = username === process.env.MASTER_ADMIN_USERNAME && password === process.env.MASTER_ADMIN_PASSWORD;
  await recordMasterLoginAttempt(username, valid);

  if (!valid) {
    return NextResponse.redirect(new URL('/master/login?error=Invalid%20login', origin));
  }

  const sessionId = await createMasterSession();
  await writeMasterAction('master_login', { username, sessionId });
  return NextResponse.redirect(new URL('/master', origin));
}
