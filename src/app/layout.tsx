import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/Toaster";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lumina — Cinematic Media Platform",
  description: "Watch, create and share cinematic stories. An original premium media platform.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://lumina-media.fly.dev"),
  openGraph: { title: "Lumina", description: "Watch, create and share cinematic stories.", type: "website" },
  robots: { index: true, follow: true },
};

// viewport-fit=cover: mobil brauzer safe-area (home indicator, gesture panel)
// to'g'ri hisoblanadi — pastki dock kesilib qolmaydi
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}>
      <body className="app-bg min-h-full">
        {/* Saqlangan theme paint'dan oldin qo'llanadi — light'da qora chaqnash bo'lmaydi */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('lumina:theme')==='light'){document.documentElement.classList.replace('dark','light');document.documentElement.style.colorScheme='light'}var l=localStorage.getItem('lumina:locale');if(l==='uz'||l==='ru'){document.documentElement.lang=l}}catch(e){}`,
          }}
        />
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
