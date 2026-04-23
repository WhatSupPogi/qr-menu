import { NextResponse } from 'next/server';
import { destroyMasterSession, writeMasterAction } from '@/lib/app';

export async function POST(request: Request) {
  await writeMasterAction('master_logout', {});
  await destroyMasterSession();
  return NextResponse.redirect(new URL('/master/login', request.url));
}
