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

  const brideName = dbData.project?.bride_nickname || "Sopi";
  const groomName = dbData.project?.groom_nickname || "Fahri";
  const brideFull = dbData.project?.bride_name || "Sopiah";
  const groomFull = dbData.project?.groom_name || "Muhammad Fahri Rahman, S.Pd";

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

  const brideNickname = dbData.project?.bride_nickname || "Sopi";
  const groomNickname = dbData.project?.groom_nickname || "Fahri";
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

  return (
    <main className="min-h-[100dvh] w-full flex flex-col md:flex-row bg-[#e8ded1] text-[#3C2A21] overflow-hidden relative">
      
      {/* Gambar ke-1: Left side Desktop 2-Column Cover (Hidden on mobile) */}
      <aside className="hidden md:flex relative md:w-[50%] lg:w-[55%] xl:w-[58%] md:h-[100dvh] sticky top-0 items-center justify-center overflow-hidden bg-[#f5ede2] border-r border-[#8A4B32]/20">
        {/* Background Texture SR-bg.jpg */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-95 select-none pointer-events-none"
          style={{ backgroundImage: `url('/assets/template/SR-bg.jpg')` }}
        />

        {/* Animated Floral Corners (Zoom in Zoom out) */}
        <div className="absolute top-2 left-2 w-48 lg:w-60 h-auto pointer-events-none z-10 animate-sr-pulse">
          <img src="/assets/template/SR-01.png" alt="Floral" className="w-full h-auto object-contain drop-shadow-md" />
        </div>
        <div className="absolute top-2 right-2 w-48 lg:w-60 h-auto pointer-events-none z-10 animate-sr-pulse-delay scale-x-[-1]">
          <img src="/assets/template/SR-01.png" alt="Floral" className="w-full h-auto object-contain drop-shadow-md" />
        </div>
        <div className="absolute bottom-2 left-2 w-48 lg:w-60 h-auto pointer-events-none z-10 animate-sr-pulse-alt">
          <img src="/assets/template/SR-02.png" alt="Floral" className="w-full h-auto object-contain drop-shadow-md" />
        </div>
        <div className="absolute bottom-2 right-2 w-48 lg:w-60 h-auto pointer-events-none z-10 animate-sr-pulse scale-x-[-1]">
          <img src="/assets/template/SR-02.png" alt="Floral" className="w-full h-auto object-contain drop-shadow-md" />
        </div>

        {/* Center Typography Card (Gambar ke-1 Kiri) */}
        <div className="relative z-20 text-center px-8 py-12 rounded-3xl bg-white/40 backdrop-blur-[2px] border border-[#8A4B32]/20 shadow-xl max-w-md mx-6 space-y-3">
          <p className="text-xs font-semibold tracking-[0.35em] uppercase text-[#3C2A21]/80">
            THE WEDDING OF
          </p>

          <h1 className="font-sr-script text-5xl lg:text-6xl text-[#8A4B32] leading-tight font-medium drop-shadow-sm">
            {brideNickname} &amp; {groomNickname}
          </h1>

          <div className="h-0.5 w-16 bg-[#8A4B32]/40 mx-auto my-2" />

          <p className="text-sm font-medium text-[#4A3B32] tracking-wider">
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
