import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: 'SecureStream — Privacy-First Anonymous Video Chat',
    template: '%s | SecureStream',
  },
  description: 'Meet new people through AI-moderated anonymous video chat. No registration required. End-to-end encrypted with real-time content moderation.',
  keywords: [
    'anonymous video chat',
    'random video call',
    'omegle alternative',
    'private video chat',
    'AI moderated chat',
    'secure video calling',
    'no registration chat',
    'meet strangers',
    'video chat platform',
    'encrypted video call',
  ],
  authors: [{ name: 'SecureStream' }],
  creator: 'SecureStream',
  publisher: 'SecureStream',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://securestream.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'SecureStream — Privacy-First Anonymous Video Chat',
    description: 'Meet new people through AI-moderated anonymous video chat. No registration required.',
    siteName: 'SecureStream',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'SecureStream — Anonymous Video Chat',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SecureStream — Privacy-First Anonymous Video Chat',
    description: 'Meet new people through AI-moderated anonymous video chat. No registration required.',
    images: ['/og-image.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/logo.svg',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-950 text-white`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
