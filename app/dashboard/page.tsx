"use client";

import React, { useState, useEffect } from "react";
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

export default function RSVPDashboard() {
  const [project, setProject] = useState<any>(null);
  const [rsvps, setRsvps] = useState<RSVPData[]>([]);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [storyEvents, setStoryEvents] = useState<StoryEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'rsvp' | 'gifts' | 'links' | 'settings'>('rsvp');
  const [settingsTab, setSettingsTab] = useState<'password' | 'story'>('password');
  const [loading, setLoading] = useState(true);

  // Authentication & Security State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [dbPassword, setDbPassword] = useState("serastory");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isBasicPlan, setIsBasicPlan] = useState(false);
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

  const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || 'f93ad18d-cba2-4de0-a86b-b1fadf2783a2';

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
            if (data.subscriptions?.packages?.name?.toLowerCase() === 'basic') {
              setIsBasicPlan(true);
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

  if (isBasicPlan) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-red-100/30 blur-[120px] animate-pulse"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white/60 backdrop-blur-2xl p-8 md:p-10 rounded-[2rem] border border-white/80 shadow-2xl relative z-10 text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-serif tracking-tight text-neutral-800 mb-2">Dashboard Dinonaktifkan</h1>
            <p className="text-xs font-serif tracking-[0.2em] text-red-500/80 uppercase">Fitur Tidak Tersedia</p>
          </div>

          <p className="text-sm text-neutral-500 leading-relaxed font-sans mb-8">
            Fitur dashboard pengelolaan tamu dan RSVP tidak tersedia untuk paket **Basic**. Silakan hubungi administrator atau lakukan upgrade paket untuk mengakses fitur ini.
          </p>

          <a
            href="https://serastory.com"
            className="inline-block text-xs font-semibold tracking-widest text-neutral-500 hover:text-neutral-900 uppercase transition-colors hover:underline"
          >
            Sera Story
          </a>
        </motion.div>
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
                className={`group relative text-[9px] font-bold tracking-[0.2em] uppercase pb-3 transition-all ${activeTab === 'rsvp' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                RSVP Responses
                {activeTab === 'rsvp' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />}
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
          <>
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
          </>
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
        ) : activeTab === 'links' ? (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-100">
              <div>
                <h3 className="text-xl font-serif text-neutral-800">Invitation Blast</h3>
                <p className="text-sm text-neutral-400 mt-1">Configure and blast personalized wedding invitations via WhatsApp</p>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-8">
                {/* WhatsApp Blaster Robot Status Panel */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-100">
                    <div>
                      <h4 className="text-base font-serif text-neutral-800">WhatsApp Blaster Robot</h4>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Scan QR code to link your WhatsApp account and send messages</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        botStatus?.status === 'connected' ? 'bg-emerald-500 animate-pulse' :
                        botStatus?.status === 'qr' ? 'bg-amber-500 animate-pulse' :
                        botStatus?.status === 'loading' ? 'bg-blue-500 animate-pulse' :
                        'bg-rose-500'
                      }`}></div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">
                        {botStatus?.status === 'connected' ? 'Connected (Aktif)' :
                         botStatus?.status === 'qr' ? 'Waiting Scan (Scan QR)' :
                         botStatus?.status === 'loading' ? 'Initializing (Memuat...)' :
                         'Disconnected (Tidak Aktif)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    {botStatus?.status === 'loading' && (
                      <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
                        <div className="w-12 h-12 rounded-full border-4 border-dashed border-neutral-300 animate-spin"></div>
                        <p className="text-xs text-neutral-500">Starting WhatsApp browser session. Please wait...</p>
                      </div>
                    )}

                    {botStatus?.status === 'qr' && botStatus.qr && (
                      <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
                        <div className="p-4 bg-white border border-neutral-200 rounded-2xl shadow-sm">
                          <QRCode value={botStatus.qr} size={200} />
                        </div>
                        <div className="max-w-xs">
                          <p className="text-xs text-neutral-600 font-bold">Scan this QR Code using WhatsApp Link Devices:</p>
                          <p className="text-[10px] text-neutral-400 mt-1">Open WhatsApp &rarr; Menu/Settings &rarr; Linked Devices &rarr; Link a Device</p>
                        </div>
                      </div>
                    )}

                    {botStatus?.status === 'connected' && (
                      <div className="flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-2xl font-bold">
                          ✓
                        </div>
                        <h5 className="text-sm font-bold text-neutral-800">Robot is Connected & Running</h5>
                        <p className="text-xs text-neutral-500 max-w-xs">Ready to blast wedding invitations automatically. Keep the background bot process running.</p>
                      </div>
                    )}

                    {(!botStatus?.status || botStatus?.status === 'disconnected') && (
                      <div className="flex flex-col items-center gap-3 text-neutral-400 py-4 animate-in fade-in duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-neutral-300"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" /></svg>
                        <p className="text-xs text-neutral-500">Robot is currently offline or logged out.</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                    {(botStatus?.status === 'connected' || botStatus?.status === 'qr' || botStatus?.status === 'loading') && (
                      <button
                        onClick={() => handleToggleBot('logout')}
                        disabled={isChangingBot}
                        className="px-6 py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-[10px] font-bold tracking-widest uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        Disconnect / Log Out Robot
                      </button>
                    )}
                    {(!botStatus?.status || botStatus?.status === 'disconnected') && (
                      <button
                        onClick={() => handleToggleBot('login')}
                        disabled={isChangingBot}
                        className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-bold tracking-widest uppercase rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        Connect / Start Robot
                      </button>
                    )}
                  </div>
                </div>

                {/* Template Editor */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100 space-y-4">
                  <div>
                    <h4 className="text-base font-serif text-neutral-800">Message Template</h4>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Customize the wedding invitation text</p>
                  </div>
                  <div className="space-y-2">
                    <textarea
                      value={messageTemplate}
                      onChange={(e) => setMessageTemplate(e.target.value)}
                      rows={14}
                      className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl text-xs focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all text-neutral-800 font-mono resize-y leading-relaxed"
                      placeholder="Wedding invitation template..."
                    />
                    <p className="text-[9px] text-neutral-400 leading-normal">
                      💡 Use <code className="bg-neutral-100 px-1 py-0.5 rounded font-bold text-neutral-600">[wedding link]</code> for the unique URL. You can also use <code className="bg-neutral-100 px-1 py-0.5 rounded font-bold text-neutral-600">[guest name]</code> or <code className="bg-neutral-100 px-1 py-0.5 rounded font-bold text-neutral-600">[nama]</code>.
                    </p>
                  </div>
                </div>

                {/* WhatsApp Live Preview */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100 space-y-4">
                  <div>
                    <h4 className="text-base font-serif text-neutral-800">WhatsApp Live Preview</h4>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Real-time simulation of the invitation message</p>
                  </div>
                  
                  <div className="relative p-5 bg-[#e5ddd5] rounded-2xl border border-neutral-200/50 shadow-inner max-h-[350px] overflow-y-auto custom-scrollbar">
                    <div className="relative max-w-[90%] bg-white p-4 rounded-xl rounded-tl-none shadow-sm text-[11px] text-neutral-800 leading-relaxed whitespace-pre-wrap font-sans">
                      <div className="absolute top-0 left-0 -translate-x-full w-0 h-0 border-t-[8px] border-t-white border-l-[8px] border-l-transparent"></div>
                      {renderMessage(messageTemplate, blastGuests[0]?.name || "GUEST NAME")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Guest Blast List */}
              <div className="w-full">
                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100 flex flex-col h-full min-h-[500px]">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-neutral-100">
                    <div>
                      <h4 className="text-base font-serif text-neutral-800">Guest Registry & Blaster</h4>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Manage list of invitation targets</p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                      <input
                        type="datetime-local"
                        value={scheduleBlastDate}
                        onChange={(e) => setScheduleBlastDate(e.target.value)}
                        className="flex-1 sm:flex-none px-3 py-2 bg-white border border-neutral-200 text-neutral-800 text-[9px] font-bold tracking-wider uppercase rounded-xl outline-none focus:border-neutral-900 transition-all"
                        title="Schedule Blast (Optional)"
                      />
                      <button
                        onClick={() => setBlastGuests([...blastGuests, { name: '', phone: '', botSession: '1', status: 'idle' }])}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-3 px-4 py-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-800 text-[9px] font-bold tracking-wider uppercase rounded-xl transition-all cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        Add Row
                      </button>
                      <button
                        onClick={() => setShowImportModal(true)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-3 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[9px] font-bold tracking-wider uppercase rounded-xl transition-all cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                        Import
                      </button>
                      <button
                        onClick={copyAllLinks}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-3 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-[9px] font-bold tracking-wider uppercase rounded-xl transition-all cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
                        Copy Links
                      </button>
                      <button
                        onClick={sendAllBlasts}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-3 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[9px] font-bold tracking-wider uppercase rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                        Blast All ({blastGuests.filter(g => g.name.trim() !== "" && g.phone.trim() !== "").length})
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-x-auto min-h-[350px]">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-neutral-50/50 text-neutral-500 border-b border-neutral-100">
                          <th className="p-4 text-[9px] font-bold tracking-wider uppercase w-10 text-center">#</th>
                          <th className="p-4 text-[9px] font-bold tracking-wider uppercase">Guest Name</th>
                          <th className="p-4 text-[9px] font-bold tracking-wider uppercase">WhatsApp Phone</th>
                          <th className="p-4 text-[9px] font-bold tracking-wider uppercase text-center">Bot Session</th>
                          <th className="p-4 text-[9px] font-bold tracking-wider uppercase">Status</th>
                          <th className="p-4 text-[9px] font-bold tracking-wider uppercase text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50">
                        {blastGuests.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-[10px] tracking-wider uppercase font-bold text-neutral-300">
                              No guests in lists. Add row or import spreadsheet values.
                            </td>
                          </tr>
                        ) : (
                          blastGuests.map((guest, idx) => {
                            const link = getGuestLink(guest.name);
                            const cleanPhone = guest.phone.replace(/[^0-9]/g, '');
                            const isPhoneValid = cleanPhone.length >= 10 && cleanPhone.length <= 15 && (cleanPhone.startsWith('62') || cleanPhone.startsWith('08') || cleanPhone.startsWith('0'));
                            return (
                              <tr key={idx} className="group hover:bg-neutral-50/50 transition-all duration-300">
                                <td className="p-4 text-[10px] font-mono text-neutral-400 text-center font-bold">
                                  {idx + 1}
                                </td>
                                <td className="p-4">
                                  <input
                                    type="text"
                                    value={guest.name}
                                    onChange={(e) => {
                                      const updated = [...blastGuests];
                                      updated[idx].name = e.target.value;
                                      setBlastGuests(updated);
                                    }}
                                    placeholder="e.g. MICHAEL SEAN"
                                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-neutral-900 py-1 text-[13px] font-serif font-bold text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-300"
                                  />
                                </td>
                                <td className="p-4">
                                  <input
                                    type="text"
                                    value={guest.phone}
                                    onChange={(e) => {
                                      const updated = [...blastGuests];
                                      updated[idx].phone = e.target.value;
                                      setBlastGuests(updated);
                                    }}
                                    placeholder="e.g. 628123456789"
                                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-neutral-900 py-1 text-xs font-mono text-neutral-500 focus:outline-none transition-all placeholder:text-neutral-300"
                                  />
                                </td>

                                <td className="p-4 text-center">
                                  <select
                                    value={guest.botSession || "1"}
                                    onChange={(e) => {
                                      const updated = [...blastGuests];
                                      updated[idx].botSession = e.target.value;
                                      setBlastGuests(updated);
                                    }}
                                    className="bg-emerald-50/50 border border-emerald-100 text-emerald-800 text-[8px] font-bold tracking-widest uppercase rounded-lg px-2 py-1.5 outline-none focus:border-emerald-500 transition-all shadow-sm cursor-pointer appearance-none text-center bg-no-repeat"
                                  >
                                    {[1, 2, 3, 4].map(num => (
                                      <option key={num} value={num.toString()}>
                                        {botStatuses[`Session${num}`]?.name || `WA ${num}`}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-4">
                                  {guest.status === 'queued' || (guest.phone.trim() && queuedPhones.has(guest.phone.trim())) ? (
                                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[8px] font-bold uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100 rounded-full" title="Already in queue">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                      Queued
                                    </span>
                                  ) : guest.status === 'error' ? (
                                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[8px] font-bold uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100 rounded-full">
                                      Error
                                    </span>
                                  ) : !isPhoneValid && guest.phone.trim() ? (
                                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[8px] font-bold uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100 rounded-full">
                                      Not Available
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[8px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full">
                                      Available
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => copyToClipboard(link, "Personalized guest invitation link copied!")}
                                      disabled={!guest.name.trim()}
                                      className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all disabled:opacity-20 cursor-pointer"
                                      title="Copy Invitation Link"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
                                    </button>
                                    <button
                                      onClick={() => copyToClipboard(renderMessage(messageTemplate, guest.name), "Fully-rendered invitation message copied!")}
                                      disabled={!guest.name.trim()}
                                      className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all disabled:opacity-20 cursor-pointer"
                                      title="Copy Message Text"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>
                                    </button>
                                    <button
                                      onClick={() => sendWhatsAppBlast(guest.name, guest.phone, idx)}
                                      disabled={!guest.name.trim() || !isPhoneValid || guest.status === 'queued' || queuedPhones.has(guest.phone.trim())}
                                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all active:scale-90 disabled:opacity-20 disabled:grayscale cursor-pointer"
                                      title="Send WhatsApp Invitation"
                                    >
                                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217s.231.001.332.005c.109.004.253-.041.397.303.145.346.491 1.2.534 1.287.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.101-.177.211-.077.383.101.173.447.737.958 1.192.658.587 1.212.769 1.385.855.173.087.275.072.376-.043.101-.116.433-.506.548-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z" /><path d="M12.036 3.913C7.622 3.912 4.032 7.502 4.032 11.917c0 1.578.463 3.047 1.242 4.286L3.5 22.142l6.125-1.607c1.163.639 2.486.981 3.893.982 4.411 0 8.002-3.59 8.002-8.005.001-4.413-3.591-8.001-7.984-7.999zm.019 14.156c-1.307 0-2.539-.376-3.585-1.03l-.257-.16-2.67.7 1.041-3.805-.181-.287c-.562-.894-.859-1.923-.858-2.98.001-3.13 2.547-5.676 5.679-5.676 3.131 0 5.677 2.546 5.677 5.676-.001 3.13-2.548 5.677-5.671 5.682z" /></svg>
                                    </button>
                                    {blastGuests.length > 1 && (
                                      <button
                                        onClick={() => {
                                          const updated = blastGuests.filter((_, i) => i !== idx);
                                          setBlastGuests(updated);
                                        }}
                                        className="p-2 text-neutral-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                        title="Remove Row"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                      </button>
                                    )}
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

                {/* Riwayat Pengiriman (Blast Logs) Panel */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-neutral-100">
                    <div>
                      <h4 className="text-base font-serif text-neutral-800">Riwayat Pengiriman (Blast Logs)</h4>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Log real-time pengiriman undangan pernikahan</p>
                    </div>
                    <button
                      onClick={fetchBlastLogs}
                      className="px-4 py-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-800 text-[9px] font-bold tracking-wider uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      🔄 Refresh Log
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-neutral-50/50 text-neutral-500 border-b border-neutral-100">
                          <th className="p-4 text-[9px] font-bold tracking-wider uppercase">Waktu</th>
                          <th className="p-4 text-[9px] font-bold tracking-wider uppercase">Penerima</th>
                          <th className="p-4 text-[9px] font-bold tracking-wider uppercase">Pesan Preview</th>
                          <th className="p-4 text-[9px] font-bold tracking-wider uppercase">Status</th>
                          <th className="p-4 text-[9px] font-bold tracking-wider uppercase">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50">
                        {blastLogs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-[10px] tracking-wider uppercase font-bold text-neutral-300">
                              Belum ada riwayat pengiriman.
                            </td>
                          </tr>
                        ) : (
                          blastLogs.map((log) => {
                            const dateStr = log.created_at ? new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "-";
                            const guestName = log.guests?.name || log.phone;
                            
                            return (
                              <tr key={log.id} className="text-xs">
                                <td className="p-4 text-[10px] text-neutral-400 font-mono font-medium">{dateStr}</td>
                                <td className="p-4 font-bold text-neutral-800">{guestName}</td>
                                <td className="p-4 text-neutral-500 truncate max-w-xs" title={log.message}>
                                  {log.message}
                                </td>
                                <td className="p-4">
                                  {log.status === 'sent' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full">
                                      Terkirim
                                    </span>
                                  )}
                                  {log.status === 'queued' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100 rounded-full animate-pulse">
                                      Antrian
                                    </span>
                                  )}
                                  {log.status === 'failed' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100 rounded-full">
                                      Gagal
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 text-[10px] text-neutral-400 font-medium max-w-xs truncate" title={log.failed_reason || ""}>
                                  {log.status === 'sent' ? `Terkirim pada ${log.sent_at ? new Date(log.sent_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}` : log.failed_reason || "-"}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Batch Import Modal */}
            {showImportModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-neutral-900/40 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-neutral-100 flex flex-col">
                  <div className="p-6 md:p-8 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                    <div>
                      <h2 className="text-xl font-serif text-neutral-800">Batch Import Guests</h2>
                      <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase mt-1">Paste names and phone numbers</p>
                    </div>
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 shadow-sm border border-neutral-100 transition-all cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="p-6 md:p-8 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest text-neutral-800 uppercase">Google Sheets Link</label>
                      <input
                        type="text"
                        value={importSheetUrl}
                        onChange={(e) => setImportSheetUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                        className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-all text-neutral-800"
                      />
                      <p className="text-[9px] text-neutral-400">Pastikan file diatur ke "Anyone with the link can view". Pastikan data ada di Kolom B (Name), C (Phone).</p>
                    </div>
                    
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-100"></div></div>
                      <div className="relative flex justify-center"><span className="bg-white px-3 text-[9px] text-neutral-400 font-bold uppercase tracking-widest">Or Paste Manually</span></div>
                    </div>

                    <textarea
                      rows={5}
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder={"Michael Sean, 08123456789\nAlbert Johnson, 62898765432"}
                      className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-all text-neutral-800 font-mono resize-none"
                    />
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setShowImportModal(false)}
                        className="flex-1 py-3.5 bg-white hover:bg-neutral-50 text-neutral-800 text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl border border-neutral-200 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBatchImport}
                        className="flex-1 py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        Import
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'settings' ? (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-100">
              <div>
                <h3 className="text-xl font-serif text-neutral-800">Dashboard Settings</h3>
                <p className="text-sm text-neutral-400 mt-1">Manage your dashboard security and configurations</p>
              </div>
            </div>

            {/* Card Menu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setSettingsTab('password')}
                className={`flex flex-col items-start p-6 rounded-[2rem] border transition-all text-left cursor-pointer ${settingsTab === 'password' ? 'bg-neutral-900 border-neutral-900 text-white shadow-xl shadow-black/10' : 'bg-white border-neutral-100 text-neutral-800 hover:border-neutral-300 hover:shadow-md'}`}
              >
                <div className={`p-3 rounded-xl mb-4 ${settingsTab === 'password' ? 'bg-white/10 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                </div>
                <h4 className="text-lg font-serif font-bold mb-1">Security & Password</h4>
                <p className={`text-xs ${settingsTab === 'password' ? 'text-neutral-400' : 'text-neutral-500'}`}>Manage your dashboard access credentials</p>
              </button>
              
              <button
                onClick={() => setSettingsTab('story')}
                className={`flex flex-col items-start p-6 rounded-[2rem] border transition-all text-left cursor-pointer ${settingsTab === 'story' ? 'bg-neutral-900 border-neutral-900 text-white shadow-xl shadow-black/10' : 'bg-white border-neutral-100 text-neutral-800 hover:border-neutral-300 hover:shadow-md'}`}
              >
                <div className={`p-3 rounded-xl mb-4 ${settingsTab === 'story' ? 'bg-white/10 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
                </div>
                <h4 className="text-lg font-serif font-bold mb-1">Our Story Timeline</h4>
                <p className={`text-xs ${settingsTab === 'story' ? 'text-neutral-400' : 'text-neutral-500'}`}>Add and edit your journey milestones</p>
              </button>
            </div>

            {settingsTab === 'password' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100 flex flex-col gap-6">
                  <div className="border-b border-neutral-100 pb-4">
                    <h4 className="text-base font-serif text-neutral-800">Change Password</h4>
                    <p className="text-xs text-neutral-400 mt-1">Update the password required to access this management suite.</p>
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
            ) : (
              <div className="flex flex-col gap-8">
                {/* Form to add story */}
                <div className="w-full bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100 h-fit">
                  <h4 className="text-base font-serif text-neutral-800 mb-6">Add New Event</h4>
                  <form onSubmit={handleAddStory} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase mb-2 ml-1">Year</label>
                      <input type="text" value={newStoryYear} onChange={(e) => setNewStoryYear(e.target.value)} required placeholder="e.g. 2019" className="w-full bg-neutral-50 border border-neutral-200 px-5 py-3 rounded-xl text-sm focus:outline-none focus:border-neutral-900 transition-all text-neutral-900" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase mb-2 ml-1">Title</label>
                      <input type="text" value={newStoryTitle} onChange={(e) => setNewStoryTitle(e.target.value)} required placeholder="e.g. First Met" className="w-full bg-neutral-50 border border-neutral-200 px-5 py-3 rounded-xl text-sm focus:outline-none focus:border-neutral-900 transition-all text-neutral-900" />
                    </div>
                    <div className="md:col-span-2 lg:col-span-1">
                      <label className="block text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase mb-2 ml-1">Order (Number)</label>
                      <input type="number" value={newStoryOrder} onChange={(e) => setNewStoryOrder(e.target.value)} required placeholder="e.g. 1" className="w-full bg-neutral-50 border border-neutral-200 px-5 py-3 rounded-xl text-sm focus:outline-none focus:border-neutral-900 transition-all text-neutral-900" />
                    </div>
                    <div className="md:col-span-2 lg:col-span-4">
                      <label className="block text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase mb-2 ml-1">Description</label>
                      <textarea value={newStoryDesc} onChange={(e) => setNewStoryDesc(e.target.value)} required rows={3} placeholder="Description..." className="w-full bg-neutral-50 border border-neutral-200 px-5 py-3 rounded-xl text-sm focus:outline-none focus:border-neutral-900 transition-all text-neutral-900 resize-none"></textarea>
                    </div>
                    <div className="md:col-span-2 lg:col-span-4 flex justify-end">
                      <button type="submit" className="w-full md:w-auto px-8 py-4 bg-neutral-900 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-neutral-800 transition-all shadow-lg active:scale-95 mt-2 cursor-pointer">
                        Save Event
                      </button>
                    </div>
                  </form>
                </div>

                {/* List of stories */}
                <div className="w-full bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100 flex flex-col min-h-[500px]">
                  <h4 className="text-base font-serif text-neutral-800 mb-6">Timeline Events</h4>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {storyEvents.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-neutral-300 gap-4">
                        <p className="text-sm font-medium">No story events found.</p>
                      </div>
                    ) : (
                      storyEvents.map((event) => (
                        <div key={event.id} className="p-5 bg-neutral-50 rounded-2xl border border-neutral-100 flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">Order: {event.order}</span>
                              <span className="text-[#d4af37] font-script text-xl">{event.year}</span>
                            </div>
                            <h5 className="font-serif text-neutral-800 uppercase text-sm font-bold">{event.title}</h5>
                            <p className="text-neutral-500 text-sm mt-1 leading-relaxed">{event.desc}</p>
                          </div>
                          <button onClick={() => handleDeleteStory(event.id)} className="shrink-0 p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-100 transition-all self-start cursor-pointer" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
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
