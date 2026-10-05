"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import FadeIn from "./FadeIn";

const bgRsvp = "https://www.serastory.com/storage/undangan/templates/onyx-1/07.webp";
const bgWishes = "https://www.serastory.com/storage/undangan/templates/onyx-1/08.webp";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { DbGuest, DbWish, DbProject, isDefaultStorageUrl } from "../../lib/resolveProject";

interface Props {
  guestName: string;
  guest?: DbGuest | null;
  projectId?: string | null;
  wishes?: DbWish[] | null;
  hasRsvp?: boolean;
  hasGuestbook?: boolean;
  project?: DbProject | null;
  galleryImages?: (string | any)[];
}

interface WishItem {
  text: string;
  createdAt: Date | string | null;
}

interface DisplayWish {
  id: string;
  name: string;
  text: string;
  createdAt: Date | null;
}

function WishCard({ wish }: { wish: DisplayWish }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollHeight > textRef.current.clientHeight);
    }
  }, [wish.text]);

  const formattedDate = wish.createdAt instanceof Date && !isNaN(wish.createdAt.getTime())
    ? wish.createdAt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : "Recently Shared";

  return (
    <div className="group relative flex flex-col gap-5 p-6 md:p-8 bg-white/[0.015] hover:bg-white/[0.03] border border-white/5 hover:border-[#d4af37]/20 rounded-[2rem] transition-all duration-700 shadow-2xl overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[#d4af37]/5 transition-all duration-700"></div>
      
      <p 
        ref={textRef}
        className={`text-[14px] md:text-base font-sans font-light text-gray-300 leading-relaxed relative z-10 group-hover:text-white transition-colors text-center ${!isExpanded ? 'line-clamp-8' : ''}`}
      >
        &ldquo;{wish.text}&rdquo;
      </p>
      
      {isTruncated && !isExpanded && (
        <button 
          onClick={() => setIsExpanded(true)}
          className="text-[#d4af37] text-[10px] font-bold tracking-widest uppercase hover:text-white transition-colors relative z-10 mt-2 mx-auto"
        >
          See more
        </button>
      )}

      {isExpanded && (
        <button 
          onClick={() => setIsExpanded(false)}
          className="text-gray-500 hover:text-[#d4af37] text-[10px] font-bold tracking-widest uppercase transition-colors relative z-10 mt-2 mx-auto"
        >
          Show less
        </button>
      )}
      
      <div className="flex flex-col items-center gap-6 pt-8 border-t border-white/5 relative z-10 mt-auto">
        <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-[10px] font-bold text-[#d4af37] group-hover:border-[#d4af37]/40 transition-all duration-500">{(wish.name || "G").charAt(0)}</div>
        <div className="flex flex-col items-center gap-2">
          <h4 className="text-[10px] font-bold text-white tracking-[0.3em] uppercase leading-none group-hover:text-[#d4af37] transition-colors">{wish.name}</h4>
          <span className="text-[8px] text-gray-600 uppercase tracking-[0.2em]">{formattedDate}</span>
        </div>
      </div>
    </div>
  );
}

