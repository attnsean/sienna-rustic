"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { DbGuest, DbProject, DbEvent, DbWish } from "../../lib/resolveProject";

interface Props {
  guestName: string;
  guest?: DbGuest | null;
  project?: DbProject | null;
  events?: DbEvent[] | null;
  wishes?: DbWish[] | null;
  stats?: {
    attending: number;
    wishes: number;
  };
}

export default function RightSidebar({ guestName, guest, project, events, wishes: initialWishes }: Props) {
  const [isOpened, setIsOpened] = useState(false);
  const [isCoverVisible, setIsCoverVisible] = useState(true);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [activeNav, setActiveNav] = useState("hero-section");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Couple Data: Mempelai Pria = Marvel, Mempelai Wanita = Nathalie
  const brideNickname = project?.bride_nickname || "Nathalie";
  const groomNickname = project?.groom_nickname || "Marvel";
  const brideFull = project?.bride_name || "Nathalie";
  const groomFull = project?.groom_name || "Marvel";
  const brideFather = (project as any)?.bride_father || "Bpk. Orang Tua";
  const brideMother = (project as any)?.bride_mother || "Ibu Orang Tua";
  const brideIg = (project as any)?.bride_instagram ? (project as any).bride_instagram.replace("@", "") : "";
  const groomFather = (project as any)?.groom_father || "Bpk. Orang Tua";
  const groomMother = (project as any)?.groom_mother || "Ibu Orang Tua";
  const groomIg = (project as any)?.groom_instagram ? (project as any).groom_instagram.replace("@", "") : "";

  // Exact couple photo matching reference
  const coverPhoto = project?.cover_photo_url || project?.opening_photo_url || "/assets/template/couple-cover.jpg";
  const bridePhoto = project?.bride_photo_url || "/assets/template/bride-portrait.jpg";
  const groomPhoto = project?.groom_photo_url || "/assets/template/groom-portrait.jpg";

  // Event Info
  const mainEvent = events && events.length > 0 ? events[0] : null;
  const weddingDateRaw = mainEvent?.event_date || project?.wedding_date || "2026-05-23";

  // Countdown timer calculations
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Gallery State
  const galleryImages = [
    "/assets/template/01-09.png",
    "/assets/template/01-10.png",
    "/assets/template/01-11.png",
    "/assets/template/01-12.png",
    "/assets/template/01-13.png",
    "/assets/template/01-14.png",
    "/assets/template/01-15.png",
  ];
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Bank Card Copy State
  const [copiedBankIndex, setCopiedBankIndex] = useState<number | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const copyAccountNumber = (accountNo: string, index: number) => {
    navigator.clipboard.writeText(accountNo.replace(/\s/g, ""));
    setCopiedBankIndex(index);
    setTimeout(() => setCopiedBankIndex(null), 2500);
  };
  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  // RSVP Form State
  const [rsvpName, setRsvpName] = useState("");
  const [rsvpMessage, setRsvpMessage] = useState("");
  const [rsvpStatus, setRsvpStatus] = useState<"hadir" | "tidak_hadir">("hadir");
  const [rsvpPax, setRsvpPax] = useState<number>(1);
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);
  const [rsvpSuccessMsg, setRsvpSuccessMsg] = useState(false);

  // Wishes List State
  const [wishesList, setWishesList] = useState<{
    name: string;
    message: string;
    initial: string;
    color: string;
    attendance?: "hadir" | "tidak_hadir";
    pax?: number;
    created_at?: string;
  }[]>([
    { name: "Erika", message: "Opiiii selamaaaattt😍 lancar sampai hari h yaaaa❤️", initial: "ER", color: "bg-[#5B8C5A]", attendance: "hadir", pax: 2, created_at: "2 jam yang lalu" },
    { name: "RAISA 8i N3RIZI", message: "selamat ya pak,semoga lancar sampai hari H'y,semoga jadi keluarga samawa,barokah dan langgeng bahagia dunia akhirat ya....aamiin", initial: "RN", color: "bg-[#8A4B32]", attendance: "hadir", pax: 1, created_at: "4 jam yang lalu" },
    { name: "Fajar ramadan", message: "Semoga lancar sampai akhir pak🫡", initial: "FR", color: "bg-[#B3784A]", attendance: "hadir", pax: 2, created_at: "Kemarin" },
    { name: "rafa", message: "Selamat menempuh hidup baru, semoga bahagia selalu!", initial: "RA", color: "bg-[#6E5D53]", attendance: "hadir", pax: 1, created_at: "Kemarin" },
  ]);

  const handleSubmitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim() || !rsvpMessage.trim()) return;

    setIsSubmittingRsvp(true);
    try {
      // 1. Post to RSVP Table
      await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project?.id || "default",
          guest_id: guest?.id || null,
          guest_name: rsvpName,
          attendance: rsvpStatus,
          pax: rsvpStatus === "hadir" ? rsvpPax : 0,
          message: rsvpMessage,
        }),
      });

      // 2. Post to Wishes Table
      await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project?.id || "default",
          guest_id: guest?.id || null,
          name: rsvpName,
          message: rsvpMessage,
        }),
      });

      // Calculate initial letters
      const initials = rsvpName
        .trim()
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

      const newEntry = {
        name: rsvpName,
        message: rsvpMessage,
        initial: initials || "UC",
        color: "bg-[#8A4B32]",
        attendance: rsvpStatus,
        pax: rsvpStatus === "hadir" ? rsvpPax : 0,
        created_at: "Baru saja",
      };

      setWishesList((prev) => [newEntry, ...prev]);
      setRsvpMessage("");
      setRsvpSuccessMsg(true);
      setTimeout(() => setRsvpSuccessMsg(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingRsvp(false);
    }
  };
  useEffect(() => {
    const target = new Date(weddingDateRaw).getTime();
    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [weddingDateRaw]);

  const formatDateDisplay = (dateStr?: string | null) => {
    try {
      if (!dateStr) return "Sabtu, 23 Mei 2026";
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Sabtu, 23 Mei 2026";
      const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch {
      return "Sabtu, 23 Mei 2026";
    }
  };

  const formattedDate = formatDateDisplay(weddingDateRaw);

  const handleOpenInvitation = () => {
    if (isOpened) return;
    setIsOpened(true);
    setIsPlayingMusic(true);
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }

    // Clean up cover overlay after slide-up finishes
    setTimeout(() => {
      setIsCoverVisible(false);
    }, 950);
  };

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlayingMusic) {
        audioRef.current.pause();
        setIsPlayingMusic(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlayingMusic(true);
      }
    }
  };

  const scrollToSection = (id: string) => {
    setActiveNav(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full md:w-[38%] lg:w-[35%] xl:w-[32%] min-h-[100dvh] md:h-[100dvh] ${
        isOpened ? "overflow-y-auto" : "overflow-hidden"
      } md:overflow-x-hidden relative bg-[#f5ede2] text-[#3C2A21] shadow-2xl shrink-0 scroll-smooth`}
    >
      {/* Background Audio Player */}
      <audio 
        ref={audioRef} 
        loop 
        src={project?.music_url || "/audio/bgm.mp3"} 
        preload="none" 
      />

      {/* ========================================================================= */}
      {/* SECTION 1 - COVER MOBILE (Layar terpisah, tidak bisa di-scroll sebelum buka) */}
      {/* Pas klik buka, screen naik ke atas (y: -100%) */}
      {/* ========================================================================= */}
      {isCoverVisible && (
        <motion.section
          key="cover-screen"
          initial={{ y: "0%" }}
          animate={{ y: isOpened ? "-100%" : "0%" }}
          transition={{ duration: 0.85, ease: [0.65, 0, 0.35, 1] }}
          className="absolute inset-0 z-50 min-h-[100dvh] w-full flex flex-col justify-end items-center text-center px-6 pb-8 pt-0 overflow-hidden select-none bg-[#f5ede2]"
        >
          {/* Base parchment background texture */}
          <div 
            className="absolute inset-0 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: `url(/assets/template/SR-bg.jpg)` }}
          />

          {/* User prewedding couple photo with exact alpha mask blend (faded lower down so bride's face is clear) */}
          <div 
            className="absolute top-0 inset-x-0 h-[70%] pointer-events-none z-0 overflow-hidden"
            style={{
              maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 56%, rgba(0,0,0,0.92) 66%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0) 94%)",
              WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 56%, rgba(0,0,0,0.92) 66%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0) 94%)"
            }}
          >
            <img 
              src={coverPhoto} 
              alt={`${brideNickname} & ${groomNickname}`} 
              className="w-full h-full object-cover object-top"
            />
          </div>

          {/* Animated Floral Corners at Bottom */}
          <div className="absolute bottom-0 left-0 pointer-events-none z-10">
            <div className="animate-sr-pulse-alt origin-bottom-left">
              <img 
                src="/assets/template/SR-01.png" 
                alt="Floral decoration" 
                className="w-32 sm:w-36 md:w-40 h-auto object-contain select-none rotate-180" 
              />
            </div>
          </div>
          <div className="absolute bottom-0 right-0 pointer-events-none z-10">
            <div className="animate-sr-pulse origin-bottom-right">
              <img 
                src="/assets/template/SR-03.png" 
                alt="Floral decoration" 
                className="w-36 sm:w-40 md:w-44 h-auto object-contain select-none" 
              />
            </div>
          </div>

          {/* Spacer to push content down onto the parchment */}
          <div className="relative z-10 flex-1 min-h-[44vh]" />

          {/* Center Info on Cover */}
          <div className="relative z-20 w-full max-w-xs space-y-2.5 pt-1">
            <p className="font-sr-sans text-[11px] font-semibold tracking-[0.3em] uppercase text-[#3C2A21]/80">
              THE WEDDING OF
            </p>

            <h1 className="font-sr-script text-4xl sm:text-5xl text-[#8A4B32] leading-tight drop-shadow-sm font-medium">
              {brideNickname} &amp; {groomNickname}
            </h1>

            <div className="pt-1.5 pb-0.5 space-y-0.5">
              <p className="font-sr-sans text-[11px] text-[#6E5D53]">
                Kepada Yth.
              </p>
              <p className="font-sr-sans text-[11px] text-[#6E5D53]">
                Bapak/Ibu/Saudara/i
              </p>
              <p className="font-sr-sans text-base sm:text-lg font-bold text-[#3C2A21] pt-0.5 tracking-wide">
                {guestName}
              </p>
              <p className="font-sr-sans text-[9px] italic text-[#7A6A60] px-4">
                *Mohon maaf jika ada kesalahan dalam penulisan nama / gelar.
              </p>
            </div>

            {/* Buka Undangan Button */}
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={handleOpenInvitation}
                className="group relative inline-flex items-center gap-2 bg-[#8A4B32] hover:bg-[#733B26] active:scale-95 text-white font-sr-sans font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-full shadow-lg transition-all duration-300 cursor-pointer"
              >
                <span>📖</span>
                <span>Buka Undangan</span>
              </button>
            </div>
          </div>

          <div className="h-4" />
        </motion.section>
      )}

      {/* ========================================================================= */}
      {/* INVITATION CONTENT */}
      {/* Animasi per widget muncul secara individu, bukan langsung full per section */}
      {/* ========================================================================= */}
      <div className="relative min-h-[100dvh] pb-0">
        
        {/* ===================================================================== */}
        {/* SECTION 2 - HERO & COUNTDOWN (Bunga di-rotate 180 persis Gambar 3) */}
        {/* ===================================================================== */}
        <section 
          id="hero-section" 
          className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center text-center px-6 py-12 overflow-hidden select-none bg-[#f5ede2]"
        >
          {/* Background Texture */}
          <div 
            className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-90"
            style={{ backgroundImage: `url(/assets/template/SR-bg.jpg)` }}
          />

          {/* 4 Animated Floral Corners */}
          <div className="absolute top-0 left-0 pointer-events-none z-10">
            <div className="animate-sr-pulse origin-top-left">
              <img 
                src="/assets/template/SR-02.png" 
                alt="Floral" 
                className="w-32 sm:w-36 md:w-40 h-auto object-contain select-none" 
              />
            </div>
          </div>
          <div className="absolute top-0 right-0 pointer-events-none z-10">
            <div className="animate-sr-pulse-delay origin-top-right">
              <img 
                src="/assets/template/SR-01.png" 
                alt="Floral" 
                className="w-20 sm:w-24 md:w-28 h-auto object-contain select-none" 
              />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 pointer-events-none z-10">
            <div className="animate-sr-pulse-alt origin-bottom-left">
              <img 
                src="/assets/template/SR-01.png" 
                alt="Floral" 
                className="w-24 sm:w-28 md:w-32 h-auto object-contain select-none rotate-180" 
              />
            </div>
          </div>
          <div className="absolute bottom-0 right-0 pointer-events-none z-10">
            <div className="animate-sr-pulse origin-bottom-right">
              <img 
                src="/assets/template/SR-03.png" 
                alt="Floral" 
                className="w-32 sm:w-36 md:w-40 h-auto object-contain select-none" 
              />
            </div>
          </div>

          {/* Widgets Container */}
          <div className="relative z-20 w-full max-w-[320px] sm:max-w-[340px] flex flex-col items-center pt-2 pb-2">
            
            {/* Widget 1: Heading Text */}
            <motion.p 
              initial={{ opacity: 0, y: -16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="font-sr-sans text-[11px] sm:text-xs font-semibold tracking-[0.35em] uppercase text-[#3C2A21]/80 mb-3 sm:mb-4"
            >
              THE WEDDING OF
            </motion.p>

            {/* Widget 2: Arch Photo Dome with Animated Swaying Floral Wings */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.88, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative mx-auto mb-6 sm:mb-7 w-[230px] sm:w-[255px] aspect-square flex items-center justify-center select-none"
            >
              {/* Floral Wings Wrapper with bottom-clipping so nothing ever shows underneath the arch line */}
              <div className="absolute inset-0 pointer-events-none z-10 [clip-path:inset(-250px_-250px_0px_-250px)]">
                {/* Floral Wing Left - Swaying Animated */}
                <motion.img 
                  src="/assets/template/arch-wing-left.png" 
                  alt="Floral Wing Left" 
                  className="absolute -left-[74px] sm:-left-[82px] bottom-0 h-[105%] w-auto object-contain pointer-events-none select-none origin-bottom-right" 
                  animate={{
                    rotate: [-1.2, 1.5, -1.2],
                    y: [0, -3.5, 0],
                    x: [0, -1.5, 0],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                {/* Floral Wing Right - Swaying Animated */}
                <motion.img 
                  src="/assets/template/arch-wing-right.png" 
                  alt="Floral Wing Right" 
                  className="absolute -right-[74px] sm:-right-[82px] bottom-0 h-[105%] w-auto object-contain pointer-events-none select-none origin-bottom-left" 
                  animate={{
                    rotate: [1.5, -1.2, 1.5],
                    y: [0, -3.5, 0],
                    x: [0, 1.5, 0],
                  }}
                  transition={{
                    duration: 5.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.6,
                  }}
                />
              </div>

              {/* Arch Photo Dome */}
              <div className="relative z-20 w-full h-full rounded-t-full rounded-b-none overflow-hidden shadow-2xl border-[3.5px] border-white bg-[#e0d6c7]">
                <img 
                  src={coverPhoto} 
                  alt={`${brideNickname} & ${groomNickname}`} 
                  className="w-full h-full object-cover object-top" 
                />
              </div>
            </motion.div>

            {/* Widget 3: Couple Title & Date */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="w-full text-center mb-5 sm:mb-6"
            >
              <h2 className="font-sr-script text-4xl sm:text-5xl text-[#8A4B32] leading-[1.25] font-medium drop-shadow-sm px-2">
                {brideNickname} &amp; {groomNickname}
              </h2>
              <p className="font-sr-sans text-xs sm:text-sm font-medium text-[#4A3B32] mt-2 tracking-wide">
                {formattedDate}
              </p>
            </motion.div>

            {/* Widget 4: 4 Countdown Boxes (Per-box staggered animation) */}
            <div className="grid grid-cols-4 gap-2.5 sm:gap-3 w-full max-w-[285px] sm:max-w-[300px] mx-auto mb-5 sm:mb-6">
              {[
                { label: "Hari", val: timeLeft.days },
                { label: "Jam", val: timeLeft.hours },
                { label: "Menit", val: timeLeft.minutes },
                { label: "Detik", val: timeLeft.seconds },
              ].map((item, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, scale: 0.85, y: 20 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: idx * 0.08, ease: "easeOut" }}
                  className="bg-[#8A4B32] text-white rounded-xl py-2.5 px-1.5 flex flex-col items-center justify-center shadow-md border border-[#A85A3C]/40"
                >
                  <span className="font-sr-sans text-lg sm:text-xl font-bold leading-none">
                    {String(item.val).padStart(2, "0")}
                  </span>
                  <span className="font-sr-sans text-[9px] uppercase tracking-wider text-white/80 mt-1">
                    {item.label}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Widget 5: Simpan Tanggal Button & Down Arrow */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center gap-3 pt-0.5"
            >
              <a 
                href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=The+Wedding+of+${encodeURIComponent(brideNickname)}+%26+${encodeURIComponent(groomNickname)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#8A4B32] hover:bg-[#733B26] text-white font-sr-sans font-medium text-xs sm:text-sm px-6 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <span>📅</span>
                <span>Simpan Tanggal</span>
              </a>

              {/* Bouncing Arrow Down */}
              <span className="text-[#8A4B32] text-lg animate-bounce pt-1">↓</span>
            </motion.div>
          </div>
          

          <div className="h-2" />
        </section>

        {/* ===================================================================== */}
        {/* SECTION 3 - AYAT SUCI (Animasi per widget) */}
        {/* ===================================================================== */}
        <section 
          id="ayat-section"
          className="relative w-full px-6 py-12 overflow-hidden bg-[#8A4B32] text-white select-none shadow-md"
        >
          <div className="max-w-md mx-auto text-center space-y-6 px-2 py-4">
            {/* Widget 1: Ayat Quote Text */}
            <motion.p 
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="font-sr-sans text-xs sm:text-sm leading-relaxed text-white/95 italic font-light"
            >
              &quot;Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.&quot;
            </motion.p>

            {/* Widget 2: Surah Title */}
            <motion.h3 
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
              className="font-sr-sans text-base sm:text-lg font-bold tracking-wide text-white"
            >
              Q.S Ar-Rum : 21
            </motion.h3>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* SECTION 4 - PROFIL MEMPELAI (Animasi per widget) */}
        {/* ===================================================================== */}
        <section 
          id="couple-section"
          className="relative w-full px-6 py-14 overflow-hidden select-none bg-[#f5ede2]"
        >
          {/* Background Texture */}
          <div 
            className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-90"
            style={{ backgroundImage: `url(/assets/template/SR-bg.jpg)` }}
          />

          {/* Floral Corners */}
          <div className="absolute top-0 left-0 pointer-events-none z-10">
            <div className="animate-sr-pulse origin-top-left">
              <img 
                src="/assets/template/SR-02.png" 
                alt="Floral" 
                className="w-32 sm:w-40 md:w-44 h-auto object-contain select-none" 
              />
            </div>
          </div>
          <div className="absolute top-0 right-0 pointer-events-none z-10">
            <div className="animate-sr-pulse-delay origin-top-right">
              <img 
                src="/assets/template/SR-01.png" 
                alt="Floral" 
                className="w-20 sm:w-24 md:w-28 h-auto object-contain select-none" 
              />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 pointer-events-none z-10">
            <div className="animate-sr-pulse-alt origin-bottom-left">
              <img 
                src="/assets/template/SR-01.png" 
                alt="Floral" 
                className="w-24 sm:w-28 md:w-32 h-auto object-contain select-none rotate-180" 
              />
            </div>
          </div>
          <div className="absolute bottom-0 right-0 pointer-events-none z-10">
            <div className="animate-sr-pulse origin-bottom-right">
              <img 
                src="/assets/template/SR-03.png" 
                alt="Floral" 
                className="w-32 sm:w-40 md:w-44 h-auto object-contain select-none" 
              />
            </div>
          </div>

          <div className="relative z-20 max-w-sm mx-auto text-center space-y-8 bg-white/70 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-[#8A4B32]/15 shadow-xl">
            {/* Widget 1: Greetings Card */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="space-y-2"
            >
              <h4 className="font-sr-sans text-xs sm:text-sm font-bold text-[#3C2A21]">
                Assalamu&apos;alaikum Warahmatullahi Wabarakatuh
              </h4>
              <p className="font-sr-sans text-[11px] leading-relaxed text-[#6E5D53]">
                Maha Suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan. Ya Allah semoga ridho-Mu tercurah mengiringi pernikahan kami.
              </p>
            </motion.div>

            {/* Widget 2: Mempelai Wanita (Nathalie) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="space-y-3 flex flex-col items-center"
            >
              <div className="w-40 aspect-[3/4] rounded-t-full overflow-hidden shadow-md border-2 border-[#8A4B32]/30">
                <img 
                  src={bridePhoto} 
                  alt={brideFull} 
                  className="w-full h-full object-cover object-top" 
                />
              </div>

              <h3 className="font-sr-script text-3xl sm:text-4xl text-[#8A4B32] font-semibold">
                {brideFull}
              </h3>

              <div className="space-y-0.5 text-xs text-[#5C4A40] font-sr-sans">
                <p className="font-semibold text-[11px]">Mempelai Wanita</p>
                <p className="text-[11px] leading-tight">Putri dari Bapak {brideFather} &amp; Ibu {brideMother}</p>
              </div>

              {brideIg && (
                <a 
                  href={`https://instagram.com/${brideIg}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 bg-[#8A4B32] text-white text-[11px] px-3.5 py-1 rounded-full shadow-sm hover:bg-[#733B26] transition-colors"
                >
                  <span>📸</span>
                  <span>@{brideIg}</span>
                </a>
              )}
            </motion.div>

            {/* Widget 3: Ampersand Divider */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="font-sr-script text-4xl text-[#8A4B32] my-2"
            >
              &amp;
            </motion.div>

            {/* Widget 4: Mempelai Pria (Marvel) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="space-y-3 flex flex-col items-center"
            >
              <div className="w-40 aspect-[3/4] rounded-t-full overflow-hidden shadow-md border-2 border-[#8A4B32]/30">
                <img 
                  src={groomPhoto} 
                  alt={groomFull} 
                  className="w-full h-full object-cover object-top" 
                />
              </div>

              <h3 className="font-sr-script text-3xl sm:text-4xl text-[#8A4B32] font-semibold">
                {groomFull}
              </h3>

              <div className="space-y-0.5 text-xs text-[#5C4A40] font-sr-sans">
                <p className="font-semibold text-[11px]">Mempelai Pria</p>
                <p className="text-[11px] leading-tight">Putra dari Bapak {groomFather} &amp; Ibu {groomMother}</p>
              </div>

              {groomIg && (
                <a 
                  href={`https://instagram.com/${groomIg}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 bg-[#8A4B32] text-white text-[11px] px-3.5 py-1 rounded-full shadow-sm hover:bg-[#733B26] transition-colors"
                >
                  <span>📸</span>
                  <span>@{groomIg}</span>
                </a>
              )}
            </motion.div>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* SECTION 5 - ACARA / JADWAL PERNIKAHAN (Matching Referensi Gambar 1) */}
        {/* ===================================================================== */}
        <section 
          id="event-section"
          className="relative w-full px-5 sm:px-6 py-14 overflow-hidden select-none bg-[#8A4B32]"
        >
          {/* Animated Floral Corners */}
          <div className="absolute top-0 left-0 pointer-events-none z-10">
            <div className="animate-sr-pulse origin-top-left">
              <img src="/assets/template/SR-02.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain opacity-95" />
            </div>
          </div>
          <div className="absolute top-0 right-0 pointer-events-none z-10">
            <div className="animate-sr-pulse-delay origin-top-right">
              <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain opacity-95" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 pointer-events-none z-10">
            <div className="animate-sr-pulse-alt origin-bottom-left">
              <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain rotate-180 opacity-95" />
            </div>
          </div>
          <div className="absolute bottom-0 right-0 pointer-events-none z-10">
            <div className="animate-sr-pulse origin-bottom-right">
              <img src="/assets/template/SR-03.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain opacity-95" />
            </div>
          </div>

          <div className="relative z-20 max-w-sm mx-auto space-y-6">
            
            {/* Header Acara */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center space-y-2 text-white"
            >
              <h3 className="font-sr-script text-4xl sm:text-5xl text-white font-medium drop-shadow-sm">
                Waktu &amp; Tempat
              </h3>
              <p className="font-sr-sans text-xs text-white/85 max-w-xs mx-auto leading-relaxed">
                Dengan memohon rahmat dan ridho Allah SWT, kami mengundang Anda untuk hadir pada acara kami:
              </p>
              <div className="flex items-center justify-center gap-2 text-white/40 text-xs pt-0.5">
                <span className="w-8 h-[1px] bg-white/30" />
                <span>✦ ✦ ✦</span>
                <span className="w-8 h-[1px] bg-white/30" />
              </div>
            </motion.div>

            {/* Card 1: Akad Nikah */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="relative rounded-[28px] p-6 sm:p-7 text-center shadow-2xl overflow-hidden border border-[#D4A373]/30 bg-[#FFFDF9]/95 text-[#3C2A21] space-y-4"
              style={{ backgroundImage: `url(/assets/template/SR-bg.jpg)`, backgroundSize: "cover" }}
            >
              <div className="inline-block px-3.5 py-1 rounded-full bg-[#8A4B32]/10 text-[#8A4B32] font-sr-sans text-[10px] font-bold tracking-[0.2em] uppercase">
                Acara Sakral
              </div>

              <h4 className="font-sr-script text-4xl sm:text-5xl text-[#8A4B32] font-semibold">
                Akad Nikah
              </h4>

              {/* Date Block with Balanced Hierarchy */}
              <div className="flex items-center justify-center gap-3 py-2 border-y border-[#8A4B32]/15 max-w-[270px] mx-auto">
                <div className="text-right flex-1">
                  <span className="block font-sr-sans text-xs font-bold uppercase tracking-wider text-[#5C4A40]">Sabtu</span>
                  <span className="block font-sr-sans text-[10px] text-[#8C7A70]">Pagi Hari</span>
                </div>
                <div className="w-[1.5px] h-9 bg-[#8A4B32]/25" />
                <div className="px-2 text-center">
                  <span className="block font-serif text-3xl sm:text-4xl font-extrabold text-[#8A4B32] leading-none">23</span>
                  <span className="block font-sr-sans text-[10px] font-bold tracking-widest text-[#8A4B32] uppercase mt-0.5">2026</span>
                </div>
                <div className="w-[1.5px] h-9 bg-[#8A4B32]/25" />
                <div className="text-left flex-1">
                  <span className="block font-sr-sans text-xs font-bold uppercase tracking-wider text-[#5C4A40]">Mei</span>
                  <span className="block font-sr-sans text-[10px] text-[#8C7A70]">Bulan Baik</span>
                </div>
              </div>

              {/* Time Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#8A4B32] text-white font-sr-sans text-xs font-semibold shadow-sm">
                <svg className="w-3.5 h-3.5 text-[#E6C280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Pukul 08:00 WIB - Selesai</span>
              </div>

              {/* Location Info */}
              <div className="pt-1 space-y-1">
                <h5 className="font-sr-sans font-bold text-sm text-[#3C2A21]">
                  Villa Nusa Permai
                </h5>
                <p className="font-sr-sans text-xs text-[#5C4A40] leading-relaxed max-w-[280px] mx-auto">
                  Blok L 2/1 Dapur Dahar, Desa Sukamulya, Kecamatan Cugenang, Cianjur
                </p>
              </div>

              {/* Google Maps Button */}
              <div className="pt-1">
                <a 
                  href="https://maps.google.com/?q=Villa+Nusa+Permai+blok+L+2/1+Dapur+Dahar+Desa+Sukamulya+Kecamatan+Cugenang+Cianjur" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-[#8A4B32] hover:bg-[#733B26] text-white font-sr-sans text-xs font-semibold px-6 py-2.5 rounded-full shadow-md active:scale-95 transition-all"
                >
                  <svg className="w-3.5 h-3.5 text-[#E6C280]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  <span>Buka Google Maps</span>
                </a>
              </div>
            </motion.div>

            {/* Card 2: Resepsi */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.65, delay: 0.12, ease: "easeOut" }}
              className="relative rounded-[28px] p-6 sm:p-7 text-center shadow-2xl overflow-hidden border border-[#D4A373]/30 bg-[#FFFDF9]/95 text-[#3C2A21] space-y-4"
              style={{ backgroundImage: `url(/assets/template/SR-bg.jpg)`, backgroundSize: "cover" }}
            >
              <div className="inline-block px-3.5 py-1 rounded-full bg-[#8A4B32]/10 text-[#8A4B32] font-sr-sans text-[10px] font-bold tracking-[0.2em] uppercase">
                Perayaan &amp; Ramah Tamah
              </div>

              <h4 className="font-sr-script text-4xl sm:text-5xl text-[#8A4B32] font-semibold">
                Resepsi
              </h4>

              {/* Date Block with Balanced Hierarchy */}
              <div className="flex items-center justify-center gap-3 py-2 border-y border-[#8A4B32]/15 max-w-[270px] mx-auto">
                <div className="text-right flex-1">
                  <span className="block font-sr-sans text-xs font-bold uppercase tracking-wider text-[#5C4A40]">Sabtu</span>
                  <span className="block font-sr-sans text-[10px] text-[#8C7A70]">Siang Hari</span>
                </div>
                <div className="w-[1.5px] h-9 bg-[#8A4B32]/25" />
                <div className="px-2 text-center">
                  <span className="block font-serif text-3xl sm:text-4xl font-extrabold text-[#8A4B32] leading-none">23</span>
                  <span className="block font-sr-sans text-[10px] font-bold tracking-widest text-[#8A4B32] uppercase mt-0.5">2026</span>
                </div>
                <div className="w-[1.5px] h-9 bg-[#8A4B32]/25" />
                <div className="text-left flex-1">
                  <span className="block font-sr-sans text-xs font-bold uppercase tracking-wider text-[#5C4A40]">Mei</span>
                  <span className="block font-sr-sans text-[10px] text-[#8C7A70]">Bulan Baik</span>
                </div>
              </div>

              {/* Time Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#8A4B32] text-white font-sr-sans text-xs font-semibold shadow-sm">
                <svg className="w-3.5 h-3.5 text-[#E6C280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Pukul 11:00 WIB - Selesai</span>
              </div>

              {/* Location Info */}
              <div className="pt-1 space-y-1">
                <h5 className="font-sr-sans font-bold text-sm text-[#3C2A21]">
                  Villa Nusa Permai
                </h5>
                <p className="font-sr-sans text-xs text-[#5C4A40] leading-relaxed max-w-[280px] mx-auto">
                  Blok L 2/1 Dapur Dahar, Desa Sukamulya, Kecamatan Cugenang, Cianjur
                </p>
              </div>

              {/* Google Maps Button */}
              <div className="pt-1">
                <a 
                  href="https://maps.google.com/?q=Villa+Nusa+Permai+blok+L+2/1+Dapur+Dahar+Desa+Sukamulya+Kecamatan+Cugenang+Cianjur" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-[#8A4B32] hover:bg-[#733B26] text-white font-sr-sans text-xs font-semibold px-6 py-2.5 rounded-full shadow-md active:scale-95 transition-all"
                >
                  <svg className="w-3.5 h-3.5 text-[#E6C280]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  <span>Buka Google Maps</span>
                </a>
              </div>
            </motion.div>

          </div>
        </section>

        {/* ===================================================================== */}
        {/* SECTION 6 - LOVE STORY (Matching Referensi Gambar 2) */}
        {/* ===================================================================== */}
        <section 
          id="story-section"
          className="relative w-full px-5 sm:px-6 py-14 overflow-hidden select-none bg-[#f5ede2]"
        >
          {/* Background Texture */}
          <div 
            className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-90"
            style={{ backgroundImage: `url(/assets/template/SR-bg.jpg)` }}
          />

          {/* Animated Floral Corners */}
          <div className="absolute top-0 left-0 pointer-events-none z-10">
            <div className="animate-sr-pulse origin-top-left">
              <img src="/assets/template/SR-02.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain" />
            </div>
          </div>
          <div className="absolute top-0 right-0 pointer-events-none z-10">
            <div className="animate-sr-pulse-delay origin-top-right">
              <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 pointer-events-none z-10">
            <div className="animate-sr-pulse-alt origin-bottom-left">
              <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain rotate-180" />
            </div>
          </div>
          <div className="absolute bottom-0 right-0 pointer-events-none z-10">
            <div className="animate-sr-pulse origin-bottom-right">
              <img src="/assets/template/SR-03.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain" />
            </div>
          </div>

          <div className="relative z-20 max-w-sm mx-auto space-y-6">
            {/* Title & Flourish */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center space-y-2 mb-6"
            >
              <h3 className="font-sr-script text-4xl sm:text-5xl text-[#8A4B32] font-semibold drop-shadow-sm">
                Love Story
              </h3>
              <p className="font-sr-sans text-xs text-[#5C4A40] max-w-xs mx-auto leading-relaxed">
                Perjalanan cinta kami dari awal bertemu hingga melangkah ke pelaminan.
              </p>
              <div className="flex items-center justify-center gap-2 text-[#8A4B32]/35 text-xs pt-0.5">
                <span className="w-8 h-[1px] bg-[#8A4B32]/25" />
                <span>✦ ✦ ✦</span>
                <span className="w-8 h-[1px] bg-[#8A4B32]/25" />
              </div>
            </motion.div>

            {/* Timeline Spine & Cards */}
            <div className="relative pl-7 sm:pl-8 space-y-6 text-left">
              {/* Vertical Spine */}
              <div className="absolute left-[13px] sm:left-[15px] top-4 bottom-5 w-[2px] bg-gradient-to-b from-[#8A4B32]/40 via-[#8A4B32]/25 to-transparent" />

              {/* Story 1: Awal Kisah */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.25 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative"
              >
                {/* Node */}
                <div className="absolute -left-[27px] sm:-left-[29px] top-3.5 w-7 h-7 rounded-full bg-gradient-to-br from-[#8A4B32] to-[#6E3622] flex items-center justify-center text-white text-[11px] shadow-md border-2 border-[#f5ede2] ring-2 ring-[#8A4B32]/20 z-10">
                  ♥
                </div>

                {/* Card */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-md border border-[#8A4B32]/15 space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b border-[#8A4B32]/10 pb-2">
                    <h4 className="font-sr-sans font-bold text-xs sm:text-sm text-[#8A4B32] tracking-wide">
                      Awal Pertemuan
                    </h4>
                    <span className="font-sr-sans text-[10px] font-semibold text-[#8C7A70] bg-[#8A4B32]/10 px-2.5 py-0.5 rounded-full">
                      05 Maret 2024
                    </span>
                  </div>
                  <p className="font-sr-sans text-xs text-[#5C4A40] leading-relaxed">
                    Tanpa sengaja semesta mempertemukan kami lewat dunia maya. Dari obrolan ringan di sosial media, kami pertama bertemu pada tanggal 05 Maret 2024. Tidak ada yang menyangka bahwa dari pertemuan sederhana itu tumbuh rasa hangat hingga hati kami sepakat untuk saling menjaga dan melengkapi.
                  </p>
                </div>
              </motion.div>

              {/* Story 2: Lamaran */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.25 }}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                className="relative"
              >
                {/* Node */}
                <div className="absolute -left-[27px] sm:-left-[29px] top-3.5 w-7 h-7 rounded-full bg-gradient-to-br from-[#8A4B32] to-[#6E3622] flex items-center justify-center text-white text-[11px] shadow-md border-2 border-[#f5ede2] ring-2 ring-[#8A4B32]/20 z-10">
                  💍
                </div>

                {/* Card */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-md border border-[#8A4B32]/15 space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b border-[#8A4B32]/10 pb-2">
                    <h4 className="font-sr-sans font-bold text-xs sm:text-sm text-[#8A4B32] tracking-wide">
                      Ikatan Suci (Lamaran)
                    </h4>
                    <span className="font-sr-sans text-[10px] font-semibold text-[#8C7A70] bg-[#8A4B32]/10 px-2.5 py-0.5 rounded-full">
                      29 Maret 2026
                    </span>
                  </div>
                  <p className="font-sr-sans text-xs text-[#5C4A40] leading-relaxed">
                    Kehendak-Nya menuntun kami pada sebuah ikatan suci yang diridhoi-Nya. Di titik ini, kami memilih untuk berhenti mencari. Momen lamaran pada 29 Maret 2026 menjadi bukti nyata dari kesungguhan hati untuk siap melangkah bersama seumur hidup.
                  </p>
                </div>
              </motion.div>

              {/* Story 3: Menuju Pelaminan */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.25 }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                className="relative"
              >
                {/* Node */}
                <div className="absolute -left-[27px] sm:-left-[29px] top-3.5 w-7 h-7 rounded-full bg-gradient-to-br from-[#8A4B32] to-[#6E3622] flex items-center justify-center text-white text-[11px] shadow-md border-2 border-[#f5ede2] ring-2 ring-[#8A4B32]/20 z-10">
                  ✨
                </div>

                {/* Card */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-md border border-[#8A4B32]/15 space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b border-[#8A4B32]/10 pb-2">
                    <h4 className="font-sr-sans font-bold text-xs sm:text-sm text-[#8A4B32] tracking-wide">
                      Awal Selamanya
                    </h4>
                    <span className="font-sr-sans text-[10px] font-semibold text-[#8C7A70] bg-[#8A4B32]/10 px-2.5 py-0.5 rounded-full">
                      23 Mei 2026
                    </span>
                  </div>
                  <p className="font-sr-sans text-xs text-[#5C4A40] leading-relaxed">
                    Dan tibalah hari yang paling kami nantikan. Bukan sekadar merayakan cinta kami berdua, tapi menyatukan dua keluarga besar dalam ikatan suci pernikahan. Hari di mana perjalanan baru kami resmi dimulai.
                  </p>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* SECTION 7 - OUR MOMENTS / GALLERY (Matching Referensi Gambar 3 Atas) */}
        {/* ===================================================================== */}
        <section 
          id="gallery-section"
          className="relative w-full px-5 sm:px-6 py-14 overflow-hidden select-none bg-[#f5ede2]"
        >
          {/* Background Texture */}
          <div 
            className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-90"
            style={{ backgroundImage: `url(/assets/template/SR-bg.jpg)` }}
          />

          {/* Animated Floral Corners */}
          <div className="absolute top-0 left-0 pointer-events-none z-10">
            <div className="animate-sr-pulse origin-top-left">
              <img src="/assets/template/SR-02.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain" />
            </div>
          </div>
          <div className="absolute top-0 right-0 pointer-events-none z-10">
            <div className="animate-sr-pulse-delay origin-top-right">
              <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 pointer-events-none z-10">
            <div className="animate-sr-pulse-alt origin-bottom-left">
              <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain rotate-180" />
            </div>
          </div>
          <div className="absolute bottom-0 right-0 pointer-events-none z-10">
            <div className="animate-sr-pulse origin-bottom-right">
              <img src="/assets/template/SR-03.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain" />
            </div>
          </div>

          <div className="relative z-20 max-w-sm mx-auto">
            {/* Title */}
            <motion.h3 
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="font-sr-script text-4xl sm:text-5xl text-[#8A4B32] font-semibold text-center mb-6"
            >
              Our Moments
            </motion.h3>

            {/* Main Interactive Photo Display */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="relative bg-[#8A4B32] rounded-3xl p-2.5 sm:p-3 shadow-2xl overflow-hidden border border-white/30"
            >
              <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-black/20 group">
                <img 
                  src={galleryImages[activePhotoIdx]} 
                  alt={`Moment ${activePhotoIdx + 1}`} 
                  className="w-full h-full object-cover transition-all duration-500" 
                />

                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-black/40 hover:bg-black/60 text-white flex items-center justify-center text-sm backdrop-blur-sm transition-all"
                  title="Perbesar Foto"
                >
                  ⛶
                </button>

                {/* Nav Arrows */}
                <button
                  type="button"
                  onClick={() => setActivePhotoIdx((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center text-lg transition-all"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setActivePhotoIdx((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center text-lg transition-all"
                >
                  ›
                </button>
              </div>

              {/* Thumbnails Row */}
              <div className="flex gap-2 pt-2.5 overflow-x-auto scrollbar-none px-0.5">
                {galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhotoIdx(idx)}
                    className={`relative w-12 h-12 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      activePhotoIdx === idx ? "border-white scale-105 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Lightbox Modal */}
        <AnimatePresence>
          {isLightboxOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLightboxOpen(false)}
              className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md cursor-pointer select-none"
            >
              <button 
                type="button" 
                onClick={() => setIsLightboxOpen(false)}
                className="absolute top-5 right-5 text-white text-3xl font-light hover:text-gray-300"
              >
                ✕
              </button>
              <img 
                src={galleryImages[activePhotoIdx]} 
                alt="Enlarged moment" 
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===================================================================== */}
        {/* SECTION 8 - WEDDING GIFT / AMPLOP DIGITAL (Matching Referensi Gambar 3 Bawah) */}
        {/* ===================================================================== */}
        <section 
          id="gift-section"
          className="relative w-full px-5 sm:px-6 py-14 overflow-hidden select-none bg-[#8A4B32] text-white"
        >
          {/* Animated Floral Corners */}
          <div className="absolute top-0 left-0 pointer-events-none z-10">
            <div className="animate-sr-pulse origin-top-left">
              <img src="/assets/template/SR-02.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain opacity-95" />
            </div>
          </div>
          <div className="absolute top-0 right-0 pointer-events-none z-10">
            <div className="animate-sr-pulse-delay origin-top-right">
              <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain opacity-95" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 pointer-events-none z-10">
            <div className="animate-sr-pulse-alt origin-bottom-left">
              <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain rotate-180 opacity-95" />
            </div>
          </div>
          <div className="absolute bottom-0 right-0 pointer-events-none z-10">
            <div className="animate-sr-pulse origin-bottom-right">
              <img src="/assets/template/SR-03.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain opacity-95" />
            </div>
          </div>

          <div className="relative z-20 max-w-sm mx-auto text-center space-y-6">
            
            {/* Title & Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="space-y-2.5"
            >
              <h3 className="font-sr-script text-4xl sm:text-5xl font-medium text-white drop-shadow-sm">
                Wedding Gift
              </h3>
              <p className="font-sr-sans text-xs text-white/90 leading-relaxed px-3">
                Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Namun jika memberi adalah ungkapan tanda kasih, Anda dapat memberi melalui rekening di bawah ini:
              </p>
              <div className="flex items-center justify-center gap-2 text-white/40 text-xs pt-0.5">
                <span className="w-8 h-[1px] bg-white/30" />
                <span>✦ ✦ ✦</span>
                <span className="w-8 h-[1px] bg-white/30" />
              </div>
            </motion.div>

            {/* List of 2 Bank Cards */}
            <div className="space-y-5">
              
              {/* Card 1: BCA (Mempelai Wanita - Sopiah) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 25 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: false, amount: 0.25 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="relative rounded-[26px] p-6 text-left shadow-2xl overflow-hidden border border-white/40 bg-[#FFFDF9]/95 text-[#3C2A21] max-w-xs mx-auto"
                style={{ backgroundImage: `url(/assets/template/SR-bg.jpg)`, backgroundSize: "cover" }}
              >
                {/* Card Top: BCA Logo & EMV Chip */}
                <div className="flex items-center justify-between mb-5">
                  <div className="bg-white rounded-xl px-3 py-1.5 shadow-sm border border-[#8A4B32]/10 flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#00529C] flex items-center justify-center text-[10px] text-white font-extrabold">
                      B
                    </div>
                    <span className="font-sans font-extrabold text-sm tracking-wider text-[#00529C]">BCA</span>
                  </div>

                  {/* EMV Gold Chip Icon */}
                  <div className="w-10 h-8 rounded-lg bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 border border-amber-600/40 shadow-inner flex flex-col justify-around p-1">
                    <div className="w-full h-[1px] bg-amber-700/35" />
                    <div className="w-full h-[1px] bg-amber-700/35" />
                  </div>
                </div>

                {/* Account Number */}
                <div className="space-y-1 mb-4">
                  <span className="font-sr-sans text-[10px] font-bold uppercase tracking-wider text-[#7C6A60]">
                    Nomor Rekening
                  </span>
                  <p className="font-sr-sans text-xl sm:text-2xl font-bold tracking-wider text-[#3C2A21] font-mono">
                    3480 9948 75
                  </p>
                </div>

                {/* Account Holder & Copy Button */}
                <div className="flex items-end justify-between pt-1 border-t border-[#8A4B32]/10">
                  <div>
                    <span className="font-sr-sans text-[10px] font-bold uppercase tracking-wider text-[#7C6A60]">
                      Atas Nama
                    </span>
                    <p className="font-sr-sans text-sm font-bold text-[#3C2A21]">
                      Sopiah
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyAccountNumber("3480994875", 1)}
                    className="inline-flex items-center gap-1.5 bg-[#8A4B32] hover:bg-[#733B26] text-white font-sr-sans text-xs font-semibold px-4 py-2 rounded-full shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <span>{copiedBankIndex === 1 ? "✓" : "📋"}</span>
                    <span>{copiedBankIndex === 1 ? "Tersalin!" : "Salin"}</span>
                  </button>
                </div>
              </motion.div>

              {/* Card 2: Bank Mandiri (Mempelai Pria - Marvel) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 25 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: false, amount: 0.25 }}
                transition={{ duration: 0.65, delay: 0.12, ease: "easeOut" }}
                className="relative rounded-[26px] p-6 text-left shadow-2xl overflow-hidden border border-white/40 bg-[#FFFDF9]/95 text-[#3C2A21] max-w-xs mx-auto"
                style={{ backgroundImage: `url(/assets/template/SR-bg.jpg)`, backgroundSize: "cover" }}
              >
                {/* Card Top: Mandiri Logo & EMV Chip */}
                <div className="flex items-center justify-between mb-5">
                  <div className="bg-white rounded-xl px-3 py-1.5 shadow-sm border border-[#8A4B32]/10 flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#003d79] flex items-center justify-center text-[10px] text-[#ffb81c] font-black">
                      M
                    </div>
                    <span className="font-sans font-extrabold text-sm tracking-wider text-[#003d79]">MANDIRI</span>
                  </div>

                  {/* EMV Gold Chip Icon */}
                  <div className="w-10 h-8 rounded-lg bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 border border-amber-600/40 shadow-inner flex flex-col justify-around p-1">
                    <div className="w-full h-[1px] bg-amber-700/35" />
                    <div className="w-full h-[1px] bg-amber-700/35" />
                  </div>
                </div>

                {/* Account Number */}
                <div className="space-y-1 mb-4">
                  <span className="font-sr-sans text-[10px] font-bold uppercase tracking-wider text-[#7C6A60]">
                    Nomor Rekening
                  </span>
                  <p className="font-sr-sans text-xl sm:text-2xl font-bold tracking-wider text-[#3C2A21] font-mono">
                    1320 0284 9182 3
                  </p>
                </div>

                {/* Account Holder & Copy Button */}
                <div className="flex items-end justify-between pt-1 border-t border-[#8A4B32]/10">
                  <div>
                    <span className="font-sr-sans text-[10px] font-bold uppercase tracking-wider text-[#7C6A60]">
                      Atas Nama
                    </span>
                    <p className="font-sr-sans text-sm font-bold text-[#3C2A21]">
                      Marvel
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyAccountNumber("1320028491823", 2)}
                    className="inline-flex items-center gap-1.5 bg-[#8A4B32] hover:bg-[#733B26] text-white font-sr-sans text-xs font-semibold px-4 py-2 rounded-full shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <span>{copiedBankIndex === 2 ? "✓" : "📋"}</span>
                    <span>{copiedBankIndex === 2 ? "Tersalin!" : "Salin"}</span>
                  </button>
                </div>
              </motion.div>

              {/* Physical Gift Option / Kirim Kado Fisik */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.6 }}
                className="rounded-2xl p-4 bg-white/10 border border-white/20 text-center max-w-xs mx-auto space-y-2 backdrop-blur-sm"
              >
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#E6C280] font-bold uppercase tracking-wider">
                  <span>🎁</span>
                  <span>Kirim Kado Fisik</span>
                </div>
                <p className="text-[11px] text-white/90 leading-relaxed">
                  Villa Nusa Permai blok L 2/1 Dapur Dahar Desa Sukamulya Kecamatan Cugenang Cianjur
                </p>
                <button
                  type="button"
                  onClick={() => copyAddress("Villa Nusa Permai blok L 2/1 Dapur Dahar Desa Sukamulya Kecamatan Cugenang Cianjur")}
                  className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white text-[11px] px-3.5 py-1.5 rounded-full border border-white/20 transition-all cursor-pointer"
                >
                  <span>{copiedAddress ? "✓" : "📦"}</span>
                  <span>{copiedAddress ? "Alamat Tersalin!" : "Salin Alamat"}</span>
                </button>
              </motion.div>

            </div>

          </div>
        </section>

        {/* ===================================================================== */}
        {/* SECTION 9 - UCAPAN & RSVP (Matching Referensi Gambar 4) */}
        {/* ===================================================================== */}
        <section 
          id="rsvp-section"
          className="relative w-full px-5 sm:px-6 py-14 overflow-hidden select-none bg-[#f5ede2]"
        >
          {/* Background Texture */}
          <div 
            className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-90"
            style={{ backgroundImage: `url(/assets/template/SR-bg.jpg)` }}
          />

          {/* Animated Floral Corners */}
          <div className="absolute top-0 left-0 pointer-events-none z-10">
            <div className="animate-sr-pulse origin-top-left">
              <img src="/assets/template/SR-02.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain" />
            </div>
          </div>
          <div className="absolute top-0 right-0 pointer-events-none z-10">
            <div className="animate-sr-pulse-delay origin-top-right">
              <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 pointer-events-none z-10">
            <div className="animate-sr-pulse-alt origin-bottom-left">
              <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain rotate-180" />
            </div>
          </div>
          <div className="absolute bottom-0 right-0 pointer-events-none z-10">
            <div className="animate-sr-pulse origin-bottom-right">
              <img src="/assets/template/SR-03.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain" />
            </div>
          </div>

          <div className="relative z-20 max-w-sm mx-auto space-y-6">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center space-y-2"
            >
              <h3 className="font-sr-script text-4xl sm:text-5xl text-[#8A4B32] font-semibold drop-shadow-sm">
                Ucapan &amp; RSVP
              </h3>
              <p className="font-sr-sans text-xs sm:text-[13px] text-[#5C4A40] leading-relaxed">
                Konfirmasi kehadiran &amp; berikan doa restu terbaik untuk kami.
              </p>
              <div className="flex items-center justify-center gap-2 text-[#8A4B32]/35 text-xs pt-0.5">
                <span className="w-8 h-[1px] bg-[#8A4B32]/25" />
                <span>✦ ✦ ✦</span>
                <span className="w-8 h-[1px] bg-[#8A4B32]/25" />
              </div>
            </motion.div>

            {/* RSVP Form Card */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="relative rounded-[28px] p-6 sm:p-7 bg-white/85 backdrop-blur-md border border-[#8A4B32]/20 shadow-xl space-y-5"
            >
              <form onSubmit={handleSubmitRsvp} className="space-y-4">
                
                {/* Field 1: Nama Lengkap */}
                <div className="space-y-1.5 text-left">
                  <label className="font-sr-sans text-[11px] font-bold uppercase tracking-wider text-[#5C4A40] flex items-center justify-between">
                    <span>Nama Lengkap</span>
                    <span className="text-[#8A4B32] text-xs font-normal">*wajib</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={rsvpName}
                    onChange={(e) => setRsvpName(e.target.value)}
                    placeholder="Masukkan nama Anda..." 
                    className="w-full px-4 py-3 rounded-2xl border border-[#D6C5B3] bg-white text-xs sm:text-sm text-[#3C2A21] placeholder-[#8A4B32]/40 focus:outline-none focus:border-[#8A4B32] focus:ring-2 focus:ring-[#8A4B32]/15 shadow-sm transition-all"
                  />
                </div>

                {/* Field 2: Konfirmasi Kehadiran */}
                <div className="space-y-2 text-left pt-1">
                  <label className="font-sr-sans text-[11px] font-bold uppercase tracking-wider text-[#5C4A40] flex items-center justify-between">
                    <span>Konfirmasi Kehadiran</span>
                    <span className="text-[#8A4B32] text-xs font-normal">*pilih salah satu</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRsvpStatus("hadir")}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        rsvpStatus === "hadir"
                          ? "bg-gradient-to-r from-[#8A4B32] to-[#733B26] border-[#8A4B32] text-white shadow-md font-bold scale-[1.01]"
                          : "bg-white/80 border-[#D6C5B3] text-[#5C4A40] hover:bg-[#F7F2EB]"
                      }`}
                    >
                      <span className="text-sm">✓</span>
                      <span>Hadir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRsvpStatus("tidak_hadir")}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        rsvpStatus === "tidak_hadir"
                          ? "bg-gradient-to-r from-[#8A4B32] to-[#733B26] border-[#8A4B32] text-white shadow-md font-bold scale-[1.01]"
                          : "bg-white/80 border-[#D6C5B3] text-[#5C4A40] hover:bg-[#F7F2EB]"
                      }`}
                    >
                      <span className="text-sm">✕</span>
                      <span>Tidak Hadir</span>
                    </button>
                  </div>
                </div>

                {/* Field 3: Jumlah Tamu (Pax) - Hanya tampil jika Hadir */}
                <AnimatePresence>
                  {rsvpStatus === "hadir" ? (
                    <motion.div 
                      key="pax-selector"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-2 text-left pt-1 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <label className="font-sr-sans text-[11px] font-bold uppercase tracking-wider text-[#5C4A40]">
                          Jumlah Orang yang Hadir
                        </label>
                        <span className="text-xs font-bold text-[#8A4B32] font-sr-sans bg-[#8A4B32]/10 px-2.5 py-0.5 rounded-full">
                          {rsvpPax} Orang
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setRsvpPax(count)}
                            className={`py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                              rsvpPax === count
                                ? "bg-[#8A4B32] text-white border-[#8A4B32] shadow-sm font-bold scale-[1.02]"
                                : "bg-white border-[#D6C5B3] text-[#5C4A40] hover:bg-[#F7F2EB]"
                            }`}
                          >
                            {count} Orang
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.p 
                      key="declined-note"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[11px] text-[#7C6A60] italic text-left pt-0.5"
                    >
                      *Doa restu Anda dari kejauhan tetap sangat berarti bagi kami.
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Field 4: Ucapan & Doa */}
                <div className="space-y-1.5 text-left pt-1">
                  <label className="font-sr-sans text-[11px] font-bold uppercase tracking-wider text-[#5C4A40] flex items-center justify-between">
                    <span>Ucapan &amp; Doa Restu</span>
                    <span className="text-[#8A4B32] text-xs font-normal">*wajib</span>
                  </label>
                  <textarea 
                    required
                    rows={3}
                    value={rsvpMessage}
                    onChange={(e) => setRsvpMessage(e.target.value)}
                    placeholder="Tulis ucapan dan doa restu untuk mempelai..." 
                    className="w-full px-4 py-3 rounded-2xl border border-[#D6C5B3] bg-white text-xs sm:text-sm text-[#3C2A21] placeholder-[#8A4B32]/40 focus:outline-none focus:border-[#8A4B32] focus:ring-2 focus:ring-[#8A4B32]/15 shadow-sm resize-none transition-all"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmittingRsvp}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#8A4B32] via-[#7D3F28] to-[#6E3622] hover:from-[#9C5539] hover:to-[#82422C] text-white font-sr-sans font-semibold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer mt-2 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSubmittingRsvp ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mengirim Konfirmasi...</span>
                    </>
                  ) : (
                    <>
                      <span>Kirim Konfirmasi &amp; Ucapan</span>
                      <span className="text-sm">→</span>
                    </>
                  )}
                </button>

                {/* Success Banner */}
                {rsvpSuccessMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-[#EBF7EE] border border-[#85D49B]/60 text-[#1E6B35] font-sr-sans text-xs flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span className="text-sm font-bold">✓</span>
                    <span className="font-semibold">Terima kasih! RSVP dan doa restu Anda telah berhasil dikirim.</span>
                  </motion.div>
                )}
              </form>

              {/* Wishes List Container */}
              <div className="pt-4 border-t border-[#8A4B32]/15 space-y-3.5 text-left">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">💬</span>
                    <h4 className="font-sr-sans text-xs font-bold uppercase tracking-wider text-[#5C4A40]">
                      Doa &amp; Ucapan ({wishesList.length})
                    </h4>
                  </div>
                  <span className="font-sr-sans text-[10px] text-[#8C7A70]">
                    Scroll ke bawah ↓
                  </span>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {wishesList.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.05 }}
                      className="p-3.5 rounded-2xl bg-white border border-[#8A4B32]/15 shadow-sm space-y-2 hover:border-[#8A4B32]/30 transition-colors"
                    >
                      {/* Header: Avatar, Name & Attendance Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full ${item.color || "bg-[#8A4B32]"} text-white flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm`}>
                            {item.initial}
                          </div>
                          <div>
                            <h5 className="font-sr-sans font-bold text-xs text-[#3C2A21] leading-tight">
                              {item.name}
                            </h5>
                            <p className="font-sr-sans text-[9px] text-[#8C7A70] leading-none mt-0.5">
                              {item.created_at || "Baru saja"}
                            </p>
                          </div>
                        </div>

                        {/* Attendance Badge */}
                        {item.attendance === "hadir" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF7EE] text-[#1E6B35] border border-[#A3E4B5]/60 flex items-center gap-1 shrink-0">
                            <span>✓</span>
                            <span>Hadir{item.pax ? ` (${item.pax})` : ""}</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAECE7] text-[#B03A2E] border border-[#F5C6CB] flex items-center gap-1 shrink-0">
                            <span>✕</span>
                            <span>Tidak Hadir</span>
                          </span>
                        )}
                      </div>

                      {/* Message Content */}
                      <p className="font-sr-sans text-xs text-[#5C4A40] leading-relaxed pl-10 pr-1">
                        {item.message}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>

            </motion.div>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* SECTION 10 - TERIMA KASIH & CLOSING (Aesthetic Redesign) */}
        {/* ===================================================================== */}
        <section 
          id="closing-section"
          className="relative w-full pt-14 pb-0 overflow-hidden select-none bg-[#f5ede2]"
        >
          {/* Background Texture */}
          <div 
            className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-90"
            style={{ backgroundImage: `url(/assets/template/SR-bg.jpg)` }}
          />

          {/* Animated Floral Corners */}
          <div className="absolute top-0 left-0 pointer-events-none z-10">
            <div className="animate-sr-pulse origin-top-left">
              <img src="/assets/template/SR-02.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain" />
            </div>
          </div>
          <div className="absolute top-0 right-0 pointer-events-none z-10">
            <div className="animate-sr-pulse-delay origin-top-right">
              <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain" />
            </div>
          </div>

          <div className="relative z-20 max-w-sm mx-auto px-5 sm:px-6 text-center pb-12">
            {/* Arch Photo Dome */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 25 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="relative mx-auto mb-6 w-[210px] sm:w-[230px] aspect-square flex items-center justify-center"
            >
              {/* Floral Wings Wrapper with bottom-clipping */}
              <div className="absolute inset-0 pointer-events-none z-10 [clip-path:inset(-250px_-250px_0px_-250px)]">
                <motion.img 
                  src="/assets/template/arch-wing-left.png" 
                  alt="Floral Wing Left" 
                  className="absolute -left-[68px] sm:-left-[76px] bottom-0 h-[105%] w-auto object-contain pointer-events-none origin-bottom-right" 
                  animate={{
                    rotate: [-1.2, 1.5, -1.2],
                    y: [0, -3.5, 0],
                    x: [0, -1.5, 0],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.img 
                  src="/assets/template/arch-wing-right.png" 
                  alt="Floral Wing Right" 
                  className="absolute -right-[68px] sm:-right-[76px] bottom-0 h-[105%] w-auto object-contain pointer-events-none origin-bottom-left" 
                  animate={{
                    rotate: [1.5, -1.2, 1.5],
                    y: [0, -3.5, 0],
                    x: [0, 1.5, 0],
                  }}
                  transition={{
                    duration: 5.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.6,
                  }}
                />
              </div>

              {/* Arch Photo Dome */}
              <div className="relative z-20 w-full h-full rounded-t-full rounded-b-none overflow-hidden shadow-2xl border-[3.5px] border-white bg-[#e0d6c7]">
                <img 
                  src={coverPhoto} 
                  alt={`${brideNickname} & ${groomNickname}`} 
                  className="w-full h-full object-cover object-top" 
                />
              </div>
            </motion.div>

            {/* Title & Thank You Note */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="space-y-4"
            >
              <h3 className="font-sr-script text-4xl sm:text-5xl text-[#8A4B32] font-semibold">
                Terima Kasih
              </h3>
              <p className="font-sr-sans text-xs sm:text-sm text-[#5C4A40] leading-relaxed px-2">
                Merupakan suatu kebahagiaan dan kehormatan bagi kami, apabila Bapak/Ibu/Saudara/i, berkenan hadir dan memberikan do&apos;a restu kepada kami.
              </p>
              <p className="font-sr-sans text-xs font-semibold text-[#3C2A21] pt-1">
                Wassalamu&apos;alaikum warahmatullahi wabarakatuh
              </p>
              <div className="pt-2">
                <span className="font-sr-sans text-xs text-[#6E5D53]">Kami Yang Berbahagia</span>
                <h4 className="font-sr-script text-3xl sm:text-4xl text-[#8A4B32] font-semibold mt-1">
                  {brideNickname} &amp; {groomNickname}
                </h4>
              </div>
            </motion.div>
          </div>

          {/* Aesthetic Luxury Footer Branding */}
          <footer className="relative z-20 bg-gradient-to-b from-[#632E1A] via-[#4D2313] to-[#331509] text-white pt-10 pb-24 px-6 text-center shadow-2xl border-t border-[#D4A373]/25">
            <div className="max-w-sm mx-auto space-y-5">
              
              {/* SeraStory Branding */}
              <div className="text-center space-y-1">
                <h4 className="font-serif font-bold text-lg sm:text-xl tracking-[0.28em] text-[#FAF5F0] uppercase">
                  SERASTORY
                </h4>
                <p className="font-sr-sans text-[9px] sm:text-[10px] tracking-[0.28em] text-[#E6C280]/85 uppercase font-medium">
                  Bespoke Digital Invitation
                </p>
              </div>

              {/* Social & Contact Badges with Crisp Vector Icons */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {/* Instagram */}
                <a 
                  href="https://instagram.com/serastory.id" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-[#E6C280]/25 hover:border-[#E6C280]/60 transition-all text-[#FAF5F0] text-xs font-medium shadow-sm hover:scale-[1.03] active:scale-95"
                >
                  <svg className="w-3.5 h-3.5 text-[#E6C280]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <span>serastory.id</span>
                </a>

                {/* WhatsApp */}
                <a 
                  href="https://wa.me/6285189970998" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-[#E6C280]/25 hover:border-[#E6C280]/60 transition-all text-[#FAF5F0] text-xs font-medium shadow-sm hover:scale-[1.03] active:scale-95"
                >
                  <svg className="w-3.5 h-3.5 text-[#E6C280]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>085189970998</span>
                </a>

                {/* Website */}
                <a 
                  href="https://serastory.com" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-[#E6C280]/25 hover:border-[#E6C280]/60 transition-all text-[#FAF5F0] text-xs font-medium shadow-sm hover:scale-[1.03] active:scale-95"
                >
                  <svg className="w-3.5 h-3.5 text-[#E6C280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <span>serastory.com</span>
                </a>
              </div>

              {/* Consultation CTA Button */}
              <div className="pt-2">
                <a 
                  href="https://wa.me/6285189970998?text=Halo%20SeraStory,%20saya%20tertarik%20untuk%20membuat%20undangan%20pernikahan%20digital"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#D4A373] to-[#B3784A] hover:from-[#DFC29A] hover:to-[#C18556] text-[#2A1206] text-xs font-bold tracking-wider uppercase shadow-lg hover:shadow-[#D4A373]/30 transition-all active:scale-95"
                >
                  <span>Hubungi Kami</span>
                  <span className="text-sm">→</span>
                </a>
              </div>

              {/* Footer Note & Copyright */}
              <div className="pt-4 border-t border-white/10 space-y-1.5">
                <p className="font-sr-sans text-[10px] tracking-[0.22em] uppercase text-[#FAF5F0]/80 font-medium">
                  HUBUNGI KAMI UNTUK UNDANGAN PERNIKAHAN ANDA
                </p>
                <p className="font-sr-sans text-[9px] text-[#D8B4A6]/60 tracking-wider">
                  © 2026 SeraStory. All Rights Reserved.
                </p>
              </div>

            </div>
          </footer></section>

      </div>

      {/* ===================================================================== */}
      {/* FLOATING CONTROLS: MUSIC & BOTTOM NAV (Hanya muncul saat dibuka) */}
      {/* ===================================================================== */}
      {isOpened && (
        <>
          {/* Floating Rotating Music Disc (Rustic Luxury Vinyl Player) */}
          <div className="fixed bottom-6 z-50 pointer-events-none w-full md:w-[38%] lg:w-[35%] xl:w-[32%] right-0 flex justify-end px-5 sm:px-6">
            <button
              type="button"
              onClick={toggleMusic}
              aria-label={isPlayingMusic ? "Jeda Musik" : "Putar Musik"}
              className="pointer-events-auto relative group active:scale-95 transition-transform duration-200"
            >
              {/* Outer Golden Aura Pulse when playing */}
              {isPlayingMusic && (
                <span className="absolute -inset-1 rounded-full bg-[#D4A373]/35 animate-ping opacity-60 pointer-events-none" />
              )}

              {/* Realistic Vinyl Disc Body */}
              <div 
                className={`relative w-12 h-12 rounded-full bg-[#181310] border-2 border-[#D4A373] shadow-[0_8px_24px_rgba(43,16,6,0.5)] flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:border-[#E6C280] ${
                  isPlayingMusic ? "animate-sr-spin" : ""
                }`}
              >
                {/* Concentric Vinyl Grooves */}
                <div className="absolute inset-[3px] rounded-full border border-white/[0.08] pointer-events-none" />
                <div className="absolute inset-[7px] rounded-full border border-white/[0.05] pointer-events-none" />

                {/* Center Record Label (Warm Terracotta with Gold Ring) */}
                <div className="relative w-5 h-5 rounded-full bg-gradient-to-br from-[#8A4B32] via-[#6D341F] to-[#451C0E] border border-[#E6C280]/60 flex items-center justify-center shadow-inner">
                  {/* Center Spindle Hole & Musical Note SVG */}
                  <svg 
                    className="w-2.5 h-2.5 text-[#FAF5F0] filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]" 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                  >
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              </div>

              {/* Tooltip on Hover */}
              <div className="absolute -top-7 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-[#2B1006]/90 text-[#F5EDE2] text-[9px] tracking-wider font-sr-sans px-2 py-0.5 rounded-md border border-[#E6C280]/30 shadow-md whitespace-nowrap uppercase">
                {isPlayingMusic ? "Jeda Musik" : "Putar Musik"}
              </div>
            </button>
          </div>
</>
      )}

    </div>
  );
}
