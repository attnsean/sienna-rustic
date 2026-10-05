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
  const [copiedBank, setCopiedBank] = useState(false);
  const copyAccountNumber = (accountNo: string) => {
    navigator.clipboard.writeText(accountNo);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2500);
  };

  // RSVP Form State
  const [rsvpName, setRsvpName] = useState("");
  const [rsvpMessage, setRsvpMessage] = useState("");
  const [rsvpStatus, setRsvpStatus] = useState<"hadir" | "tidak_hadir">("hadir");
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);
  const [rsvpSuccessMsg, setRsvpSuccessMsg] = useState(false);

  // Wishes List State (Matching user reference image 4 + dynamic entries)
  const [wishesList, setWishesList] = useState([
    { name: "Erika", message: "Opiiii selamaaaattt😍 lancar sampai hari h yaaaa❤️", initial: "ER", color: "bg-[#5B8C5A]" },
    { name: "RAISA 8i N3RIZI", message: "selamat ya pak,semoga lancar sampai hari H'y,semoga jadi keluarga samawa,barokah dan langgeng bahagia dunia akhirat ya....aamiin", initial: "RN", color: "bg-[#56B4D3]" },
    { name: "Fajar ramadan", message: "Semoga lancar sampai akhir pak🫡", initial: "FR", color: "bg-[#E6C654]" },
    { name: "rafa", message: "Selamat menempuh hidup baru, semoga bahagia selalu!", initial: "RA", color: "bg-[#8A9BA8]" },
  ]);

  const handleSubmitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim() || !rsvpMessage.trim()) return;

    setIsSubmittingRsvp(true);
    try {
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
      };

      setWishesList((prev) => [newEntry, ...prev]);
      setRsvpName("");
      setRsvpMessage("");
      setRsvpSuccessMsg(true);
      setTimeout(() => setRsvpSuccessMsg(false), 3500);
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

          {/* User prewedding couple photo with exact alpha mask blend */}
          <div 
            className="absolute top-0 inset-x-0 h-[66%] pointer-events-none z-0 overflow-hidden"
            style={{
              maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 32%, rgba(0,0,0,0.85) 42%, rgba(0,0,0,0.35) 56%, rgba(0,0,0,0) 72%)",
              WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 32%, rgba(0,0,0,0.85) 42%, rgba(0,0,0,0.35) 56%, rgba(0,0,0,0) 72%)"
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
      <div className="relative min-h-[100dvh] pb-24">
        
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
          {/* Floral Corners */}
          <div className="absolute top-0 left-0 pointer-events-none z-10">
            <img src="/assets/template/SR-02.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain opacity-95" />
          </div>
          <div className="absolute top-0 right-0 pointer-events-none z-10">
            <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain opacity-95" />
          </div>
          <div className="absolute bottom-0 left-0 pointer-events-none z-10">
            <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain rotate-180 opacity-95" />
          </div>
          <div className="absolute bottom-0 right-0 pointer-events-none z-10">
            <img src="/assets/template/SR-03.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain opacity-95" />
          </div>

          <div className="relative z-20 max-w-sm mx-auto space-y-7">
            {/* Card 1: Akad Nikah */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="relative rounded-3xl p-6 sm:p-7 text-center shadow-2xl overflow-hidden border border-white/40 bg-[#f5ede2]"
              style={{ backgroundImage: `url(/assets/template/SR-bg.jpg)`, backgroundSize: "cover" }}
            >
              <h3 className="font-sr-script text-4xl sm:text-5xl text-[#8A4B32] font-semibold mb-3">
                Akad Nikah
              </h3>

              {/* Date Block with Vertical Dividers */}
              <div className="flex items-center justify-center gap-4 text-[#8A4B32] my-2">
                <span className="font-sr-sans text-sm sm:text-base font-semibold text-[#5C4A40]">Sabtu</span>
                <div className="h-10 w-[1.5px] bg-[#8A4B32]/35" />
                <div className="flex flex-col items-center">
                  <span className="font-sr-sans text-3xl sm:text-4xl font-extrabold leading-none text-[#8A4B32]">23</span>
                  <span className="font-sr-sans text-xs font-semibold text-[#8A4B32] tracking-wider mt-0.5">2026</span>
                </div>
                <div className="h-10 w-[1.5px] bg-[#8A4B32]/35" />
                <span className="font-sr-sans text-sm sm:text-base font-semibold text-[#5C4A40]">Mei</span>
              </div>

              {/* Time */}
              <div className="flex items-center justify-center gap-1.5 my-3 text-xs sm:text-sm font-bold text-[#3C2A21] font-sr-sans">
                <span>🕒</span>
                <span>08:00 WIB</span>
              </div>

              {/* Location */}
              <div className="mt-4 mb-5 space-y-1">
                <h5 className="font-sr-sans font-bold text-xs sm:text-sm text-[#8A4B32]">
                  Lokasi Acara
                </h5>
                <p className="font-sr-sans text-xs text-[#5C4A40] leading-relaxed px-2">
                  Villa Nusa Permai blok L 2/1 Dapur Dahar Desa Sukamulya Kecamatan Cugenang Cianjur
                </p>
              </div>

              {/* Google Maps Button */}
              <a 
                href="https://maps.google.com/?q=Villa+Nusa+Permai+blok+L+2/1+Dapur+Dahar+Desa+Sukamulya+Kecamatan+Cugenang+Cianjur" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#8A4B32] hover:bg-[#733B26] text-white font-sr-sans text-xs sm:text-sm font-medium px-6 py-2 rounded-full shadow-md active:scale-95 transition-all"
              >
                <span>📍</span>
                <span>Google Maps</span>
              </a>
            </motion.div>

            {/* Card 2: Resepsi */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.65, delay: 0.15, ease: "easeOut" }}
              className="relative rounded-3xl p-6 sm:p-7 text-center shadow-2xl overflow-hidden border border-white/40 bg-[#f5ede2]"
              style={{ backgroundImage: `url(/assets/template/SR-bg.jpg)`, backgroundSize: "cover" }}
            >
              <h3 className="font-sr-script text-4xl sm:text-5xl text-[#8A4B32] font-semibold mb-3">
                Resepsi
              </h3>

              {/* Date Block with Vertical Dividers */}
              <div className="flex items-center justify-center gap-4 text-[#8A4B32] my-2">
                <span className="font-sr-sans text-sm sm:text-base font-semibold text-[#5C4A40]">Sabtu</span>
                <div className="h-10 w-[1.5px] bg-[#8A4B32]/35" />
                <div className="flex flex-col items-center">
                  <span className="font-sr-sans text-3xl sm:text-4xl font-extrabold leading-none text-[#8A4B32]">23</span>
                  <span className="font-sr-sans text-xs font-semibold text-[#8A4B32] tracking-wider mt-0.5">2026</span>
                </div>
                <div className="h-10 w-[1.5px] bg-[#8A4B32]/35" />
                <span className="font-sr-sans text-sm sm:text-base font-semibold text-[#5C4A40]">Mei</span>
              </div>

              {/* Time */}
              <div className="flex items-center justify-center gap-1.5 my-3 text-xs sm:text-sm font-bold text-[#3C2A21] font-sr-sans">
                <span>🕒</span>
                <span>11:00 WIB</span>
              </div>

              {/* Location */}
              <div className="mt-4 mb-5 space-y-1">
                <h5 className="font-sr-sans font-bold text-xs sm:text-sm text-[#8A4B32]">
                  Lokasi Acara
                </h5>
                <p className="font-sr-sans text-xs text-[#5C4A40] leading-relaxed px-2">
                  Villa Nusa Permai blok L 2/1 Dapur Dahar Desa Sukamulya Kecamatan Cugenang Cianjur
                </p>
              </div>

              {/* Google Maps Button */}
              <a 
                href="https://maps.google.com/?q=Villa+Nusa+Permai+blok+L+2/1+Dapur+Dahar+Desa+Sukamulya+Kecamatan+Cugenang+Cianjur" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#8A4B32] hover:bg-[#733B26] text-white font-sr-sans text-xs sm:text-sm font-medium px-6 py-2 rounded-full shadow-md active:scale-95 transition-all"
              >
                <span>📍</span>
                <span>Google Maps</span>
              </a>
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

          {/* Floral Corners */}
          <div className="absolute top-0 left-0 pointer-events-none z-10">
            <img src="/assets/template/SR-02.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain" />
          </div>
          <div className="absolute top-0 right-0 pointer-events-none z-10">
            <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain" />
          </div>
          <div className="absolute bottom-0 left-0 pointer-events-none z-10">
            <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain rotate-180" />
          </div>
          <div className="absolute bottom-0 right-0 pointer-events-none z-10">
            <img src="/assets/template/SR-03.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain" />
          </div>

          <div className="relative z-20 max-w-sm mx-auto">
            {/* Title */}
            <motion.h3 
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="font-sr-script text-4xl sm:text-5xl text-[#8A4B32] font-semibold text-center mb-8"
            >
              Love Story
            </motion.h3>

            {/* Timeline Container */}
            <div className="relative pl-6 sm:pl-8 space-y-6">
              {/* Vertical Timeline Guide Line */}
              <div className="absolute left-[13px] sm:left-[17px] top-3 bottom-5 w-[2px] bg-[#8A4B32]/35" />

              {/* Story 1: Awal Kisah */}
              <motion.div 
                initial={{ opacity: 0, x: 25 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.25 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="relative"
              >
                {/* Node with heart */}
                <div className="absolute -left-[25px] sm:-left-[29px] top-3 w-6 h-6 rounded-full bg-[#8A4B32] flex items-center justify-center text-white text-[10px] shadow-md border-2 border-[#f5ede2] z-10">
                  ♥
                </div>

                {/* Speech Bubble Card */}
                <div className="relative bg-white rounded-2xl p-5 shadow-lg border border-[#8A4B32]/10 before:content-[''] before:absolute before:-left-2 before:top-4 before:w-0 before:h-0 before:border-y-8 before:border-y-transparent before:border-r-8 before:border-r-white">
                  <h4 className="font-sr-sans font-bold text-sm text-[#8A4B32] mb-2.5">
                    &quot; awal kisah &quot;
                  </h4>
                  <p className="font-sr-sans text-[11px] sm:text-xs text-[#5C4A40] leading-relaxed text-justify">
                    Tanpa sengaja semesta mempertemukan kami lewat dunia maya. Dari obrolan ringan di sosial media instagram, kami pertama bertemu pada tanggal 05 Maret 2024, tidak ada yang pernah menyangka bahwa dari pertemuan itu tumbuh rasa hangat hingga hati kami sepakat untuk saling menjaga. Perjalanan kami bukan hanya tentang kebahagiaan, tapi tentang proses saling mendewasakan. Kami belajar menyatukan perbedaan, membangun fondasi kepercayaan, dan meyakini bahwa setiap tantangan adalah cara kami untuk semakin kokoh sebagai satu kesatuan.
                  </p>
                </div>
              </motion.div>

              {/* Story 2: Lamaran */}
              <motion.div 
                initial={{ opacity: 0, x: 25 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.25 }}
                transition={{ duration: 0.65, delay: 0.1, ease: "easeOut" }}
                className="relative"
              >
                {/* Node with heart */}
                <div className="absolute -left-[25px] sm:-left-[29px] top-3 w-6 h-6 rounded-full bg-[#8A4B32] flex items-center justify-center text-white text-[10px] shadow-md border-2 border-[#f5ede2] z-10">
                  ♥
                </div>

                {/* Speech Bubble Card */}
                <div className="relative bg-white rounded-2xl p-5 shadow-lg border border-[#8A4B32]/10 before:content-[''] before:absolute before:-left-2 before:top-4 before:w-0 before:h-0 before:border-y-8 before:border-y-transparent before:border-r-8 before:border-r-white">
                  <h4 className="font-sr-sans font-bold text-sm text-[#8A4B32] mb-2.5">
                    &quot; lamaran &quot;
                  </h4>
                  <p className="font-sr-sans text-[11px] sm:text-xs text-[#5C4A40] leading-relaxed text-justify">
                    Kehendak-Nya menuntun kami pada sebuah ikatan suci yang di cintai-Nya. Di titik ini, kami memilih untuk berhenti mencari. Momen lamaran berlangsung pada tanggal 29 Maret 2026 menjadi bukti nyata dari kesungguhan hati-sebuah pernyataan bahwa kami siap melangkah lebih jauh.
                  </p>
                </div>
              </motion.div>

              {/* Story 3: Awal Selamanya */}
              <motion.div 
                initial={{ opacity: 0, x: 25 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.25 }}
                transition={{ duration: 0.65, delay: 0.2, ease: "easeOut" }}
                className="relative"
              >
                {/* Node with heart */}
                <div className="absolute -left-[25px] sm:-left-[29px] top-3 w-6 h-6 rounded-full bg-[#8A4B32] flex items-center justify-center text-white text-[10px] shadow-md border-2 border-[#f5ede2] z-10">
                  ♥
                </div>

                {/* Speech Bubble Card */}
                <div className="relative bg-white rounded-2xl p-5 shadow-lg border border-[#8A4B32]/10 before:content-[''] before:absolute before:-left-2 before:top-4 before:w-0 before:h-0 before:border-y-8 before:border-y-transparent before:border-r-8 before:border-r-white">
                  <h4 className="font-sr-sans font-bold text-sm text-[#8A4B32] mb-2.5">
                    &quot; awal selamanya &quot;
                  </h4>
                  <p className="font-sr-sans text-[11px] sm:text-xs text-[#5C4A40] leading-relaxed text-justify">
                    Hari ini, dua doa menyatu menjadi satu tujuan. Di hadapan sang pencipta, kami mengukir janji suci untuk memulai hidup baru. Pernikahan ini bukanlah akhir, melainkan gerbang menuju petualangan abadi yang kami tempuh bersama.
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

          {/* Floral Corners */}
          <div className="absolute top-0 left-0 pointer-events-none z-10">
            <img src="/assets/template/SR-02.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain" />
          </div>
          <div className="absolute top-0 right-0 pointer-events-none z-10">
            <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain" />
          </div>
          <div className="absolute bottom-0 left-0 pointer-events-none z-10">
            <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain rotate-180" />
          </div>
          <div className="absolute bottom-0 right-0 pointer-events-none z-10">
            <img src="/assets/template/SR-03.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain" />
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
          {/* Floral Corners */}
          <div className="absolute top-0 left-0 pointer-events-none z-10">
            <img src="/assets/template/SR-02.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain opacity-95" />
          </div>
          <div className="absolute top-0 right-0 pointer-events-none z-10">
            <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain opacity-95" />
          </div>
          <div className="absolute bottom-0 left-0 pointer-events-none z-10">
            <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain rotate-180 opacity-95" />
          </div>
          <div className="absolute bottom-0 right-0 pointer-events-none z-10">
            <img src="/assets/template/SR-03.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain opacity-95" />
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
              <h3 className="font-sr-script text-4xl sm:text-5xl font-medium text-white">
                Wedding Gift
              </h3>
              <p className="font-sr-sans text-xs text-white/90 leading-relaxed px-4">
                Doa Restu Anda merupakan karunia yang sangat berarti bagi kami. Dan jika memberi adalah ungkapan tanda kasih, Anda dapat memberi melalui dibawah ini.
              </p>
            </motion.div>

            {/* ATM Debit Card Matching Reference */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 25 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="relative rounded-3xl p-6 sm:p-7 text-left shadow-2xl overflow-hidden border border-white/40 bg-[#f5ede2] text-[#3C2A21] max-w-xs mx-auto"
              style={{ backgroundImage: `url(/assets/template/SR-bg.jpg)`, backgroundSize: "cover" }}
            >
              {/* Card Top Row: BCA Logo & EMV Chip */}
              <div className="flex items-center justify-between mb-6">
                {/* BCA Badge */}
                <div className="bg-white rounded-lg px-2.5 py-1 shadow-sm border border-[#8A4B32]/10 flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-[#00529C] flex items-center justify-center text-[9px] text-white font-bold">
                    B
                  </div>
                  <span className="font-sans font-extrabold text-sm tracking-wider text-[#00529C]">BCA</span>
                </div>

                {/* EMV Gold Chip Icon */}
                <div className="w-10 h-8 rounded-md bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 border border-amber-600/50 shadow-inner flex flex-col justify-around p-1">
                  <div className="w-full h-[1px] bg-amber-700/40" />
                  <div className="w-full h-[1px] bg-amber-700/40" />
                </div>
              </div>

              {/* No Rekening */}
              <div className="space-y-0.5 mb-4">
                <span className="font-sr-sans text-[11px] font-semibold text-[#6E5D53]">
                  No Rekening
                </span>
                <p className="font-sr-sans text-xl sm:text-2xl font-bold tracking-wider text-[#3C2A21] font-mono">
                  3480994875
                </p>
              </div>

              {/* Atas Nama & Copy Button */}
              <div className="flex items-end justify-between pt-1">
                <div>
                  <span className="font-sr-sans text-[11px] font-semibold text-[#6E5D53]">
                    Atas Nama
                  </span>
                  <p className="font-sr-sans text-sm font-bold italic text-[#3C2A21]">
                    Sopiah
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => copyAccountNumber("3480994875")}
                  className="inline-flex items-center gap-1.5 bg-[#8A4B32] hover:bg-[#733B26] text-white font-sr-sans text-xs px-4 py-1.5 rounded-full shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <span>📋</span>
                  <span>{copiedBank ? "Tersalin!" : "Salin"}</span>
                </button>
              </div>
            </motion.div>
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

          {/* Floral Corners */}
          <div className="absolute top-0 left-0 pointer-events-none z-10">
            <img src="/assets/template/SR-02.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain" />
          </div>
          <div className="absolute top-0 right-0 pointer-events-none z-10">
            <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain" />
          </div>
          <div className="absolute bottom-0 left-0 pointer-events-none z-10">
            <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain rotate-180" />
          </div>
          <div className="absolute bottom-0 right-0 pointer-events-none z-10">
            <img src="/assets/template/SR-03.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain" />
          </div>

          <div className="relative z-20 max-w-sm mx-auto space-y-6">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center space-y-1.5"
            >
              <h3 className="font-sr-script text-4xl sm:text-5xl text-[#8A4B32] font-semibold">
                Ucapan &amp; RSVP
              </h3>
              <p className="font-sr-sans text-xs text-[#5C4A40]">
                Berikan doa dan ucapan terbaik untuk kami.
              </p>
            </motion.div>

            {/* RSVP Form Card */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="relative rounded-3xl p-5 sm:p-6 bg-white/70 backdrop-blur-sm border border-[#8A4B32]/25 shadow-xl space-y-4"
            >
              <form onSubmit={handleSubmitRsvp} className="space-y-3.5">
                <div>
                  <input 
                    type="text"
                    required
                    value={rsvpName}
                    onChange={(e) => setRsvpName(e.target.value)}
                    placeholder="nama" 
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#8A4B32]/30 bg-white text-xs sm:text-sm text-[#3C2A21] placeholder-[#8A4B32]/50 focus:outline-none focus:border-[#8A4B32] shadow-inner"
                  />
                </div>

                <div>
                  <textarea 
                    required
                    rows={3}
                    value={rsvpMessage}
                    onChange={(e) => setRsvpMessage(e.target.value)}
                    placeholder="Ucapan" 
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#8A4B32]/30 bg-white text-xs sm:text-sm text-[#3C2A21] placeholder-[#8A4B32]/50 focus:outline-none focus:border-[#8A4B32] shadow-inner resize-none"
                  />
                </div>

                {/* Divider Line */}
                <div className="flex items-center gap-2 pt-1 pb-0.5">
                  <div className="flex-1 h-[1px] bg-[#8A4B32]/25" />
                  <span className="font-sr-sans text-[11px] font-semibold text-[#8A4B32] whitespace-nowrap">
                    Konfirmasi Kehadiran
                  </span>
                  <div className="flex-1 h-[1px] bg-[#8A4B32]/25" />
                </div>

                {/* Attendance Toggle */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRsvpStatus("hadir")}
                    className={`py-2 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      rsvpStatus === "hadir"
                        ? "bg-[#8A4B32] text-white shadow-md"
                        : "bg-[#e5d8cb] text-[#5C4A40] hover:bg-[#d8c8b8]"
                    }`}
                  >
                    <span>✔</span>
                    <span>Hadir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRsvpStatus("tidak_hadir")}
                    className={`py-2 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      rsvpStatus === "tidak_hadir"
                        ? "bg-[#8A4B32] text-white shadow-md"
                        : "bg-[#e5d8cb] text-[#5C4A40] hover:bg-[#d8c8b8]"
                    }`}
                  >
                    <span>✖</span>
                    <span>Tidak Hadir</span>
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmittingRsvp}
                  className="w-full py-2.5 rounded-full bg-[#8A4B32] hover:bg-[#733B26] text-white font-sr-sans font-semibold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer mt-2 disabled:opacity-70"
                >
                  {isSubmittingRsvp ? "Mengirim..." : "Kirim"}
                </button>

                {rsvpSuccessMsg && (
                  <p className="text-center font-sr-sans text-xs text-green-700 font-semibold pt-1">
                    ✓ Terima kasih! Ucapan Anda berhasil terkirim.
                  </p>
                )}
              </form>

              {/* Wishes List Container */}
              <div className="pt-3 space-y-3 max-h-72 overflow-y-auto pr-1">
                {wishesList.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5"
                  >
                    {/* Circle Avatar with Initials */}
                    <div className={`w-8 h-8 rounded-full ${item.color} text-white flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm`}>
                      {item.initial}
                    </div>

                    {/* Speech Box */}
                    <div className="flex-1 bg-white rounded-xl p-3 shadow-sm border border-[#8A4B32]/10 space-y-0.5">
                      <h5 className="font-sr-sans font-bold text-xs text-[#8A4B32]">
                        {item.name}
                      </h5>
                      <p className="font-sr-sans text-[11px] text-[#5C4A40] leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* SECTION 10 - TERIMA KASIH & FOOTER (Matching Referensi Gambar 5) */}
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

          {/* Floral Corners */}
          <div className="absolute top-0 left-0 pointer-events-none z-10">
            <img src="/assets/template/SR-02.png" alt="Floral" className="w-32 sm:w-40 h-auto object-contain" />
          </div>
          <div className="absolute top-0 right-0 pointer-events-none z-10">
            <img src="/assets/template/SR-01.png" alt="Floral" className="w-24 sm:w-32 h-auto object-contain" />
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
                <img 
                  src="/assets/template/arch-wing-left.png" 
                  alt="Floral Wing Left" 
                  className="absolute -left-[68px] sm:-left-[76px] bottom-0 h-[105%] w-auto object-contain pointer-events-none" 
                />
                <img 
                  src="/assets/template/arch-wing-right.png" 
                  alt="Floral Wing Right" 
                  className="absolute -right-[68px] sm:-right-[76px] bottom-0 h-[105%] w-auto object-contain pointer-events-none" 
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

          {/* Footer Branding Matching Reference */}
          <footer className="relative z-20 bg-[#8A4B32] text-white pt-8 pb-24 text-center px-4">
            <div className="max-w-xs mx-auto space-y-3">
              {/* Brand Logo */}
              <div className="inline-flex items-center gap-2 justify-center">
                <div className="w-6 h-6 rounded-lg bg-[#2DD4BF] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  i
                </div>
                <span className="font-sans font-semibold text-sm tracking-wide text-white">invisimple.id</span>
              </div>

              {/* Social Links */}
              <div className="flex items-center justify-center gap-3 text-[11px] text-white/90 font-sr-sans pt-1">
                <span className="flex items-center gap-1">📸 invisimple.id</span>
                <span>•</span>
                <span className="flex items-center gap-1">💬 0851 50000 715</span>
                <span>•</span>
                <span className="flex items-center gap-1">🎵 invisimple.id</span>
              </div>

              <p className="font-sr-sans text-[10px] tracking-[0.25em] uppercase text-white/70 pt-2 font-medium">
                HUBUNGI KAMI
              </p>
            </div>
          </footer>
        </section>

      </div>

      {/* ===================================================================== */}
      {/* FLOATING CONTROLS: MUSIC & BOTTOM NAV (Hanya muncul saat dibuka) */}
      {/* ===================================================================== */}
      {isOpened && (
        <>
          {/* Floating Rotating Music Disc */}
          <div className="fixed bottom-20 z-50 pointer-events-none w-full md:w-[38%] lg:w-[35%] xl:w-[32%] right-0 flex justify-end px-4 sm:px-6">
            <button
              type="button"
              onClick={toggleMusic}
              aria-label="Toggle Music"
              className="pointer-events-auto w-11 h-11 rounded-full bg-[#1A1A1A] border-2 border-[#8A4B32] shadow-2xl flex items-center justify-center cursor-pointer group active:scale-90 transition-transform"
            >
              <div className={`w-8 h-8 rounded-full bg-[#8A4B32] flex items-center justify-center ${isPlayingMusic ? "animate-sr-spin" : ""}`}>
                <span className="text-white text-xs">🎵</span>
              </div>
            </button>
          </div>

          {/* Floating Bottom Navigation Bar (6 ikon cokelat matching referensi) */}
          <div className="fixed bottom-4 z-50 pointer-events-none w-full md:w-[38%] lg:w-[35%] xl:w-[32%] right-0 flex justify-center px-4">
            <nav className="pointer-events-auto bg-[#8A4B32]/95 backdrop-blur-md rounded-2xl px-2.5 py-1.5 shadow-2xl border border-white/20 flex items-center gap-1 sm:gap-1.5">
              {[
                { id: "hero-section", icon: "🏠", label: "Home" },
                { id: "couple-section", icon: "🤍", label: "Mempelai" },
                { id: "event-section", icon: "📅", label: "Acara" },
                { id: "gallery-section", icon: "📷", label: "Galeri" },
                { id: "gift-section", icon: "🎁", label: "Kado" },
                { id: "rsvp-section", icon: "💬", label: "Ucapan" },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-xs sm:text-sm text-white/90 hover:text-white hover:bg-white/20 transition-all active:scale-95"
                  title={item.label}
                >
                  {item.icon}
                </button>
              ))}
            </nav>
          </div>
        </>
      )}

    </div>
  );
}
