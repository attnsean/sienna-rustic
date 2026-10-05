"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { DbGuest, DbProject, DbEvent, DbWish, isDefaultStorageUrl } from "../../lib/resolveProject";

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
  const [isOpen, setIsOpen] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [activeNav, setActiveNav] = useState("home");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Couple Data with Fallbacks (Sopi & Fahri)
  const brideNickname = project?.bride_nickname || "Sopi";
  const groomNickname = project?.groom_nickname || "Fahri";
  const brideFull = project?.bride_name || "Sopiah";
  const groomFull = project?.groom_name || "Muhammad Fahri Rahman, S.Pd";
  const brideFather = (project as any)?.bride_father || "H. Endang Rusmana/juang";
  const brideMother = (project as any)?.bride_mother || "Hj. Dede Empid";
  const brideIg = (project as any)?.bride_instagram ? (project as any).bride_instagram.replace("@", "") : "sopizhrt";
  const groomFather = (project as any)?.groom_father || "H.M.Saepulloh.A.md.Kep.S.Ip";
  const groomMother = (project as any)?.groom_mother || "Hj.Een Cahyati,S.Pd";
  const groomIg = (project as any)?.groom_instagram ? (project as any).groom_instagram.replace("@", "") : "mfaahrirahman9";

  const coverPhoto = project?.cover_photo_url || project?.opening_photo_url || "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop";
  const bridePhoto = project?.bride_photo_url || "https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=800&auto=format&fit=crop";
  const groomPhoto = project?.groom_photo_url || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop";

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
    setIsOpen(true);
    setIsPlayingMusic(true);
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    setTimeout(() => {
      const heroEl = document.getElementById("hero-section");
      if (heroEl) {
        heroEl.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
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
    <div className="w-full md:w-[38%] lg:w-[35%] xl:w-[32%] min-h-[100dvh] md:h-[100dvh] md:overflow-y-auto md:overflow-x-hidden relative bg-[#f5ede2] text-[#3C2A21] shadow-2xl shrink-0">
      {/* Background Audio Player */}
      <audio 
        ref={audioRef} 
        loop 
        src={project?.music_url || "/audio/bgm.mp3"} 
        preload="none" 
      />

      {/* ========================================================================= */}
      {/* SECTION 1 - COVER MOBILE / OPENING SCREEN */}
      {/* Photo background + parchment overlay like Gambar 1 */}
      {/* ========================================================================= */}
      {!isOpen && (
        <section className="relative min-h-[100dvh] w-full flex flex-col justify-end items-center text-center px-6 pb-8 pt-0 overflow-hidden select-none bg-[#f5ede2]">
          
          {/* Base parchment background texture */}
          <div 
            className="absolute inset-0 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: `url('/assets/template/SR-bg.jpg')` }}
          />

          {/* User prewedding photo at top (100% full opacity, NO opacity overlay on photo, exactly like Gambar 2) */}
          <div className="absolute top-0 inset-x-0 h-[56%] pointer-events-none z-0 overflow-hidden">
            <img 
              src={coverPhoto} 
              alt={`${brideNickname} & ${groomNickname}`} 
              className="w-full h-full object-cover object-top"
            />
            {/* Smooth bottom gradient blend into parchment */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f5ede2] via-[#f5ede2]/80 to-transparent" />
          </div>

          {/* Animated Floral Corners at Bottom - Large and prominent like Gambar 2 */}
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

          {/* Center Info */}
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
        </section>
      )}

      {/* ========================================================================= */}
      {/* INVITATION CONTENT (AFTER BUKA UNDANGAN) */}
      {/* ========================================================================= */}
      {isOpen && (
        <div className="relative pb-24">
          
          {/* ===================================================================== */}
          {/* GAMBAR KE-3: SECTION 2 - HERO & COUNTDOWN */}
          {/* ===================================================================== */}
          <section id="hero-section" className="relative min-h-[100dvh] w-full flex flex-col items-center justify-between text-center px-6 py-12 overflow-hidden select-none bg-[#f5ede2]">
            {/* Background Texture */}
            <div 
              className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-90"
              style={{ backgroundImage: `url('/assets/template/SR-bg.jpg')` }}
            />

            {/* Animated Floral Corners - Section 2 (Enlarged and framing the arch photo like reference) */}
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

            <div className="relative z-20 w-full max-w-xs space-y-4 pt-4">
              <p className="font-sr-sans text-[11px] font-semibold tracking-[0.3em] uppercase text-[#3C2A21]/80">
                THE WEDDING OF
              </p>

              {/* Arch Photo with Couple */}
              <div className="relative mx-auto w-48 aspect-[3/4] rounded-t-full overflow-hidden shadow-2xl border-4 border-white/80">
                <img 
                  src={coverPhoto} 
                  alt={`${brideNickname} & ${groomNickname}`} 
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Couple Title & Date */}
              <div>
                <h2 className="font-sr-script text-4xl sm:text-5xl text-[#8A4B32] leading-tight font-medium">
                  {brideNickname} &amp; {groomNickname}
                </h2>
                <p className="font-sr-sans text-xs sm:text-sm font-medium text-[#4A3B32] mt-1">
                  {formattedDate}
                </p>
              </div>

              {/* 4 Countdown Boxes */}
              <div className="grid grid-cols-4 gap-2 pt-2 px-2">
                {[
                  { label: "Hari", val: timeLeft.days },
                  { label: "Jam", val: timeLeft.hours },
                  { label: "Menit", val: timeLeft.minutes },
                  { label: "Detik", val: timeLeft.seconds },
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="bg-[#8A4B32] text-white rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-md border border-[#A85A3C]"
                  >
                    <span className="font-sr-sans text-lg sm:text-xl font-bold leading-none">
                      {String(item.val).padStart(2, "0")}
                    </span>
                    <span className="font-sr-sans text-[9px] uppercase tracking-wider text-white/80 mt-1">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Simpan Tanggal Button */}
              <div className="pt-2 flex justify-center">
                <a 
                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=The+Wedding+of+${encodeURIComponent(brideNickname)}+%26+${encodeURIComponent(groomNickname)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-[#8A4B32] hover:bg-[#733B26] text-white font-sr-sans font-medium text-xs px-5 py-2 rounded-full shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <span>📅</span>
                  <span>Simpan Tanggal</span>
                </a>
              </div>

              {/* Bouncing Arrow Down */}
              <div className="pt-2 flex justify-center">
                <span className="text-[#8A4B32] text-lg animate-bounce">↓</span>
              </div>
            </div>

            <div className="h-4" />
          </section>

          {/* ===================================================================== */}
          {/* GAMBAR KE-4: SECTION 3 - AYAT SUCI (Q.S AR-RUM : 21) */}
          {/* ===================================================================== */}
          <section id="ayat-section" className="relative w-full px-6 py-10 overflow-hidden bg-[#8A4B32] text-white select-none shadow-md">
            <div className="max-w-md mx-auto text-center space-y-6 px-2 py-4">
              <p className="font-sr-sans text-xs sm:text-sm leading-relaxed text-white/95 italic font-light">
                &quot;Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.&quot;
              </p>

              <h3 className="font-sr-sans text-base sm:text-lg font-bold tracking-wide text-white">
                Q.S Ar-Rum : 21
              </h3>
            </div>
          </section>

          {/* ===================================================================== */}
          {/* GAMBAR KE-5: SECTION 4 - PROFIL MEMPELAI (BRIDE & GROOM) */}
          {/* ===================================================================== */}
          <section id="couple-section" className="relative w-full px-6 py-14 overflow-hidden select-none bg-[#f5ede2]">
            {/* Background Texture */}
            <div 
              className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-90"
              style={{ backgroundImage: `url('/assets/template/SR-bg.jpg')` }}
            />

            {/* Floral Corners - Correct matching assets, natural flush borders, no flat cutouts */}
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
              {/* Greetings */}
              <div className="space-y-2">
                <h4 className="font-sr-sans text-xs sm:text-sm font-bold text-[#3C2A21]">
                  Assalamu&apos;alaikum Warahmatullahi Wabarakatuh
                </h4>
                <p className="font-sr-sans text-[11px] leading-relaxed text-[#6E5D53]">
                  Maha Suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan. Ya Allah semoga ridho-Mu tercurah mengiringi pernikahan kami.
                </p>
              </div>

              {/* Mempelai Wanita (Bride) */}
              <div className="space-y-3 flex flex-col items-center">
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
                  <p className="font-semibold text-[11px]">Putri Keempat dari</p>
                  <p className="text-[11px] leading-tight">Bapak {brideFather} &amp; Ibu {brideMother}</p>
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
              </div>

              {/* Ampersand Divider */}
              <div className="font-sr-script text-4xl text-[#8A4B32] my-2">
                &amp;
              </div>

              {/* Mempelai Pria (Groom) */}
              <div className="space-y-3 flex flex-col items-center">
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
                  <p className="font-semibold text-[11px]">Putra Kedua dari</p>
                  <p className="text-[11px] leading-tight">Bapak {groomFather} &amp; Ibu {groomMother}</p>
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
              </div>
            </div>
          </section>

          {/* ===================================================================== */}
          {/* FLOATING CONTROLS: MUSIC & BOTTOM NAV (Pinned strictly to Right Sidebar) */}
          {/* ===================================================================== */}
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

          {/* Floating Bottom Navigation Bar (Centered within Right Sidebar on desktop, never spilling to left) */}
          <div className="fixed bottom-4 z-50 pointer-events-none w-full md:w-[38%] lg:w-[35%] xl:w-[32%] right-0 flex justify-center px-4">
            <nav className="pointer-events-auto bg-[#8A4B32]/90 backdrop-blur-md rounded-2xl px-3 py-2 shadow-2xl border border-white/20 flex items-center gap-1 sm:gap-2">
              {[
                { id: "hero-section", icon: "🏠", label: "Home" },
                { id: "couple-section", icon: "🤍", label: "Mempelai" },
                { id: "ayat-section", icon: "📖", label: "Ayat" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-sm sm:text-base transition-all ${
                    activeNav === item.id 
                      ? "bg-white/25 text-white shadow-inner scale-105" 
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                  title={item.label}
                >
                  {item.icon}
                </button>
              ))}
            </nav>
          </div>

        </div>
      )}
    </div>
  );
}
