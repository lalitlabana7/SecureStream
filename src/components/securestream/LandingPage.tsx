'use client';

import { m } from 'framer-motion';
import { Shield, Lock, Eye, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrustBadge } from './TrustBadge';

interface LandingPageProps {
  onStart: () => void;
  trustScore: number;
}

export function LandingPage({ onStart, trustScore }: LandingPageProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SecureStream',
    description: 'Privacy-first anonymous video chat with AI moderation',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://securestream.app',
    applicationCategory: 'Social Networking',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    browserRequirements: 'Requires JavaScript. Requires WebRTC support.',
    featureList: [
      'Anonymous video chat',
      'AI content moderation',
      'No registration required',
      'Trust scoring system',
      'Real-time content filtering',
    ],
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-transparent to-neutral-950 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Shield icon with glow */}
      <m.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 200 }}
        className="relative mb-8"
      >
        <m.div
          animate={{
            boxShadow: [
              '0 0 20px rgba(16,185,129,0.3)',
              '0 0 60px rgba(16,185,129,0.6)',
              '0 0 20px rgba(16,185,129,0.3)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-neutral-900 border border-emerald-500/30 flex items-center justify-center"
        >
          <Shield className="w-12 h-12 md:w-16 md:h-16 text-emerald-500" strokeWidth={1.5} />
        </m.div>
      </m.div>

      {/* Title */}
      <m.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-4xl md:text-6xl font-bold text-white mb-3 tracking-tight"
      >
        Secure<span className="text-emerald-500">Stream</span>
      </m.h1>

      {/* Tagline */}
      <m.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="text-neutral-400 text-base md:text-lg mb-8 text-center max-w-md"
      >
        Privacy-first anonymous video chat
      </m.p>

      {/* Feature badges */}
      <m.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="flex flex-wrap gap-3 mb-10 justify-center"
      >
        <Badge
          variant="outline"
          className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 text-sm gap-2"
        >
          <Lock className="w-3.5 h-3.5" />
          Encrypted
        </Badge>
        <Badge
          variant="outline"
          className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 text-sm gap-2"
        >
          <Shield className="w-3.5 h-3.5" />
          AI Moderated
        </Badge>
        <Badge
          variant="outline"
          className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 text-sm gap-2"
        >
          <Eye className="w-3.5 h-3.5" />
          Anonymous
        </Badge>
      </m.div>

      {/* Trust score badge */}
      {trustScore > 0 && (
        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mb-8"
        >
          <TrustBadge score={trustScore} />
        </m.div>
      )}

      {/* Start button */}
      <m.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="mb-6"
      >
        <Button
          onClick={onStart}
          size="lg"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base md:text-lg px-8 py-6 rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95"
        >
          <Zap className="w-5 h-5 mr-2" />
          Start Chat
        </Button>
      </m.div>

      {/* Footer */}
      <m.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="text-neutral-600 text-xs text-center absolute bottom-6"
      >
        By continuing, you agree to our community guidelines
      </m.p>
    </div>
  );
}