export default function BlessingWall({ 
  guestName, 
  guest, 
  projectId, 
  wishes, 
  hasRsvp = true, 
  hasGuestbook = true,
  project,
  galleryImages
}: Props) {
  // Determine if project has any user uploaded photo
  const userCover = !isDefaultStorageUrl(project?.cover_photo_url) ? project?.cover_photo_url : null;
  const userOpening = !isDefaultStorageUrl(project?.opening_photo_url) ? project?.opening_photo_url : null;
  const userBride = !isDefaultStorageUrl(project?.bride_photo_url) ? project?.bride_photo_url : null;
  const userGroom = !isDefaultStorageUrl(project?.groom_photo_url) ? project?.groom_photo_url : null;
  const userGalleryFirst = galleryImages && galleryImages.length > 0 && !isDefaultStorageUrl(galleryImages[0]) ? galleryImages[0] : null;

  const userPhoto = userCover || userOpening || userBride || userGroom || userGalleryFirst;

  const rsvpBgImage = (galleryImages && galleryImages.length > 0 && !isDefaultStorageUrl(galleryImages[3 % galleryImages.length]) ? galleryImages[3 % galleryImages.length] : null)
    || userPhoto
    || bgRsvp;

  const wishesBgImage = (galleryImages && galleryImages.length > 0 && !isDefaultStorageUrl(galleryImages[4 % galleryImages.length]) ? galleryImages[4 % galleryImages.length] : null)
    || userPhoto
    || bgWishes;

  // States
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isAttending, setIsAttending] = useState<string>("yes");
  const [guestsCount, setGuestsCount] = useState(1);
  const [wishText, setWishText] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRsvpSubmitted, setHasRsvpSubmitted] = useState(false);
  const [myWishes, setMyWishes] = useState<WishItem[]>([]);
  const [allDisplayWishes, setAllDisplayWishes] = useState<DisplayWish[]>([]);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState<'rsvp' | 'wish'>('rsvp');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const wishesPerPage = 5;
  const galleryRef = useRef<HTMLDivElement>(null);

  // Helper to fetch wishes
  const fetchWishes = useCallback(async () => {
    if (!projectId) return;
    try {
      const { data, error } = await supabase
        .from('guestbook_entries')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (data && !error) {
        const formatted = (data as DbWish[]).map((w: DbWish) => ({
          id: w.id,
          name: w.name,
          text: w.message,
          createdAt: w.created_at ? new Date(w.created_at) : null
        }));
        setAllDisplayWishes(formatted);
      }
    } catch (err) {
      console.error("Error fetching guestbook entries:", err);
    }
  }, [projectId]);

  // Check Status and Bind initial wishes
  useEffect(() => {
    const checkStatus = async () => {
      setIsCheckingStatus(true);
      
      // 1. Bind wishes
      if (wishes) {
        const formatted = wishes.map((w: DbWish) => ({
          id: w.id,
          name: w.name,
          text: w.message,
          createdAt: w.created_at ? new Date(w.created_at) : null
        }));
        setAllDisplayWishes(formatted);
      } else {
        await fetchWishes();
      }
      
      // 2. Retrieve phone and email from guest record if resolved
      if (guest) {
        if (guest.phone) setPhone(guest.phone);
        if (guest.email) setEmail(guest.email);
      }

      // 3. Check if RSVP already exists and load existing wishes for this guest
      if (projectId) {
        try {
          // Check existing RSVP
          let hasRsvp = false;
          
          if (guest?.id) {
            // First check by guest_id
            const { data: byIdData, error: byIdError } = await supabase
              .from('rsvp')
              .select('*')
              .eq('project_id', projectId)
              .eq('guest_id', guest.id)
              .limit(1);

            if (byIdData && byIdData.length > 0 && !byIdError) {
              hasRsvp = true;
              const rsvpRecord = byIdData[0];
              if (rsvpRecord.guest_phone) setPhone(rsvpRecord.guest_phone);
              if (rsvpRecord.attendance) setIsAttending(rsvpRecord.attendance === 'hadir' ? 'yes' : 'no');
              if (rsvpRecord.pax) setGuestsCount(rsvpRecord.pax);
            }
          }

          // If not found by ID (or no guest ID), check by guest_name (case-insensitive)
          if (!hasRsvp && guestName && guestName !== "Guest Name" && guestName !== "Special Guest") {
            const { data: byNameData, error: byNameError } = await supabase
              .from('rsvp')
              .select('*')
              .eq('project_id', projectId)
              .ilike('guest_name', guestName)
              .limit(1);

            if (byNameData && byNameData.length > 0 && !byNameError) {
              hasRsvp = true;
              const rsvpRecord = byNameData[0];
              if (rsvpRecord.guest_phone) setPhone(rsvpRecord.guest_phone);
              if (rsvpRecord.attendance) setIsAttending(rsvpRecord.attendance === 'hadir' ? 'yes' : 'no');
              if (rsvpRecord.pax) setGuestsCount(rsvpRecord.pax);
            }
          }

          if (hasRsvp) {
            setHasRsvpSubmitted(true);
          }

          // Check existing wishes
          let wishesData: any[] = [];
          if (guest?.id) {
            // Check by guest_id
            const { data: byIdWishes } = await supabase
              .from('guestbook_entries')
              .select('message, created_at')
              .eq('project_id', projectId)
              .eq('guest_id', guest.id);
            if (byIdWishes && byIdWishes.length > 0) {
              wishesData = byIdWishes;
            }
          }

          // If not found by ID, fallback to name (case-insensitive)
          if (wishesData.length === 0 && guestName && guestName !== "Guest Name" && guestName !== "Special Guest") {
            const { data: byNameWishes } = await supabase
              .from('guestbook_entries')
              .select('message, created_at')
              .eq('project_id', projectId)
              .ilike('name', guestName);
            if (byNameWishes) {
              wishesData = byNameWishes;
            }
          }

          if (wishesData.length > 0) {
            const loadedWishes = wishesData.map(item => ({
              text: item.message,
              createdAt: item.created_at ? new Date(item.created_at) : null
            }));
            setMyWishes(loadedWishes);
          }
        } catch (err) {
          console.error("Error loading status check:", err);
        }
      }

      setIsCheckingStatus(false);
    };

    checkStatus();
  }, [guestName, guest, projectId, wishes, fetchWishes]);

  // Pagination Logic
  const totalPages = Math.ceil(allDisplayWishes.length / wishesPerPage);
  const indexOfLastWish = currentPage * wishesPerPage;
  const indexOfFirstWish = indexOfLastWish - wishesPerPage;
  const currentWishes = allDisplayWishes.slice(indexOfFirstWish, indexOfLastWish);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (galleryRef.current) {
      galleryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || hasRsvpSubmitted) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          guest_id: guest?.id || null,
          guest_name: guestName,
          guest_phone: phone,
          attendance: isAttending === 'yes' ? 'hadir' : 'tidak_hadir',
          pax: isAttending === 'yes' ? guestsCount : 0,
          message: ''
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit RSVP');
      }

      // Optional trigger for email sending
      if (email) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              name: guestName,
              attendance: isAttending === 'yes' ? 'Hadir' : 'Tidak Hadir',
              pax: guestsCount,
              brideName: project?.bride_nickname || 'Ananda',
              groomName: project?.groom_nickname || 'Angga',
              weddingDate: project?.wedding_date || '2026-06-13',
              venueName: project?.venue_name || 'Hotel Grand Tjokro Bandung'
            })
          });
        } catch (emailErr) {
          console.error('Failed to send RSVP email:', emailErr);
        }
      }

      setHasRsvpSubmitted(true);
      setSuccessType('rsvp');
      setShowSuccess(true);
    } catch (err) {
      console.error('Error submitting RSVP:', err);
      alert('Gagal mengirim RSVP. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !wishText || myWishes.length >= 3) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          guest_id: guest?.id || null,
          name: guestName,
          message: wishText
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit wish');
      }

      const newWish: WishItem = {
        text: wishText,
        createdAt: new Date()
      };
      setMyWishes([...myWishes, newWish]);
      setWishText("");
      setSuccessType('wish');
      setShowSuccess(true);
      
      // Re-fetch wishes live from Supabase
      await fetchWishes();
    } catch (err) {
      console.error('Error submitting wish:', err);
      alert('Gagal mengirim ucapan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* SECTION 1: ATTENDANCE (SIMPLE & ELEGANT REDESIGN) */}
      {hasRsvp && (
        <section id="rsvp" className="relative w-full min-h-screen snap-start shrink-0 flex flex-col items-center justify-center bg-black py-24 md:py-32 overflow-hidden">
        {/* Beautiful Soft Background */}
        <div className="absolute inset-0 z-0">
          <Image 
            src={rsvpBgImage} 
            alt="RSVP BG" 
            fill 
            unoptimized={typeof rsvpBgImage === 'string'}
            className="object-cover opacity-20 grayscale" 
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/80 to-black"></div>
        </div>

        <div className="relative z-10 w-full max-w-3xl px-6 md:px-10">
          <FadeIn>
            <div className="text-center mb-10 md:mb-16">
              <span className="text-[7px] md:text-[10px] font-bold tracking-[0.8em] text-[#d4af37] uppercase mb-4 md:mb-6 block opacity-90">R.S.V.P</span>
              <h3 className="text-3xl sm:text-5xl md:text-7xl font-serif text-white font-light tracking-tight leading-none drop-shadow-md">Attendance</h3>
              <div className="flex items-center justify-center gap-2 md:gap-4 mt-6 md:mt-8">
                <div className="h-[1px] w-8 md:w-12 bg-gradient-to-r from-transparent to-white/30"></div>
                <p className="text-[6px] md:text-[9px] text-gray-400 tracking-[0.2em] md:tracking-[0.4em] uppercase text-center max-w-[200px] md:max-w-none">Your presence is our greatest honor</p>
                <div className="h-[1px] w-8 md:w-12 bg-gradient-to-l from-transparent to-white/30"></div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            {/* Elegant Soft Container */}
            <div className="relative">
              <div className="absolute inset-0 bg-[#d4af37]/[0.02] rounded-[2rem] md:rounded-[3rem] blur-2xl"></div>
              <div className="relative bg-white/[0.015] backdrop-blur-3xl border border-white/[0.05] rounded-[2rem] md:rounded-[3rem] p-5 sm:p-8 md:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
                {isCheckingStatus ? (
                  <div className="py-20 flex flex-col items-center gap-6">
                    <div className="w-8 h-8 border-t-2 border-[#d4af37] rounded-full animate-spin"></div>
                    <span className="text-[9px] font-bold text-gray-500 tracking-[0.4em] uppercase">Verifying Invitation</span>
                  </div>
                ) : hasRsvpSubmitted ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-10 py-8">
                    <div className="relative inline-block">
                      <div className="w-20 h-20 bg-[#d4af37]/5 rounded-full border border-[#d4af37]/20 flex items-center justify-center relative z-10">
                        <span className="text-3xl text-[#d4af37]">✓</span>
                      </div>
                      <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0, 0.1] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 bg-[#d4af37] rounded-full" />
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-2xl font-serif text-white tracking-wide">Presence Recorded</h4>
                      <p className="text-[10px] text-gray-400 tracking-[0.2em] uppercase leading-relaxed max-w-[280px] mx-auto">
                        Thank you! Your attendance confirmation has been received.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleRsvpSubmit} className="flex flex-col gap-6 md:gap-10">
                    <div className="flex flex-col gap-5 md:gap-6">
                      <div className="relative group">
                        <label className="block text-[9px] md:text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 pl-4 whitespace-nowrap">Guest Identity</label>
                        <div className="bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3 md:px-5 md:py-4 flex items-center">
                          <input type="text" value={guestName} readOnly className="w-full bg-transparent text-xs md:text-sm text-white/40 focus:outline-none cursor-not-allowed font-sans tracking-wide truncate" />
                        </div>
                      </div>
                      <div className="relative group">
                        <label className="block text-[9px] md:text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 pl-4 transition-colors group-focus-within:text-[#d4af37] whitespace-nowrap">Email Address</label>
                        <div className="bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3 md:px-5 md:py-4 transition-all duration-500 group-focus-within:border-[#d4af37]/40 group-focus-within:bg-white/[0.04]">
                          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent text-xs md:text-sm text-white focus:outline-none font-sans truncate" placeholder="To receive your digital invitation" required />
                        </div>
                      </div>
                      <div className="relative group">
                        <label className="block text-[9px] md:text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 pl-4 transition-colors group-focus-within:text-[#d4af37] whitespace-nowrap">WhatsApp Number</label>
                        <div className="bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3 md:px-5 md:py-4 transition-all duration-500 group-focus-within:border-[#d4af37]/40 group-focus-within:bg-white/[0.04]">
                          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-transparent text-xs md:text-sm text-white focus:outline-none font-sans truncate" placeholder="Example: 08123456789" required />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-5 md:gap-6">
                      <div className="relative group">
                        <label className="block text-[9px] md:text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 pl-4 transition-colors group-focus-within:text-[#d4af37] whitespace-nowrap">Confirmation</label>
                        <div className="relative bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3 md:px-5 md:py-4 transition-all duration-500 group-focus-within:border-[#d4af37]/40 group-focus-within:bg-white/[0.04]">
                          <select value={isAttending} onChange={(e) => setIsAttending(e.target.value)} className="w-full bg-transparent text-xs md:text-sm text-white focus:outline-none appearance-none cursor-pointer font-sans tracking-wide truncate">
                             <option value="yes" className="bg-neutral-900">Will Joyfully Attend</option>
                             <option value="no" className="bg-neutral-900">Will Regretfully Decline</option>
                          </select>
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#d4af37]/60">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                          </div>
                        </div>
                      </div>
                      
                      {isAttending === "yes" && (
                        <div className="relative group">
                          <label className="block text-[9px] md:text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 pl-4 whitespace-nowrap">Total Persons</label>
                          <div className="bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-2 md:py-2.5 flex items-center justify-center gap-6 md:gap-10">
                            <button type="button" onClick={() => setGuestsCount(Math.max(1, guestsCount - 1))} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-white/30 hover:text-[#d4af37] hover:bg-white/5 rounded-full transition-all text-base md:text-xl">-</button>
                            <span className="text-[10px] md:text-xs font-bold text-white tracking-[0.2em] md:tracking-[0.3em] uppercase whitespace-nowrap min-w-[80px] text-center">{guestsCount} {guestsCount > 1 ? 'Guests' : 'Guest'}</span>
                            <button type="button" onClick={() => setGuestsCount(guestsCount + 1)} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-white/30 hover:text-[#d4af37] hover:bg-white/5 rounded-full transition-all text-base md:text-xl">+</button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 md:pt-4">
                      <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full py-4 md:py-5 bg-transparent border border-white/20 text-white text-[9px] md:text-[11px] font-bold tracking-[0.3em] md:tracking-[0.4em] uppercase rounded-full hover:bg-white hover:text-black hover:border-white transition-all duration-500 relative overflow-hidden group shadow-lg whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="relative z-10 transition-colors duration-500 truncate">
                          {isSubmitting ? "SENDING..." : "CONFIRM PRESENCE"}
                        </span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
      )}

      {/* SECTION 2: BLESSING WALL */}
      {hasGuestbook && (
        <section id="blessings" className="relative w-full min-h-screen snap-start shrink-0 flex flex-col items-center bg-neutral-900 py-16 md:py-24">
        <div className="absolute inset-0 z-0">
          <Image 
            src={wishesBgImage} 
            alt="Wishes BG" 
            fill 
            unoptimized={typeof wishesBgImage === 'string'}
            className="object-cover opacity-20 grayscale" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>
        </div>
        <div className="relative z-10 w-full max-w-5xl px-6 md:px-10 flex flex-col items-center">
          <FadeIn>
            <div className="text-center mb-12 md:mb-16">
              <span className="text-[7px] md:text-[10px] font-bold tracking-[0.6em] text-[#d4af37] uppercase mb-4 block">Part II</span>
              <h2 className="text-3xl md:text-5xl font-serif text-white font-light tracking-tight leading-none">Blessings</h2>
              <p className="text-[7px] sm:text-[8px] md:text-[10px] text-gray-600 tracking-[0.2em] md:tracking-[0.3em] uppercase mt-4 md:mt-6 max-w-[250px] md:max-w-xs mx-auto leading-relaxed">Leave your warmest words for the beginning of our new chapter.</p>
            </div>
          </FadeIn>
          <div className="w-full max-w-2xl mb-20 md:mb-32">
            <FadeIn delay={0.2}>
              <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2rem] md:rounded-[2.5rem] p-5 sm:p-8 md:p-12 shadow-2xl w-full">
                {myWishes.length >= 3 ? (
                  <div className="text-center space-y-6 py-4">
                     <span className="text-5xl block mb-6 opacity-30">✨</span>
                     <h4 className="text-3xl font-serif text-white italic">Blessings Sent</h4>
                     <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase leading-relaxed max-w-xs mx-auto">You have shared 3 beautiful blessings. They are now part of our wall forever.</p>
                  </div>
                ) : (
                  <form onSubmit={handleWishSubmit} className="space-y-10">
                    <div className="relative">
                      <textarea value={wishText} onChange={(e) => setWishText(e.target.value)} className="w-full bg-transparent border-b border-white/10 py-3 md:py-4 text-xs md:text-sm text-white focus:outline-none focus:border-[#d4af37] transition-all duration-500 peer placeholder-transparent min-h-[80px] md:min-h-[100px] resize-none font-sans" placeholder="Wishes" required />
                      <label className="absolute left-0 -top-6 md:-top-7 text-[9px] md:text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em] md:tracking-[0.4em] peer-placeholder-shown:text-xs peer-placeholder-shown:top-4 peer-focus:-top-6 peer-focus:text-[#d4af37] whitespace-nowrap">Share your blessings ({myWishes.length}/3)</label>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full py-4 md:py-5 border border-white/10 text-white text-[9px] md:text-[11px] font-bold tracking-[0.3em] md:tracking-[0.5em] uppercase rounded-full hover:bg-white hover:text-black transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                      <span className="truncate">{isSubmitting && successType === 'wish' ? "SHARING..." : "SUBMIT BLESSING"}</span>
                    </button>
                  </form>
                )}
              </div>
            </FadeIn>
          </div>

          {/* GALLERY WITH PAGINATION */}
          <div ref={galleryRef} className="w-full flex flex-col items-center">
            <div className="flex flex-col items-center mb-16 text-center">
               <div className="h-[1px] w-16 bg-white/10 mb-8"></div>
               <h3 className="text-2xl md:text-4xl font-serif text-white font-light tracking-tight leading-none mb-4">Gallery of Love</h3>
               <span className="text-[7px] md:text-[9px] font-bold tracking-[0.3em] md:tracking-[0.5em] text-[#d4af37] uppercase">{allDisplayWishes.length} Shared Messages</span>
            </div>

            {/* Single Column List (Paginated) */}
            <div className="w-full max-w-lg flex flex-col gap-6 md:gap-8 min-h-[500px]">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentPage}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col gap-6 md:gap-8"
                >
                  {currentWishes.map((wish) => (
                    <WishCard key={wish.id} wish={wish} />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-16 md:mt-24 flex items-center justify-center gap-4 md:gap-8 w-full flex-wrap">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-3 md:p-4 border border-white/10 rounded-full text-[#d4af37] disabled:opacity-20 hover:bg-white/5 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                <div className="flex items-center gap-2 md:gap-4">
                   <span className="text-[9px] md:text-[10px] font-bold text-white tracking-[0.2em] md:tracking-[0.4em] uppercase">Page</span>
                   <div className="px-3 py-1.5 md:px-4 md:py-2 bg-white/5 border border-white/10 rounded-lg text-[#d4af37] text-[10px] md:text-xs font-bold">{currentPage}</div>
                   <span className="text-[9px] md:text-[10px] font-bold text-gray-600 tracking-[0.2em] md:tracking-[0.4em] uppercase">of {totalPages}</span>
                </div>
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-3 md:p-4 border border-white/10 rounded-full text-[#d4af37] disabled:opacity-20 hover:bg-white/5 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                </button>
              </div>
            )}

            {allDisplayWishes.length === 0 && <p className="text-gray-700 text-[10px] tracking-[0.5em] uppercase italic py-20">The gallery is waiting for your light.</p>}
          </div>
        </div>
      </section>
      )}

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] flex items-center justify-center bg-black/98 backdrop-blur-3xl p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} className="bg-neutral-950 border border-white/5 p-12 md:p-20 flex flex-col items-center gap-12 text-center max-w-sm rounded-[5rem] relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"></div>
              <div className="w-24 h-24 bg-[#d4af37]/5 rounded-full flex items-center justify-center text-5xl border border-[#d4af37]/10"><span className="relative z-10">{successType === 'rsvp' ? '🥂' : '✨'}</span></div>
              <div className="space-y-5">
                <h4 className="text-white font-serif text-4xl tracking-widest italic leading-none">{successType === 'rsvp' ? 'Confirmed' : 'Sent'}</h4>
                <p className="text-gray-500 text-[10px] font-sans tracking-[0.25em] leading-relaxed uppercase">{successType === 'rsvp' ? "Your presence is our joy." : "Your beautiful words are shared."}</p>
              </div>
              <button onClick={() => setShowSuccess(false)} className="w-full py-6 bg-white text-black text-[11px] font-bold tracking-[0.6em] uppercase rounded-full hover:bg-[#d4af37]">Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
