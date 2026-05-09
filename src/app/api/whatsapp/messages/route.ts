import { NextResponse } from 'next/server';
import { readMessages } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const messages = readMessages();
  return NextResponse.json({ ok: true, messages });
}
