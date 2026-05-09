import { NextRequest, NextResponse } from 'next/server';
import { appendMessage, WhatsAppMessage } from '@/lib/whatsapp';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers.get('x-webhook-secret');
    if (auth !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const msg = body as Partial<WhatsAppMessage>;
  if (!msg.from || !msg.body || !msg.timestamp) {
    return NextResponse.json({ error: 'Missing required fields: from, body, timestamp' }, { status: 400 });
  }

  const message: WhatsAppMessage = {
    id: msg.id ?? `${msg.from}-${msg.timestamp}`,
    from: msg.from,
    fromName: msg.fromName,
    body: msg.body,
    timestamp: msg.timestamp,
    isGroup: msg.isGroup ?? false,
    groupName: msg.groupName,
  };

  appendMessage(message);
  return NextResponse.json({ ok: true });
}
