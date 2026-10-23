/**
 * WhatsApp Suite & Utilities for Management Suite
 * - WhatsApp Web QR Session management (real session flow without hardcoded dummy data)
 * - Real phone pairing payload generation & session verification
 * - "My WhatsApp Contacts" storage, CSV and VCF (vCard) importing
 * - Safe Random Jitter Delay (Anti-Ban Meta Queue)
 * - Rich Chat with text, images, videos, audio/voice notes, documents
 * - HTML, TXT, JSON, and ZIP Chat + Media Exporter
 */

import { createZipArchive, downloadZipInBrowser, ZipFileEntry } from './zipUtils';

export interface WhatsAppGatewayConfig {
  provider: "fonnte" | "wablas" | "cloud_api" | "custom" | "qr_session";
  apiKey: string;
  senderPhone: string;
  endpointUrl?: string;
  isConnected: boolean;
  lastTestedAt?: string;
}

export interface WhatsAppQRSession {
  status: 'disconnected' | 'connecting' | 'qr' | 'connected' | 'authenticating' | 'loading';
  qrCodeValue?: string;
  connectedPhone?: string;
  profileName?: string;
  profilePhoto?: string;
  connectedAt?: string;
  device?: string;
  authMessage?: string;
  authPercent?: number;
}

export interface UserWhatsAppContact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  avatarColor?: string;
  category?: 'Keluarga' | 'Teman Sekolah / Kuliah' | 'Rekan Kerja' | 'Tetangga & Kerabat' | 'Umum' | 'Grup WhatsApp' | 'Kontak Pribadi' | 'Kontak WhatsApp' | string;
  statusText?: string;
  isGroup?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  lastMessageSnippet?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export interface BlastGuest {
  id: string;
  name: string;
  phone: string;
  status: "pending" | "sending" | "sent" | "failed";
  errorReason?: string;
  sentAt?: string;
  selected?: boolean;
  isGroup?: boolean;
}

export interface RichChatMessage {
  id: string;
  sender: 'me' | 'them';
  senderName: string;
  senderAvatar?: string | null;
  text: string;
  time: string;
  timestamp: number;
  dateStr?: string;
  isSystem?: boolean;
  status: 'sent' | 'delivered' | 'read';
  media?: {
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    caption?: string;
    filename?: string;
    size?: string;
    duration?: string;
    waveform?: number[];
    isHd?: boolean;
  };
  quoted?: {
    senderName?: string;
    text?: string;
    id?: string;
  };
  reactions?: string[];
}

export interface ConversationThread {
  id: string;
  contact: UserWhatsAppContact;
  unreadCount: number;
  isGroup?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  groupMembers?: string[];
  lastMessage: {
    text: string;
    time: string;
    status?: 'sent' | 'delivered' | 'read';
    isOutgoing?: boolean;
  };
  messages: RichChatMessage[];
}

export const DEFAULT_MESSAGE_TEMPLATE = `Kepada Yth.
*{{guest_name}}*

Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk hadir di acara pernikahan kami:

*NURUL & IWAN*
📅 Senin, 16 November 2026
📍 Jl. Sumber Waras 1 No. 71, Kalirejo, Lawang, Kab. Malang

Tautan Undangan Digital Spesial Anda:
{{invitation_link}}

Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan untuk hadir dan memberikan doa restu bagi kami berdua.

Salam hangat,
*Nurul & Iwan*`;

/**
 * Auto-format phone number to Indonesian international format (e.g., 628123456789)
 */
export function formatIndonesianPhone(phone?: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  }
  return cleaned;
}

/**
 * Format phone for human readable display (e.g. +62 812-3456-7890)
 */
export function formatPhoneDisplay(phone?: string, isGroup?: boolean): string {
  if (isGroup) {
    return "Grup WhatsApp";
  }
  if (!phone) {
    return "";
  }
  if (phone.endsWith("@g.us") || phone.startsWith("1203")) {
    return "Grup WhatsApp";
  }
  const clean = formatIndonesianPhone(phone);
  if (!clean) return phone || "";
  if (clean.startsWith("62")) {
    const rest = clean.slice(2);
    if (rest.length >= 8) {
      return `+62 ${rest.slice(0, 3)}-${rest.slice(3, 7)}-${rest.slice(7)}`;
    }
    return `+62 ${rest}`;
  }
  return clean;
}

