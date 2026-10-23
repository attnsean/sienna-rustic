"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  WhatsAppGatewayConfig, 
  WhatsAppQRSession,
  UserWhatsAppContact,
  BlastGuest, 
  DEFAULT_MESSAGE_TEMPLATE, 
  formatIndonesianPhone, 
  formatPhoneDisplay, 
  generateInvitationLink, 
  interpolateMessage, 
  sendWhatsAppMessage, 
  parseGuestsCsv,
  parseBulkGuestText,
  parseVcfContacts,
  getStoredSession,
  saveStoredSession,
  clearStoredSession,
  getStoredContacts,
  saveStoredContacts,
  generateWhatsAppPairingPayload
} from "@/lib/whatsappUtils";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip as RechartsTooltip, PieChart, Pie } from 'recharts';
import { supabase } from "../../lib/supabase";
import QRCode from "react-qr-code";

interface WishItem {
  text: string;
  createdAt: any;
}

interface RSVPData {
  id: string;
  rsvp_id?: string;
  name: string;
  isAttending: boolean;
  guestsCount: number;
  actualGuestsCount?: number;
  checkedIn?: boolean;
  checkedInAt?: Date | null;
  phone?: string;
  wishes: string;
  createdAt: Date | null;
}

interface GiftItem {
  id: string;
  name: string;
  price: string;
  image: string;
  link: string;
  originalPrice: string;
  discount: string;
  isBought: boolean;
}

