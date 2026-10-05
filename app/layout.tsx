import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display, Great_Vibes } from "next/font/google";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const customSerif = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const customScript = Great_Vibes({
  variable: "--font-great-vibes",
  weight: "400",
  subsets: ["latin"],
});

import { supabase } from "../lib/supabase";

export async function generateMetadata(): Promise<Metadata> {
  const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || 'a99bab7e-6ed3-48f5-bc1d-23f134794f20';
  
  const { data: projectData } = await supabase
    .from('projects')
    .select('site_url, custom_domain')
    .eq('id', projectId)
    .maybeSingle();

  const { data: weddingData } = await supabase
    .from('wedding_details')
    .select('bride_name, groom_name, bride_nickname, groom_nickname, cover_photo_url, opening_photo_url')
    .eq('project_id', projectId)
    .maybeSingle();

  const data = {
    ...projectData,
    ...weddingData
  };

  const brideName = data?.bride_name || "Bride";
  const groomName = data?.groom_name || "Groom";
  const brideNick = data?.bride_nickname || "Bride";
  const groomNick = data?.groom_nickname || "Groom";
  const coverUrl = data?.cover_photo_url || data?.opening_photo_url || '/opengraph-image.jpg';
  const siteUrl = data?.custom_domain || data?.site_url || process.env.NEXT_PUBLIC_SITE_URL || 'https://serastory.com';

  const title = `${brideName.toUpperCase()} & ${groomName.toUpperCase()} Wedding Invitation`;
  const description = `The wedding celebration of ${brideName} & ${groomName}`;

  return {
    metadataBase: new URL(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`),
    title,
    description,
    openGraph: {
      title,
      description,
      url: siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`,
      siteName: `${brideNick} & ${groomNick} Wedding`,
      images: [
        {
          url: coverUrl,
          width: 1200,
          height: 630,
          alt: `${brideNick} & ${groomNick} Wedding Invitation`,
        },
      ],
      locale: 'id_ID',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [coverUrl],
    }
  };
}
 
import ClientSecurity from "./components/ClientSecurity";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${customSerif.variable} ${customScript.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClientSecurity />
        {children}
      </body>
    </html>
  );
}
