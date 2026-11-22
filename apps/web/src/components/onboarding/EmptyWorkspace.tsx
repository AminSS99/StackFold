'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  FolderGit2,
  Package,
  Layers,
  Compass,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Database,
  Globe,
  Download,
  Play,
} from 'lucide-react';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import { IS_STATIC_DEMO, asset } from '@/lib/demo';
import { WalkthroughVideo } from '@/components/media/WalkthroughVideo';

export function EmptyWorkspace() {
  const setOnboardingModalOpen = useStackfoldStore(s => s.setOnboardingModalOpen);
  const scan = useStackfoldStore(s => s.scan);
  const recentProjects = useStackfoldStore(s => s.recentProjects);

  return (
    <div className="w-full h-full flex flex-col items-center p-6 sm:p-10 bg-[#070806] overflow-y-auto select-none">
      <div className="max-w-4xl w-full my-auto space-y-9 text-center py-4">
        {/* Hero Branding */}
        <div className="space-y-3 flex flex-col items-center">
          <Image src={asset('/logo.png')} alt="Stackfold" width={64} height={64} className="w-16 h-16 rounded-2xl shadow-[0_0_32px_rgba(246,201,69,0.12)]" priority />
          <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-[#f6c945]">Architecture intelligence, local by default</p>
          <h1 className="text-4xl font-extrabold text-[#f6f7f2] tracking-tight">
            See how your codebase fits together.
          </h1>
          <p className="text-base text-[#a5aa9b] max-w-xl leading-relaxed">
            Scan locally, explore the real dependency graph, and understand the impact before you change a line of code.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
          {/* Open Local Repo (hosted demo: Security Lab entry instead, no filesystem access) */}
          {IS_STATIC_DEMO ? (
            <Link
              href="/security-lab/queue"
              className="p-5 rounded-xl bg-[#f6c945] hover:bg-[#ffda67] border border-[#f6c945] shadow-xl shadow-[#f6c945]/10 transition-all group flex flex-col justify-between text-[#070806]"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-[#070806]/10 text-[#070806] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="font-bold text-[#070806] text-sm">Security Lab: Queue Compatibility</div>
                <p className="text-xs text-[#514107]">
                  Replay historical BullMQ payloads against a new worker and see the exact field that breaks.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-[#070806] gap-1 group-hover:translate-x-1 transition-transform">
                <span>Try the replay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          ) : (
          <button
            onClick={() => setOnboardingModalOpen(true)}
            className="p-5 rounded-xl bg-[#f6c945] hover:bg-[#ffda67] border border-[#f6c945] shadow-xl shadow-[#f6c945]/10 transition-all group flex flex-col justify-between text-[#070806]"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-[#070806]/10 text-[#070806] flex items-center justify-center">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <div className="font-bold text-[#070806] text-sm">
                Open Local Repository
              </div>
              <p className="text-xs text-[#514107]">
                Analyze any TypeScript/JavaScript codebase on your machine.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-[#070806] gap-1 group-hover:translate-x-1 transition-transform">
              <span>Choose Path</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
          )}

          {/* Sample E-Commerce Fixture */}
          <button
            onClick={() => scan({ fixture: 'sample-ecommerce-app' })}
            className="p-5 rounded-xl bg-[#11130f] hover:bg-[#181b14] border border-[#2a2d24] hover:border-[#555b49] shadow-xl transition-all group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div className="font-bold text-[#f6f7f2] text-sm group-hover:text-[#f6c945]">
                E-Commerce Demo
              </div>
              <p className="text-xs text-slate-400">
                Next.js 14 App Router, Prisma PostgreSQL, Stripe &amp; Resend.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-emerald-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Explore Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Multi-Package Monorepo Fixture */}
          <button
            onClick={() => scan({ fixture: 'sample-monorepo-platform' })}
            className="p-5 rounded-xl bg-[#11130f] hover:bg-[#181b14] border border-[#2a2d24] hover:border-[#555b49] shadow-xl transition-all group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div className="font-bold text-[#f6f7f2] text-sm group-hover:text-[#f6c945]">
                Monorepo Platform
              </div>
              <p className="text-xs text-slate-400">
                pnpm workspaces: 2 Next.js apps, shared Prisma DB &amp; utils.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-purple-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Explore Monorepo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left text-xs">
          <div className="p-3 rounded-lg bg-[#0d0f0c] border border-[#2a2d24] space-y-1">
            <div className="flex items-center gap-1.5 text-[#f6c945] font-semibold">
              <Globe className="w-4 h-4" />
              <span>Route Mapping</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic discovery of App &amp; Pages API endpoints.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#0d0f0c] border border-[#2a2d24] space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Database className="w-4 h-4" />
              <span>Schema Relations</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Parses Prisma models, foreign keys, and queries.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#0d0f0c] border border-[#2a2d24] space-y-1">
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <Activity className="w-4 h-4" />
              <span>Change Impact</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Traverse blast radius before making code changes.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#0d0f0c] border border-[#2a2d24] space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero Leakage</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Secret keys and private env values are never stored.
            </p>
          </div>
        </div>

        {/* Download & Video Banner */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {process.env.NEXT_PUBLIC_STACKFOLD_DESKTOP !== 'true' && (
            <a
              href="#walkthrough-inline"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#11130f] hover:bg-[#181b14] border border-[#f6c945]/40 hover:border-[#f6c945] text-xs text-slate-200 hover:text-[#f6c945] transition-colors shadow-lg"
            >
              <Play className="w-4 h-4 text-[#f6c945]" />
              <span>Watch the <strong>50-second walkthrough</strong></span>
            </a>
          )}
          <Link
            href="/download"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#11130f] hover:bg-[#181b14] border border-[#2a2d24] hover:border-[#f6c945]/50 text-xs text-slate-300 hover:text-[#f6c945] transition-colors shadow-lg group"
          >
            <Download className="w-4 h-4 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
            <span>Prefer a native desktop app? <strong>Download Stackfold for macOS (.dmg) &rarr;</strong></span>
          </Link>
        </div>

        <WalkthroughVideo compact />
      </div>
    </div>
  );
}