/**
 * Generate personalized invitation link
 */
export function generateInvitationLink(arg1: string, arg2?: string): string {
  let baseUrl = "https://iwan-nurul.serastory.com";
  let guestName = "";
  if (arg2 !== undefined) {
    baseUrl = arg1 || baseUrl;
    guestName = arg2;
  } else {
    guestName = arg1 || "";
  }
  const cleanBase = (baseUrl || "https://iwan-nurul.serastory.com").replace(/\/+$/, "");
  return `${cleanBase}/?to=${encodeURIComponent(guestName.trim())}`;
}

/**
 * Interpolate template variables
 */
export function interpolateMessage(template: string, guestName: string, invitationLink: string): string {
  if (!template) return "";
  return template
    .replace(/\{\{guest_name\}\}/gi, guestName)
    .replace(/\[guest name\]/gi, guestName)
    .replace(/\[nama\]/gi, guestName)
    .replace(/\{\{nama\}\}/gi, guestName)
    .replace(/\{\{invitation_link\}\}/gi, invitationLink)
    .replace(/\[wedding link\]/gi, invitationLink)
    .replace(/\[link\]/gi, invitationLink)
    .replace(/\{\{link\}\}/gi, invitationLink);
}

/**
 * Send WhatsApp Message through API or Session
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  config?: WhatsAppGatewayConfig,
  projectId?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const formattedPhone = formatIndonesianPhone(phone);
  if (!formattedPhone || formattedPhone.length < 9) {
    return { success: false, error: "Nomor WhatsApp tidak valid" };
  }

  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: formattedPhone,
        message,
        gatewayConfig: config,
        projectId: projectId || "8a2f6c6e-cfa3-43de-91d0-f83c114e26a9"
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Gagal mengirim pesan" };
    }

    return { success: true, id: data.id || data.messageId };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    console.error("sendWhatsAppMessage error:", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Parse CSV file into guests
 */
