import fs from 'fs';
import path from 'path';

export interface WhatsAppMessage {
  id: string;
  from: string;
  fromName?: string;
  body: string;
  timestamp: number;
  isGroup: boolean;
  groupName?: string;
}

export interface WhatsAppResult {
  ok: true;
  messages: WhatsAppMessage[];
}

export interface WhatsAppError {
  ok: false;
  error: string;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'whatsapp-messages.json');
const MAX_MESSAGES = 50;

export function readMessages(): WhatsAppMessage[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as WhatsAppMessage[];
  } catch {
    return [];
  }
}

export function appendMessage(msg: WhatsAppMessage): void {
  const messages = readMessages();
  // Deduplicate by id
  if (messages.find((m) => m.id === msg.id)) return;
  messages.unshift(msg);
  const trimmed = messages.slice(0, MAX_MESSAGES);
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(trimmed, null, 2));
}

export async function fetchWhatsAppMessages(): Promise<WhatsAppResult | WhatsAppError> {
  try {
    const messages = readMessages();
    return { ok: true, messages };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
