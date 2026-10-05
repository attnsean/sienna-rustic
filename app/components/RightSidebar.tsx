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
  const bridePhoto = project?.bride_photo_url || "/assets/template/couple-cover.jpg";
  const groomPhoto = project?.groom_photo_url || "/assets/template/couple-cover.jpg";

  // Event Info
  const mainEvent = events && events.length > 0 ? events[0] : null;
  const weddingDateRaw = mainEvent?.event_date || project?.wedding_date || "2026-05-23";

  // Countdown timer calculations
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
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
          className="relative min-h-[100dvh] w-full flex flex-col items-center justify-between text-center px-6 py-10 overflow-hidden select-none bg-[#f5ede2]"
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
          <div className="relative z-20 w-full max-w-xs space-y-3 pt-2">
            
            {/* Widget 1: Heading Text */}
            <motion.p 
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="font-sr-sans text-[11px] font-semibold tracking-[0.3em] uppercase text-[#3C2A21]/80"
            >
              THE WEDDING OF
            </motion.p>

            {/* Widget 2: Arch Photo Dome with Rotated Floral Wings (Matching Gambar 3) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.88, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative mx-auto my-2 w-[235px] sm:w-[260px] aspect-square flex items-center justify-center select-none"
            >
              {/* Floral Wing Left - SR-01 rotated 180 degrees mirrored */}
              <img 
                src="/assets/template/arch-wing-left.png" 
                alt="Floral Wing Left" 
                className="absolute -left-[75px] sm:-left-[84px] -top-[4px] h-[107%] w-auto object-contain pointer-events-none z-10 select-none" 
              />

              {/* Floral Wing Right - SR-01 rotated 180 degrees */}
              <img 
                src="/assets/template/arch-wing-right.png" 
                alt="Floral Wing Right" 
                className="absolute -right-[75px] sm:-right-[84px] -top-[4px] h-[107%] w-auto object-contain pointer-events-none z-10 select-none" 
              />

              {/* Arch Photo Dome */}
              <div className="relative z-20 w-full h-full rounded-t-full rounded-b-none overflow-hidden shadow-2xl border-[3.5px] border-white bg-[#e0d6c7]">
                <img 
                  src={coverPhoto} 
                  alt={`${brideNickname} & ${groomNickname}`} 
                  className="w-full h-full object-cover object-[center_28%]" 
                />
              </div>
            </motion.div>

            {/* Widget 3: Couple Title & Date */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
            >
              <h2 className="font-sr-script text-4xl sm:text-5xl text-[#8A4B32] leading-tight font-medium drop-shadow-sm">
                {brideNickname} &amp; {groomNickname}
              </h2>
              <p className="font-sr-sans text-xs sm:text-sm font-medium text-[#4A3B32] mt-1 tracking-wide">
                {formattedDate}
              </p>
            </motion.div>

            {/* Widget 4: 4 Countdown Boxes (Per-box staggered animation) */}
            <div className="grid grid-cols-4 gap-2 pt-1 px-1 w-full max-w-[280px] mx-auto">
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
                  className="bg-[#8A4B32] text-white rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-md border border-[#A85A3C]"
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
              className="pt-1 flex flex-col items-center gap-2.5"
            >
              <a 
                href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=The+Wedding+of+${encodeURIComponent(brideNickname)}+%26+${encodeURIComponent(groomNickname)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#8A4B32] hover:bg-[#733B26] text-white font-sr-sans font-medium text-xs px-5 py-2.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <span>📅</span>
                <span>Simpan Tanggal</span>
              </a>

              {/* Bouncing Arrow Down */}
              <span className="text-[#8A4B32] text-lg animate-bounce pt-0.5">↓</span>
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
                { id: "hero-section", icon: "📅", label: "Tanggal" },
                { id: "couple-section", icon: "📷", label: "Galeri" },
                { id: "couple-section", icon: "🎁", label: "Kado" },
                { id: "couple-section", icon: "💬", label: "Ucapan" },
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
