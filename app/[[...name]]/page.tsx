import React from "react";
import Image from "next/image";
import RightSidebar from "../components/RightSidebar";
import { headers } from "next/headers";
import { resolveProjectData } from "../../lib/resolveProject";
import type { Metadata } from "next";

export const revalidate = 0;

type Props = {
  params: Promise<{ name?: string[] }>;
};

const formatFallbackGuestName = (raw: string): string => {
  let name = raw;
  try {
    name = decodeURIComponent(raw);
  } catch {}
  name = name
    .replace(/%20/g, " ")
    .replace(/%25/g, " ")
    .replace(/%/g, " ")
    .replace(/\+/g, " ")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return name
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  let guestName = "Tamu Undangan";
  const slug = resolvedParams?.name && resolvedParams.name.length > 0 ? resolvedParams.name[0] : undefined;

  const headersList = await headers();
  const host = headersList.get("host") || undefined;

  const dbData = await resolveProjectData(slug, host);

  if (dbData.guest) {
    guestName = dbData.guest.name;
  } else if (resolvedParams?.name && resolvedParams.name.length > 0) {
    guestName = formatFallbackGuestName(resolvedParams.name.join(" "));
  }

  const brideName = dbData.project?.bride_nickname || "Nathalie";
  const groomName = dbData.project?.groom_nickname || "Marvel";
  const brideFull = dbData.project?.bride_name || "Nathalie";
  const groomFull = dbData.project?.groom_name || "Marvel";

  const title = `Undangan Pernikahan untuk ${guestName} | ${brideName} & ${groomName}`;
  const description = `Kepada Yth. ${guestName}, kami mengundang Anda untuk hadir di pernikahan ${brideFull} & ${groomFull}.`;
  const imageUrl = dbData.project?.cover_photo_url || dbData.project?.opening_photo_url || "/assets/template/SR-bg.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: `Pernikahan ${brideName} & ${groomName}`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `Undangan Pernikahan ${brideName} & ${groomName}`,
        },
      ],
      locale: "id_ID",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function Home({ params }: Props) {
  const resolvedParams = await params;
  let guestName = "Syipa";
  const slug = resolvedParams?.name && resolvedParams.name.length > 0 ? resolvedParams.name[0] : undefined;

  const headersList = await headers();
  const host = headersList.get("host") || undefined;

  const dbData = await resolveProjectData(slug, host);

  // Check project status
  const isLive = dbData.project ? dbData.project.status === "live" : true;
  const subscription = dbData.project?.subscriptions;
  const isExpired = subscription && (
    subscription.status === "expired" || 
    (subscription.expires_at && new Date(subscription.expires_at) < new Date())
  );

  if (dbData.project && (!isLive || isExpired)) {
    return (
      <main className="min-h-[100dvh] w-full flex items-center justify-center bg-neutral-950 px-4">
        <div className="max-w-md w-full text-center space-y-6 p-8 rounded-3xl bg-neutral-900 border border-neutral-800 text-white">
          <h2 className="text-2xl font-serif text-neutral-200">Undangan Nonaktif</h2>
          <p className="text-sm text-neutral-400">
            Masa aktif undangan pernikahan digital ini telah selesai.
          </p>
        </div>
      </main>
    );
  }

  if (dbData.guest) {
    guestName = dbData.guest.name;
  } else if (resolvedParams?.name && resolvedParams.name.length > 0) {
    guestName = formatFallbackGuestName(resolvedParams.name.join(" "));
  }

  const brideNickname = dbData.project?.bride_nickname || "Nathalie";
  const groomNickname = dbData.project?.groom_nickname || "Marvel";
  const weddingDateRaw = dbData.events?.[0]?.event_date || dbData.project?.wedding_date || "2026-05-23";

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
  const coverPhoto = dbData.project?.cover_photo_url || dbData.project?.opening_photo_url || "/assets/template/couple-cover.jpg";

  return (
    <main className="min-h-[100dvh] md:h-[100dvh] w-full flex flex-col md:flex-row bg-[#e8ded1] text-[#3C2A21] md:overflow-hidden relative">
      
      {/* Gambar ke-1: Left side Desktop 2-Column Cover (Hidden on mobile, Fixed on Desktop) */}
      <aside className="hidden md:flex relative md:w-[62%] lg:w-[65%] xl:w-[68%] md:h-[100dvh] shrink-0 items-center justify-center overflow-hidden bg-[#f5ede2] border-r border-[#8A4B32]/20 select-none">
        {/* Layer 1: Parchment texture background */}
        <div 
          className="absolute inset-0 pointer-events-none z-0 select-none bg-cover bg-center opacity-95"
          style={{ backgroundImage: `url('/assets/template/SR-bg.jpg')` }}
        />

        {/* Animated Floral Corners (Zoom in Zoom out) - Large & prominent matching Gambar 2 reference */}
        {/* Top-Left: SR-02.png flush in top-0 left-0 */}
        <div className="absolute top-0 left-0 pointer-events-none z-10">
          <div className="animate-sr-pulse origin-top-left">
            <img 
              src="/assets/template/SR-02.png" 
              alt="Floral" 
              className="w-36 md:w-44 lg:w-52 xl:w-60 h-auto object-contain select-none" 
            />
          </div>
        </div>

        {/* Top-Right: SR-01.png flush in top-0 right-0 */}
        <div className="absolute top-0 right-0 pointer-events-none z-10">
          <div className="animate-sr-pulse-delay origin-top-right">
            <img 
              src="/assets/template/SR-01.png" 
              alt="Floral" 
              className="w-20 md:w-26 lg:w-30 xl:w-34 h-auto object-contain select-none" 
            />
          </div>
        </div>

        {/* Bottom-Left: SR-01.png rotated 180 flush in bottom-0 left-0 */}
        <div className="absolute bottom-0 left-0 pointer-events-none z-10">
          <div className="animate-sr-pulse-alt origin-bottom-left">
            <img 
              src="/assets/template/SR-01.png" 
              alt="Floral" 
              className="w-24 md:w-30 lg:w-34 xl:w-38 h-auto object-contain select-none rotate-180" 
            />
          </div>
        </div>

        {/* Bottom-Right: SR-03.png flush in bottom-0 right-0 */}
        <div className="absolute bottom-0 right-0 pointer-events-none z-10">
          <div className="animate-sr-pulse origin-bottom-right">
            <img 
              src="/assets/template/SR-03.png" 
              alt="Floral" 
              className="w-36 md:w-44 lg:w-52 xl:w-60 h-auto object-contain select-none" 
            />
          </div>
        </div>

        {/* Vertical Scroll Indicator on Right Border (Gambar 1) */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[10px] font-sr-sans text-[#3C2A21]/50 tracking-[0.25em] flex items-center gap-2 select-none pointer-events-none z-20">
          <span className="w-3 h-[1px] bg-[#3C2A21]/40 inline-block"></span>
          <span>scroll</span>
        </div>

        {/* Center Typography (Gambar 1: Clean text directly on parchment background, NO white card!) */}
        <div className="relative z-20 text-center select-none px-6 space-y-2">
          <p className="font-sr-sans text-xs lg:text-sm font-medium tracking-[0.35em] uppercase text-[#3C2A21]/80">
            THE WEDDING OF
          </p>

          <h1 className="font-sr-script text-6xl md:text-7xl lg:text-8xl text-[#8A4B32] leading-tight font-medium my-1 drop-shadow-sm">
            {brideNickname} &amp; {groomNickname}
          </h1>

          <p className="font-sr-sans text-sm lg:text-base font-medium text-[#4A3B32] tracking-wider">
            {formattedDate}
          </p>
        </div>
      </aside>

      {/* Right side: Mobile-style Invitation Scrollable Container */}
      <RightSidebar 
        guestName={guestName} 
        guest={dbData.guest}
        project={dbData.project}
        events={dbData.events}
        wishes={dbData.wishes}
        stats={dbData.stats}
      />
      
    </main>
  );
}