const GIFT_PRESETS = [
  { name: "Premium Vacuum Cleaner", price: "2.500.000", image: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=400&auto=format&fit=crop" },
  { name: "Air Purifier HEPA 13", price: "1.800.000", image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=400&auto=format&fit=crop" },
  { name: "Microwave Oven", price: "1.200.000", image: "https://images.unsplash.com/photo-1519225495810-7517c24a2ed3?q=80&w=400&auto=format&fit=crop" },
  { name: "Premium Coffee Maker", price: "3.500.000", image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=400&auto=format&fit=crop" },
  { name: "Juicer Blender Set", price: "850.000", image: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?q=80&w=400&auto=format&fit=crop" }
];

const formatCurrencyInput = (val: string) => {
  const number = val.replace(/[^0-9]/g, '');
  if (!number) return '';
  return parseInt(number, 10).toLocaleString('id-ID');
};

interface StoryEvent {
  id: string;
  year: string;
  title: string;
  desc: string;
  order: number;
}

export const OFFICIAL_PACKAGE_PRICES: Record<string, number> = {
  basic: 104000,
  silver: 159000,
  premium: 259000,
  exclusive: 449000,
  exclutif: 449000,
};

export const BUNDLE_WA_BLAST_CONFIG: Record<string, { max_wa_blast: number; has_wa_blast: boolean; label: string; badge: string; desc: string }> = {
  basic: {
    max_wa_blast: 0,
    has_wa_blast: false,
    label: 'Basic',
    badge: 'Tanpa WA Blast (0 Kuota)',
    desc: 'Fitur WA Blast tidak tersedia pada Paket Basic.'
  },
  silver: {
    max_wa_blast: 100,
    has_wa_blast: true,
    label: 'Silver',
    badge: '100 Kuota WA Blast',
    desc: 'Mendapatkan kuota 100 pesan blast undangan resmi.'
  },
  premium: {
    max_wa_blast: 300,
    has_wa_blast: true,
    label: 'Premium',
    badge: '300 Kuota WA Blast',
    desc: 'Mendapatkan kuota 300 pesan blast undangan resmi.'
  },
  exclusive: {
    max_wa_blast: 500,
    has_wa_blast: true,
    label: 'Exclusive',
    badge: '500 Kuota WA Blast',
    desc: 'Mendapatkan kuota 500 pesan blast undangan resmi.'
  },
  exclutif: {
    max_wa_blast: 500,
    has_wa_blast: true,
    label: 'Exclusive',
    badge: '500 Kuota WA Blast',
    desc: 'Mendapatkan kuota 500 pesan blast undangan resmi.'
  }
};

export default function RSVPDashboard() {
  const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || 'f93ad18d-cba2-4de0-a86b-b1fadf2783a2';
  const [project, setProject] = useState<any>(null);
  const [rsvps, setRsvps] = useState<RSVPData[]>([]);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [storyEvents, setStoryEvents] = useState<StoryEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'rsvp' | 'blast' | 'settings' | 'gifts' | 'links'>('rsvp');
  const [settingsTab, setSettingsTab] = useState<'password' | 'story'>('password');
  const [loading, setLoading] = useState(true);

  // Authentication & Security State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [dbPassword, setDbPassword] = useState("serastory");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isBasicPlan, setIsBasicPlan] = useState(false);
  const [hasDashboardFeature, setHasDashboardFeature] = useState(true);
  const [checkingPlan, setCheckingPlan] = useState(true);

  // Invitation Blast State
  const [blastGuests, setBlastGuests] = useState<{ name: string; phone: string; group?: string; botSession?: string; status?: 'idle' | 'queued' | 'error' }[]>([{ name: '', phone: '', group: '', botSession: '1', status: 'idle' }]);
  const [selectedBotSession, setSelectedBotSession] = useState<string>('1');
  const [rowBotSessions, setRowBotSessions] = useState<{ [key: string]: string }>({});
  const [botStatuses] = useState<{ [key: string]: { status: string, lastActive: any, name?: string } }>({
    Session1: { status: 'online', lastActive: new Date(), name: 'WhatsApp 1' },
    Session2: { status: 'offline', lastActive: null, name: 'WhatsApp 2' },
    Session3: { status: 'offline', lastActive: null, name: 'WhatsApp 3' },
    Session4: { status: 'offline', lastActive: null, name: 'WhatsApp 4' },
  });
  const [messageTemplate, setMessageTemplate] = useState<string>("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importSheetUrl, setImportSheetUrl] = useState("");
  const [queuedPhones, setQueuedPhones] = useState<Set<string>>(new Set());
  const [scheduleBlastDate, setScheduleBlastDate] = useState("");

  // WhatsApp QR Session State (Real Session Flow)
  const [waSession, setWaSession] = useState<WhatsAppQRSession>({
    status: 'qr',
    qrCodeValue: ''
  });
  const [waContacts, setWaContacts] = useState<UserWhatsAppContact[]>([]);
  const [waQrCountdown, setWaQrCountdown] = useState<number>(60);
  const [showMyContactsModal, setShowMyContactsModal] = useState(false);
  const [waContactsSearch, setWaContactsSearch] = useState('');
  const [waContactsCategory, setWaContactsCategory] = useState<string>('all');
  const [selectedWaContactIds, setSelectedWaContactIds] = useState<Set<string>>(new Set());
  const [isAddingManualContact, setIsAddingManualContact] = useState(false);
  const [newManualName, setNewManualName] = useState('');
  const [newManualPhone, setNewManualPhone] = useState('');
  const [newManualCat, setNewManualCat] = useState<'Keluarga' | 'Teman Sekolah / Kuliah' | 'Rekan Kerja' | 'Tetangga & Kerabat' | 'Umum'>('Umum');

  const [isPcBotOnline, setIsPcBotOnline] = useState<boolean>(false);

  // Load Session and Real Contacts on Mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existing = getStoredSession(projectId);
    const isExplicitlyActive = sessionStorage.getItem('wa_session_active_' + projectId) === 'true';
    if (existing && existing.status === 'connected' && isExplicitlyActive) {
      setWaSession(existing);
    } else {
      clearStoredSession(projectId);
      setWaSession({
        status: 'qr',
        qrCodeValue: ''
      });
    }
    const rawSaved = getStoredContacts(projectId);
    const sanitized = (rawSaved || []).map(c => {
      const idStr = String(c.id || '');
      const isGroup = Boolean(c.isGroup || idStr.endsWith('@g.us') || idStr.startsWith('1203') || (c.phone && c.phone.startsWith('1203')));
      let phone = isGroup ? '' : (c.phone || '');
      if (!isGroup) {
        if (phone.length > 15 || phone.startsWith('32427') || phone.startsWith('24623')) {
          const cleanName = (c.name || '').replace(/[^0-9]/g, '');
          if ((cleanName.startsWith('62') || cleanName.startsWith('08')) && cleanName.length >= 10 && cleanName.length <= 15) {
            phone = cleanName;
          } else {
            phone = '';
          }
        }
      }
      return {
        ...c,
        isGroup,
        phone: isGroup ? '' : formatIndonesianPhone(phone),
        category: (isGroup ? 'Grup WhatsApp' : (c.category === 'Grup WhatsApp' ? 'Kontak Pribadi' : (c.category || 'Kontak Pribadi'))) as any
      };
    });
    setWaContacts(sanitized);
    saveStoredContacts(sanitized, projectId);
  }, [projectId]);

  // Supabase Realtime Channel to communicate with PC Bot Server (whatsapp-bot.js)
  const botChannelRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const channel = supabase.channel('wa-bot:' + projectId, {
      config: { broadcast: { self: true } }
    });
    botChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'bot_status' }, ({ payload }) => {
        console.log('Realtime Bot Status:', payload);
        setIsPcBotOnline(true);

        if (payload?.status === 'qr' && payload?.qr) {
          try {
            localStorage.removeItem('wa_manual_disconnected_' + projectId);
          } catch (e) {}
          setWaSession({
            status: 'qr',
            qrCodeValue: payload.qr
          });
          setWaQrCountdown(60);
        } else if (payload?.status === 'connected') {
          const isManualDisc = typeof window !== 'undefined' && localStorage.getItem('wa_manual_disconnected_' + projectId) === 'true';
          if (isManualDisc) return;
          try {
            localStorage.removeItem('wa_manual_disconnected_' + projectId);
          } catch (e) {}
          const newSession: WhatsAppQRSession = {
            status: 'connected',
            connectedPhone: payload.phone || '+62 812-3456-7890',
            profileName: payload.name || 'WhatsApp Official Wedding Bot',
            device: payload.device || 'WhatsApp Web (PC Server)',
            connectedAt: new Date().toISOString()
          };
          setWaSession(newSession);
          sessionStorage.setItem('wa_session_active_' + projectId, 'true');
          saveStoredSession(newSession, projectId);
        } else if (payload?.status === 'disconnected') {
          clearStoredSession(projectId);
          sessionStorage.removeItem('wa_session_active_' + projectId);
          setWaSession({ status: 'loading', qrCodeValue: '', authMessage: 'Menyiapkan QR Code baru...' });
        }
      })
      .on('broadcast', { event: 'bot_contacts' }, ({ payload }) => {
        if (payload?.contacts && Array.isArray(payload.contacts) && payload.contacts.length > 0) {
          const formatted: UserWhatsAppContact[] = payload.contacts.map((c: any) => {
            const idStr = String(c.id || '');
            const isGroup = Boolean(
              c.isGroup ||
              idStr.endsWith('@g.us') ||
              idStr.startsWith('1203') ||
              (c.id && c.id.server === 'g.us')
            );

            let rawPhone = '';
            if (!isGroup) {
              if (c.phone) {
                rawPhone = String(c.phone).replace(/[^0-9]/g, '');
              } else if (idStr.endsWith('@c.us')) {
                rawPhone = idStr.replace('@c.us', '').replace(/[^0-9]/g, '');
              } else {
                const cleanName = (c.name || '').replace(/[^0-9]/g, '');
                if ((cleanName.startsWith('62') || cleanName.startsWith('08')) && cleanName.length >= 10 && cleanName.length <= 15) {
                  rawPhone = cleanName;
                }
              }
            }

            let displayName = (c.name || '').trim();
            if (!displayName) {
              displayName = isGroup ? 'Grup WhatsApp' : (rawPhone ? `+${rawPhone}` : 'Kontak');
            }

            return {
              id: idStr,
              name: displayName,
              phone: isGroup ? '' : formatIndonesianPhone(rawPhone),
              isGroup: isGroup,
              category: (isGroup ? 'Grup WhatsApp' : 'Kontak Pribadi') as any,
              avatarUrl: c.profilePicUrl || undefined
            };
          });
          setWaContacts(formatted);
          saveStoredContacts(formatted, projectId);
        }
      })
      .on('broadcast', { event: 'single_message_result' }, ({ payload }) => {
        if (payload) {
          setBlastGuestList(prev => prev.map(g => {
            if (g.id === payload.guestId || g.phone === payload.phone) {
              return {
                ...g,
                status: payload.success ? 'sent' : 'failed',
                sentAt: payload.success ? new Date().toISOString() : undefined,
                errorReason: payload.error
              };
            }
            return g;
          }));
        }
      })
      .on('broadcast', { event: 'blast_progress' }, ({ payload }) => {
        if (payload) {
          setBlastProgress({
            current: payload.current || 0,
            total: payload.total || 0,
            currentGuestName: payload.guestName
          });
          if (payload.status === 'sent') {
            setWaBlastSentCount(prev => prev + 1);
            syncBlastConfigToSupabase({ increment_used_wa_blast: 1 });
            setBlastGuestList(prev => prev.map(g => g.phone === payload.guestPhone ? { ...g, status: 'sent', sentAt: new Date().toISOString() } : g));
          } else if (payload.status === 'failed') {
            setBlastGuestList(prev => prev.map(g => g.phone === payload.guestPhone ? { ...g, status: 'failed', errorReason: payload.error } : g));
          }
        }
      })
      .on('broadcast', { event: 'blast_break' }, ({ payload }) => {
        if (payload?.breakDuration) {
          setIsBreakActive(true);
          setBreakCountdown(payload.breakDuration);
          setCurrentDelayCountdown(null);
        }
      })
      .on('broadcast', { event: 'blast_delay' }, ({ payload }) => {
        if (payload?.delayDuration) {
          setIsBreakActive(false);
          setBreakCountdown(null);
          setCurrentDelayCountdown(payload.delayDuration);
        }
      })
      .on('broadcast', { event: 'blast_completed' }, () => {
        setIsBlasting(false);
        setIsBreakActive(false);
        setBreakCountdown(null);
        setCurrentDelayCountdown(null);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({ type: 'broadcast', event: 'get_status' });
        }
      });

    return () => {
      botChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Auto-poll bot status until connected so dashboard updates immediately
  useEffect(() => {
    if (waSession?.status === 'connected') return;

    const checkStatus = () => {
      if (botChannelRef.current) {
        botChannelRef.current.send({
          type: 'broadcast',
          event: 'get_status'
        }).catch(() => {});
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2500);
    return () => clearInterval(interval);
  }, [waSession?.status, projectId]);

  // QR Refresh Countdown Timer
  useEffect(() => {
    if (waSession?.status !== 'qr') return;
    const timer = setInterval(() => {
      setWaQrCountdown((prev) => {
        if (prev <= 1) {
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [waSession?.status]);

  // Safe Random Delay Setting (Anti-Ban Jitter)
  const [randomDelayRange, setRandomDelayRange] = useState<{ min: number; max: number; label: string }>({
    min: 15,
    max: 30,
    label: '15 - 30 Detik (Disarankan - Aman)'
  });
  const [currentDelayCountdown, setCurrentDelayCountdown] = useState<number | null>(null);

  // WhatsApp Gateway Configuration State
  const [waGatewayConfig, setWaGatewayConfig] = useState<WhatsAppGatewayConfig>({
    provider: 'fonnte',
    apiKey: '',
    senderPhone: '',
    isConnected: false
  });
  const [isTestingGateway, setIsTestingGateway] = useState(false);
  const [gatewayFeedback, setGatewayFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // WA Blast Promotional & Bundle Features
  const SERASTORY_PROMO_FOOTER = "\n\n━━━━━━━━━━━━━━━━━━━━\n✨ Undangan digital ini dibuat via *serastory.com*\nBuat undangan pernikahan impianmu di https://serastory.com";

  // WA Blast Management State
  const [blastGuestList, setBlastGuestList] = useState<BlastGuest[]>([]);
  const [blastTemplate, setBlastTemplate] = useState<string>(DEFAULT_MESSAGE_TEMPLATE);
  const [blastDelay, setBlastDelay] = useState<number>(10);
  const [isBlasting, setIsBlasting] = useState<boolean>(false);
  const [blastProgress, setBlastProgress] = useState<{ current: number; total: number; currentGuestName?: string }>({ current: 0, total: 0 });
  const [blastFilterStatus, setBlastFilterStatus] = useState<'all' | 'pending' | 'sent' | 'failed'>('all');
  const [blastSearchTerm, setBlastSearchTerm] = useState<string>('');
  const [copiedLinkFor, setCopiedLinkFor] = useState<string | null>(null);

  // Bundle Feature (hasWABlast), Quotas & Promo Removal (Watermark)
  const [projectPackageName, setProjectPackageName] = useState<string>('silver');
  const [hasWABlast, setHasWABlast] = useState<boolean>(true);
  const [waBlastBaseQuota, setWaBlastBaseQuota] = useState<number>(50);
  const [waBlastExtraQuota, setWaBlastExtraQuota] = useState<number>(0);
  const [waBlastSentCount, setWaBlastSentCount] = useState<number>(0);
  const [hasRemovedWatermark, setHasRemovedWatermark] = useState<boolean>(false);

  // Sync Blast Configuration with Supabase
  // - Kuota (paket, max, extra, used, watermark, dashboard) -> tabel wa_blast_quotas
  // - Daftar tamu & template pesan -> wedding_details.dining_schedule
  // Hanya field yang berubah yang dikirim, agar top-up kuota dari admin tidak tertimpa.
  const syncBlastConfigToSupabase = async (patch: {
    package_name?: string;
    max_wa_blast?: number;
    extra_wa_blast?: number;
    has_wa_blast?: boolean;
    has_removed_watermark?: boolean;
    has_dashboard?: boolean;
    used_wa_blast?: number;
    increment_used_wa_blast?: number;
    add_extra_wa_blast?: number;
    guest_list?: BlastGuest[];
    message_template?: string;
  }) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_blast_config',
          payload: {
            project_id: projectId,
            config: patch
          }
        })
      });
      const json = await res.json().catch(() => null);
      const quota = json?.data?.quota;
      if (quota && typeof quota === 'object') {
        if (typeof quota.max_wa_blast === 'number') setWaBlastBaseQuota(quota.max_wa_blast);
        if (typeof quota.extra_wa_blast === 'number') setWaBlastExtraQuota(quota.extra_wa_blast);
        if (typeof quota.used_wa_blast === 'number') setWaBlastSentCount(quota.used_wa_blast);
        if (typeof quota.has_wa_blast === 'boolean') setHasWABlast(quota.has_wa_blast);
      }
    } catch (err) {
      console.error('Failed to sync blast config:', err);
    }
  };

  const persistBlastGuestList = (updatedGuests: BlastGuest[]) => {
    setBlastGuestList(updatedGuests);
    try {
      localStorage.setItem('wa_blast_guest_list', JSON.stringify(updatedGuests));
    } catch (_) {}
    syncBlastConfigToSupabase({ guest_list: updatedGuests });
  };

  const persistBlastTemplate = (template: string) => {
    setBlastTemplate(template);
    try {
      localStorage.setItem('wa_blast_template', template);
    } catch (_) {}
    syncBlastConfigToSupabase({ message_template: template });
  };

  // Anti-Ban Spam Protection Break (1-2 minutes every 15 messages)
  const [isBreakActive, setIsBreakActive] = useState<boolean>(false);
  const [breakCountdown, setBreakCountdown] = useState<number | null>(null);

  // Modals for WA Blast
  const [showAddGuestModal, setShowAddGuestModal] = useState<boolean>(false);
  const [newGuestName, setNewGuestName] = useState<string>('');
  const [newGuestPhone, setNewGuestPhone] = useState<string>('');
  const [showCsvModal, setShowCsvModal] = useState<boolean>(false);
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [showBulkPasteModal, setShowBulkPasteModal] = useState<boolean>(false);
  const [bulkPasteRawText, setBulkPasteRawText] = useState<string>('');
  const [showBuyQuotaModal, setShowBuyQuotaModal] = useState<boolean>(false);
  const [showRemovePromoModal, setShowRemovePromoModal] = useState<boolean>(false);
  const [showUpgradeBundleModal, setShowUpgradeBundleModal] = useState<boolean>(false);
  const [showLogsModal, setShowLogsModal] = useState<boolean>(false);
  const [manualInputMode, setManualInputMode] = useState<'single' | 'bulk'>('single');
  const [blastStep, setBlastStep] = useState<1 | 2>(1);
  const blastAbortRef = useRef<boolean>(false);

  // Checkout & Voucher Claim State
  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean;
    type: 'watermark' | 'upgrade' | 'quota' | 'dashboard';
    title: string;
    itemLabel: string;
    price: number;
    data?: any;
  }>({
    isOpen: false,
    type: 'watermark',
    title: '',
    itemLabel: '',
    price: 0
  });
  const [voucherCodeInput, setVoucherCodeInput] = useState<string>('');
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discountPercent: number } | null>(null);
  const [voucherError, setVoucherError] = useState<string>('');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<boolean>(false);

  // Kode Unik Pembayaran (3 digit) - ditambahkan ke nominal agar transfer mudah diverifikasi admin
  const SERASTORY_ADMIN_WA = '6285157917178';
  const [checkoutUniqueCode, setCheckoutUniqueCode] = useState<number>(0);
  const [copiedTransferAmount, setCopiedTransferAmount] = useState<boolean>(false);
  useEffect(() => {
    if (checkoutModal.isOpen) {
      setCheckoutUniqueCode(Math.floor(Math.random() * 899) + 101); // 101 - 999
      setCopiedTransferAmount(false);
    }
  }, [checkoutModal.isOpen, checkoutModal.title]);
  const checkoutTransferTotal = checkoutModal.price + checkoutUniqueCode;

  // Break Countdown Timer effect
  useEffect(() => {
    if (breakCountdown === null || breakCountdown <= 0) {
      if (isBreakActive) setIsBreakActive(false);
      return;
    }
    const timer = setInterval(() => {
      setBreakCountdown(prev => {
        if (prev === null || prev <= 1) {
          setIsBreakActive(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [breakCountdown, isBreakActive]);

  // Safe Random Delay Countdown Timer effect
  useEffect(() => {
    if (currentDelayCountdown === null || currentDelayCountdown <= 0) return;
    const timer = setInterval(() => {
      setCurrentDelayCountdown(prev => {
        if (prev === null || prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentDelayCountdown]);

  // Initialize and Sync WA Blast & Gateway Data
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('wa_gateway_config');
      if (savedConfig) {
        setWaGatewayConfig(JSON.parse(savedConfig));
      }
      const savedTemplate = localStorage.getItem('wa_blast_template');
      if (savedTemplate && savedTemplate.trim() !== 'test' && savedTemplate.trim().length > 15) {
        setBlastTemplate(savedTemplate);
      } else {
        setBlastTemplate(DEFAULT_MESSAGE_TEMPLATE);
        localStorage.setItem('wa_blast_template', DEFAULT_MESSAGE_TEMPLATE);
      }
      const savedGuests = localStorage.getItem('wa_blast_guest_list');
      if (savedGuests) {
        try {
          const parsed = JSON.parse(savedGuests);
          if (Array.isArray(parsed)) {
            // Clean out any legacy dummy records (bg1..bg5 or hardcoded mock names)
            const cleaned = parsed.filter((g: BlastGuest) =>
              g &&
              !['bg1', 'bg2', 'bg3', 'bg4', 'bg5'].includes(g.id) &&
              g.name !== 'Bpk. Rahmat Santoso' &&
              g.name !== 'Ibu Citra Lestari & Keluarga' &&
              g.name !== 'Dika Pratama (Alumni SMA)' &&
              g.name !== 'Sarah Amalia' &&
              g.name !== 'Dimas Anggara'
            );
            setBlastGuestList(cleaned);
            localStorage.setItem('wa_blast_guest_list', JSON.stringify(cleaned));
          }
        } catch (e) {
          console.error('Error parsing stored blast guests:', e);
        }
      }

      // Load Extra Quota, Watermark Removal, and Bundle Feature from storage
      const storedExtraQuota = localStorage.getItem(`wa_blast_extra_quota_${projectId}`);
      if (storedExtraQuota) {
        setWaBlastExtraQuota(parseInt(storedExtraQuota, 10) || 0);
      }
      const storedRemovePromo = localStorage.getItem(`wa_blast_removed_promo_${projectId}`);
      if (storedRemovePromo) {
        setHasRemovedWatermark(storedRemovePromo === 'true');
      }
      const storedFeature = localStorage.getItem(`wa_blast_feature_${projectId}`);
      if (storedFeature) {
        setHasWABlast(storedFeature === 'true');
      }
    } catch (e) {
      console.error('Error initializing WA blast config:', e);
    }
  }, [projectId]);

  const handleSaveAndTestGateway = async () => {
    setIsTestingGateway(true);
    setGatewayFeedback(null);
    try {
      const formattedSender = formatIndonesianPhone(waGatewayConfig.senderPhone || '');
      const configToSave = { ...waGatewayConfig, senderPhone: formattedSender };
      setWaGatewayConfig(configToSave);
      localStorage.setItem('wa_gateway_config', JSON.stringify(configToSave));

      const testRes = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedSender || '6281234567890',
          message: 'Halo! Ini adalah pesan verifikasi koneksi WhatsApp Gateway Management Suite Nurul & Iwan.',
          gatewayConfig: configToSave,
          projectId: projectId || 'f93ad18d-cba2-4de0-a86b-b1fadf2783a2'
        })
      });
      const data = await testRes.json();
      if (testRes.ok && data.success) {
        const connectedConfig = { ...configToSave, isConnected: true, lastTestedAt: new Date().toISOString() };
        setWaGatewayConfig(connectedConfig);
        localStorage.setItem('wa_gateway_config', JSON.stringify(connectedConfig));
        setGatewayFeedback({ type: 'success', message: 'Koneksi Gateway WhatsApp Berhasil Diverifikasi!' });
      } else {
        setGatewayFeedback({ type: 'error', message: data.error || 'Verifikasi gateway gagal. Periksa token atau endpoint Anda.' });
      }
    } catch (err: any) {
      setGatewayFeedback({ type: 'error', message: err.message || 'Gagal menghubungi server verifikasi.' });
    } finally {
      setIsTestingGateway(false);
    }
  };

  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<boolean>(false);

  const handleDisconnectQRSession = () => {
    setShowDisconnectConfirm(false);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('wa_manual_disconnected_' + projectId, 'true');
        localStorage.removeItem('wa_web_session_v2');
        localStorage.removeItem('wa_web_session_v2_' + projectId);
        localStorage.removeItem('wa_web_session_v2_default');
        localStorage.removeItem('wa_qr_session_' + projectId);
        localStorage.removeItem('wa_qr_session_default');
        localStorage.removeItem('wa_threads_' + projectId);
      }
      sessionStorage.removeItem('wa_session_active_' + projectId);
      sessionStorage.clear();
      clearStoredSession(projectId);
    } catch (e) {
      console.error(e);
    }
    setWaSession({
      status: 'loading',
      qrCodeValue: '',
      authMessage: 'Memutuskan sesi WhatsApp dan menyiapkan QR Code baru...'
    });
    setWaQrCountdown(60);

    // Send disconnect command to PC bot
    try {
      if (botChannelRef.current) {
        botChannelRef.current.send({ type: 'broadcast', event: 'bot_logout' });
      } else {
        const ch = supabase.channel('wa-bot:' + projectId);
        ch.subscribe((s) => {
          if (s === 'SUBSCRIBED') {
            ch.send({ type: 'broadcast', event: 'bot_logout' });
            setTimeout(() => supabase.removeChannel(ch), 1000);
          }
        });
      }
    } catch (e) {}
  };

  const handleAddSelectedWaContactsToBlast = () => {
    const selectedContacts = waContacts.filter(c => selectedWaContactIds.has(c.id));
    if (selectedContacts.length === 0) return;

    const newGuests: BlastGuest[] = selectedContacts.map((c, idx) => ({
      id: `wa_contact_${Date.now()}_${idx}`,
      name: c.name,
      phone: c.isGroup ? c.id : (c.phone || c.id),
      status: 'pending',
      selected: true,
      isGroup: c.isGroup
    }));

    setBlastGuestList(prev => {
      const existingKeys = new Set(prev.map(g => g.isGroup ? g.id : (g.phone || g.id)));
      const filteredNew = newGuests.filter(g => !existingKeys.has(g.isGroup ? g.id : (g.phone || g.id)));
      const combined = [...filteredNew, ...prev];
      localStorage.setItem('wa_blast_guest_list', JSON.stringify(combined));
      return combined;
    });

    setSelectedWaContactIds(new Set());
    setShowMyContactsModal(false);
  };

  const toggleSelectAllWaContacts = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedWaContactIds(new Set(waContacts.map(c => c.id)));
    } else {
      setSelectedWaContactIds(new Set());
    }
  };

  const toggleSingleWaContact = (id: string) => {
    setSelectedWaContactIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleManualAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManualName.trim() || !newManualPhone.trim()) return;
    const cleanPhone = formatIndonesianPhone(newManualPhone);
    const newContact: UserWhatsAppContact = {
      id: `cnt_${Date.now()}`,
      name: newManualName.trim(),
      phone: cleanPhone,
      avatarColor: 'bg-emerald-600',
      category: newManualCat,
      statusText: 'Kontak WhatsApp'
    };
    const updated = [newContact, ...waContacts];
    setWaContacts(updated);
    saveStoredContacts(updated, projectId);
    setNewManualName('');
    setNewManualPhone('');
    setIsAddingManualContact(false);
  };

  const handleSyncFromRsvpGuests = () => {
    if (!Array.isArray(rsvps) || rsvps.length === 0) {
      alert('Belum ada tamu pada daftar RSVP untuk disinkronkan.');
      return;
    }
    const synced: UserWhatsAppContact[] = rsvps
      .filter(r => r.phone && r.phone.length >= 8)
      .map((r, i) => ({
        id: `rsvp_contact_${r.id || i}`,
        name: r.name || 'Tamu',
        phone: formatIndonesianPhone(r.phone || ''),
        avatarColor: 'bg-emerald-600',
        category: 'Umum',
        statusText: 'Tamu Undangan'
      }));

    const existingPhones = new Set(waContacts.map(c => c.phone));
    const newOnly = synced.filter(s => !existingPhones.has(s.phone));
    if (newOnly.length === 0) {
      alert('Seluruh tamu RSVP sudah ada dalam kontak WhatsApp Anda.');
      return;
    }
    const combined = [...waContacts, ...newOnly];
    setWaContacts(combined);
    saveStoredContacts(combined, projectId);
    alert(`Berhasil menambahkan ${newOnly.length} kontak dari tamu RSVP!`);
  };

  const handleSyncRsvpsToBlastQueue = () => {
    if (!Array.isArray(rsvps) || rsvps.length === 0) {
      alert('Belum ada tamu pada daftar RSVP untuk disinkronkan ke antrean WA Blast.');
      return;
    }
    const syncedGuests: BlastGuest[] = rsvps
      .filter(r => r.name && r.phone && r.phone.length >= 8)
      .map((r, i) => ({
        id: `rsvp_blast_${r.id || i}_${Date.now()}`,
        name: r.name,
        phone: formatIndonesianPhone(r.phone || ''),
        status: 'pending',
        selected: true
      }));

    if (syncedGuests.length === 0) {
      alert('Tidak ditemukan tamu RSVP dengan nomor telepon yang valid (minimal 8 digit).');
      return;
    }

    setBlastGuestList(prev => {
      const existingPhones = new Set(prev.map(g => g.phone));
      const newGuests = syncedGuests.filter(g => !existingPhones.has(g.phone));
      if (newGuests.length === 0) {
        alert('Semua tamu RSVP sudah terdaftar dalam antrean WA Blast.');
        return prev;
      }
      const updated = [...newGuests, ...prev];
      localStorage.setItem('wa_blast_guest_list', JSON.stringify(updated));
      alert(`Berhasil menambahkan ${newGuests.length} tamu dari daftar RSVP ke antrean WA Blast!`);
      return updated;
    });
  };

  const openWatermarkCheckout = () => {
    setShowRemovePromoModal(false);
    setVoucherCodeInput('');
    setAppliedVoucher(null);
    setVoucherError('');
    setCheckoutModal({
      isOpen: true,
      type: 'watermark',
      title: 'Hapus Promosi serastory.com',
      itemLabel: 'Add-On Mode Eksklusif (Bebas Watermark Promosi)',
      price: 35000
    });
  };

  const openUpgradeCheckout = (targetPkgKey: string) => {
    setShowUpgradeBundleModal(false);
    const cfg = BUNDLE_WA_BLAST_CONFIG[targetPkgKey];
    const currentKey = (projectPackageName || 'basic').toLowerCase();
    const currentPrice = OFFICIAL_PACKAGE_PRICES[currentKey] ?? 104000;
    const targetPrice = OFFICIAL_PACKAGE_PRICES[targetPkgKey] ?? 159000;
    const upgradePrice = Math.max(0, targetPrice - currentPrice);

    setVoucherCodeInput('');
    setAppliedVoucher(null);
    setVoucherError('');
    setCheckoutModal({
      isOpen: true,
      type: 'upgrade',
      title: `Upgrade ke ${cfg.label}`,
      itemLabel: `Upgrade Paket ${cfg.label} (+${cfg.max_wa_blast} Kuota WA Blast)`,
      price: upgradePrice,
      data: { packageKey: targetPkgKey, cfg, currentKey, targetPrice, currentPrice }
    });
  };

  const openQuotaCheckout = (count: number, priceStr: string, priceNum: number) => {
    setShowBuyQuotaModal(false);
    setVoucherCodeInput('');
    setAppliedVoucher(null);
    setVoucherError('');
    setCheckoutModal({
      isOpen: true,
      type: 'quota',
      title: `Beli +${count} Kuota WA Blast`,
      itemLabel: `Tambahan ${count} Pesan Blast Undangan Resmi`,
      price: priceNum,
      data: { count }
    });
  };

  const openDashboardCheckout = () => {
    setVoucherCodeInput('');
    setAppliedVoucher(null);
    setVoucherError('');
    setCheckoutModal({
      isOpen: true,
      type: 'dashboard',
      title: 'Aktivasi Menu Dashboard & RSVP',
      itemLabel: 'Akses Penuh Ringkasan Tamu & RSVP',
      price: 20000
    });
  };

  const handleUnlockDashboard = () => {
    openDashboardCheckout();
  };

  const handleApplyVoucher = (inputCode: string) => {
    const clean = inputCode.trim().toUpperCase();
    if (!clean) {
      setVoucherError('Silakan ketik kode voucher terlebih dahulu.');
      return;
    }

    const validPrefixes = ['VIP-', 'SERA-', 'SEAN-', 'ADMIN-', 'KUPON-', 'LUNAS-', 'PROMO-'];
    const hasValidPrefix = validPrefixes.some(p => clean.startsWith(p));

    const validWatermarkCodes = ['SERAWATERMARK', 'BEBASPROMOSI', 'NOWATERMARK', 'SERA35', 'WATERMARK35'];
    const validUpgradeCodes = ['SERAPREMIUM', 'SERAEXCLUSIVE', 'UPGRADESERA', 'UPGRADE150', 'UPGRADE250'];
    const validQuotaCodes = ['SERABLAST', 'KUOTA100', 'KUOTA250', 'KUOTA500', 'TOPUPBLAST'];
    const validDashboardCodes = ['SERADASHBOARD', 'OPENDASHBOARD', 'DASHBOARD20', 'RSVP20'];

    let isValid = false;
    if (hasValidPrefix) {
      isValid = true;
    } else if (checkoutModal.type === 'watermark' && (validWatermarkCodes.includes(clean) || clean === 'SERASTORY')) {
      isValid = true;
    } else if (checkoutModal.type === 'upgrade' && (validUpgradeCodes.includes(clean) || clean === 'SERASTORY')) {
      isValid = true;
    } else if (checkoutModal.type === 'quota' && (validQuotaCodes.includes(clean) || clean === 'SERASTORY')) {
      isValid = true;
    } else if (checkoutModal.type === 'dashboard' && (validDashboardCodes.includes(clean) || clean === 'SERASTORY')) {
      isValid = true;
    }

    if (isValid) {
      setAppliedVoucher({ code: clean, discountPercent: 100 });
      setVoucherError('');
    } else {
      setAppliedVoucher(null);
      setVoucherError('Kode voucher tidak valid atau tidak cocok untuk transaksi ini. Hubungi admin untuk mendapatkan kupon.');
    }
  };

  const handleCompleteCheckoutWithVoucher = async () => {
    if (!appliedVoucher) {
      alert('Silakan terapkan kode voucher yang valid terlebih dahulu, atau hubungi admin untuk konfirmasi pembayaran.');
      return;
    }

    setIsProcessingCheckout(true);
    try {
      if (checkoutModal.type === 'watermark') {
        setHasRemovedWatermark(true);
        await syncBlastConfigToSupabase({ has_removed_watermark: true });
        alert('Klaim Kupon Berhasil!\n\nMode Bebas Promosi serastory.com telah aktif selamanya.');
      } else if (checkoutModal.type === 'upgrade') {
        const { packageKey, cfg } = checkoutModal.data;
        setProjectPackageName(packageKey);
        setHasWABlast(cfg.has_wa_blast);
        setWaBlastBaseQuota(cfg.max_wa_blast);
        setIsBasicPlan(packageKey === 'basic');
        await syncBlastConfigToSupabase({
          package_name: packageKey,
          max_wa_blast: cfg.max_wa_blast,
          has_wa_blast: cfg.has_wa_blast
        });
        alert(`Klaim Kupon Berhasil!\n\nPaket berhasil di-upgrade ke ${cfg.label}.`);
      } else if (checkoutModal.type === 'quota') {
        const count = checkoutModal.data.count;
        setWaBlastExtraQuota(prev => prev + count);
        await syncBlastConfigToSupabase({ add_extra_wa_blast: count });
        alert(`Klaim Kupon Berhasil!\n\nBerhasil menambahkan ${count} kuota WA Blast.`);
      } else if (checkoutModal.type === 'dashboard') {
        setHasDashboardFeature(true);
        await syncBlastConfigToSupabase({ has_dashboard: true });
        alert('Klaim Kupon Berhasil!\n\nFitur Menu Dashboard & RSVP kini telah aktif selamanya.');
      }

      setCheckoutModal({ isOpen: false, type: 'watermark', title: '', itemLabel: '', price: 0 });
      setAppliedVoucher(null);
      setVoucherCodeInput('');
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Terjadi kendala saat memproses klaim kupon.');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handleClearAllBlastGuests = () => {
    if (blastGuestList.length === 0) return;
    if (confirm('Apakah Anda yakin ingin mengosongkan antrean tamu WA Blast? Seluruh daftar tamu akan dibersihkan.')) {
      persistBlastGuestList([]);
    }
  };

  const insertVariableChip = (variableName: string) => {
    setBlastTemplate((prev) => {
      const next = prev + ` {{${variableName}}} `;
      persistBlastTemplate(next);
      return next;
    });
  };

  const handleAddSingleGuest = () => {
    if (!newGuestName.trim()) {
      alert('Silakan masukkan nama tamu terlebih dahulu.');
      return;
    }
    const cleanPhone = formatIndonesianPhone(newGuestPhone);
    if (!cleanPhone || cleanPhone.length < 9) {
      alert('Nomor WhatsApp tidak valid. Masukkan nomor HP aktif minimal 9 digit angka (contoh: 08123456789).');
      return;
    }
    const newGuest: BlastGuest = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newGuestName.trim(),
      phone: cleanPhone,
      status: 'pending',
      selected: true
    };
    const updated = [newGuest, ...blastGuestList];
    persistBlastGuestList(updated);
    setNewGuestName('');
    setNewGuestPhone('');
    setShowAddGuestModal(false);
  };

  const handleBulkPasteGuests = () => {
    if (!bulkPasteRawText.trim()) return;
    const parsed = parseBulkGuestText(bulkPasteRawText);
    if (parsed.length === 0) {
      alert('Tidak ada format nama dan nomor yang dapat dikenali. Format per baris: "Nama Tamu, 08123456789".');
      return;
    }
    const newGuests: BlastGuest[] = parsed.map((p, idx) => ({
      id: `bulk_${Date.now()}_${idx}`,
      name: p.name,
      phone: p.phone,
      status: 'pending',
      selected: true
    }));
    const updated = [...newGuests, ...blastGuestList];
    persistBlastGuestList(updated);
    setBulkPasteRawText('');
    setShowBulkPasteModal(false);
    alert(`Berhasil menambahkan ${newGuests.length} tamu ke daftar WA Blast! Data telah tersimpan.`);
  };

  const handleImportCsv = () => {
    if (!csvRawText.trim()) return;
    const parsed = parseGuestsCsv(csvRawText);
    if (parsed.length === 0) {
      alert('Format CSV tidak valid atau kosong.');
      return;
    }
    const newGuests: BlastGuest[] = parsed.map((p, idx) => ({
      id: `csv_${Date.now()}_${idx}`,
      name: p.name,
      phone: p.phone,
      status: 'pending',
      selected: true
    }));
    const updated = [...newGuests, ...blastGuestList];
    persistBlastGuestList(updated);
    setCsvRawText('');
    setShowCsvModal(false);
    alert(`Berhasil mengimpor ${newGuests.length} tamu dari file CSV! Data telah tersimpan.`);
  };

  const handleSendIndividual = async (guestId: string) => {
    const target = blastGuestList.find(g => g.id === guestId);
    if (!target) return;

    const cleanPhone = formatIndonesianPhone(target.phone);
    if (!cleanPhone || cleanPhone.length < 9) {
      alert(`Nomor WhatsApp untuk "${target.name}" tidak valid (minimal 9 digit angka). Silakan perbaiki nomornya terlebih dahulu.`);
      return;
    }

    setBlastGuestList(prev => prev.map(g => g.id === guestId ? { ...g, status: 'sending' } : g));

    const baseUrl = typeof window !== 'undefined' ? (project?.slug ? `https://${project.slug}.serastory.com` : window.location.origin) : 'https://serastory.com';
    const personalizedLink = generateInvitationLink(baseUrl, target.name);
    const textToSend = interpolateMessage(blastTemplate, target.name, personalizedLink) + (!hasRemovedWatermark ? SERASTORY_PROMO_FOOTER : '');

    // 1. If third-party gateway (Fonnte/Wablas) is configured
    if (waGatewayConfig?.apiKey) {
      const result = await sendWhatsAppMessage(cleanPhone, textToSend, waGatewayConfig, projectId);
      setBlastGuestList(prev => {
        const nextList = prev.map(g => {
          if (g.id === guestId) {
            return {
              ...g,
              status: (result.success ? 'sent' : 'failed') as "sent" | "failed",
              sentAt: result.success ? new Date().toISOString() : undefined,
              errorReason: result.error
            };
          }
          return g;
        });
        localStorage.setItem('wa_blast_guest_list', JSON.stringify(nextList));
        return nextList;
      });
      return;
    }

    // 2. If PC Server bot is connected
    if (waSession?.status === 'connected') {
      if (botChannelRef.current) {
        botChannelRef.current.send({
          type: 'broadcast',
          event: 'send_single_message',
          payload: {
            guestId: target.id,
            phone: cleanPhone,
            name: target.name,
            template: blastTemplate,
            isGroup: target.isGroup
          }
        });
      }
      return;
    }

    // 3. Fallback: Bot is offline / not connected -> prompt user to send directly via WhatsApp Web/App
    const directWaUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(textToSend)}`;
    const confirmDirect = confirm(
      `Bot WhatsApp di server belum terhubung.\n\nApakah Anda ingin membuka WhatsApp Web / Chat langsung untuk mengirim pesan personalisasi ke "${target.name}" sekarang?`
    );
    if (confirmDirect) {
      window.open(directWaUrl, '_blank');
      setBlastGuestList(prev => {
        const nextList = prev.map(g => g.id === guestId ? {
          ...g,
          status: 'sent' as const,
          sentAt: new Date().toISOString()
        } : g);
        localStorage.setItem('wa_blast_guest_list', JSON.stringify(nextList));
        return nextList;
      });
    } else {
      setBlastGuestList(prev => prev.map(g => g.id === guestId ? { ...g, status: 'pending' } : g));
    }
  };

  const handleDeleteBlastGuest = (guestId: string) => {
    const nextList = blastGuestList.filter(g => g.id !== guestId);
    persistBlastGuestList(nextList);
  };

  const handleResetTemplate = () => {
    if (confirm('Kembalikan template pesan ke draf resmi undangan?')) {
      persistBlastTemplate(DEFAULT_MESSAGE_TEMPLATE);
    }
  };

  const handleStartBlast = async () => {
    const selectedTargets = blastGuestList.filter(g => g.selected && g.status !== 'sent');
    if (selectedTargets.length === 0) {
      alert('Tidak ada tamu terpilih yang berstatus pending/failed untuk dikirim.');
      return;
    }

    // Check Bundle Permission (hasWABlast)
    if (!hasWABlast) {
      setShowUpgradeBundleModal(true);
      return;
    }

    // Calculate Quota & Check Limits
    const totalWaBlastQuota = waBlastBaseQuota + waBlastExtraQuota;
    const remainingWaBlastQuota = Math.max(0, totalWaBlastQuota - waBlastSentCount);

    if (remainingWaBlastQuota <= 0) {
      alert(
        'Batas kapasitas kuota WA Blast Anda telah habis (0 tersisa).\n\n' +
        'Silakan beli paket kuota tambahan untuk melanjutkan pengiriman undangan.'
      );
      setShowBuyQuotaModal(true);
      return;
    }

    let targetsToSend = selectedTargets;
    if (selectedTargets.length > remainingWaBlastQuota) {
      const proceed = confirm(
        `Kapasitas Kuota Terbatas:\n\n` +
        `Sisa kuota Anda adalah ${remainingWaBlastQuota} pesan, namun Anda memilih ${selectedTargets.length} tamu.\n\n` +
        `Sistem hanya dapat mengirim ke ${remainingWaBlastQuota} tamu pertama.\n\n` +
        `• Klik OK untuk melanjutkan pengiriman (${remainingWaBlastQuota} tamu)\n` +
        `• Klik Batal jika ingin membeli kuota tambahan terlebih dahulu`
      );
      if (!proceed) {
        setShowBuyQuotaModal(true);
        return;
      }
      targetsToSend = selectedTargets.slice(0, remainingWaBlastQuota);
    }

    const hasGateway = Boolean(waGatewayConfig?.apiKey);
    const isBotConnected = waSession?.status === 'connected';

    if (!hasGateway && !isBotConnected) {
      alert(
        'WhatsApp Bot di server belum terhubung.\n\n' +
        'Silakan hubungkan WhatsApp terlebih dahulu dengan memindai (scan) QR Code agar Bot dapat mengirim otomatis, atau kirim langsung per tamu menggunakan tombol WhatsApp.'
      );
      return;
    }

    setBlastStep(2);
    setIsBlasting(true);
    blastAbortRef.current = false;
    setBlastProgress({ current: 0, total: targetsToSend.length });
    setIsBreakActive(false);
    setBreakCountdown(null);

    // Send broadcast to PC bot server (45-60s delay, 1-2m break per 15 messages)
    if (botChannelRef.current) {
      botChannelRef.current.send({
        type: 'broadcast',
        event: 'start_blast',
        payload: {
          guests: targetsToSend,
          template: blastTemplate,
          minDelay: 45,
          maxDelay: 60,
          removePromo: hasRemovedWatermark
        }
      });
    }

    // If using third-party gateway, process queue sequentially
    if (hasGateway) {
      let successfulCount = 0;
      for (let i = 0; i < targetsToSend.length; i++) {
        if (blastAbortRef.current) break;

        const guest = targetsToSend[i];
        setBlastProgress({ current: i + 1, total: targetsToSend.length, currentGuestName: guest.name });
        setBlastGuestList(prev => prev.map(g => g.id === guest.id ? { ...g, status: 'sending' } : g));

        const cleanPhone = formatIndonesianPhone(guest.phone);
        const baseUrl = typeof window !== 'undefined' ? (project?.slug ? `https://${project.slug}.serastory.com` : window.location.origin) : 'https://serastory.com';
        const personalizedLink = generateInvitationLink(baseUrl, guest.name);
        const textToSend = interpolateMessage(blastTemplate, guest.name, personalizedLink) + (!hasRemovedWatermark ? SERASTORY_PROMO_FOOTER : '');

        const res = await sendWhatsAppMessage(cleanPhone, textToSend, waGatewayConfig, projectId);
        if (res.success) {
          successfulCount++;
        }

        setBlastGuestList(prev => {
          const nextList = prev.map(g => {
            if (g.id === guest.id) {
              return {
                ...g,
                status: (res.success ? 'sent' : 'failed') as "sent" | "failed",
                sentAt: res.success ? new Date().toISOString() : undefined,
                errorReason: res.error
              };
            }
            return g;
          });
          localStorage.setItem('wa_blast_guest_list', JSON.stringify(nextList));
          return nextList;
        });

        // Delay & break logic for gateway (45-60s per msg, 1-2m break per 15 msgs)
        if (i < targetsToSend.length - 1 && !blastAbortRef.current) {
          if (successfulCount > 0 && successfulCount % 15 === 0) {
            const breakSec = Math.floor(60 + Math.random() * 61); // 60 - 120s
            setIsBreakActive(true);
            setBreakCountdown(breakSec);
            for (let s = breakSec; s > 0; s--) {
              if (blastAbortRef.current) break;
              setBreakCountdown(s);
              await new Promise(r => setTimeout(r, 1000));
            }
            setIsBreakActive(false);
            setBreakCountdown(null);
          } else {
            const randomWait = Math.floor(45 + Math.random() * 16); // 45 - 60s
            setCurrentDelayCountdown(randomWait);
            for (let s = randomWait; s > 0; s--) {
              if (blastAbortRef.current) break;
              setCurrentDelayCountdown(s);
              await new Promise(r => setTimeout(r, 1000));
            }
            setCurrentDelayCountdown(null);
          }
        }
      }
      setCurrentDelayCountdown(null);
      setIsBreakActive(false);
      setBreakCountdown(null);
      setIsBlasting(false);
    }
  };

  const handleAbortBlast = () => {
    blastAbortRef.current = true;
    setIsBlasting(false);
    setIsBreakActive(false);
    setBreakCountdown(null);
    setCurrentDelayCountdown(null);
    if (botChannelRef.current) {
      botChannelRef.current.send({
        type: 'broadcast',
        event: 'abort_blast',
        payload: {}
      });
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    setBlastGuestList(prev => {
      const nextList = prev.map(g => ({ ...g, selected: checked }));
      localStorage.setItem('wa_blast_guest_list', JSON.stringify(nextList));
      return nextList;
    });
  };

  const toggleSelectGuest = (guestId: string) => {
    setBlastGuestList(prev => {
      const nextList = prev.map(g => g.id === guestId ? { ...g, selected: !g.selected } : g);
      localStorage.setItem('wa_blast_guest_list', JSON.stringify(nextList));
      return nextList;
    });
  };

  const filteredBlastGuests = blastGuestList.filter(guest => {
    if (blastFilterStatus === 'pending' && !(guest.status === 'pending' || guest.status === 'sending')) return false;
    if (blastFilterStatus === 'sent' && guest.status !== 'sent') return false;
    if (blastFilterStatus === 'failed' && guest.status !== 'failed') return false;

    if (blastSearchTerm.trim()) {
      const q = blastSearchTerm.toLowerCase();
      const matchName = guest.name.toLowerCase().includes(q);
      const matchPhone = guest.phone.includes(q);
      if (!matchName && !matchPhone) return false;
    }
    return true;
  });

  // Settings State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, attending, declined
  const [filterCheckIn, setFilterCheckIn] = useState("all"); // all, arrived, waiting
  const [currentPage, setCurrentPage] = useState(1);

  // Story State
  const [newStoryYear, setNewStoryYear] = useState("");
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [newStoryDesc, setNewStoryDesc] = useState("");
  const [newStoryOrder, setNewStoryOrder] = useState("");

  const [showSlideshow, setShowSlideshow] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'guestsCount' | 'actualGuestsCount' | null, direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc'
  });

  const [selectedWish, setSelectedWish] = useState<RSVPData | null>(null);
  const [scheduleTime, setScheduleTime] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isHourlyExpanded, setIsHourlyExpanded] = useState(true);

  const [newGift, setNewGift] = useState({
    name: "",
    price: "",
    image: "",
    link: "",
    originalPrice: "",
    discount: ""
  });
  const [isAddingGift, setIsAddingGift] = useState(false);
  const [showAddGiftModal, setShowAddGiftModal] = useState(false);

  const [editingGift, setEditingGift] = useState<{ id: string, name: string, price: string, image: string, discount: string } | null>(null);
  const [isUpdatingGift, setIsUpdatingGift] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [botStatus, setBotStatus] = useState<{ status: string; qr?: string }>({ status: 'disconnected' });
  const [isChangingBot, setIsChangingBot] = useState(false);
  const [blastLogs, setBlastLogs] = useState<any[]>([]);