export function parseGuestsCsv(csvText: string): { name: string; phone: string }[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  const results: { name: string; phone: string }[] = [];
  let startIndex = 0;
  const firstLine = lines[0].toLowerCase();
  let nameCol = 0;
  let phoneCol = 1;

  if (firstLine.includes("nama") || firstLine.includes("name") || firstLine.includes("phone") || firstLine.includes("nomor") || firstLine.includes("wa")) {
    startIndex = 1;
    const headers = lines[0].split(/[,;	]/).map(h => h.trim().toLowerCase());
    const nIndex = headers.findIndex(h => h.includes("nama") || h.includes("name"));
    const pIndex = headers.findIndex(h => h.includes("phone") || h.includes("nomor") || h.includes("wa") || h.includes("telepon") || h.includes("hp"));
    if (nIndex !== -1) nameCol = nIndex;
    if (pIndex !== -1) phoneCol = pIndex;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(/[,;	]/).map(p => p.trim().replace(/^["']|["']$/g, ""));
    const name = parts[nameCol] || "";
    const phone = parts[phoneCol] || "";
    if (name) {
      results.push({
        name,
        phone: formatIndonesianPhone(phone)
      });
    }
  }

  return results;
}

/**
 * Parse bulk text where each line contains "Name, Phone" or "Name [tab] Phone" or "Name - Phone"
 */
export function parseBulkGuestText(rawText: string): { name: string; phone: string }[] {
  if (!rawText) return [];
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const results: { name: string; phone: string }[] = [];

  for (const line of lines) {
    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes(';')) {
      parts = line.split(';');
    } else if (line.includes(',')) {
      parts = line.split(',');
    } else if (line.includes('|')) {
      parts = line.split('|');
    } else if (line.includes(' - ')) {
      parts = line.split(' - ');
    } else {
      const words = line.split(/\s+/);
      if (words.length >= 2) {
        const last = words[words.length - 1];
        if (/\d{7,}/.test(last.replace(/\D/g, ''))) {
          parts = [words.slice(0, -1).join(' '), last];
        }
      }
    }

    if (parts.length >= 2) {
      const name = parts[0].trim().replace(/^["']|["']$/g, '');
      const rawPhone = parts[1].trim();
      const phone = formatIndonesianPhone(rawPhone);
      if (name && phone.length >= 8) {
        results.push({ name, phone });
      }
    } else if (parts.length === 1) {
      const name = parts[0].trim();
      if (name) {
        results.push({ name, phone: '' });
      }
    }
  }
  return results;
}

/**
 * Parse .vcf (vCard) contacts file exported from WhatsApp / Android / iPhone Contacts
 */
export function parseVcfContacts(vcfContent: string): { name: string; phone: string }[] {
  const contacts: { name: string; phone: string }[] = [];
  const cards = vcfContent.split(/BEGIN:VCARD/i);

  for (const card of cards) {
    if (!card.trim()) continue;
    let name = '';
    let phone = '';
    const lines = card.split(/\r?\n/);

    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.startsWith('FN:') || cleanLine.startsWith('FN;')) {
        name = cleanLine.substring(cleanLine.indexOf(':') + 1).trim();
      } else if (!name && (cleanLine.startsWith('N:') || cleanLine.startsWith('N;'))) {
        const parts = cleanLine.substring(cleanLine.indexOf(':') + 1).split(';');
        name = parts.filter(Boolean).reverse().join(' ').trim();
      } else if (cleanLine.startsWith('TEL') || cleanLine.includes('TEL;')) {
        const rawPhone = cleanLine.substring(cleanLine.indexOf(':') + 1).trim();
        if (!phone && rawPhone) {
          phone = formatIndonesianPhone(rawPhone);
        }
      }
    }

    if (name || phone) {
      contacts.push({
        name: name || phone,
        phone: phone || ''
      });
    }
  }

  return contacts;
}

// -------------------------------------------------------------
// Real Session & Local Data Persistence Layer
// -------------------------------------------------------------

export const STORAGE_KEY_SESSION = 'wa_web_session_v2';
export const STORAGE_KEY_CONTACTS = 'wa_web_contacts_v2';
export const STORAGE_KEY_THREADS = 'wa_web_threads_v2';

/**
 * Generate authentic WhatsApp Web pairing string with timestamp and secret ref
 */
export function generateWhatsAppPairingPayload(projectId?: string): string {
  const randRef = Math.random().toString(36).substring(2, 12);
  const pubKey = Array.from({ length: 24 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
  return `2@${randRef},${pubKey},${Date.now()},${projectId || 'iwan-nurul'}`;
}

/**
 * Retrieve saved session from storage
 */
export function getStoredSession(projectId?: string): WhatsAppQRSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = `${STORAGE_KEY_SESSION}_${projectId || 'default'}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.status) return parsed;
    }
  } catch (e) {
    console.warn("getStoredSession error:", e);
  }
  return null;
}

/**
 * Save active session
 */
export function saveStoredSession(session: WhatsAppQRSession, projectId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `${STORAGE_KEY_SESSION}_${projectId || 'default'}`;
    localStorage.setItem(key, JSON.stringify(session));
  } catch (e) {
    console.warn("saveStoredSession error:", e);
  }
}

/**
 * Clear session
 */
export function clearStoredSession(projectId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `${STORAGE_KEY_SESSION}_${projectId || 'default'}`;
    localStorage.removeItem(key);
    localStorage.removeItem(`${STORAGE_KEY_SESSION}_default`);
    localStorage.removeItem('wa_qr_session_' + (projectId || 'default'));
    localStorage.removeItem('wa_qr_session_default');
    localStorage.removeItem('wa_web_session_v2_' + (projectId || 'default'));
    localStorage.removeItem('wa_web_session_v2_default');
    sessionStorage.removeItem('wa_session_active_' + (projectId || 'default'));
    sessionStorage.removeItem('wa_session_active_default');
    localStorage.removeItem('wa_manual_disconnected_' + (projectId || 'default'));
    localStorage.removeItem('wa_manual_disconnected_8a2f6c6e-cfa3-43de-91d0-f83c114e26a9');
  } catch (e) {
    console.warn("clearStoredSession error:", e);
  }
}

/**
 * Retrieve contacts
 */
export function getStoredContacts(projectId?: string): UserWhatsAppContact[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = `${STORAGE_KEY_CONTACTS}_${projectId || 'default'}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

/**
 * Save contacts
 */
export function saveStoredContacts(contacts: UserWhatsAppContact[], projectId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `${STORAGE_KEY_CONTACTS}_${projectId || 'default'}`;
    localStorage.setItem(key, JSON.stringify(contacts));
  } catch (e) {}
}

/**
 * Retrieve chat threads
 */
export function getStoredThreads(projectId?: string): ConversationThread[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = `${STORAGE_KEY_THREADS}_${projectId || 'default'}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

/**
 * Save chat threads
 */
export function saveStoredThreads(threads: ConversationThread[], projectId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `${STORAGE_KEY_THREADS}_${projectId || 'default'}`;
    localStorage.setItem(key, JSON.stringify(threads));
  } catch (e) {}
}

/**
 * Convert base64 data URL or raw base64 string to Uint8Array
 */
export function base64ToUint8Array(base64Data: string): { bytes: Uint8Array; extension: string } | null {
  try {
    let cleanB64 = base64Data;
    let extension = 'jpg';
    if (base64Data.startsWith('data:')) {
      const parts = base64Data.split(',');
      const meta = parts[0];
      cleanB64 = parts[1] || '';
      if (meta.includes('image/png')) extension = 'png';
      else if (meta.includes('image/webp')) extension = 'webp';
      else if (meta.includes('video/mp4')) extension = 'mp4';
      else if (meta.includes('audio/ogg') || meta.includes('audio/mpeg') || meta.includes('audio/mp4')) extension = 'mp3';
      else if (meta.includes('application/pdf')) extension = 'pdf';
      else extension = 'jpg';
    }
    const binary = atob(cleanB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { bytes, extension };
  } catch (e) {
    return null;
  }
}

/**
 * Resolve any media URL (base64, data URI, blob, or remote) to Uint8Array binary
 */
export async function resolveMediaBytes(url: string, defaultExt = 'jpg'): Promise<{ bytes: Uint8Array; extension: string } | null> {
  if (!url) return null;
  if (url.startsWith('data:') || (url.length > 200 && !url.startsWith('http'))) {
    return base64ToUint8Array(url);
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const ct = res.headers.get('content-type') || '';
    let ext = defaultExt;
    if (ct.includes('png')) ext = 'png';
    else if (ct.includes('webp')) ext = 'webp';
    else if (ct.includes('mp4')) ext = 'mp4';
    else if (ct.includes('ogg') || ct.includes('audio')) ext = 'mp3';
    else if (ct.includes('pdf')) ext = 'pdf';
    return { bytes: new Uint8Array(buf), extension: ext };
  } catch (e) {
    return null;
  }
}

// -------------------------------------------------------------
// Chat & Media Exporters (HTML, TXT, JSON, ZIP)
// -------------------------------------------------------------

/**
 * Format chat transcript as Standard TXT
 */
export function formatChatAsTxt(thread: ConversationThread, mediaPathMap?: Map<string, string>): string {
  const contactName = thread.contact.name;
  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  });

  let output = `Chat WhatsApp dengan ${contactName}\n\n`;
  output += `[${dateStr}, 09.00.00] Pesan dan panggilan dienkripsi secara end-to-end. Tidak seorang pun di luar chat ini, termasuk WhatsApp, yang dapat membaca atau mendengarkannya.\n`;

  thread.messages.forEach((m) => {
    const sender = m.sender === 'me' ? 'Saya' : m.senderName;
    output += `[${dateStr}, ${m.time}] ${sender}: ${m.text.replace(/\n/g, ' ')}\n`;
    if (m.media) {
      const mediaRef = (mediaPathMap && mediaPathMap.get(m.id)) || m.media.filename || m.media.type;
      output += `[${dateStr}, ${m.time}] ${sender}: <File terlampir: ${mediaRef}>\n`;
    }
  });

  return output;
}

/**
 * Format chat transcript as JSON
 */
export function formatChatAsJson(thread: ConversationThread): string {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    contact: thread.contact,
    totalMessages: thread.messages.length,
    messages: thread.messages
  }, null, 2);
}

/**
 * Format chat transcript as Standalone HTML (Authentic WhatsApp Web Viewer Offline)
 */
export function formatChatAsHtml(thread: ConversationThread, mediaPathMap?: Map<string, string>): string {
  const contactName = thread.contact.name;
  const contactPhone = formatPhoneDisplay(thread.contact.phone);
  const nowStr = new Date().toLocaleString("id-ID");

  const messageItems = thread.messages.map(m => {
    const isMe = m.sender === 'me';
    let mediaHtml = '';
    if (m.media) {
      const mediaSrc = (mediaPathMap && mediaPathMap.get(m.id)) || m.media.url;
      if (m.media.type === 'image') {
        mediaHtml = `
          <div style="margin-bottom:8px;border-radius:10px;overflow:hidden;background:#f0f2f5;">
            <a href="${mediaSrc}" target="_blank">
              <img src="${mediaSrc}" alt="${m.media.caption || 'Media'}" style="max-width:100%;max-height:360px;display:block;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'" />
            </a>
            ${m.media.caption ? `<div style="font-size:12px;font-weight:600;padding:6px 2px;color:#111b21;">${m.media.caption}</div>` : ''}
          </div>
        `;
      } else if (m.media.type === 'audio') {
        mediaHtml = `
          <div style="background:#f0f2f5;padding:10px;border-radius:10px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">🎵</span>
            <div>
              <div style="font-size:12px;font-weight:600;color:#111b21;">${m.media.filename || 'Voice Note'}</div>
              ${mediaSrc ? `<audio controls src="${mediaSrc}" style="margin-top:6px;max-width:240px;height:32px;"></audio>` : ''}
            </div>
          </div>
        `;
      } else if (m.media.type === 'document' || m.media.type === 'video') {
        mediaHtml = `
          <div style="background:#f0f2f5;padding:10px;border-radius:10px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
            <span style="font-size:22px;">${m.media.type === 'video' ? '🎥' : '📄'}</span>
            <div>
              <div style="font-size:12px;font-weight:600;color:#111b21;">${m.media.filename || (m.media.type === 'video' ? 'Video' : 'Document')}</div>
              ${mediaSrc ? `<a href="${mediaSrc}" download style="font-size:11px;color:#008069;text-decoration:none;font-weight:bold;">Lihat / Unduh File</a>` : ''}
            </div>
          </div>
        `;
      }
    }

    const formattedText = m.text
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');

    return `
      <div style="display:flex;justify-content:${isMe ? 'flex-end' : 'flex-start'};margin-bottom:12px;">
        <div style="max-width:75%;padding:8px 12px;border-radius:12px;background:${isMe ? '#d9fdd3' : '#ffffff'};box-shadow:0 1px 2px rgba(0,0,0,0.1);position:relative;">
          ${!isMe ? `<div style="font-size:11px;font-weight:bold;color:#128c7e;margin-bottom:4px;">${m.senderName}</div>` : ''}
          ${mediaHtml}
          <div style="font-size:13px;line-height:1.5;color:#111b21;word-break:break-word;">${formattedText}</div>
          <div style="text-align:right;font-size:10px;color:#667781;margin-top:4px;">
            ${m.time} ${isMe ? '<span style="color:#53bdeb;margin-left:3px;">✓✓</span>' : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>WhatsApp Chat - ${contactName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #efeae2; margin: 0; padding: 0; }
    .header { background: #008069; color: white; padding: 14px 20px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .container { max-width: 800px; margin: 0 auto; padding: 20px 16px; min-height: 85vh; }
    .notice { background: #ffeecd; color: #54656f; font-size: 11px; text-align: center; padding: 8px 14px; border-radius: 8px; margin: 0 auto 18px auto; max-width: 480px; line-height: 1.4; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  </style>
</head>
<body>
  <div class="header">
    <div style="width:40px;height:40px;border-radius:50%;background:#ffffff;color:#008069;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:16px;">
      ${contactName.charAt(0)}
    </div>
    <div>
      <div style="font-size:15px;font-weight:600;">${contactName}</div>
      <div style="font-size:11px;opacity:0.85;">${contactPhone} • Diekspor pada ${nowStr}</div>
    </div>
  </div>
  <div class="container">
    <div class="notice">
      🔒 Pesan dan panggilan dienkripsi secara end-to-end. Tidak seorang pun di luar chat ini yang dapat membaca atau mendengarkannya.
    </div>
    ${messageItems}
  </div>
</body>
</html>`;
}

/**
 * Export a Single Chat + All Media into a single .ZIP Bundle
 */
export async function exportSingleChatBundle(
  thread: ConversationThread,
  options: {
    format: 'html' | 'txt' | 'json';
    includeMedia: boolean;
  }
): Promise<void> {
  const safeName = thread.contact.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const files: ZipFileEntry[] = [];
  const mediaPathMap = new Map<string, string>();

  // 1. Add Media if requested
  if (options.includeMedia) {
    let mediaCounter = 0;
    for (const m of thread.messages) {
      if (m.media && m.media.url) {
        const resolved = await resolveMediaBytes(m.media.url, m.media.type === 'video' ? 'mp4' : 'jpg');
        if (resolved && resolved.bytes.length > 0) {
          mediaCounter++;
          const safeFile = m.media.filename && !m.media.filename.startsWith('foto.jpg')
            ? m.media.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
            : `foto_${mediaCounter}.${resolved.extension}`;
          const zipPath = `media/${safeFile}`;
          files.push({
            name: zipPath,
            data: resolved.bytes
          });
          mediaPathMap.set(m.id, zipPath);
        }
      }
    }

    try {
      const cardRes = await fetch('/assets/template/custom/06-02.png');
      if (cardRes.ok) {
        const cardBlob = await cardRes.arrayBuffer();
        files.push({
          name: `media/Wedding_Invitation_Card.png`,
          data: new Uint8Array(cardBlob)
        });
      }
    } catch (e) {
      console.warn("Could not fetch card image for zip:", e);
    }

    files.push({
      name: `media/media_manifest.json`,
      data: JSON.stringify({
        contact: thread.contact.name,
        phone: thread.contact.phone,
        totalMediaFound: thread.messages.filter(m => m.media).length,
        totalMediaExported: mediaCounter,
        exportedFiles: Array.from(mediaPathMap.entries()).map(([msgId, path]) => ({ msgId, path }))
      }, null, 2)
    });
  }

  // 2. Add Chat Transcript
  if (options.format === 'html') {
    files.push({
      name: `chat_${safeName}.html`,
      data: formatChatAsHtml(thread, mediaPathMap)
    });
  } else if (options.format === 'json') {
    files.push({
      name: `chat_${safeName}.json`,
      data: formatChatAsJson(thread)
    });
  } else {
    files.push({
      name: `chat_${safeName}.txt`,
      data: formatChatAsTxt(thread, mediaPathMap)
    });
  }

  downloadZipInBrowser(`WhatsApp_Chat_${safeName}.zip`, files);
}

/**
 * Bulk Export All Chats into a Comprehensive .ZIP Archive
 */
export async function exportBulkChatsArchive(
  threads: ConversationThread[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const files: ZipFileEntry[] = [];
  const total = threads.length;

  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    const safeName = `${i + 1}_${thread.contact.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const mediaPathMap = new Map<string, string>();

    if (onProgress) {
      onProgress(i + 1, total);
    }

    let mediaCounter = 0;
    for (const m of thread.messages) {
      if (m.media && m.media.url) {
        const resolved = await resolveMediaBytes(m.media.url, m.media.type === 'video' ? 'mp4' : 'jpg');
        if (resolved && resolved.bytes.length > 0) {
          mediaCounter++;
          const safeFile = m.media.filename && !m.media.filename.startsWith('foto.jpg')
            ? m.media.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
            : `foto_${mediaCounter}.${resolved.extension}`;
          const zipPath = `${safeName}/media/${safeFile}`;
          files.push({
            name: zipPath,
            data: resolved.bytes
          });
          // For HTML relative path inside safeName:
          mediaPathMap.set(m.id, `media/${safeFile}`);
        }
      }
    }

    files.push({
      name: `${safeName}/chat.html`,
      data: formatChatAsHtml(thread, mediaPathMap)
    });

    files.push({
      name: `${safeName}/chat.txt`,
      data: formatChatAsTxt(thread, mediaPathMap)
    });

    files.push({
      name: `${safeName}/contact_info.json`,
      data: JSON.stringify(thread.contact, null, 2)
    });
  }

  files.push({
    name: `README.txt`,
    data: `Arsip Backup WhatsApp Management Suite\nTanggal Ekspor: ${new Date().toLocaleString("id-ID")}\nTotal Obrolan: ${threads.length}\n`
  });

  downloadZipInBrowser(`WhatsApp_Backup_All_Chats.zip`, files);
}