// projectId declared at top of component

  const allWishes = rsvps.reduce((acc, rsvp) => {
    if (rsvp.wishes && rsvp.wishes.trim() !== "" && rsvp.wishes !== "Walk-in registration") {
      acc.push({ name: rsvp.name, text: rsvp.wishes });
    }
    return acc;
  }, [] as { name: string, text: string }[]);

  useEffect(() => {
    if (showSlideshow && allWishes.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % allWishes.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [showSlideshow, allWishes.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterCheckIn]);

  const fetchData = async () => {
    try {
      // 1. Fetch project info
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      const { data: weddingData } = await supabase
        .from('wedding_details')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (projectData) {
        const mergedProject = {
          ...projectData,
          ...(weddingData || {})
        };
        setProject(mergedProject);
        setDbPassword(mergedProject.hashtag || "serastory");

        try {
          if (mergedProject.love_story) {
            const status = JSON.parse(mergedProject.love_story);
            setBotStatus(status);
          } else {
            setBotStatus({ status: 'disconnected' });
          }
        } catch (e) {
          setBotStatus({ status: 'disconnected' });
        }
        
        const bName = mergedProject.bride_name || "Bride";
        const gName = mergedProject.groom_name || "Groom";
        const bNick = mergedProject.bride_nickname || "Bride";
        const gNick = mergedProject.groom_nickname || "Groom";

        setMessageTemplate(
          `*WEDDING INVITATION*\n\nShalom / Salam Sejahtera,\n\n“Two are better than one, because they have a good reward for their toil. For if they fall, one will lift up his fellow. But woe to him who is alone when he falls and has not another to lift him up.”\n(Ecclesiastes 4:9-10)\n\nWith great joy and without diminishing our respect, we would like to invite you to attend and give your blessings on the occasion of our wedding celebration:\n\n*${gName} & ${bName}*💍\n\nGod willing, the ceremony will be held on:\n\n*Holy Matrimony*\nSaturday, 25 April 2026\n10.00 WIB\n\n*Wedding Reception*\nSaturday, 25 April 2026\n12.00 WIB\n\nPlease visit the link below for complete wedding details:\n\n[wedding link]\n\nIt would be a great honor and happiness for us if you could attend and celebrate this special day with us.\n\nWarm regards,\n\n*${gNick} & ${bNick}*🤍`
        );
      }

      // 2. Fetch guests
      const { data: guestsData, error: guestsError } = await supabase
        .from('guests')
        .select('*')
        .eq('project_id', projectId);

      if (guestsError) {
        console.error("Error fetching guests:", guestsError);
      }

      // 3. Fetch rsvp
      const { data: rsvpData, error: rsvpError } = await supabase
        .from('rsvp')
        .select('*')
        .eq('project_id', projectId);

      if (rsvpError) {
        console.error("Error fetching RSVP:", rsvpError);
      }

      // 4. Fetch checkins
      const { data: checkinsData, error: checkinsError } = await supabase
        .from('checkins')
        .select('*')
        .eq('project_id', projectId);

      if (checkinsError) {
        console.error("Error fetching checkins:", checkinsError);
      }

      // 5. Merge data
      const rsvpMap = new Map<string, any>();
      const rsvpByNameMap = new Map<string, any>();
      const rsvpByPhoneMap = new Map<string, any>();

      (rsvpData || []).forEach(r => {
        if (r.guest_id) {
          rsvpMap.set(r.guest_id, r);
        } else {
          if (r.guest_name) {
            rsvpByNameMap.set(r.guest_name.toLowerCase().trim(), r);
          }
          if (r.guest_phone) {
            rsvpByPhoneMap.set(r.guest_phone.trim(), r);
          }
        }
      });

      const checkinsMap = new Map<string, any>();
      (checkinsData || []).forEach(c => {
        if (c.guest_id) {
          checkinsMap.set(c.guest_id, c);
        }
      });

      const mergedRSVPs: RSVPData[] = [];
      const matchedRsvpIds = new Set<string>();

      (guestsData || []).forEach(g => {
        let rsvp = rsvpMap.get(g.id);
        if (!rsvp && g.name) {
          rsvp = rsvpByNameMap.get(g.name.toLowerCase().trim());
        }
        if (!rsvp && g.phone) {
          rsvp = rsvpByPhoneMap.get(g.phone.trim());
        }

        if (rsvp) {
          matchedRsvpIds.add(rsvp.id);
        }
        const checkin = checkinsMap.get(g.id);

        mergedRSVPs.push({
          id: g.id,
          rsvp_id: rsvp?.id,
          name: g.name,
          isAttending: rsvp ? (rsvp.attendance === 'hadir') : false,
          guestsCount: rsvp ? rsvp.pax : 0,
          actualGuestsCount: checkin ? parseInt(checkin.notes || '1', 10) : undefined,
          checkedIn: !!checkin,
          checkedInAt: checkin ? new Date(checkin.checked_in_at) : null,
          phone: rsvp?.guest_phone || g.phone || "",
          wishes: rsvp?.message || "",
          createdAt: rsvp ? new Date(rsvp.submitted_at) : new Date(g.created_at)
        });
      });

      // Add unmatched RSVP submissions
      (rsvpData || []).forEach(r => {
        if (r.guest_id) {
          matchedRsvpIds.add(r.id);
        }
        if (!matchedRsvpIds.has(r.id)) {
          mergedRSVPs.push({
            id: r.id,
            rsvp_id: r.id,
            name: r.guest_name || "Guest",
            isAttending: r.attendance === 'hadir',
            guestsCount: r.pax,
            actualGuestsCount: undefined,
            checkedIn: false,
            checkedInAt: null,
            phone: r.guest_phone || "",
            wishes: r.message || "",
            createdAt: r.submitted_at ? new Date(r.submitted_at) : new Date()
          });
        }
      });

      // Sort by createdAt desc
      mergedRSVPs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      setRsvps(mergedRSVPs);

      // 6. Fetch gifts
      const { data: giftsData } = await supabase
        .from('gift_registry')
        .select('*')
        .eq('project_id', projectId);

      const mappedGifts = (giftsData || []).map(gift => ({
        id: gift.id,
        name: gift.name,
        price: gift.price ? gift.price.toLocaleString('id-ID') : '0',
        image: gift.image_url || '',
        link: gift.link || '',
        originalPrice: gift.original_price ? gift.original_price.toLocaleString('id-ID') : '',
        discount: gift.discount_label || '',
        isBought: gift.is_bought
      }));
      setGifts(mappedGifts);

      // 7. Fetch stories
      const { data: storyData } = await supabase
        .from('love_story_items')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      const mappedStory = (storyData || []).map(event => ({
        id: event.id,
        year: event.year,
        title: event.title,
        desc: event.description,
        order: event.sort_order
      }));
      setStoryEvents(mappedStory);

      // 8. Fetch wa_blast_logs queue
      const { data: queueData } = await supabase
        .from('wa_blast_logs')
        .select('phone')
        .eq('project_id', projectId)
        .eq('status', 'queued');

      const activePhones = new Set<string>();
      (queueData || []).forEach(item => {
        if (item.phone) {
          activePhones.add(item.phone.trim());
        }
      });
      setQueuedPhones(activePhones);

      // 9. Fetch wa_blast_logs history
      const { data: logsData } = await supabase
        .from('wa_blast_logs')
        .select('*, guests(name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(30);
      setBlastLogs(logsData || []);

    } catch (error) {
      console.error("Firestore RSVP Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlastLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('wa_blast_logs')
        .select('*, guests(name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      setBlastLogs(data || []);
    } catch (err) {
      console.error("Error fetching blast logs:", err);
    }
  };

  useEffect(() => {
    fetchData();

    // Enable Supabase Realtime Channels
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guests' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rsvp' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkins' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
        (payload) => {
          const newProj = payload.new as any;
          try {
            if (newProj && newProj.love_story) {
              const status = JSON.parse(newProj.love_story);
              setBotStatus(status);
            } else {
              setBotStatus({ status: 'disconnected' });
            }
          } catch (e) {
            setBotStatus({ status: 'disconnected' });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wa_blast_logs', filter: `project_id=eq.${projectId}` },
        () => {
          fetchBlastLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  // Fallback Polling for Bot Status when it is in loading or qr state
  useEffect(() => {
    if (!projectId) return;
    if (botStatus?.status !== 'loading' && botStatus?.status !== 'qr') return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('love_story')
          .eq('id', projectId)
          .maybeSingle();

        if (error) throw error;
        if (data && data.love_story) {
          const status = JSON.parse(data.love_story);
          if (status.status !== botStatus.status || status.qr !== botStatus.qr) {
            console.log("Polling updated bot status to:", status.status);
            setBotStatus(status);
          }
        }
      } catch (err) {
        console.error("Error polling bot status:", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [projectId, botStatus?.status, botStatus?.qr]);

  // Auth & Plan Check Effect
  useEffect(() => {
    const checkAuthAndPlan = async () => {
      try {
        // Fetch project plan using server admin API to bypass RLS
        const planRes = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_project_plan',
            payload: { project_id: projectId }
          })
        });

        if (planRes.ok) {
          const { data } = await planRes.json();
          if (data) {
            if (data.hashtag) {
              setDbPassword(data.hashtag);
            }

            // 1. Exact sent count from Supabase wa_blast_logs
            if (typeof data.sent_count === 'number') {
              setWaBlastSentCount(data.sent_count);
            }

            // 2. Determine Package & Bundle Quotas
            const storedConfig = data.blast_config;
            const subPkg = data.subscriptions?.packages;
            const rawPkgName = (storedConfig?.package_name || subPkg?.name || 'silver').toLowerCase();
            const bundleConfig = BUNDLE_WA_BLAST_CONFIG[rawPkgName] || BUNDLE_WA_BLAST_CONFIG['silver'];

            setProjectPackageName(bundleConfig.label.toLowerCase());

            const isBasic = rawPkgName === 'basic';
            setIsBasicPlan(isBasic);

            // Dashboard feature is active for silver, premium, exclusive OR if unlocked for Rp 20.000
            const isDashboardActive = !isBasic || Boolean(storedConfig?.has_dashboard);
            setHasDashboardFeature(isDashboardActive);
            if (!isDashboardActive) {
              setActiveTab('blast');
            }

            const resolvedHasBlast = storedConfig?.has_wa_blast !== undefined 
              ? Boolean(storedConfig.has_wa_blast) 
              : bundleConfig.has_wa_blast;
            setHasWABlast(resolvedHasBlast);

            const resolvedMaxBlast = typeof storedConfig?.max_wa_blast === 'number'
              ? storedConfig.max_wa_blast
              : bundleConfig.max_wa_blast;
            setWaBlastBaseQuota(resolvedMaxBlast);

            if (typeof storedConfig?.extra_wa_blast === 'number') {
              setWaBlastExtraQuota(storedConfig.extra_wa_blast);
            }

            // Jumlah terkirim dari tabel kuota (paling akurat, termasuk koreksi admin)
            if (data.quota_source === 'wa_blast_quotas' && typeof storedConfig?.used_wa_blast === 'number') {
              setWaBlastSentCount(storedConfig.used_wa_blast);
            }

            if (typeof storedConfig?.has_removed_watermark === 'boolean') {
              setHasRemovedWatermark(storedConfig.has_removed_watermark);
            }

            if (Array.isArray(storedConfig?.guest_list) && storedConfig.guest_list.length > 0) {
              setBlastGuestList(storedConfig.guest_list);
              try {
                localStorage.setItem('wa_blast_guest_list', JSON.stringify(storedConfig.guest_list));
              } catch (_) {}
            }
            if (typeof storedConfig?.message_template === 'string' && storedConfig.message_template.trim().length > 15) {
              setBlastTemplate(storedConfig.message_template);
              try {
                localStorage.setItem('wa_blast_template', storedConfig.message_template);
              } catch (_) {}
            }
            if (Array.isArray(data.recent_logs)) {
              setBlastLogs(data.recent_logs);
            }

            // If Supabase didn't have dining_schedule config yet, initialize and record it!
            if (!storedConfig || Object.keys(storedConfig).length === 0) {
              const initialUsed = data.sent_count || 0;
              const initialMax = bundleConfig.max_wa_blast;
              const initialConfig = {
                package_name: bundleConfig.label.toLowerCase(),
                max_wa_blast: initialMax,
                extra_wa_blast: 0,
                total_wa_blast: initialMax,
                available_wa_blast: Math.max(0, initialMax - initialUsed),
                used_wa_blast: initialUsed,
                has_wa_blast: bundleConfig.has_wa_blast,
                has_removed_watermark: false,
                last_synced_at: new Date().toISOString()
              };
              fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'update_blast_config',
                  payload: { project_id: projectId, config: initialConfig }
                })
              }).catch(() => {});
            }
          }
        }
      } catch (error) {
        console.error("Error checking plan/password:", error);
      } finally {
        setIsCheckingAuth(false);
        setCheckingPlan(false);
      }
    };

    checkAuthAndPlan();
  }, [projectId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === dbPassword) {
      setIsAuthenticated(true);
    } else {
      alert("Incorrect password!");
      setPasswordInput("");
    }
  };

  const getGuestLink = (guestName: string, guestId?: string) => {
    const baseLink = typeof window !== 'undefined' ? window.location.origin : '';
    // Find invitation slug if matching guest exists
    const matchingRsvp = rsvps.find(r => r.name.toLowerCase() === guestName.toLowerCase() || r.id === guestId);
    
    // We will fallback to raw guestName if slug not available
    const pathSegment = guestId || encodeURIComponent(guestName.trim().toUpperCase());
    return `${baseLink}/${pathSegment}`;
  };

  const renderMessage = (template: string, name: string) => {
    const link = getGuestLink(name);
    return template
      .replace(/\[wedding link\]/g, link)
      .replace(/\[guest name\]/g, name.trim().toUpperCase())
      .replace(/\[nama\]/g, name.trim().toUpperCase());
  };

  const copyToClipboard = (text: string, msg: string = "Copied to clipboard!") => {
    navigator.clipboard.writeText(text).then(() => {
      alert(msg);
    }).catch(err => {
      console.error("Failed to copy:", err);
      alert("Failed to copy text.");
    });
  };

  const copyAllLinks = () => {
    const validGuests = blastGuests.filter(g => g.name.trim() !== "");
    if (validGuests.length === 0) return;
    const textToCopy = validGuests.map(g => `${g.name.trim().toUpperCase()}:\n${getGuestLink(g.name)}`).join('\n\n');
    copyToClipboard(textToCopy, "All wedding links copied to clipboard!");
  };

  const sendWhatsAppBlast = async (name: string, phone: string, index: number) => {
    if (!phone || phone.trim() === "") {
      alert("WhatsApp phone number is required.");
      return;
    }
    
    try {
      const message = renderMessage(messageTemplate, name);
      
      const updated = [...blastGuests];
      updated[index].status = 'queued';
      setBlastGuests(updated);

      const { data: matchedGuest } = await supabase
        .from('guests')
        .select('id')
        .eq('project_id', projectId)
        .eq('phone', phone.trim())
        .limit(1)
        .maybeSingle();

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'queue_blast',
          payload: {
            project_id: projectId,
            blasts: [{
              phone: phone.trim(),
              message: message,
              guest_id: matchedGuest?.id || null
            }]
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to queue blast');
      }

      setQueuedPhones(prev => {
        const next = new Set(prev);
        next.add(phone.trim());
        return next;
      });

      alert(`Pesan untuk ${name} masuk antrian blast.`);
    } catch (err) {
      console.error(err);
      const updated = [...blastGuests];
      updated[index].status = 'error';
      setBlastGuests(updated);
      alert(`Failed to queue message: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const sendAllBlasts = async () => {
    const validGuests = blastGuests
      .map((g, idx) => ({ ...g, originalIdx: idx }))
      .filter(g => {
        const cleanPhone = g.phone.replace(/[^0-9]/g, '');
        const isPhoneValid = cleanPhone.length >= 10 && cleanPhone.length <= 15 && (cleanPhone.startsWith('62') || cleanPhone.startsWith('08') || cleanPhone.startsWith('0'));
        return g.name.trim() !== "" && isPhoneValid && !queuedPhones.has(g.phone.trim());
      });

    if (validGuests.length === 0) {
      alert("No valid guests with name and phone number to blast.");
      return;
    }

    const confirmBlast = window.confirm(`Are you sure you want to send invitations to ${validGuests.length} guests?`);
    if (!confirmBlast) return;

    const updated = [...blastGuests];

    validGuests.forEach(g => {
      updated[g.originalIdx].status = 'queued';
    });
    setBlastGuests(updated);

    try {
      const blastsData = await Promise.all(validGuests.map(async (g) => {
        const message = renderMessage(messageTemplate, g.name);

        const { data: matchedGuest } = await supabase
          .from('guests')
          .select('id')
          .eq('project_id', projectId)
          .eq('phone', g.phone.trim())
          .limit(1)
          .maybeSingle();

        return {
          phone: g.phone.trim(),
          message: message,
          guest_id: matchedGuest?.id || null
        };
      }));

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'queue_blast',
          payload: {
            project_id: projectId,
            blasts: blastsData
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to queue blasts');
      }

      setQueuedPhones(prev => {
        const next = new Set(prev);
        validGuests.forEach(g => next.add(g.phone.trim()));
        return next;
      });

      alert(`Successfully queued ${validGuests.length} invitations to the WhatsApp Bot queue!`);
    } catch (err) {
      console.error("Error blasting all:", err);
      alert("Failed to queue some invitations. Please check the logs.");
    }
  };

  const handleBatchImport = async () => {
    let lines: string[] = [];

    if (importSheetUrl.trim()) {
      try {
        const res = await fetch(`/api/proxy-sheet?url=${encodeURIComponent(importSheetUrl)}`);
        if (!res.ok) {
          const errData = await res.json();
          alert(errData.error || "Failed to fetch from Google Sheets");
          return;
        }
        const csvText = await res.text();
        lines = csvText.split(/\r?\n/);
        // Remove header if it looks like one
        if (lines.length > 0 && (lines[0].toLowerCase().includes("name") || lines[0].toLowerCase().includes("nama"))) {
          lines.shift();
        }
      } catch (err) {
        alert("Network error trying to fetch Google Sheets.");
        return;
      }
    } else if (importText.trim()) {
      lines = importText.split("\n");
    } else {
      return;
    }
    
    const parsed: { name: string; phone: string; botSession: string; status: 'idle' }[] = [];
    
    lines.forEach(line => {
      if (!line.trim()) return;
      
      let parts: string[] = [];
      if (importSheetUrl.trim()) {
        // Simple CSV parse
        parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/^"|"$/g, '').trim());
      } else {
        parts = line.split(/[,\t;]+/);
        if (parts.length < 2) {
          const match = line.trim().match(/^(.*?)\s+([\d+-\s]+)$/);
          if (match) {
            parts = [match[1], match[2]];
          }
        }
      }
      
      let name = "";
      let phone = "";
      
      if (importSheetUrl.trim()) {
        name = parts[1]?.trim() || "";
        phone = parts[2]?.trim() || "";
      } else {
        name = parts[0]?.trim() || "";
        phone = parts[1]?.trim() || "";
      }
      
      phone = phone.replace(/[\s\-\(\)]/g, "");
      
      if (name) {
        parsed.push({
          name: name,
          phone: phone,
          botSession: '1',
          status: 'idle'
        });
      }
    });

    if (parsed.length > 0) {
      const currentFiltered = blastGuests.filter(g => g.name.trim() !== "" || g.phone.trim() !== "");
      setBlastGuests([...currentFiltered, ...parsed]);
      setShowImportModal(false);
      setImportText("");
      setImportSheetUrl("");
      alert(`Successfully imported ${parsed.length} guests!`);
    } else {
      alert("Could not parse any valid names from the input. Make sure the format is 'Name, Phone'.");
    }
  };

  const handleAddStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoryYear || !newStoryTitle || !newStoryDesc || !newStoryOrder) {
      alert("Please fill all fields");
      return;
    }
    
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_story',
          payload: {
            project_id: projectId,
            year: newStoryYear,
            title: newStoryTitle,
            description: newStoryDesc,
            sort_order: parseInt(newStoryOrder, 10)
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add story event');
      }

      setNewStoryYear("");
      setNewStoryTitle("");
      setNewStoryDesc("");
      setNewStoryOrder("");
      await fetchData();
      alert("Story event added successfully!");
    } catch (error) {
      console.error("Error adding story event:", error);
      alert("Failed to add story event.");
    }
  };

  const handleDeleteStory = async (id: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      try {
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete_story',
            payload: { id }
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to delete event');
        }
        await fetchData();
        alert("Event deleted successfully!");
      } catch (error) {
        console.error("Error deleting event:", error);
        alert("Failed to delete event.");
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    if (newPassword.length < 5) {
      alert("Password must be at least 5 characters long.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          payload: {
            project_id: projectId,
            password: newPassword
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to change password');
      }

      setDbPassword(newPassword);
      alert("Password successfully changed!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      alert("Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isCheckingAuth || checkingPlan) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-neutral-300 animate-spin"></div>
      </div>
    );
  }


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-amber-100/30 blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[20%] right-[20%] w-[40%] h-[40%] rounded-full bg-emerald-50/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white/60 backdrop-blur-2xl p-8 md:p-10 rounded-[2rem] border border-white/80 shadow-2xl relative z-10 text-center"
        >
          <div className="mb-8">
            <h2 className="text-[10px] font-bold tracking-[0.4em] text-neutral-400 uppercase mb-3">Restricted Access</h2>
            <h1 className="text-3xl font-serif tracking-tight text-neutral-800">Management <span className="italic text-neutral-400">Suite</span></h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 text-left">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase mb-2 ml-1">Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-white/80 border border-neutral-200 px-5 py-4 rounded-xl text-sm focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all text-neutral-900 placeholder:text-neutral-300"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-neutral-900 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-neutral-800 transition-all shadow-lg active:scale-95"
            >
              Unlock Dashboard
            </button>
          </form>

          <div className="mt-10 flex flex-col items-center justify-center">
            <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity duration-300">
              <div className="w-8 h-[1px] bg-neutral-300"></div>
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-black tracking-[0.4em] uppercase text-neutral-400 mb-1">Developed By</span>
                <span className="text-xs font-serif font-black tracking-[0.2em] text-neutral-800">SERA STORY</span>
              </div>
              <div className="w-8 h-[1px] bg-neutral-300"></div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditMode: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Max size is 5MB.");
      return;
    }

    setIsUploadingImage(true);
    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload_image',
          payload: {
            project_id: projectId,
            file: base64String,
            fileName: file.name,
            fileType: file.type
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to upload image');
      }

      const data = await res.json();
      if (isEditMode && editingGift) {
        setEditingGift({ ...editingGift, image: data.url });
      } else {
        setNewGift({ ...newGift, image: data.url });
      }
      alert("Image uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleToggleBot = async (action: 'login' | 'logout') => {
    setIsChangingBot(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_bot',
          payload: {
            project_id: projectId,
            status: 'loading',
            action: action
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update bot command');
      }

      setBotStatus(prev => ({ ...prev, status: 'loading' }));
    } catch (err) {
      console.error(err);
      alert(`Operation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsChangingBot(false);
    }
  };

  const handleAddGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGift.name || !newGift.image) return;
    setIsAddingGift(true);

    const originalVal = parseInt(newGift.price.replace(/[^0-9]/g, ''));
    if (isNaN(originalVal)) {
      alert("Invalid price value");
      setIsAddingGift(false);
      return;
    }

    let finalPrice = originalVal;
    let originalPriceVal: number | null = null;
    let discountLabelStr = "";

    if (newGift.discount) {
      const discVal = parseInt(newGift.discount.replace(/[^0-9]/g, ''));
      if (!isNaN(discVal) && discVal > 0 && discVal <= 100) {
        finalPrice = originalVal - (originalVal * discVal / 100);
        originalPriceVal = originalVal;
        discountLabelStr = `${discVal}% OFF`;
      }
    }

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_gift',
          payload: {
            project_id: projectId,
            name: newGift.name,
            price: finalPrice,
            original_price: originalPriceVal,
            discount_label: discountLabelStr,
            image_url: newGift.image
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add gift');
      }

      setNewGift({ name: "", price: "", image: "", link: "", originalPrice: "", discount: "" });
      setShowAddGiftModal(false);
      await fetchData();
      alert("Gift added successfully!");
    } catch (error) {
      console.error("Error adding gift:", error);
      alert("Failed to add gift.");
    } finally {
      setIsAddingGift(false);
    }
  };

  const handleUpdateGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGift) return;
    setIsUpdatingGift(true);

    const originalVal = parseInt(editingGift.price.replace(/[^0-9]/g, ''));
    if (isNaN(originalVal)) {
      alert("Invalid price value");
      setIsUpdatingGift(false);
      return;
    }

    let finalPrice = originalVal;
    let originalPriceVal: number | null = null;
    let discountLabelStr = "";

    if (editingGift.discount) {
      const discVal = parseInt(editingGift.discount.replace(/[^0-9]/g, ''));
      if (!isNaN(discVal) && discVal > 0 && discVal <= 100) {
        finalPrice = originalVal - (originalVal * discVal / 100);
        originalPriceVal = originalVal;
        discountLabelStr = `${discVal}% OFF`;
      }
    }

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_gift',
          payload: {
            id: editingGift.id,
            name: editingGift.name,
            price: finalPrice,
            original_price: originalPriceVal,
            discount_label: discountLabelStr,
            image_url: editingGift.image
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update gift');
      }

      setEditingGift(null);
      await fetchData();
      alert("Gift updated successfully!");
    } catch (error) {
      console.error("Error updating gift:", error);
      alert("Failed to update gift.");
    } finally {
      setIsUpdatingGift(false);
    }
  };

  const handleDeleteGift = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_gift',
          payload: { id }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete gift');
      }
      await fetchData();
    } catch (error) {
      console.error("Error deleting gift:", error);
    }
  };

  const toggleBought = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_gift',
          payload: {
            id,
            is_bought: !currentStatus
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update status');
      }
      await fetchData();
    } catch (error) {
      console.error("Error updating gift status:", error);
    }
  };

  const handleDeleteWish = async (id: string, wishIndex?: number) => {
    if (!confirm("Are you sure you want to delete this wish?")) return;
    try {
      const item = rsvps.find(r => r.id === id || r.rsvp_id === id);
      const rsvpId = item?.rsvp_id;
      const guestId = item?.id;

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_wish',
          payload: {
            project_id: projectId,
            id: guestId,
            rsvp_id: rsvpId,
            name: item?.name
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete wish');
      }

      await fetchData();
      setSelectedWish(null);
      alert("Wish deleted successfully!");
    } catch (error) {
      console.error("Error deleting wish:", error);
      alert("Failed to delete wish.");
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat('id-ID', { timeStyle: 'short' }).format(date);
  };

  const totalPlanned = rsvps.filter(r => r.isAttending).reduce((sum, r) => sum + r.guestsCount, 0);
  const totalActual = rsvps.filter(r => r.checkedIn).reduce((sum, r) => sum + (r.actualGuestsCount !== undefined ? r.actualGuestsCount : r.guestsCount), 0);
  const totalNotAttending = rsvps.filter(r => !r.isAttending).length;
  const attendancePercentage = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

  const totalGroupsAttending = rsvps.filter(r => r.isAttending).length;
  const totalGroupsArrived = rsvps.filter(r => r.checkedIn).length;
  const totalGroupsPending = totalGroupsAttending - totalGroupsArrived;
  const remainingPax = Math.max(0, totalPlanned - totalActual);
  const totalWishesCount = allWishes.length;

  const remainingPercentage = totalPlanned > 0 ? Math.round((remainingPax / totalPlanned) * 100) : 0;

  const sortedRsvps = [...rsvps]
    .filter(rsvp => {
      const matchesSearch = rsvp.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || (filterStatus === "attending" && rsvp.isAttending) || (filterStatus === "declined" && !rsvp.isAttending);
      const matchesCheckIn = filterCheckIn === "all" || (filterCheckIn === "arrived" && rsvp.checkedIn) || (filterCheckIn === "waiting" && !rsvp.checkedIn);
      return matchesSearch && matchesStatus && matchesCheckIn;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;

      let valA: any = a[sortConfig.key];
      let valB: any = b[sortConfig.key];

      if (sortConfig.key === 'actualGuestsCount') {
        valA = a.actualGuestsCount !== undefined ? a.actualGuestsCount : (a.checkedIn ? a.guestsCount : 0);
        valB = b.actualGuestsCount !== undefined ? b.actualGuestsCount : (b.checkedIn ? b.guestsCount : 0);
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const filteredRsvps = sortedRsvps;

  const requestSort = (key: 'name' | 'guestsCount' | 'actualGuestsCount') => {
    let direction: 'asc' | 'desc' = 'asc';
    let newKey: 'name' | 'guestsCount' | 'actualGuestsCount' | null = key;

    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else {
        newKey = null;
      }
    }
    setSortConfig({ key: newKey, direction });
  };

  const getBotStatus = (sessionId: string) => {
    const stat = botStatuses[`Session${sessionId}`];
    if (!stat || stat.status !== 'online') return '(🔴 Offline)';
    return '(🟢 Online)';
  };

  const SortIcon = ({ column }: { column: 'name' | 'guestsCount' | 'actualGuestsCount' }) => {
    if (sortConfig.key !== column) return (
      <svg className="w-3 h-3 ml-1 opacity-20 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
    );
    return sortConfig.direction === 'asc' ? (
      <svg className="w-3 h-3 ml-1 text-neutral-900 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
    ) : (
      <svg className="w-3 h-3 ml-1 text-neutral-900 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-1l-4 4m0 0l-4-4m4 4V10" /></svg>
    );
  };

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredRsvps.length / ITEMS_PER_PAGE);
  const paginatedRsvps = filteredRsvps.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const coupleNicknames = project 
    ? `${project.bride_nickname || 'Bride'} & ${project.groom_nickname || 'Groom'}` 
    : 'Bride & Groom';

  const slideshowBg = project?.cover_photo_url || project?.opening_photo_url || "https://images.unsplash.com/photo-1519225495810-7517c24a2ed3?q=80&w=1920&auto=format&fit=crop";

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white pb-24 relative overflow-hidden">
      {/* Aesthetic Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-amber-100/30 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-50/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-8 md:pt-12 relative z-10 space-y-8 md:space-y-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 border-b border-neutral-200/60 pb-8"
        >
          <div className="flex-1">
            <h2 className="text-[8px] md:text-[9px] font-bold tracking-[0.4em] text-neutral-400 uppercase mb-2">{coupleNicknames} Wedding</h2>
            <h1 className="text-3xl md:text-4xl font-serif tracking-tight text-neutral-800 leading-tight">Management <span className="italic text-neutral-400">Suite</span></h1>
            <div className="flex gap-6 mt-8">
              <button
                onClick={() => setActiveTab('rsvp')}
                className={`group relative text-[9px] font-bold tracking-[0.2em] uppercase pb-3 transition-all flex items-center gap-1.5 ${activeTab === 'rsvp' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                {!hasDashboardFeature && <span>🔒</span>}
                <span>RSVP Responses</span>
                {!hasDashboardFeature && (
                  <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-100 text-amber-800 font-bold lowercase">kunci</span>
                )}
                {activeTab === 'rsvp' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />}
              </button>
              <button
                onClick={() => setActiveTab('blast')}
                className={`group relative text-[9px] font-bold tracking-[0.2em] uppercase pb-3 transition-all ${activeTab === 'blast' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                WA BLAST
                {activeTab === 'blast' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`group relative text-[9px] font-bold tracking-[0.2em] uppercase pb-3 transition-all ${activeTab === 'settings' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                Settings
                {activeTab === 'settings' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />}
              </button>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            
            <button onClick={() => setShowSlideshow(true)} className="group inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-white/80 backdrop-blur-md border border-neutral-200/60 text-neutral-900 text-[10px] font-bold tracking-[0.2em] uppercase transition-all hover:bg-neutral-900 hover:text-white rounded-xl shadow-sm hover:shadow-lg active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" /></svg>
              Live Slideshow
            </button>
          </div>
        </motion.div>

        {activeTab === 'rsvp' ? (
          !hasDashboardFeature ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-xl border border-neutral-200/80 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto shadow-xl space-y-6 my-6"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 text-3xl shadow-sm">
                🔒
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  Menu Dashboard Belum Aktif
                </span>
                <h3 className="text-2xl font-serif font-bold text-neutral-900 mt-2">Menu Dashboard & RSVP Terkunci</h3>
                <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
                  Fitur ringkasan tamu dan RSVP tidak aktif pada paket Basic. Anda tetap dapat menggunakan menu <strong>WA Blast</strong>. Untuk mengaktifkan menu Dashboard & RSVP selamanya, Anda dapat mengaktifkannya seharga <strong>Rp 20.000</strong>.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleUnlockDashboard}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold uppercase tracking-[0.15em] rounded-xl transition-all shadow-md active:scale-95 cursor-pointer text-center flex items-center justify-center gap-2"
                >
                  <span>⚡ Aktifkan Menu Dashboard (Rp 20.000)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('blast')}
                  className="w-full sm:w-auto px-5 py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer text-center"
                >
                  Buka Menu WA Blast →
                </button>
              </div>
            </motion.div>
          ) : (
          <div className="space-y-8 md:space-y-12">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-5">
              {[
                { label: 'Total RSVPs', value: rsvps.length, sub: 'ALL RESPONSES', color: 'text-neutral-800' },
                { label: 'Attending', value: totalGroupsAttending, sub: '"YES" RESPONSES', color: 'text-emerald-600' },
                { label: 'Declined', value: totalNotAttending, sub: '"NO" RESPONSES', color: 'text-rose-500' },
                { label: 'Total Pax', value: totalPlanned, sub: 'EXPECTED GUESTS', color: 'text-neutral-800' },
                { label: 'Actual', value: totalActual, sub: `${totalGroupsArrived} GROUPS IN`, color: 'text-amber-100', dark: true, percent: attendancePercentage },
                { label: 'Remaining', value: remainingPax, sub: `${totalGroupsPending} LEFT`, color: 'text-neutral-400', percent: remainingPercentage, percentColor: 'text-rose-500' }
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -5 }}
                  className={`${stat.dark ? 'bg-neutral-900 border-neutral-800 shadow-xl' : 'bg-white/70 backdrop-blur-md border-white/40 shadow-sm'} p-4 md:p-5 flex flex-col justify-between min-h-[100px] md:min-h-[120px] rounded-[1.5rem] md:rounded-[2rem] border transition-all duration-300 group`}
                >
                  <h3 className={`text-[7px] md:text-[8px] font-bold tracking-[0.2em] uppercase flex justify-between items-center ${stat.dark ? 'text-amber-200/60' : 'text-neutral-400'}`}>
                    <span>{stat.label}</span>
                    {stat.percent !== undefined && (
                      <span className={`font-mono ${stat.dark ? 'text-amber-200' : stat.percentColor || 'text-neutral-400'}`}>
                        {stat.percent}%
                      </span>
                    )}
                  </h3>
                  <div>
                    <p className={`text-xl md:text-3xl font-serif ${stat.color}`}>{stat.value}</p>
                    <p className={`text-[7px] md:text-[8px] mt-0.5 ${stat.dark ? 'text-neutral-500' : 'text-neutral-400'}`}>{stat.sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Arrival Flow - Ultra Aesthetic Area Chart */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/40 backdrop-blur-2xl p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/80 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/20 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-amber-200/30 transition-all duration-1000"></div>

                <div className="flex justify-between items-start mb-8 md:mb-12 relative z-10">
                  <div className="flex justify-between items-end w-full">
                    <div>
                      <h3 className="text-[9px] md:text-[10px] font-black tracking-[0.3em] text-amber-600/60 uppercase mb-1 md:mb-2">Live Analytics</h3>
                      <p className="text-xl md:text-3xl font-serif text-neutral-900">Hourly Distribution</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xl md:text-2xl font-serif text-neutral-900">{totalActual}</p>
                        <p className="text-[8px] md:text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Guests Arrived</p>
                      </div>
                      <button
                        onClick={() => setIsHourlyExpanded(!isHourlyExpanded)}
                        className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                      >
                        <motion.svg
                          animate={{ rotate: isHourlyExpanded ? 0 : 180 }}
                          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-neutral-400"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </motion.svg>
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isHourlyExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="h-56 md:h-72 w-full relative z-10" onMouseDown={(e) => e.preventDefault()} tabIndex={-1}>
                        {(() => {
                          const hours: { [key: string]: number } = {};
                          for (let i = 8; i <= 22; i++) {
                            hours[`${i.toString().padStart(2, '0')}:00`] = 0;
                          }

                          rsvps.forEach(rsvp => {
                            if (rsvp.checkedIn && rsvp.checkedInAt) {
                              const hr = rsvp.checkedInAt.getHours();
                              const timeKey = `${hr.toString().padStart(2, '0')}:00`;
                              if (hours[timeKey] !== undefined) {
                                hours[timeKey] += (rsvp.actualGuestsCount || rsvp.guestsCount || 1);
                              }
                            }
                          });

                          const hourlyData = Object.keys(hours).map(time => ({
                            time,
                            guests: hours[time]
                          }));

                          const hasData = hourlyData.some(d => d.guests > 0);

                          if (!hasData) return (
                            <div className="h-full flex flex-col items-center justify-center gap-4">
                              <div className="w-12 h-12 rounded-full border-2 border-dashed border-neutral-200 animate-spin"></div>
                              <p className="text-[10px] text-neutral-300 uppercase tracking-[0.4em] font-bold">Waiting for Live Data</p>
                            </div>
                          );

                          const softBlacks = [
                            '#171717',
                            '#262626',
                            '#404040',
                            '#525252',
                            '#171717',
                            '#262626',
                          ];

                          return (
                            <ResponsiveContainer
                              width="100%"
                              height="100%"
                              style={{ outline: 'none' }}
                            >
                              <BarChart data={hourlyData} style={{ outline: 'none' }}>
                                <XAxis
                                  dataKey="time"
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fontSize: 9, fontWeight: 700, fill: '#A3A3A3' }}
                                  dy={10}
                                />
                                <YAxis hide />
                                <RechartsTooltip
                                  contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    border: 'none',
                                    borderRadius: '16px',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    backdropFilter: 'blur(10px)'
                                  }}
                                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                />
                                <Bar
                                  dataKey="guests"
                                  radius={[8, 8, 0, 0]}
                                  barSize={32}
                                >
                                  {hourlyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={softBlacks[index % softBlacks.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* RSVP Summary - Simple Elegant White Glass Chart */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/40 backdrop-blur-2xl p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/80 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden group"
              >
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-100/20 blur-[60px] rounded-full -ml-16 -mb-16 group-hover:bg-emerald-200/30 transition-all duration-1000"></div>

                <div className="mb-8 md:mb-12 relative z-10">
                  <h3 className="text-[9px] md:text-[10px] font-black tracking-[0.3em] text-emerald-600/60 uppercase mb-1 md:mb-2">Guest Insight</h3>
                  <p className="text-xl md:text-3xl font-serif text-neutral-900">RSVP Status</p>
                </div>

                <div className="h-auto md:h-72 w-full flex flex-col md:flex-row items-center relative z-10 gap-8 md:gap-0">
                  <div className="h-48 md:h-full w-full md:w-1/2 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Arrived', value: totalActual },
                            { name: 'Remaining', value: remainingPax }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={90}
                          paddingAngle={10}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell fill="#10B981" />
                          <Cell fill="#f3f4f6" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-4xl font-serif text-neutral-900">{attendancePercentage}%</p>
                      <p className="text-[8px] font-black text-neutral-400 uppercase tracking-[0.2em]">Attendance</p>
                    </div>
                  </div>

                  <div className="w-full md:w-1/2 space-y-6 px-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-neutral-400 text-[9px] font-black uppercase tracking-widest">
                        <span>Check-in Progress</span>
                        <span className="text-neutral-900">{totalActual} / {totalPlanned}</span>
                      </div>
                      <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${attendancePercentage}%` }}
                          transition={{ duration: 1.5, ease: "circOut" }}
                          className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { label: 'Arrived', val: totalActual, color: 'bg-emerald-500' },
                        { label: 'Pending', val: remainingPax, color: 'bg-neutral-200' },
                        { label: 'Not Attending', val: totalNotAttending, color: 'bg-rose-100 text-rose-600' }
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between p-4 rounded-2xl bg-white/50 border border-white/80 hover:bg-white hover:shadow-md transition-all">
                          <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-1.5 rounded-full ${item.color.includes('bg-') ? item.color.split(' ')[0] : item.color}`}></div>
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{item.label}</span>
                          </div>
                          <span className="text-sm font-serif text-neutral-900 font-bold">{item.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col md:flex-row gap-3 mt-6 mb-5"
            >
              <div className="relative flex-1 group">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-neutral-900 transition-colors z-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search guest name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/70 backdrop-blur-md px-11 py-3 text-[13px] border border-white/60 rounded-xl outline-none focus:border-neutral-900 focus:bg-white transition-all shadow-sm focus:shadow-lg focus:shadow-black/5"
                />
              </div>
              <div className="grid grid-cols-2 md:flex gap-3">
                <div className="relative group min-w-0 md:min-w-[160px]">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-neutral-900 transition-colors z-10 pointer-events-none">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <motion.select
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-white/70 backdrop-blur-md pl-11 pr-10 py-3 text-[13px] border border-white/60 rounded-xl outline-none focus:border-neutral-900 transition-all shadow-sm cursor-pointer appearance-none bg-no-repeat"
                  >
                    <option value="all">All Status</option>
                    <option value="attending">Attending</option>
                    <option value="declined">Declined</option>
                  </motion.select>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none transition-transform group-focus-within:rotate-180">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
                <div className="relative group min-w-[160px]">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-neutral-900 transition-colors z-10 pointer-events-none">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  <motion.select
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    value={filterCheckIn}
                    onChange={(e) => setFilterCheckIn(e.target.value)}
                    className="w-full bg-white/70 backdrop-blur-md pl-11 pr-10 py-3 text-[13px] border border-white/60 rounded-xl outline-none focus:border-neutral-900 transition-all shadow-sm cursor-pointer appearance-none bg-no-repeat"
                  >
                    <option value="all">All Check-Ins</option>
                    <option value="arrived">Arrived</option>
                    <option value="waiting">Waiting</option>
                  </motion.select>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none transition-transform group-focus-within:rotate-180">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
                {(searchTerm || filterStatus !== 'all' || filterCheckIn !== 'all' || sortConfig.key) && (
                  <motion.button
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => {
                      setSearchTerm("");
                      setFilterStatus("all");
                      setFilterCheckIn("all");
                      setSortConfig({ key: null, direction: 'asc' });
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 text-white text-[9px] font-bold tracking-[0.2em] uppercase rounded-xl hover:bg-neutral-800 transition-all shadow-lg active:scale-95 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    Clear Filters
                  </motion.button>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/60 backdrop-blur-xl overflow-hidden rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] border border-white/60"
            >
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="bg-neutral-50/30 text-neutral-500 border-b border-neutral-100">
                      <th className="p-6 w-10">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 transition-all cursor-pointer disabled:opacity-20"
                          checked={(() => {
                            const available = paginatedRsvps.filter(r => r.phone);
                            return available.length > 0 && available.every(r => selectedIds.has(r.id));
                          })()}
                          disabled={paginatedRsvps.filter(r => r.phone).length === 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const withPhone = paginatedRsvps.filter(r => r.phone).map(r => r.id);
                              setSelectedIds(new Set([...selectedIds, ...withPhone]));
                            } else {
                              const paginatedIds = paginatedRsvps.map(r => r.id);
                              const next = new Set(selectedIds);
                              paginatedIds.forEach(id => next.delete(id));
                              setSelectedIds(next);
                            }
                          }}
                        />
                      </th>
                      <th className="p-6 text-[9px] font-bold tracking-[0.2em] uppercase">Status</th>
                      <th className="p-6 text-[9px] font-bold tracking-[0.2em] uppercase">Check-In</th>
                      <th
                        className="p-6 text-[9px] font-bold tracking-[0.2em] uppercase cursor-pointer hover:text-neutral-900 transition-colors"
                        onClick={() => requestSort('name')}
                      >
                        Guest Name <SortIcon column="name" />
                      </th>
                      <th className="p-6 text-[9px] font-bold tracking-[0.2em] uppercase">Phone</th>
                      <th
                        className="p-6 text-[9px] font-bold tracking-[0.2em] uppercase text-center cursor-pointer hover:text-neutral-900 transition-colors"
                        onClick={() => requestSort('guestsCount')}
                      >
                        Plan <SortIcon column="guestsCount" />
                      </th>
                      <th
                        className="p-6 text-[9px] font-bold tracking-[0.2em] uppercase text-center cursor-pointer hover:text-neutral-900 transition-colors"
                        onClick={() => requestSort('actualGuestsCount')}
                      >
                        Actual <SortIcon column="actualGuestsCount" />
                      </th>
                      <th className="p-6 text-[9px] font-bold tracking-[0.2em] uppercase text-right">Message</th>
                      <th className="p-6 text-[9px] font-bold tracking-[0.2em] uppercase text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {loading ? (
                      <tr><td colSpan={9} className="p-16 text-center text-[10px] tracking-[0.3em] uppercase font-bold text-neutral-300 animate-pulse">Synchronizing Data...</td></tr>
                    ) : filteredRsvps.length === 0 ? (
                      <tr><td colSpan={9} className="p-16 text-center text-[10px] tracking-[0.3em] uppercase font-bold text-neutral-300">No responses found</td></tr>
                    ) : (
                      paginatedRsvps.map((rsvp, idx) => {
                        const sendWhatsApp = async (name: string, phone: string) => {
                          if (!phone) return;
                          try {
                            const message = `Hi *${name}*! 👋✨\n\nThank you yaa sudah RSVP untuk wedding *${coupleNicknames}* 🤍\n\nFriendly reminder nih, jangan lupa bawa dan tunjukkan *QR Code* kamu saat tiba di meja registrasi besok ya 🎟️✨\nBiar proses check-in jadi lebih cepat, praktis, nyaman & effortless.\n\nWe’re super happy to celebrate this special day with you🥹\nSee you tomorrow at our wedding! 💐`;

                            const { error } = await supabase
                              .from('wa_blast_logs')
                              .insert({
                                project_id: projectId,
                                guest_id: rsvp.id,
                                phone: phone.trim(),
                                message: message,
                                status: 'queued'
                              });

                            if (error) throw error;

                            alert(`Pesan untuk ${name} telah masuk antrian bot.`);
                            setQueuedPhones(prev => {
                              const next = new Set(prev);
                              next.add(phone.trim());
                              return next;
                            });
                          } catch (err) {
                            console.error(err);
                            alert("Gagal menambahkan ke antrian.");
                          }
                        };

                        return (
                          <motion.tr
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            key={rsvp.id}
                            className={`group hover:bg-white/80 transition-all duration-300 ${rsvp.checkedIn ? 'bg-emerald-50/10' : ''} ${selectedIds.has(rsvp.id) ? 'bg-neutral-50' : ''}`}
                          >
                            <td className="p-6">
                              {rsvp.phone ? (
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 transition-all cursor-pointer"
                                  checked={selectedIds.has(rsvp.id)}
                                  onChange={(e) => {
                                    const next = new Set(selectedIds);
                                    if (e.target.checked) next.add(rsvp.id);
                                    else next.delete(rsvp.id);
                                    setSelectedIds(next);
                                  }}
                                />
                              ) : (
                                <div className="w-4 h-4 border border-dashed border-neutral-200 rounded-sm opacity-20" title="No phone number available"></div>
                              )}
                            </td>
                            <td className="p-6">
                              <span className={`px-4 py-1.5 text-[9px] font-bold tracking-widest uppercase rounded-full border transition-all ${rsvp.isAttending ? 'text-emerald-600 border-emerald-100 bg-emerald-50/50' : 'text-neutral-400 border-neutral-100 bg-neutral-50'}`}>{rsvp.isAttending ? 'Attending' : 'Declined'}</span>
                            </td>
                            <td className="p-6">
                              {rsvp.checkedIn ? (
                                <div className="flex items-center gap-3">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                                  <div>
                                    <span className="block text-[9px] font-bold uppercase tracking-widest text-neutral-700">Arrived</span>
                                    <span className="block text-[9px] font-mono text-neutral-400">{formatTime(rsvp.checkedInAt || null)}</span>
                                  </div>
                                </div>
                              ) : <span className="text-[9px] font-bold tracking-widest text-neutral-200 uppercase italic">Waiting...</span>}
                            </td>
                            <td className="p-6">
                              <div className="flex flex-col">
                                <p className="text-sm font-serif font-bold text-neutral-800 group-hover:text-black transition-colors">{rsvp.name}</p>
                                <span className="text-[8px] text-neutral-400 tracking-[0.2em] uppercase mt-0.5">Guest Registry</span>
                              </div>
                            </td>
                            <td className="p-6">
                              <span className="text-[11px] font-mono text-neutral-500">{rsvp.phone || '—'}</span>
                            </td>
                            <td className="p-6 text-center">
                              <span className="text-sm font-serif text-neutral-700 font-medium">{rsvp.isAttending ? rsvp.guestsCount : '—'}</span>
                            </td>
                            <td className="p-6 text-center">
                              {(() => {
                                const plan = rsvp.guestsCount;
                                const actual = rsvp.actualGuestsCount !== undefined ? rsvp.actualGuestsCount : (rsvp.checkedIn ? rsvp.guestsCount : null);
                                const isOver = actual !== null && actual > plan;

                                return (
                                  <span className={`text-lg font-serif ${isOver ? 'text-rose-600 font-black' : rsvp.checkedIn ? 'text-neutral-900 font-bold' : 'text-neutral-300'}`}>
                                    {actual ?? '—'}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="p-6 text-right">
                              {rsvp.wishes && rsvp.wishes !== 'Walk-in registration' ? (
                                <button onClick={() => setSelectedWish(rsvp)} className="px-5 py-2 text-[9px] font-bold tracking-[0.2em] uppercase border border-neutral-200 bg-white/50 hover:bg-neutral-900 hover:text-white transition-all rounded-xl shadow-sm active:scale-95 cursor-pointer">Read Wish</button>
                              ) : <span className="text-[9px] text-neutral-200 tracking-widest uppercase">—</span>}
                            </td>
                            <td className="p-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => sendWhatsApp(rsvp.name, rsvp.phone || '')}
                                  disabled={!rsvp.phone || queuedPhones.has((rsvp.phone || '').trim())}
                                  className="inline-flex items-center justify-center p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all active:scale-90 disabled:opacity-20 disabled:grayscale cursor-pointer"
                                  title="Send WhatsApp Reminder"
                                >
                                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217s.231.001.332.005c.109.004.253-.041.397.303.145.346.491 1.2.534 1.287.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.101-.177.211-.077.383.101.173.447.737.958 1.192.658.587 1.212.769 1.385.855.173.087.275.072.376-.043.101-.116.433-.506.548-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z" /><path d="M12.036 3.913C7.622 3.912 4.032 7.502 4.032 11.917c0 1.578.463 3.047 1.242 4.286L3.5 22.142l6.125-1.607c1.163.639 2.486.981 3.893.982 4.411 0 8.002-3.59 8.002-8.005.001-4.413-3.591-8.001-7.984-7.999zm.019 14.156c-1.307 0-2.539-.376-3.585-1.03l-.257-.16-2.67.7 1.041-3.805-.181-.287c-.562-.894-.859-1.923-.858-2.98.001-3.13 2.547-5.676 5.679-5.676 3.131 0 5.677 2.546 5.677 5.676-.001 3.13-2.548 5.677-5.671 5.682z" /></svg>
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="p-4 md:p-6 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/30 gap-4">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 md:px-5 md:py-2.5 text-[10px] font-bold tracking-widest uppercase rounded-xl border border-neutral-200 text-neutral-600 hover:bg-white hover:text-neutral-900 hover:border-neutral-900 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-3 md:h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                    <span className="hidden md:inline">Prev</span>
                  </button>

                  <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
                    <div
                      className="flex gap-1 max-w-full overflow-x-auto scrollbar-hide py-1 px-2 cursor-grab active:cursor-grabbing select-none"
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                        <button
                          key={num}
                          onClick={() => setCurrentPage(num)}
                          className={`w-8 h-8 md:w-9 md:h-9 shrink-0 flex items-center justify-center text-[10px] font-bold uppercase rounded-lg border transition-all shadow-sm cursor-pointer ${currentPage === num
                            ? 'bg-neutral-900 border-neutral-900 text-white'
                            : 'border-neutral-200 text-neutral-600 hover:bg-white'
                            }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <span className="text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] whitespace-nowrap">Page {currentPage} of {totalPages}</span>
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 md:px-5 md:py-2.5 text-[10px] font-bold tracking-widest uppercase rounded-xl border border-neutral-200 text-neutral-600 hover:bg-white hover:text-neutral-900 hover:border-neutral-900 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <span className="hidden md:inline">Next</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-3 md:h-3"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
          )
        ) : activeTab === 'gifts' ? (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-100">
              <div>
                <h3 className="text-xl font-serif text-neutral-800">Gift Registry</h3>
                <p className="text-sm text-neutral-400 mt-1">Manage items available for guests to purchase</p>
              </div>
              <button onClick={() => setShowAddGiftModal(true)} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 text-white text-[10px] font-bold tracking-[0.2em] uppercase transition-all hover:bg-neutral-800 rounded-xl shadow-sm hover:shadow-md cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add New Item
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {gifts.map((gift) => (
                <div key={gift.id} className="group bg-white rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100 flex flex-col hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300">
                  <div className="relative aspect-[4/5] bg-neutral-100 overflow-hidden">
                    <img src={gift.image} alt={gift.name} className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${gift.isBought ? 'grayscale opacity-60' : ''}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    {gift.isBought && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-sm text-[9px] font-bold tracking-widest uppercase text-neutral-900 rounded-full shadow-sm">
                        Purchased
                      </div>
                    )}
                    {gift.discount && !gift.isBought && (
                      <div className="absolute top-4 left-4 px-3 py-1 bg-rose-500 text-[9px] font-bold tracking-widest uppercase text-white rounded-full shadow-sm">
                        {gift.discount}
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex-1 flex flex-col bg-white z-10">
                    <h4 className="text-base font-serif text-neutral-800 mb-2 line-clamp-2">{gift.name}</h4>
                    <div className="flex flex-col mb-6">
                      <span className="text-neutral-900 font-bold text-lg tracking-tight">Rp. {gift.price}</span>
                      {gift.originalPrice && (
                        <span className="text-xs text-neutral-400 line-through">Rp. {gift.originalPrice}</span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <button onClick={() => toggleBought(gift.id, gift.isBought)} className={`flex-1 py-3.5 px-2 text-[10px] font-bold tracking-widest uppercase rounded-xl border transition-all cursor-pointer ${gift.isBought ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-900 hover:text-white hover:border-neutral-900'}`}>{gift.isBought ? 'Make Available' : 'Mark as Bought'}</button>
                      <button onClick={() => setEditingGift({
                        id: gift.id,
                        name: gift.name,
                        price: gift.originalPrice ? gift.originalPrice.toString().replace(/[^0-9]/g, '') : gift.price.toString().replace(/[^0-9]/g, ''),
                        image: gift.image,
                        discount: gift.discount ? gift.discount.replace(/[^0-9]/g, '') : ""
                      })} className="p-3.5 px-3 text-amber-500 bg-amber-50 hover:bg-amber-500 hover:text-white rounded-xl border border-transparent transition-all cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                      </button>
                      <button onClick={() => handleDeleteGift(gift.id)} className="p-3.5 px-3 text-rose-400 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-xl border border-transparent transition-all cursor-pointer"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'blast' ? (
          <>
          {!hasWABlast ? (
            /* ==============================================================
             * LOCKED STATE: PAKET BELUM TERMASUK FITUR WA BLAST
             * ============================================================== */
            <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 py-2 sm:py-4">
              {/* Hero Card */}
              <div className="relative overflow-hidden bg-white rounded-3xl sm:rounded-[2.5rem] border border-neutral-200/80 shadow-[0_12px_40px_rgba(0,0,0,0.05)]">
                <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-100/60 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-amber-100/60 blur-3xl pointer-events-none" />

                <div className="relative grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 p-5 sm:p-8 md:p-10 items-center">
                  {/* Left: Copy & CTA */}
                  <div className="md:col-span-7 space-y-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>Belum Tersedia di Paket {BUNDLE_WA_BLAST_CONFIG[projectPackageName?.toLowerCase()]?.label || 'Anda'}</span>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-neutral-900 tracking-tight leading-tight">
                        Sebar Undangan ke Semua Tamu, <span className="text-emerald-700">Sekali Klik.</span>
                      </h2>
                      <p className="text-sm text-neutral-500 leading-relaxed max-w-lg">
                        Kirim undangan pernikahan langsung ke WhatsApp setiap tamu secara otomatis, lengkap dengan nama dan link undangan pribadi masing-masing. Tidak perlu lagi kirim satu per satu.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                      <button
                        type="button"
                        id="wa-blast-locked-upgrade-btn"
                        onClick={() => setShowUpgradeBundleModal(true)}
                        className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-[11px] font-bold uppercase tracking-[0.15em] rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>Aktifkan WA Blast</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                      <a
                        id="wa-blast-locked-ask-admin-btn"
                        href={`https://wa.me/${SERASTORY_ADMIN_WA}?text=${encodeURIComponent(
                          `Halo Admin Sera Story, saya ingin tanya tentang fitur WA Blast untuk undangan ${coupleNicknames || 'saya'}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-neutral-50 text-neutral-700 text-[11px] font-bold uppercase tracking-[0.15em] rounded-2xl border border-neutral-200 transition-all cursor-pointer text-center"
                      >
                        Tanya Admin Dulu
                      </a>
                    </div>

                    <p className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                      <span>🎟️</span>
                      <span>Sudah punya kode voucher dari admin? Pilih paket, lalu masukkan kodenya di halaman pembayaran.</span>
                    </p>
                  </div>

                  {/* Right: Blurred Preview Mockup */}
                  <div className="md:col-span-5">
                    <div className="relative mx-auto max-w-[320px]">
                      <div className="rounded-3xl bg-[#ECE5DD] border border-neutral-200 shadow-xl overflow-hidden select-none" aria-hidden="true">
                        <div className="bg-[#075E54] px-4 py-3 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-white/20" />
                          <div className="space-y-1">
                            <div className="h-2.5 w-24 rounded bg-white/70" />
                            <div className="h-2 w-14 rounded bg-white/40" />
                          </div>
                        </div>
                        <div className="p-4 space-y-2.5 blur-[1.5px]">
                          <div className="ml-auto max-w-[85%] bg-[#DCF8C6] rounded-xl rounded-tr-sm p-3 shadow-xs space-y-1.5">
                            <p className="text-[11px] text-neutral-800 font-semibold">Kepada Yth. Bapak Rahmat 🙏</p>
                            <p className="text-[10px] text-neutral-600 leading-relaxed">Dengan penuh sukacita kami mengundang Anda di hari bahagia kami...</p>
                            <p className="text-[10px] text-sky-700 underline">serastory.com/undangan</p>
                            <p className="text-[8px] text-neutral-400 text-right">09.41 ✓✓</p>
                          </div>
                          <div className="ml-auto max-w-[70%] bg-[#DCF8C6] rounded-xl rounded-tr-sm p-3 shadow-xs space-y-1.5">
                            <p className="text-[11px] text-neutral-800 font-semibold">Kepada Yth. Ibu Citra 🙏</p>
                            <div className="h-2 w-full rounded bg-neutral-300/70" />
                            <div className="h-2 w-2/3 rounded bg-neutral-300/70" />
                          </div>
                        </div>
                        <div className="bg-white/90 px-4 py-3 border-t border-neutral-200 blur-[1px]">
                          <div className="flex justify-between text-[10px] font-bold text-neutral-600 mb-1.5">
                            <span>Mengirim undangan...</span>
                            <span>48 / 120</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
                            <div className="h-full w-2/5 bg-emerald-500 rounded-full" />
                          </div>
                        </div>
                      </div>

                      {/* Lock Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/95 backdrop-blur shadow-2xl border border-neutral-200 flex items-center justify-center">
                          <svg className="w-7 h-7 text-neutral-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { icon: '🚀', title: 'Kirim Otomatis', desc: 'Ratusan undangan terkirim tanpa perlu kirim manual satu per satu.' },
                  { icon: '💌', title: 'Nama Personal', desc: 'Setiap tamu menerima pesan dengan nama & link undangan sendiri.' },
                  { icon: '🛡️', title: 'Aman dari Blokir', desc: 'Jeda kirim acak otomatis agar nomor WhatsApp Anda tetap aman.' },
                  { icon: '📊', title: 'Pantau Status', desc: 'Lihat siapa saja yang sudah terkirim, tertunda, atau gagal.' },
                ].map((f) => (
                  <div key={f.title} className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-lg">
                      {f.icon}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-900">{f.title}</h4>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>

              {/* Package Picker */}
              <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-5">
                <div className="text-center space-y-1">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">Pilih Paket</span>
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-neutral-900">Upgrade untuk Membuka WA Blast</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { key: 'silver', label: 'Silver', quota: 50, note: 'Cocok untuk acara intim', popular: false },
                    { key: 'premium', label: 'Premium', quota: 150, note: 'Pilihan paling banyak dipakai', popular: true },
                    { key: 'exclusive', label: 'Exclusive', quota: 250, note: 'Untuk daftar tamu besar', popular: false },
                  ].map((pkg) => (
                    <button
                      key={pkg.key}
                      id={`wa-blast-locked-pkg-${pkg.key}`}
                      type="button"
                      onClick={() => openUpgradeCheckout(pkg.key)}
                      className={`relative text-left p-5 rounded-2xl border transition-all cursor-pointer group active:scale-[0.99] ${
                        pkg.popular
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40 hover:bg-emerald-50'
                          : 'border-neutral-200 bg-white hover:border-emerald-500 hover:shadow-md'
                      }`}
                    >
                      {pkg.popular && (
                        <span className="absolute -top-2.5 left-5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm">
                          Paling Populer
                        </span>
                      )}
                      <p className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">Paket</p>
                      <h4 className="text-lg font-serif font-bold text-neutral-900 mt-0.5">{pkg.label}</h4>
                      <div className="flex items-baseline gap-1 mt-3">
                        <span className="text-3xl font-serif font-bold text-neutral-900">{pkg.quota}</span>
                        <span className="text-xs text-neutral-500 font-medium">pesan undangan</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1">{pkg.note}</p>
                      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Pilih Paket</span>
                        <svg className="w-4 h-4 text-emerald-700 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-center text-[11px] text-neutral-400">
                  Pembayaran via QRIS (semua bank & e-wallet). Fitur langsung aktif setelah kode voucher dimasukkan.
                </p>
              </div>
            </div>
          ) : waSession.status !== 'connected' ? (
            /* ==============================================================
             * REAL WHATSAPP WEB LINKING SCREEN (DIRECT FROM PC BOT SERVER)
             * ============================================================== */
            <div className="max-w-4xl mx-auto py-6">
              <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_12px_40px_rgba(0,0,0,0.05)] border border-neutral-200">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
                  
                  {/* Left Column: Clear, Real Instructions */}
                  <div className="md:col-span-7 space-y-6">
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-300"
                      style={{
                        backgroundColor: waSession.qrCodeValue ? '#ECFDF5' : '#FFFBEB',
                        borderColor: waSession.qrCodeValue ? '#A7F3D0' : '#FDE68A',
                        color: waSession.qrCodeValue ? '#065F46' : '#92400E'
                      }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: waSession.qrCodeValue ? '#10B981' : '#F59E0B' }} />
                      <span>
                        {waSession.qrCodeValue
                          ? 'Kode QR Siap — Silakan Pindai dengan WhatsApp'
                          : 'Menunggu Bot Aktif...'}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-2xl md:text-3xl font-serif font-bold text-neutral-900 tracking-tight">
                        Tautkan WhatsApp Pengirim
                      </h2>
                      <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                        Hubungkan akun WhatsApp yang akan digunakan untuk mengirim pesan blast undangan pernikahan ke seluruh daftar tamu.
                      </p>
                    </div>

                    {/* Stepper Langkah Scan */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-start gap-3.5">
                        <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                          1
                        </span>
                        <div className="pt-0.5">
                          <p className="text-sm font-semibold text-neutral-800">Buka Aplikasi WhatsApp</p>
                          <p className="text-xs text-neutral-500">Buka WhatsApp pada smartphone pengirim pesan.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5">
                        <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                          2
                        </span>
                        <div className="pt-0.5">
                          <p className="text-sm font-semibold text-neutral-800">Buka Menu Perangkat Tertaut</p>
                          <p className="text-xs text-neutral-500">
                            Ketuk <strong>Menu Titik Tiga (⋮)</strong> di Android atau <strong>Pengaturan</strong> di iPhone, lalu pilih <strong>Perangkat Tertaut (Linked Devices)</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5">
                        <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                          3
                        </span>
                        <div className="pt-0.5">
                          <p className="text-sm font-semibold text-neutral-800">Scan QR Code</p>
                          <p className="text-xs text-neutral-500">
                            Ketuk <strong>Tautkan Perangkat</strong> dan arahkan kamera smartphone Anda ke QR Code di samping.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex items-center gap-3 text-xs text-neutral-600">
                      <span className="text-base">🔒</span>
                      <span>
                        Koneksi langsung dan aman ke akun WhatsApp resmi Anda tanpa perantara pihak ketiga.
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Genuine QR Code Display or Waiting State */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center">
                    {waSession.qrCodeValue ? (
                      <div className="p-5 bg-white rounded-3xl border-2 border-emerald-500/80 shadow-xl relative flex flex-col items-center">
                        <div className="relative">
                          <QRCode
                            value={waSession.qrCodeValue}
                            size={230}
                            level="H"
                            className="w-52 h-52 md:w-60 md:h-60 block"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 bg-white rounded-full p-1 shadow-md flex items-center justify-center border-2 border-white">
                              <div className="w-full h-full bg-[#25D366] rounded-full flex items-center justify-center text-white">
                                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16C10.66 20.16 9.3 19.81 8.1 19.14L7.81 18.97L4.69 19.79L5.52 16.75L5.33 16.45C4.59 15.27 4.2 13.61 4.2 11.91C4.2 7.37 7.9 3.67 12.05 3.67Z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>QR Code Resmi Siap Discan</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-square max-w-[290px] p-7 bg-gradient-to-b from-neutral-50/90 to-neutral-100/70 rounded-3xl border-2 border-dashed border-neutral-300/80 flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden backdrop-blur-xs shadow-xs">
                        {/* Animated radar rings in background */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-44 h-44 rounded-full bg-emerald-500/10 animate-ping opacity-50" style={{ animationDuration: '3.5s' }} />
                          <div className="w-28 h-28 rounded-full bg-amber-500/15 animate-pulse" />
                        </div>

                        {/* Center glowing icon */}
                        <div className="relative z-10">
                          <div className="relative w-16 h-16 rounded-2xl bg-white shadow-md border border-neutral-200/80 flex items-center justify-center">
                            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-emerald-500/30 via-amber-400/40 to-teal-500/30 animate-spin blur-[2px] opacity-80" style={{ animationDuration: '6s' }} />
                            <div className="relative w-full h-full rounded-2xl bg-white flex items-center justify-center text-emerald-600">
                              <svg className="w-8 h-8 animate-bounce" style={{ animationDuration: '2.5s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Status text */}
                        <div className="relative z-10 space-y-1.5">
                          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50/90 border border-amber-200/90 text-amber-800 text-[11px] font-bold shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            <span>Menunggu Bot Aktif</span>
                          </div>
                          <p className="text-xs text-neutral-600 font-semibold pt-0.5">
                            Menyiapkan sambungan...
                          </p>
                          <p className="text-[11px] text-neutral-400 leading-relaxed max-w-[210px]">
                            Kode QR untuk ditautkan akan otomatis tampil di sini begitu koneksi siap.
                          </p>
                        </div>

                        {/* Animated wave dots */}
                        <div className="relative z-10 flex items-center gap-1.5 pt-0.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6 md:space-y-8 max-w-5xl mx-auto">
              {/* Header Info & Connected Phone Bar */}
              <div className="bg-white p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-neutral-100/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/80 shadow-2xs">
                    <svg className="w-6 h-6 sm:w-6.5 sm:h-6.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16C10.66 20.16 9.3 19.81 8.1 19.14L7.81 18.97L4.69 19.79L5.52 16.75L5.33 16.45C4.59 15.27 4.2 13.61 4.2 11.91C4.2 7.37 7.9 3.67 12.05 3.67Z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm sm:text-base font-serif font-bold text-neutral-800 truncate">
                        {waSession.profileName || 'WhatsApp Web'}
                      </h4>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Sesi WhatsApp Aktif
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5 font-mono truncate">
                      {formatPhoneDisplay(waSession.connectedPhone || '')} • {waSession.device || 'WhatsApp Web'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center self-end sm:self-auto shrink-0 pt-0.5 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => setShowDisconnectConfirm(true)}
                    className="px-3.5 py-2 bg-neutral-50 hover:bg-rose-50 text-neutral-500 hover:text-rose-600 border border-neutral-200/80 hover:border-rose-200 text-[10px] font-bold tracking-wider uppercase rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Disconnect Sesi</span>
                  </button>
                </div>
              </div>

              {/* Bundle & Quota & Watermark Hub Banner (Always Visible on Top of Steps) */}
              {!hasWABlast ? (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col md:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-xs">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500 text-white flex items-center justify-center text-lg sm:text-xl shrink-0 shadow-sm">
                      🔒
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-amber-950 font-serif">Fitur WA Blast Belum Termasuk dalam Paket Anda</h4>
                      <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                        Paket saat ini belum memiliki akses otomatisasi WA Blast. Aktifkan bundle atau upgrade paket untuk mulai mengirim undangan massal.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUpgradeBundleModal(true)}
                    className="w-full sm:w-auto px-5 py-2.5 sm:py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap text-center"
                  >
                    Beli / Aktifkan WA Blast
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                  {/* Quota Card */}
                  <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-100 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">Kuota WA Blast</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {projectPackageName}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        (waBlastBaseQuota + waBlastExtraQuota - waBlastSentCount) > 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {(waBlastBaseQuota + waBlastExtraQuota - waBlastSentCount) > 0 ? 'Tersedia' : 'Habis'}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-serif font-bold text-neutral-900">
                          {Math.max(0, (waBlastBaseQuota + waBlastExtraQuota) - waBlastSentCount)}
                        </span>
                        <span className="text-xs text-neutral-400 font-medium">
                          / {waBlastBaseQuota + waBlastExtraQuota} Pesan Tersisa
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2 mt-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.round((waBlastSentCount / (waBlastBaseQuota + waBlastExtraQuota || 1)) * 100))}%`
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[10px] text-neutral-600 font-medium flex items-center gap-1">
                          <span className="text-emerald-700 font-bold">✓ {waBlastSentCount}</span> pesan terkirim
                        </p>
                        <span className="text-[9px] text-neutral-400">
                          {waBlastExtraQuota > 0 ? `(+${waBlastExtraQuota} tambahan)` : 'Tersimpan Otomatis'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowBuyQuotaModal(true)}
                        className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center shadow-xs"
                      >
                        + Beli Kuota
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowUpgradeBundleModal(true)}
                        className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center border border-neutral-200"
                        title="Ganti Paket Bundle"
                      >
                        Bundle
                      </button>
                    </div>
                  </div>

                  {/* Promo Watermark Status Card */}
                  <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-100 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">Watermark Promosi</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        hasRemovedWatermark
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {hasRemovedWatermark ? 'Bebas Promosi' : 'Aktif (serastory.com)'}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-neutral-800">
                        {hasRemovedWatermark ? 'Mode Eksklusif Aktif' : 'Promosi serastory.com Disertakan'}
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                        {hasRemovedWatermark
                          ? 'Pesan blast Anda 100% bersih tanpa footer atau teks promosi serastory.com.'
                          : 'Setiap pesan menyertakan teks promosi singkat serastory.com di bagian bawah.'}
                      </p>
                    </div>

                    {hasRemovedWatermark ? (
                      <div className="py-2 px-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[10px] font-bold text-emerald-700 text-center">
                        ✓ Watermark Terhapus (Rp 35.000 Lunas)
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowRemovePromoModal(true)}
                        className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center shadow-xs"
                      >
                        ⚡ Hapus Promosi (Rp 35.000)
                      </button>
                    )}
                  </div>

                  {/* Spam Protection & Delay Safeguard Card */}
                  <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-100 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">Proteksi Anti-Ban</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        🛡️ Otomatis
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Jeda Acak: <strong>45 - 60 Detik</strong> per pesan</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Break Istirahat: <strong>1 - 2 Menit</strong> per 15 pesan</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 pt-1 leading-relaxed">
                        Perlindungan otomatis aktif meniru ritme manusia agar nomor WhatsApp Anda aman dari blokir/banned.
                      </p>
                    </div>

                    <div className="p-2 bg-neutral-50 rounded-xl text-center text-[10px] font-mono font-medium text-neutral-600">
                      Standard Safe Delay Active
                    </div>
                  </div>
                </div>
              )}

              {/* ==============================================================
               * STEPPER NAVIGATION BAR (Modern iOS Segmented Style)
               * ============================================================== */}
              <div className="bg-neutral-100/80 p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl border border-neutral-200/70 max-w-xl mx-auto shadow-2xs">
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {/* Step 1 Pill */}
                  <button
                    type="button"
                    onClick={() => setBlastStep(1)}
                    className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all text-left flex items-center gap-2.5 sm:gap-3 cursor-pointer ${
                      blastStep === 1
                        ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/70'
                        : 'text-neutral-500 hover:text-neutral-800 hover:bg-white/50'
                    }`}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      blastStep === 1
                        ? 'bg-neutral-900 text-white'
                        : blastGuestList.length > 0
                        ? 'bg-emerald-500 text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      {blastGuestList.length > 0 && blastStep === 2 ? '✓' : '1'}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[11px] sm:text-xs font-bold truncate ${blastStep === 1 ? 'text-neutral-900' : 'text-neutral-700'}`}>
                        1. Masukkan Tamu
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate">
                        {blastGuestList.length === 0
                          ? 'Input Nama & WA'
                          : `${blastGuestList.filter(g => g.selected).length} Tamu Siap`}
                      </p>
                    </div>
                  </button>

                  {/* Step 2 Pill */}
                  <button
                    type="button"
                    onClick={() => {
                      if (blastGuestList.filter(g => g.selected).length === 0) {
                        alert('Silakan masukkan dan pilih minimal 1 tamu undangan terlebih dahulu di Langkah 1.');
                        return;
                      }
                      syncBlastConfigToSupabase({ guest_list: blastGuestList });
                      setBlastStep(2);
                    }}
                    className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all text-left flex items-center gap-2.5 sm:gap-3 cursor-pointer ${
                      blastStep === 2
                        ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/70'
                        : 'text-neutral-500 hover:text-neutral-800 hover:bg-white/50'
                    }`}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      blastStep === 2
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      2
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[11px] sm:text-xs font-bold truncate ${blastStep === 2 ? 'text-neutral-900' : 'text-neutral-700'}`}>
                        2. Teks & Blast
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate">
                        Draf & Kirim Undangan
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* ==============================================================
               * STEP 1: MASUKKAN NAMA & NOMOR WA (INPUT MANUAL SAJA)
               * ============================================================== */}
              {blastStep === 1 ? (
                <div className="space-y-4 sm:space-y-6">
                  {/* Card Daftar Tamu */}
                  <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-neutral-100 space-y-4 sm:space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-100 pb-4">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[9px] font-bold uppercase tracking-wider mb-1">
                          Langkah 1 dari 2
                        </div>
                        <h3 className="text-base sm:text-lg font-serif font-bold text-neutral-900">Masukkan Nama & Nomor WhatsApp Tamu</h3>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Masukkan data tamu secara manual (tanpa akses kontak otomatis).
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                        <button
                          type="button"
                          onClick={() => setManualInputMode(manualInputMode === 'single' ? 'bulk' : 'single')}
                          className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap"
                        >
                          {manualInputMode === 'single' ? '📋 Mode Tempel Banyak' : '➕ Mode Form Satuan'}
                        </button>
                        {blastGuestList.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearAllBlastGuests}
                            title="Kosongkan antrean tamu"
                            className="p-1.5 sm:p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 transition-all cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Input Mode 1: Single Guest Form */}
                    {manualInputMode === 'single' ? (
                      <div className="p-3.5 sm:p-5 bg-neutral-50/80 rounded-2xl border border-neutral-200/80 space-y-2.5 sm:space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-700 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Input Manual Satu Tamu
                          </span>
                          <span className="text-[10px] text-neutral-400 hidden xs:inline">Tekan Enter untuk simpan</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 items-end">
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                              Nama Tamu Undangan
                            </label>
                            <input
                              type="text"
                              value={newGuestName}
                              onChange={(e) => setNewGuestName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddSingleGuest(); }}
                              placeholder="Contoh: Bpk. H. Hendra & Keluarga"
                              className="w-full bg-white border border-neutral-200 px-3.5 py-2.5 rounded-xl text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs"
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                              Nomor WhatsApp
                            </label>
                            <input
                              type="text"
                              value={newGuestPhone}
                              onChange={(e) => setNewGuestPhone(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddSingleGuest(); }}
                              placeholder="Contoh: 0812-3456-7890"
                              className="w-full bg-white border border-neutral-200 px-3.5 py-2.5 rounded-xl text-xs font-mono text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <button
                              type="button"
                              onClick={handleAddSingleGuest}
                              className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-black text-white text-[10px] font-bold tracking-[0.15em] uppercase rounded-xl transition-all cursor-pointer active:scale-95 shadow-sm flex items-center justify-center gap-1.5"
                            >
                              <span>+</span>
                              <span>Tambah Tamu</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Input Mode 2: Bulk Paste Form */
                      <div className="p-3.5 sm:p-5 bg-neutral-50/80 rounded-2xl border border-neutral-200/80 space-y-2.5 sm:space-y-3">
                        <div className="flex justify-between items-center text-[10px] text-neutral-500">
                          <span className="font-bold uppercase tracking-wider text-neutral-700">
                            Tempel Banyak Tamu (Format: Nama, No WA per baris)
                          </span>
                          <span className="font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
                            {parseBulkGuestText(bulkPasteRawText).length} Tamu Terdeteksi
                          </span>
                        </div>
                        <textarea
                          rows={4}
                          value={bulkPasteRawText}
                          onChange={(e) => setBulkPasteRawText(e.target.value)}
                          placeholder={`Contoh:\nBpk. H. Hendra & Keluarga, 081234567890\nIbu Hj. Rina & Suami, 081987654321\nDika Pratama (Alumni SMA), 085712345678`}
                          className="w-full bg-white border border-neutral-200 p-3.5 rounded-xl text-xs font-mono focus:outline-none focus:border-neutral-900 text-neutral-800"
                        />
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                          <p className="text-[10px] text-neutral-400">
                            💡 Salin langsung dari Excel atau Spreadsheet (kolom Nama dan Nomor HP).
                          </p>
                          <button
                            type="button"
                            onClick={handleBulkPasteGuests}
                            disabled={!bulkPasteRawText.trim() || parseBulkGuestText(bulkPasteRawText).length === 0}
                            className="w-full sm:w-auto py-2.5 px-5 bg-neutral-900 hover:bg-black disabled:bg-neutral-200 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm disabled:cursor-not-allowed whitespace-nowrap text-center"
                          >
                            Masukkan ({parseBulkGuestText(bulkPasteRawText).length}) Tamu ke Antrean
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 pt-1">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs scrollbar-none no-scrollbar">
                        {(['all', 'pending', 'sent', 'failed'] as const).map(tab => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setBlastFilterStatus(tab)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                              blastFilterStatus === tab
                                ? 'bg-neutral-900 text-white shadow-xs'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                            }`}
                          >
                            {tab === 'all' && `Semua (${blastGuestList.length})`}
                            {tab === 'pending' && `Menunggu (${blastGuestList.filter(g => g.status === 'pending' || g.status === 'sending').length})`}
                            {tab === 'sent' && `Terkirim (${blastGuestList.filter(g => g.status === 'sent').length})`}
                            {tab === 'failed' && `Gagal (${blastGuestList.filter(g => g.status === 'failed').length})`}
                          </button>
                        ))}
                      </div>

                      <div className="relative w-full sm:w-64 shrink-0">
                        <input
                          type="text"
                          value={blastSearchTerm}
                          onChange={(e) => setBlastSearchTerm(e.target.value)}
                          placeholder="Cari nama atau no. WA..."
                          className="w-full bg-neutral-50 border border-neutral-200 pl-8 pr-3 py-1.5 sm:py-2 rounded-xl text-xs focus:outline-none focus:border-neutral-900 focus:bg-white text-neutral-800"
                        />
                        <svg className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                      </div>
                    </div>

                    {/* Selection Bar */}
                    <div className="flex items-center justify-between py-2 text-xs text-neutral-500 border-t border-neutral-100">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={blastGuestList.length > 0 && blastGuestList.every(g => g.selected)}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900 cursor-pointer accent-neutral-900"
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-700">Pilih Semua</span>
                        </label>
                        <span className="text-neutral-300">|</span>
                        <span className="text-[10px] text-neutral-500">
                          {blastGuestList.filter(g => g.selected).length} dari {blastGuestList.length} tamu dipilih
                        </span>
                      </div>
                      {blastGuestList.some(g => g.status === 'failed') && (
                        <button
                          type="button"
                          onClick={() => {
                            setBlastGuestList(prev => prev.map(g => g.status === 'failed' ? { ...g, status: 'pending', selected: true } : g));
                          }}
                          className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                        >
                          Reset Status Gagal ke Menunggu
                        </button>
                      )}
                    </div>

                    {/* Guest Table (Responsive Scroll Container) */}
                    <div className="overflow-x-auto rounded-xl border border-neutral-200/80 shadow-2xs">
                      <table className="w-full text-left border-collapse min-w-[560px]">
                        <thead>
                          <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">
                            <th className="py-2.5 px-3 w-8">#</th>
                            <th className="py-2.5 px-3">Tamu Undangan</th>
                            <th className="py-2.5 px-3">Nomor WhatsApp</th>
                            <th className="py-2.5 px-3">Link Undangan</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 text-xs">
                          {filteredBlastGuests.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center">
                                <p className="text-xs text-neutral-400">
                                  {blastSearchTerm || blastFilterStatus !== 'all'
                                    ? 'Tidak ada tamu yang cocok dengan filter pencarian.'
                                    : 'Belum ada data tamu. Masukkan nama & nomor WhatsApp secara manual di atas.'}
                                </p>
                              </td>
                            </tr>
                          ) : (
                            filteredBlastGuests.map((guest) => {
                              const baseUrl = typeof window !== 'undefined' ? (project?.slug ? `https://${project.slug}.serastory.com` : window.location.origin) : 'https://serastory.com';
                              const personalizedUrl = generateInvitationLink(baseUrl, guest.name);
                              const displayPhone = formatPhoneDisplay(guest.phone);
                              return (
                                <tr key={guest.id} className="hover:bg-neutral-50/70 transition-colors">
                                  <td className="py-2.5 px-3">
                                    <input
                                      type="checkbox"
                                      checked={!!guest.selected}
                                      onChange={() => toggleSelectGuest(guest.id)}
                                      className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900 cursor-pointer accent-neutral-900"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="text-xs font-bold text-neutral-900 block truncate max-w-[200px]">
                                      {guest.name}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-xs text-neutral-700 whitespace-nowrap">
                                    {displayPhone || guest.phone}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-neutral-500 font-mono truncate max-w-[120px] bg-neutral-100 px-2 py-0.5 rounded">
                                        {`/?to=${encodeURIComponent(guest.name)}`}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(personalizedUrl);
                                          setCopiedLinkFor(guest.id);
                                          setTimeout(() => setCopiedLinkFor(null), 2000);
                                        }}
                                        className="p-1 text-neutral-400 hover:text-neutral-800"
                                        title="Salin Link"
                                      >
                                        {copiedLinkFor === guest.id ? (
                                          <span className="text-[9px] text-emerald-700 font-bold">Tersalin</span>
                                        ) : (
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    {guest.status === 'pending' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-neutral-100 text-neutral-600">
                                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                                        Menunggu
                                      </span>
                                    )}
                                    {guest.status === 'sending' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-50 text-amber-700 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                        Mengirim...
                                      </span>
                                    )}
                                    {guest.status === 'sent' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        ✓ Terkirim
                                      </span>
                                    )}
                                    {guest.status === 'failed' && (
                                      <span title={guest.errorReason || "Gagal"} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-50 text-rose-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        ✕ Gagal
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteBlastGuest(guest.id)}
                                        title="Hapus tamu dari daftar"
                                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                      >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Bottom Navigation Step 1 -> Step 2 */}
                  <div className="bg-white p-4 sm:p-6 md:p-7 rounded-2xl sm:rounded-3xl shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-neutral-800">
                        {blastGuestList.filter(g => g.selected).length > 0
                          ? `${blastGuestList.filter(g => g.selected).length} Tamu Siap Dikirimi Undangan`
                          : 'Belum Ada Tamu yang Dipilih'}
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Lanjut ke langkah ke-2 untuk mengetik draf teks undangan WhatsApp dan memulai blast.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (blastGuestList.filter(g => g.selected).length === 0) {
                          alert('Silakan masukkan dan pilih minimal 1 tamu undangan terlebih dahulu.');
                          return;
                        }
                        syncBlastConfigToSupabase({ guest_list: blastGuestList });
                        setBlastStep(2);
                      }}
                      disabled={blastGuestList.filter(g => g.selected).length === 0}
                      className="w-full sm:w-auto px-6 py-3 sm:py-3.5 bg-neutral-900 hover:bg-black disabled:bg-neutral-200 text-white disabled:text-neutral-400 text-xs font-bold uppercase tracking-[0.15em] rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed text-center"
                    >
                      <span>Lanjut ke Teks Undangan (Langkah 2)</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ==============================================================
                 * STEP 2: TEKS UNDANGAN, PREVIEW & KONTROL PENGIRIMAN BLAST
                 * ============================================================== */
                <div className="space-y-4 sm:space-y-6 md:space-y-8">
                  {/* Back Navigation Bar & Guest Summary */}
                  <div className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-xs border border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setBlastStep(1)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-all cursor-pointer"
                    >
                      <span>←</span>
                      <span>Kembali ke Daftar Tamu</span>
                    </button>
                    <div className="sm:text-right">
                      <p className="text-xs font-bold text-neutral-900">
                        Target: <span className="text-emerald-700 font-semibold">{blastGuestList.filter(g => g.selected && g.status !== 'sent').length} Tamu Terpilih</span>
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        Teks undangan dipersonalisasi otomatis sesuai nama tamu
                      </p>
                    </div>
                  </div>


                  {/* Template Pesan, Preview & Kontrol Pengiriman */}
                  <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-neutral-100 space-y-4 sm:space-y-6">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[9px] font-bold uppercase tracking-wider mb-1">
                          Langkah 2 dari 2
                        </div>
                        <h3 className="text-lg font-serif font-bold text-neutral-900">Form Teks Undangan WhatsApp & Kontrol Blast</h3>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetTemplate}
                        title="Pulihkan pesan ke draf standar undangan resmi"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
                      >
                        <span>↺</span>
                        <span>Draf Standar</span>
                      </button>
                    </div>

                    {/* Variable Chips */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase">Sisipkan Variabel Otomatis</label>
                        <span className="text-[10px] text-neutral-400">Klik untuk memasukkan ke dalam teks</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => insertVariableChip('guest_name')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-200 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer active:scale-95 shadow-xs"
                        >
                          <span>✨</span>
                          <span>{"{{guest_name}}"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => insertVariableChip('invitation_link')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-800 border border-blue-200 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer active:scale-95 shadow-xs"
                        >
                          <span>🔗</span>
                          <span>{"{{invitation_link}}"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Template Textarea */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase">Teks Form Pesan Undangan</label>
                        <span className="text-[10px] font-mono text-neutral-400 font-medium">{blastTemplate.length} karakter</span>
                      </div>
                      <textarea
                        value={blastTemplate}
                        onChange={(e) => {
                          setBlastTemplate(e.target.value);
                          localStorage.setItem('wa_blast_template', e.target.value);
                        }}
                        onBlur={(e) => {
                          syncBlastConfigToSupabase({ message_template: e.target.value });
                        }}
                        rows={7}
                        className="w-full bg-neutral-50/70 border border-neutral-200 p-4 rounded-2xl text-xs focus:outline-none focus:border-neutral-900 focus:bg-white transition-all font-mono leading-relaxed text-neutral-800 resize-y shadow-inner"
                        placeholder="Ketik teks undangan pernikahan Anda di sini..."
                      />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2 text-[10px] text-neutral-400">
                        <p className="flex items-center gap-1.5">
                          <span>💡</span>
                          <span>Mendukung format WhatsApp: <strong>*tebal*</strong>, <em>_miring_</em>, dan emoji 💍</span>
                        </p>
                        {!hasRemovedWatermark ? (
                          <button
                            type="button"
                            onClick={() => setShowRemovePromoModal(true)}
                            className="text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>🏷️ Termasuk Promosi serastory.com</span>
                            <span className="underline">(Hapus Rp 35.000)</span>
                          </button>
                        ) : (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <span>✨ Mode Bebas Promosi Aktif</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Live WhatsApp Preview (Authentic chat bubble with dynamic name and promo footer) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase">Live Preview WhatsApp Tamu</label>
                        <span className="text-[10px] text-neutral-400">Tampilan persis yang diterima di handphone tamu</span>
                      </div>

                      <div className="rounded-[1.75rem] overflow-hidden border border-neutral-300 shadow-md bg-[#EFEAE2]">
                        <div className="bg-[#008069] px-4 py-3 text-white flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs opacity-75">←</span>
                            <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-serif font-bold text-xs shadow-xs">
                              {project?.bride_nickname && project?.groom_nickname
                                ? `${project.bride_nickname[0]}&${project.groom_nickname[0]}`
                                : '💍'}
                            </div>
                            <div>
                              <p className="text-xs font-bold leading-tight">
                                {project?.title || (project?.bride_nickname && project?.groom_nickname ? `The Wedding of ${project.bride_nickname} & ${project.groom_nickname}` : 'The Wedding Invitation')}
                              </p>
                              <p className="text-[9px] text-emerald-100 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                                <span>online</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs opacity-85">
                            <span>📹</span>
                            <span>📞</span>
                            <span>⋮</span>
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          <div className="flex justify-center">
                            <span className="bg-[#E1F3FB] text-neutral-600 text-[9px] font-medium px-3 py-1 rounded-lg shadow-2xs">
                              Hari ini
                            </span>
                          </div>

                          <div className="flex justify-end">
                            <div className="bg-[#E7FFDB] rounded-2xl rounded-tr-xs p-3.5 shadow-sm max-w-[94%] border border-black/5 space-y-2 relative">
                              <div className="text-[11px] text-neutral-800 whitespace-pre-wrap leading-relaxed font-sans">
                                {interpolateMessage(
                                  blastTemplate,
                                  (blastGuestList.find(g => g.selected)?.name || rsvps[0]?.name || "Nama Tamu Undangan"),
                                  generateInvitationLink(
                                    typeof window !== 'undefined' ? (project?.slug ? `https://${project.slug}.serastory.com` : window.location.origin) : 'https://serastory.com',
                                    blastGuestList.find(g => g.selected)?.name || rsvps[0]?.name || "Nama Tamu Undangan"
                                  )
                                )}
                              </div>

                              {/* Promotional footer snippet if not removed */}
                              {!hasRemovedWatermark && (
                                <div className="pt-2 text-[10px] text-emerald-900/80 border-t border-black/10 mt-2 font-sans leading-relaxed">
                                  ━━━━━━━━━━━━━━━━━━━━<br />
                                  ✨ Undangan digital ini dibuat via <strong>serastory.com</strong><br />
                                  <span className="text-[9px] text-neutral-500">Buat undangan pernikahan impianmu di https://serastory.com</span>
                                </div>
                              )}

                              {/* Invitation Card Mockup */}
                              <div className="bg-white/95 border border-emerald-600/15 rounded-xl p-3 flex items-center gap-3 shadow-2xs">
                                <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200 text-xl shadow-xs">
                                  💌
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-bold text-neutral-900 truncate">
                                    {project?.title || (project?.bride_nickname && project?.groom_nickname ? `The Wedding of ${project.bride_nickname} & ${project.groom_nickname}` : 'The Wedding Invitation')}
                                  </p>
                                  <p className="text-[10px] text-neutral-500 truncate">
                                    {project?.event_date || 'Undangan Pernikahan'}
                                  </p>
                                  <span className="text-[9px] text-emerald-700 font-mono font-medium block truncate">
                                    {project?.slug ? `${project.slug}.serastory.com` : (typeof window !== 'undefined' ? window.location.host : 'serastory.com')}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-1 pt-0.5 text-[9px] text-neutral-400">
                                <span>16:45</span>
                                <span className="text-[#34B7F1] font-bold">✓✓</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Blast Action CTA Button & Progress Bar */}
                    <div className="space-y-3 pt-2 border-t border-neutral-100">
                      {isBlasting ? (
                        <button
                          type="button"
                          onClick={handleAbortBlast}
                          className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-[0.15em] rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                          <span>HENTIKAN PENGIRIMAN WA BLAST</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStartBlast}
                          disabled={blastGuestList.filter(g => g.selected && g.status !== 'sent').length === 0}
                          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:from-neutral-200 disabled:to-neutral-200 disabled:text-neutral-400 text-white text-xs font-bold uppercase tracking-[0.15em] rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16C10.66 20.16 9.3 19.81 8.1 19.14L7.81 18.97L4.69 19.79L5.52 16.75L5.33 16.45C4.59 15.27 4.2 13.61 4.2 11.91C4.2 7.37 7.9 3.67 12.05 3.67Z" /></svg>
                          <span>
                            MULAI WA BLAST ({blastGuestList.filter(g => g.selected && g.status !== 'sent').length} TAMU TERPILIH)
                          </span>
                        </button>
                      )}

                      {/* Blasting Progress & Real-Time Anti-Ban Countdown */}
                      {(isBlasting || blastProgress.total > 0) && (
                        <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-2.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-neutral-800">
                              {isBlasting ? `Mengirim ke: ${blastProgress.currentGuestName || 'Tamu'}` : 'Pengiriman Selesai'}
                            </span>
                            <span className="font-mono text-neutral-600 font-bold">
                              {blastProgress.current} / {blastProgress.total} ({Math.round((blastProgress.current / (blastProgress.total || 1)) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                              style={{ width: `${Math.round((blastProgress.current / (blastProgress.total || 1)) * 100)}%` }}
                            />
                          </div>

                          {/* Break State Alert (1-2 minutes every 15 messages) */}
                          {isBreakActive && breakCountdown !== null && (
                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2.5 text-xs text-amber-900 font-semibold animate-pulse">
                              <span className="text-base">☕</span>
                              <div>
                                <p>Istirahat Proteksi Spam Meta (15 Pesan Tercapai)</p>
                                <p className="text-[11px] text-amber-700 font-normal">
                                  Jeda istirahat 1-2 menit untuk menjaga akun WhatsApp Anda tetap aman. Melanjutkan dalam <strong>{breakCountdown} detik</strong>...
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Random Delay Countdown between 45-60s */}
                          {!isBreakActive && currentDelayCountdown !== null && (
                            <p className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5 pt-1">
                              <span>⏱️</span>
                              <span>Jeda acak anti-ban: menunggu <strong>{currentDelayCountdown} detik</strong> sebelum pesan berikutnya...</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

            {/* Modal: Add Guest */}
            {showAddGuestModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-neutral-900/40 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-neutral-100 p-8 space-y-6">
                  <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
                    <div>
                      <h4 className="text-lg font-serif font-bold text-neutral-800">Add Target Guest</h4>
                      <p className="text-xs text-neutral-400 mt-0.5">Tambah tamu baru ke antrean pengiriman WhatsApp</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddGuestModal(false)}
                      className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex items-center justify-center cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase mb-2">Nama Tamu</label>
                      <input
                        type="text"
                        value={newGuestName}
                        onChange={(e) => setNewGuestName(e.target.value)}
                        placeholder="e.g. Nama Tamu / Keluarga"
                        className="w-full bg-neutral-50 border border-neutral-200 px-4 py-3 rounded-xl text-xs focus:outline-none focus:border-neutral-900 text-neutral-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase mb-2">Nomor WhatsApp</label>
                      <input
                        type="text"
                        value={newGuestPhone}
                        onChange={(e) => setNewGuestPhone(formatIndonesianPhone(e.target.value))}
                        placeholder="e.g. 08123456789 (otomatis 628...)"
                        className="w-full bg-neutral-50 border border-neutral-200 px-4 py-3 rounded-xl text-xs focus:outline-none focus:border-neutral-900 text-neutral-800 font-mono"
                      />
                      <p className="text-[10px] text-neutral-400 mt-1">Otomatis diformat ke awalan 628...</p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddGuestModal(false)}
                      className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSingleGuest}
                      disabled={!newGuestName.trim()}
                      className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50"
                    >
                      Simpan Tamu
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Tempel Banyak Tamu (Bulk Paste) */}
            {showBulkPasteModal && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-6 bg-neutral-900/50 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-neutral-100 p-6 md:p-8 space-y-5">
                  <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
                    <div>
                      <h4 className="text-lg font-serif font-bold text-neutral-800">Tempel Banyak Tamu (Bulk Paste)</h4>
                      <p className="text-xs text-neutral-400 mt-0.5">Tempel daftar nama & nomor WhatsApp sekaligus dari Excel, Sheets, atau Catatan</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBulkPasteModal(false)}
                      className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex items-center justify-center cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-neutral-500">
                      <span className="font-bold uppercase tracking-wider">Format: Nama Tamu, Nomor WhatsApp (1 baris per tamu)</span>
                      <span className="font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
                        {parseBulkGuestText(bulkPasteRawText).length} Tamu Terdeteksi
                      </span>
                    </div>
                    <textarea
                      rows={8}
                      value={bulkPasteRawText}
                      onChange={(e) => setBulkPasteRawText(e.target.value)}
                      placeholder={`Contoh:\nBpk. H. Hendra & Keluarga, 081234567890\nIbu Hj. Rina & Suami, 081987654321\nDika Pratama (Alumni SMA), 085712345678\nSarah Amalia\t081399887766`}
                      className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-2xl text-xs font-mono focus:outline-none focus:border-neutral-900 focus:bg-white transition-all text-neutral-800"
                    />
                    <p className="text-[10px] text-neutral-400 leading-relaxed">
                      💡 Tip: Anda bisa copy-paste kolom <b>Nama</b> dan <b>No HP</b> langsung dari Google Sheets atau Microsoft Excel. Format nomor otomatis disesuaikan ke format internasional 628...
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowBulkPasteModal(false)}
                      className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkPasteGuests}
                      disabled={!bulkPasteRawText.trim() || parseBulkGuestText(bulkPasteRawText).length === 0}
                      className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-40"
                    >
                      Masukkan ({parseBulkGuestText(bulkPasteRawText).length}) Tamu ke Antrean
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal 1: Beli Kuota WA Blast Tambahan */}
            {showBuyQuotaModal && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-6 bg-neutral-900/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-neutral-100 flex flex-col">
                  {/* Header */}
                  <div className="p-6 md:p-7 border-b border-neutral-100 flex justify-between items-center bg-gradient-to-r from-emerald-50/60 to-teal-50/60">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">Top Up Kapasitas</span>
                      <h4 className="text-xl font-serif font-bold text-neutral-900 mt-0.5">Beli Kuota WA Blast</h4>
                      <p className="text-xs text-neutral-500 mt-1">Tambah kuota pengiriman untuk mengundang lebih banyak tamu tanpa batasan</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBuyQuotaModal(false)}
                      className="w-8 h-8 rounded-full bg-white text-neutral-400 hover:text-neutral-900 shadow-xs border border-neutral-200 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Body with 3 Package Options */}
                  <div className="p-6 md:p-7 space-y-4">
                    <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                      Pilih Paket Tambahan Kuota:
                    </p>

                    <div className="space-y-2.5">
                      {[
                        { count: 100, price: 'Rp 25.000', label: '+100 Pesan WA Blast', desc: 'Cocok untuk pernikahan intim / keluarga dekat' },
                        { count: 250, price: 'Rp 50.000', label: '+250 Pesan WA Blast', desc: 'Paling Populer • Rekomendasi untuk resepsi standar', popular: true },
                        { count: 500, price: 'Rp 85.000', label: '+500 Pesan WA Blast', desc: 'Hemat 30% • Kapasitas besar tanpa khawatir kuota habis' },
                      ].map((pkg) => (
                        <div
                          key={pkg.count}
                          onClick={() => {
                            openQuotaCheckout(pkg.count, pkg.price, pkg.count === 100 ? 25000 : pkg.count === 250 ? 50000 : 85000);
                          }}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                            pkg.popular
                              ? 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-500 hover:shadow-md'
                              : 'bg-neutral-50 hover:bg-white border-neutral-200 hover:border-neutral-900 hover:shadow-xs'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-700 transition-colors">
                                {pkg.label}
                              </h5>
                              {pkg.popular && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white uppercase tracking-wider">
                                  Terpopuler
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-500">{pkg.desc}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-serif font-bold text-neutral-900 block">{pkg.price}</span>
                            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">Beli Kuota →</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 text-[11px] text-neutral-500 space-y-1 leading-relaxed">
                      <p className="font-semibold text-neutral-700 flex items-center gap-1.5">
                        <span>🛡️</span>
                        <span>Garansi Pengiriman Aman & Kuota Langsung Aktif</span>
                      </p>
                      <p>
                        Kuota tambahan berlaku selamanya untuk undangan ini dan otomatis dilengkapi proteksi anti-ban Meta (jeda acak 45-60 detik & jeda istirahat).
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 md:p-6 border-t border-neutral-100 bg-neutral-50/50 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowBuyQuotaModal(false)}
                      className="px-5 py-2.5 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-bold uppercase tracking-wider rounded-xl border border-neutral-200 transition-all cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal 2: Hapus Promosi serastory.com (Rp 35.000) */}
            {showRemovePromoModal && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-6 bg-neutral-900/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-neutral-100 flex flex-col">
                  {/* Header */}
                  <div className="p-6 md:p-7 border-b border-neutral-100 flex justify-between items-center bg-gradient-to-r from-amber-50/60 to-emerald-50/60">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">Add-On Eksklusif</span>
                      <h4 className="text-xl font-serif font-bold text-neutral-900 mt-0.5">Hapus Promosi serastory.com</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRemovePromoModal(false)}
                      className="w-8 h-8 rounded-full bg-white text-neutral-400 hover:text-neutral-900 shadow-xs border border-neutral-200 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-6 md:p-7 space-y-4">
                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 text-center space-y-1">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">Biaya Sekali Bayar</span>
                      <span className="text-3xl font-serif font-bold text-emerald-900 block">Rp 35.000</span>
                      <span className="text-[10px] text-neutral-500 block">Aktif selamanya untuk seluruh pesan WA Blast di website ini</span>
                    </div>

                    <div className="space-y-2 text-xs text-neutral-600">
                      <p className="font-bold text-neutral-800">Keuntungan Menghapus Promosi:</p>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Pesan undangan pernikahan Anda 100% bersih tanpa footer promosi serastory.com.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Tampak lebih profesional, mewah, privat, dan eksklusif di mata para tamu undangan.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Berlaku permanen tanpa biaya langganan bulanan.</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 md:p-6 border-t border-neutral-100 bg-neutral-50/50 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowRemovePromoModal(false)}
                      className="flex-1 py-3 bg-white hover:bg-neutral-100 text-neutral-700 text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl border border-neutral-200 transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={openWatermarkCheckout}
                      className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl transition-all shadow-md cursor-pointer active:scale-95 text-center"
                    >
                      Lanjut ke Pembayaran / Voucher →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal 3: Upgrade / Pilihan Bundle WA Blast */}
            {showUpgradeBundleModal && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-6 bg-neutral-900/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-neutral-100 flex flex-col">
                  {/* Header */}
                  <div className="p-6 md:p-7 border-b border-neutral-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800">Pilihan Bundling & Kuota</span>
                      <h4 className="text-xl font-serif font-bold text-neutral-900 mt-0.5">Paket Undangan & WA Blast</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowUpgradeBundleModal(false)}
                      className="w-8 h-8 rounded-full bg-white text-neutral-400 hover:text-neutral-900 shadow-xs border border-neutral-200 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-6 md:p-7 space-y-4">
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      Kapasitas kuota pengiriman WA Blast disesuaikan dengan paket langganan undangan pernikahan Anda:
                    </p>

                    <div className="space-y-2.5">
                      {[
                        { key: 'basic', label: 'Paket Basic', quota: 0, hasBlast: false, desc: 'Fitur WA Blast tidak tersedia / dinonaktifkan', tag: 'Tanpa WA Blast' },
                        { key: 'silver', label: 'Paket Silver', quota: 100, hasBlast: true, desc: 'Dapat kuota 100 pesan blast undangan resmi', tag: '100 Kuota' },
                        { key: 'premium', label: 'Paket Premium', quota: 300, hasBlast: true, desc: 'Dapat kuota 300 pesan blast undangan resmi', tag: '300 Kuota' },
                        { key: 'exclusive', label: 'Paket Exclusive', quota: 500, hasBlast: true, desc: 'Kapasitas maksimal 500 pesan blast undangan resmi', tag: '500 Kuota (Maks)' },
                      ].map((item) => {
                        const PACKAGE_TIER_RANK: Record<string, number> = {
                          basic: 0,
                          silver: 1,
                          premium: 2,
                          exclusive: 3,
                        };
                        const currentRank = PACKAGE_TIER_RANK[projectPackageName.toLowerCase()] ?? 0;
                        const itemRank = PACKAGE_TIER_RANK[item.key] ?? 0;
                        const isCurrent = projectPackageName.toLowerCase() === item.key.toLowerCase();
                        const isDowngrade = itemRank < currentRank;
                        const isUpgrade = itemRank > currentRank;
                        const currentPrice = OFFICIAL_PACKAGE_PRICES[projectPackageName.toLowerCase()] ?? 104000;
                        const targetPrice = OFFICIAL_PACKAGE_PRICES[item.key] ?? 104000;
                        const priceDiff = Math.max(0, targetPrice - currentPrice);

                        return (
                          <div
                            key={item.key}
                            onClick={() => {
                              if (isDowngrade) {
                                alert(`Tidak dapat menurunkan paket (downgrade).\n\nPaket aktif Anda saat ini adalah ${BUNDLE_WA_BLAST_CONFIG[projectPackageName]?.label || projectPackageName.toUpperCase()}. Anda hanya dapat melakukan upgrade ke paket yang lebih tinggi.`);
                                return;
                              }
                              if (isCurrent) return;
                              openUpgradeCheckout(item.key);
                            }}
                            className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                              isCurrent
                                ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-300 cursor-default'
                                : isDowngrade
                                ? 'opacity-40 cursor-not-allowed bg-neutral-100/60 border-neutral-200'
                                : 'bg-white hover:border-emerald-600 hover:shadow-md border-neutral-200 cursor-pointer group'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h5 className={`text-sm font-bold transition-colors ${
                                  isCurrent ? 'text-amber-900' : isDowngrade ? 'text-neutral-400' : 'text-neutral-900 group-hover:text-emerald-700'
                                }`}>
                                  {item.label}
                                </h5>
                                {isCurrent && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-600 text-white uppercase tracking-wider">
                                    Paket Aktif
                                  </span>
                                )}
                                {isDowngrade && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-500 uppercase tracking-wider">
                                    Tidak Bisa Downgrade
                                  </span>
                                )}
                              </div>
                              <p className={`text-[11px] ${isDowngrade ? 'text-neutral-400' : 'text-neutral-500'}`}>{item.desc}</p>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-serif font-bold block ${isDowngrade ? 'text-neutral-400' : 'text-neutral-900'}`}>{item.tag}</span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                                isCurrent
                                  ? 'text-amber-700'
                                  : isDowngrade
                                  ? 'text-neutral-400'
                                  : 'text-emerald-700 group-hover:underline'
                              }`}>
                                {isCurrent ? 'Aktif ✓' : isDowngrade ? 'Terkunci ✕' : `+Rp ${priceDiff.toLocaleString('id-ID')} · Upgrade →`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 md:p-6 border-t border-neutral-100 bg-neutral-50/50 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowUpgradeBundleModal(false)}
                      className="px-5 py-2.5 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-bold uppercase tracking-wider rounded-xl border border-neutral-200 transition-all cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Riwayat Log Supabase */}
            {showLogsModal && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-6 bg-neutral-900/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden border border-neutral-100 flex flex-col">
                  {/* Header */}
                  <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-gradient-to-r from-neutral-50 to-emerald-50/40">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">Server Pengiriman</span>
                      <h4 className="text-xl font-serif font-bold text-neutral-900 mt-0.5">Riwayat Pengiriman WA Blast</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">Tercatat {blastLogs.length} pengiriman pesan</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLogsModal(false)}
                      className="w-8 h-8 rounded-full bg-white text-neutral-400 hover:text-neutral-900 shadow-xs border border-neutral-200 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Stats Summary */}
                  <div className="grid grid-cols-3 gap-3 p-4 bg-neutral-50/70 border-b border-neutral-100 text-center">
                    <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
                      <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-bold">Paket Bundle</span>
                      <span className="text-xs font-bold text-neutral-800 uppercase">{projectPackageName}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
                      <span className="text-[9px] uppercase tracking-wider text-emerald-600 block font-bold">Total Terkirim</span>
                      <span className="text-xs font-bold text-emerald-700">{waBlastSentCount} Pesan</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
                      <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-bold">Sisa Kuota</span>
                      <span className="text-xs font-bold text-neutral-900">{Math.max(0, (waBlastBaseQuota + waBlastExtraQuota) - waBlastSentCount)} Pesan</span>
                    </div>
                  </div>

                  {/* Logs Table */}
                  <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-2">
                    {blastLogs.length === 0 ? (
                      <div className="py-12 text-center text-neutral-400 space-y-2">
                        <span className="text-3xl block">📭</span>
                        <p className="text-xs">Belum ada riwayat pesan yang dikirim.</p>
                      </div>
                    ) : (
                      blastLogs.map((log: any) => (
                        <div key={log.id} className="p-3.5 bg-white rounded-xl border border-neutral-200 hover:border-neutral-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-neutral-900 font-mono">{log.phone}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                log.status === 'sent'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {log.status === 'sent' ? 'Terkirim ✓' : 'Gagal ✕'}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-500 line-clamp-1 max-w-md">
                              {log.message?.replace(/\n/g, ' ')}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-neutral-400 font-mono block">
                              {new Date(log.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} WIB
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => fetchBlastLogs()}
                      className="text-xs text-neutral-600 hover:text-neutral-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>🔄</span>
                      <span>Refresh Data</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLogsModal(false)}
                      className="px-5 py-2 bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Konfirmasi Disconnect Sesi WhatsApp */}
            {showDisconnectConfirm && (
              <div
                className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setShowDisconnectConfirm(false)}
              >
                <div
                  className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-neutral-100 p-6 space-y-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-serif font-bold text-neutral-900">Putuskan Sesi WhatsApp?</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        WhatsApp {waSession.profileName ? <strong>{waSession.profileName}</strong> : 'Anda'} akan dikeluarkan dari dashboard. Anda perlu scan QR lagi untuk menghubungkannya kembali.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      id="disconnect-cancel-btn"
                      onClick={() => setShowDisconnectConfirm(false)}
                      className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-bold tracking-[0.15em] uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      id="disconnect-confirm-btn"
                      onClick={handleDisconnectQRSession}
                      className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold tracking-[0.15em] uppercase rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
                    >
                      Ya, Disconnect
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Checkout Pembayaran & Klaim Voucher */}
            {checkoutModal.isOpen && (
              <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 md:p-6 bg-neutral-900/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-neutral-100 flex flex-col">
                  {/* Header */}
                  <div className="p-6 md:p-7 border-b border-neutral-100 flex justify-between items-center bg-gradient-to-r from-neutral-50 via-emerald-50/40 to-teal-50/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-lg shadow-sm">
                        🧾
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">Checkout Transaksi</span>
                        <h4 className="text-lg font-serif font-bold text-neutral-900">Pembayaran & Voucher</h4>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCheckoutModal(prev => ({ ...prev, isOpen: false }))}
                      className="w-8 h-8 rounded-full bg-white text-neutral-400 hover:text-neutral-900 shadow-xs border border-neutral-200 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-6 md:p-7 space-y-5 overflow-y-auto max-h-[75vh]">
                    {/* Ringkasan Item & Tagihan */}
                    <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Item Pesanan</span>
                          <h5 className="text-sm font-bold text-neutral-900">{checkoutModal.title}</h5>
                          <p className="text-[11px] text-neutral-500 mt-0.5">{checkoutModal.itemLabel}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Total</span>
                          <span className="text-base font-serif font-bold text-neutral-900">
                            Rp {checkoutModal.price.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>

                      {appliedVoucher && (
                        <div className="pt-2 border-t border-neutral-200/60 flex justify-between items-center text-xs text-emerald-700 font-bold">
                          <span>Diskon Voucher ({appliedVoucher.code}):</span>
                          <span>- Rp {checkoutModal.price.toLocaleString('id-ID')} (100%)</span>
                        </div>
                      )}

                      {!appliedVoucher && (
                        <div className="pt-2 border-t border-neutral-200/60 flex justify-between items-center text-xs">
                          <span className="text-neutral-500 font-semibold">Kode Unik Pembayaran:</span>
                          <span className="font-mono font-bold text-amber-700">+ Rp {checkoutUniqueCode.toLocaleString('id-ID')}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-neutral-200 flex justify-between items-center">
                        <span className="text-xs font-bold text-neutral-800">{appliedVoucher ? 'Total Harus Dibayar:' : 'Total Transfer:'}</span>
                        <span className={`text-lg font-serif font-bold ${appliedVoucher ? 'text-emerald-600' : 'text-neutral-900'}`}>
                          {appliedVoucher ? 'Rp 0 (LUNAS)' : `Rp ${checkoutTransferTotal.toLocaleString('id-ID')}`}
                        </span>
                      </div>
                    </div>

                    {/* Section 1: Input Kode Voucher / Kupon */}
                    <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">🎟️</span>
                        <label className="text-xs font-bold text-neutral-800">Punya Kode Voucher / Kupon Pembelian?</label>
                      </div>
                      <p className="text-[11px] text-neutral-600 leading-relaxed">
                        Jika Anda telah membeli atau mentransfer langsung ke owner/admin Sera Story, masukkan kode kupon yang diberikan oleh admin di bawah ini untuk langsung mengaktifkan pesanan Anda.
                      </p>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={voucherCodeInput}
                          onChange={(e) => {
                            setVoucherCodeInput(e.target.value);
                            setVoucherError('');
                          }}
                          placeholder="Masukkan kode voucher..."
                          className="flex-1 bg-white border border-neutral-300 px-3.5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-neutral-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyVoucher(voucherCodeInput)}
                          className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          Terapkan
                        </button>
                      </div>

                      {voucherError && (
                        <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                          <span>✕</span>
                          <span>{voucherError}</span>
                        </p>
                      )}

                      {appliedVoucher && (
                        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-300 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                          <span>✓</span>
                          <span>Kode Voucher <strong>{appliedVoucher.code}</strong> berhasil diterapkan! Tagihan menjadi Rp 0.</span>
                        </div>
                      )}
                    </div>

                    {/* Section 2: QRIS Pembayaran & WhatsApp Admin (Jika Belum Punya Voucher) */}
                    {!appliedVoucher && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs font-bold text-neutral-900">QRIS Resmi Sera Story</span>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Semua Bank & E-Wallet</span>
                        </div>

                        {/* Nominal Transfer + Kode Unik */}
                        <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-amber-300 space-y-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-800 text-center">Transfer Tepat Sejumlah</p>
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            <span className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900 tracking-tight">
                              Rp {checkoutModal.price.toLocaleString('id-ID').replace(/\.?\d{3}$/, '')}{checkoutModal.price >= 1000 ? '.' : ''}<span className="text-amber-600 underline decoration-amber-400 decoration-2 underline-offset-4">{String(checkoutTransferTotal % 1000).padStart(3, '0')}</span>
                            </span>
                            <button
                              type="button"
                              id="checkout-copy-transfer-amount"
                              onClick={() => {
                                navigator.clipboard.writeText(String(checkoutTransferTotal));
                                setCopiedTransferAmount(true);
                                setTimeout(() => setCopiedTransferAmount(false), 2000);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                                copiedTransferAmount
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200'
                              }`}
                            >
                              {copiedTransferAmount ? '✓ Tersalin' : 'Salin'}
                            </button>
                          </div>
                          <p className="text-[11px] text-neutral-500 text-center leading-relaxed">
                            Harga Rp {checkoutModal.price.toLocaleString('id-ID')} + kode unik <strong className="text-amber-700">{checkoutUniqueCode}</strong>.
                            Mohon transfer <strong>sesuai nominal persis</strong> (termasuk 3 digit terakhir) agar pembayaran Anda cepat dikenali.
                          </p>
                        </div>

                        {/* QRIS Card */}
                        <div className="p-4 bg-white rounded-2xl border border-neutral-200 shadow-xs flex flex-col items-center text-center space-y-3">
                          <div className="relative group max-w-[240px] w-full bg-white p-2 rounded-xl border border-neutral-200 shadow-xs">
                            <img
                              src="/qris_serastory.jpg"
                              alt="QRIS Sera Story"
                              className="w-full h-auto rounded-lg object-contain"
                            />
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs font-bold text-neutral-900">Sera Story - Software</p>
                            <p className="text-[10px] font-mono text-neutral-500">NMID : ID1026519417855</p>
                            <p className="text-[11px] text-neutral-500 max-w-xs leading-relaxed">
                              Scan QR di atas menggunakan GoPay, OVO, Dana, ShopeePay, BCA, Mandiri, BRI, atau mobile banking lainnya.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <a
                              href="/qris_serastory.jpg"
                              download="QRIS_SeraStory.jpg"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              <span>Unduh / Buka QRIS</span>
                            </a>
                          </div>
                        </div>

                        <a
                          href={`https://wa.me/${SERASTORY_ADMIN_WA}?text=${encodeURIComponent(
                            `Halo Admin Sera Story, saya sudah transfer via QRIS sebesar Rp ${checkoutTransferTotal.toLocaleString('id-ID')} (harga Rp ${checkoutModal.price.toLocaleString('id-ID')} + kode unik ${checkoutUniqueCode}) untuk: ${checkoutModal.title} pada project ${coupleNicknames || 'Undangan'}. Berikut saya lampirkan bukti bayarnya, mohon kirimkan kode voucher aktivasi saya. Terima kasih!`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs text-center"
                        >
                          <span>📱</span>
                          <span>Kirim Bukti Bayar & Minta Voucher ke Admin</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="p-4 md:p-6 border-t border-neutral-100 bg-neutral-50/50 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCheckoutModal(prev => ({ ...prev, isOpen: false }))}
                      className="px-4 py-3 bg-white hover:bg-neutral-100 text-neutral-700 text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl border border-neutral-200 transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    {appliedVoucher ? (
                      <button
                        type="button"
                        onClick={handleCompleteCheckoutWithVoucher}
                        disabled={isProcessingCheckout}
                        className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl transition-all shadow-md cursor-pointer active:scale-95 text-center flex items-center justify-center gap-1.5"
                      >
                        {isProcessingCheckout ? (
                          <span>Memproses...</span>
                        ) : (
                          <span>✓ KLAIM & AKTIFKAN SEKARANG</span>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          alert(`Silakan scan QRIS dan transfer tepat Rp ${checkoutTransferTotal.toLocaleString('id-ID')} (sudah termasuk kode unik ${checkoutUniqueCode}), lalu kirim bukti bayar ke WhatsApp Admin Sera Story (+62 851-5791-7178) untuk mendapatkan kode voucher aktivasi.`);
                        }}
                        className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl transition-all shadow-md cursor-pointer text-center"
                      >
                        Selesaikan Pembayaran
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Import CSV */}
            {showCsvModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-neutral-900/40 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-neutral-100 p-8 space-y-6">
                  <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
                    <div>
                      <h4 className="text-lg font-serif font-bold text-neutral-800">Import Guests via CSV</h4>
                      <p className="text-xs text-neutral-400 mt-0.5">Tempel format teks CSV atau pisahkan dengan koma</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCsvModal(false)}
                      className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex items-center justify-center cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase">Data CSV (Nama, No. Telepon)</label>
                        <button
                          type="button"
                          onClick={() => {
                            setCsvRawText(`Nama,Nomor Telepon\nBpk. Hendra Gunawan, 081234567890\nIbu Maya Indah & Partner, 085712345678\nDimas Prasetyo, 089612345678`);
                          }}
                          className="text-[10px] text-blue-600 hover:underline font-medium cursor-pointer"
                        >
                          Isi Contoh
                        </button>
                      </div>
                      <textarea
                        value={csvRawText}
                        onChange={(e) => setCsvRawText(e.target.value)}
                        rows={7}
                        placeholder={"Nama, Nomor Telepon\nBpk. Agus, 08123456789\nIbu Sari & Suami, 08567891234"}
                        className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl text-xs focus:outline-none focus:border-neutral-900 font-mono text-neutral-800 resize-none leading-relaxed"
                      />
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      💡 Sistem otomatis mendeteksi header CSV dan mengubah awalan nomor telepon <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-neutral-700">08...</code> menjadi <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-neutral-700">628...</code>.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCsvModal(false)}
                      className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleImportCsv}
                      disabled={!csvRawText.trim()}
                      className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50"
                    >
                      Import Tamu
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'settings' ? (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-100">
              <div>
                <h3 className="text-xl font-serif text-neutral-800">Dashboard Settings</h3>
                <p className="text-sm text-neutral-400 mt-1">Manage your dashboard security and configurations</p>
              </div>
            </div>

            <div className="max-w-2xl">
              <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100 flex flex-col gap-6">
                <div className="border-b border-neutral-100 pb-4 flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-neutral-100 text-neutral-700">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  </div>
                  <div>
                    <h4 className="text-base font-serif font-bold text-neutral-800">Security & Password</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">Update the password required to access this management suite.</p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase mb-2 ml-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-neutral-50 border border-neutral-200 px-5 py-4 rounded-xl text-sm focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all text-neutral-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase mb-2 ml-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full bg-neutral-50 border border-neutral-200 px-5 py-4 rounded-xl text-sm focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all text-neutral-900"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="w-full py-4 bg-neutral-900 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-neutral-800 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 mt-2 cursor-pointer"
                  >
                    {isChangingPassword ? (
                      <>
                        <div className="w-3 h-3 rounded-full border-2 border-dashed border-white animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      "Save New Password"
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Elegant Wish Modal */}
      {selectedWish && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-neutral-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-neutral-100">
            <div className="p-8 pt-10 text-center space-y-6">
              <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-8 h-8 text-neutral-300"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-[10px] font-bold tracking-[0.4em] text-neutral-400 uppercase">Messages From</h2>
                <p className="text-3xl font-serif text-neutral-800 uppercase tracking-tight">{selectedWish.name}</p>
              </div>
              <div className="relative p-6 bg-neutral-50/50 rounded-[2rem] border border-neutral-100/50 max-h-[300px] overflow-y-auto space-y-4">
                <div className="text-left flex justify-between items-start gap-4">
                  <p className="text-lg text-neutral-700 leading-relaxed font-serif italic text-pretty flex-1">"{selectedWish.wishes}"</p>
                  <button
                    onClick={() => handleDeleteWish(selectedWish.id)}
                    className="shrink-0 p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-100 transition-all cursor-pointer"
                    title="Delete Wish"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
              <button onClick={() => setSelectedWish(null)} className="w-full py-5 bg-neutral-900 text-white text-xs font-bold tracking-[0.2em] uppercase rounded-2xl hover:bg-neutral-800 transition-all shadow-lg active:scale-[0.98] cursor-pointer">Return to Dashboard</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Gift Modal */}
      {showAddGiftModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-neutral-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-neutral-100 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
              <div>
                <h2 className="text-2xl font-serif text-neutral-800">Add Registry Item</h2>
                <p className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase mt-1">Fill the details below</p>
              </div>
              <button onClick={() => setShowAddGiftModal(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 shadow-sm border border-neutral-100 transition-all cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 overflow-y-auto">
              <form onSubmit={handleAddGift} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">Quick Presets (Pilih Kado Cepat)</label>
                  <div className="flex flex-wrap gap-2">
                    {GIFT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewGift({
                          name: preset.name,
                          price: preset.price,
                          image: preset.image,
                          link: "",
                          originalPrice: "",
                          discount: ""
                        })}
                        className="px-4 py-2 text-xs bg-neutral-50 border border-neutral-200 hover:border-neutral-900 rounded-xl transition-all cursor-pointer text-neutral-800"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">Item Name</label>
                    <input type="text" value={newGift.name} onChange={(e) => setNewGift({ ...newGift, name: e.target.value })} className="w-full bg-white px-5 py-4 text-sm border border-neutral-200 rounded-2xl outline-none focus:border-neutral-900 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]" required placeholder="e.g. Microwave Oven" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">Original Price (Rp)</label>
                    <input type="text" value={newGift.price} onChange={(e) => setNewGift({ ...newGift, price: formatCurrencyInput(e.target.value) })} placeholder="e.g. 500.000" className="w-full bg-white px-5 py-4 text-sm border border-neutral-200 rounded-2xl outline-none focus:border-neutral-900 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 flex flex-col">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">Image URL or Upload File</label>
                    <div className="flex gap-2">
                      <input type="text" value={newGift.image} onChange={(e) => setNewGift({ ...newGift, image: e.target.value })} className="flex-1 bg-white px-5 py-4 text-sm border border-neutral-200 rounded-2xl outline-none focus:border-neutral-900 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]" required placeholder="https://... or upload below" />
                    </div>
                    <div className="relative mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, false)}
                        className="hidden"
                        id="gift-image-file-add"
                        disabled={isUploadingImage}
                      />
                      <label
                        htmlFor="gift-image-file-add"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border border-neutral-200 text-[10px] font-bold tracking-wider uppercase rounded-xl transition-all cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                        {isUploadingImage ? "Uploading..." : "Upload Image"}
                      </label>
                    </div>
                    {newGift.image && (
                      <div className="mt-4 relative w-32 aspect-[4/5] rounded-xl overflow-hidden border border-neutral-200 shadow-sm bg-neutral-50">
                        <img src={newGift.image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">Discount Percentage (%)</label>
                    <input type="number" min="0" max="100" value={newGift.discount} onChange={(e) => setNewGift({ ...newGift, discount: e.target.value })} placeholder="e.g. 20 (Optional)" className="w-full bg-white px-5 py-4 text-sm border border-neutral-200 rounded-2xl outline-none focus:border-neutral-900 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]" />
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setShowAddGiftModal(false)} className="flex-1 py-4 bg-white text-neutral-900 text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-all cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isAddingGift || isUploadingImage} className="flex-1 py-4 bg-neutral-900 text-white text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl hover:bg-neutral-800 transition-all disabled:opacity-50 shadow-md cursor-pointer">{isAddingGift ? "ADDING..." : "ADD TO REGISTRY"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Gift Modal */}
      {editingGift && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-neutral-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-neutral-100 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
              <div>
                <h2 className="text-2xl font-serif text-neutral-800">Edit Registry Item</h2>
                <p className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase mt-1">Update the details below</p>
              </div>
              <button onClick={() => setEditingGift(null)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 shadow-sm border border-neutral-100 transition-all cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 overflow-y-auto">
              <form onSubmit={handleUpdateGift} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">Item Name</label>
                    <input type="text" value={editingGift.name} onChange={(e) => setEditingGift({ ...editingGift, name: e.target.value })} className="w-full bg-white px-5 py-4 text-sm border border-neutral-200 rounded-2xl outline-none focus:border-neutral-900 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">Original Price (Rp)</label>
                    <input type="text" value={editingGift.price} onChange={(e) => setEditingGift({ ...editingGift, price: formatCurrencyInput(e.target.value) })} className="w-full bg-white px-5 py-4 text-sm border border-neutral-200 rounded-2xl outline-none focus:border-neutral-900 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 flex flex-col">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">Image URL or Upload File</label>
                    <div className="flex gap-2">
                      <input type="text" value={editingGift.image} onChange={(e) => setEditingGift({ ...editingGift, image: e.target.value })} className="flex-1 bg-white px-5 py-4 text-sm border border-neutral-200 rounded-2xl outline-none focus:border-neutral-900 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]" required />
                    </div>
                    <div className="relative mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, true)}
                        className="hidden"
                        id="gift-image-file-edit"
                        disabled={isUploadingImage}
                      />
                      <label
                        htmlFor="gift-image-file-edit"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border border-neutral-200 text-[10px] font-bold tracking-wider uppercase rounded-xl transition-all cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                        {isUploadingImage ? "Uploading..." : "Upload Image"}
                      </label>
                    </div>
                    {editingGift.image && (
                      <div className="mt-4 relative w-32 aspect-[4/5] rounded-xl overflow-hidden border border-neutral-200 shadow-sm bg-neutral-50">
                        <img src={editingGift.image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">Discount Percentage (%)</label>
                    <input type="number" min="0" max="100" value={editingGift.discount} onChange={(e) => setEditingGift({ ...editingGift, discount: e.target.value })} placeholder="e.g. 20 (Optional)" className="w-full bg-white px-5 py-4 text-sm border border-neutral-200 rounded-2xl outline-none focus:border-neutral-900 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]" />
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setEditingGift(null)} className="flex-1 py-4 bg-white text-neutral-900 text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-all cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isUpdatingGift || isUploadingImage} className="flex-1 py-4 bg-neutral-900 text-white text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl hover:bg-neutral-800 transition-all disabled:opacity-50 shadow-md cursor-pointer">{isUpdatingGift ? "SAVING..." : "SAVE CHANGES"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showSlideshow && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-neutral-950 overflow-hidden">
          {/* Cinematic Background */}
          <div className="absolute inset-0 z-0">
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: 1.15 }}
              transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
              className="relative w-full h-full"
            >
              <img
                src={slideshowBg}
                alt="Slideshow Background"
                className="w-full h-full object-cover opacity-20 grayscale brightness-50"
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/80 via-transparent to-neutral-950"></div>
          </div>

          {/* Floating UI Elements */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4"
              >
                <div className="h-[1px] w-12 bg-gradient-to-l from-amber-200/50 to-transparent"></div>
                <h2 className="text-[10px] font-bold tracking-[0.5em] text-amber-200/40 uppercase">The Wedding Wishes</h2>
                <div className="h-[1px] w-12 bg-gradient-to-r from-amber-200/50 to-transparent"></div>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-white/90 font-serif text-3xl md:text-5xl mt-2 tracking-wider"
              >
                {coupleNicknames}
              </motion.p>
            </div>

            <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end">
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-bold tracking-[0.3em] text-white/20 uppercase">Now Showing</span>
                <span className="text-white/40 font-mono text-xs">{currentSlideIndex + 1} / {allWishes.length}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></div>
                <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">Live Stream</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowSlideshow(false)}
            className="absolute top-8 right-8 w-12 h-12 bg-white/5 hover:bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white/50 hover:text-white transition-all z-[110] border border-white/10 active:scale-90 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="w-full max-w-4xl px-6 relative z-20 mt-24">
            <AnimatePresence mode="wait">
              {allWishes.length > 0 ? (
                <motion.div
                  key={currentSlideIndex}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 1.05 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="relative flex flex-col items-center"
                >
                  <div className="absolute -top-8 -left-4 text-6xl text-amber-200/10 font-serif pointer-events-none">"</div>

                  <div className="bg-white/[0.03] backdrop-blur-2xl p-8 md:p-12 lg:p-16 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden group w-full">
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 8, ease: "linear" }}
                        className="h-full bg-gradient-to-r from-transparent via-amber-200/40 to-transparent"
                      />
                    </div>

                    <div className="max-h-[35vh] overflow-y-auto no-scrollbar">
                      <p 
                        className={`font-bold text-white text-center tracking-wide leading-relaxed drop-shadow-2xl
                        ${(allWishes[currentSlideIndex]?.text?.length || 0) < 100 ? "text-xl md:text-2xl lg:text-3xl" :
                          (allWishes[currentSlideIndex]?.text?.length || 0) < 250 ? "text-lg md:text-xl lg:text-2xl" : "text-base md:text-lg lg:text-xl"}`}
                      >
                        {allWishes[currentSlideIndex]?.text}
                      </p>
                    </div>

                    <div className="mt-12 flex flex-col items-center gap-4">
                      <div className="h-px w-24 bg-gradient-to-r from-transparent via-amber-200/30 to-transparent"></div>
                      <motion.h3
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-lg md:text-xl lg:text-2xl font-bold text-amber-200/90 tracking-[0.1em] drop-shadow-lg"
                      >
                        {allWishes[currentSlideIndex]?.name}
                      </motion.h3>
                    </div>
                  </div>

                  <div className="absolute -bottom-8 -right-4 text-6xl text-amber-200/10 font-serif pointer-events-none rotate-180">"</div>
                </motion.div>
              ) : (
                <div className="text-center space-y-4">
                  <p className="text-white/20 font-serif text-3xl tracking-widest uppercase animate-pulse">Waiting for wishes...</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
