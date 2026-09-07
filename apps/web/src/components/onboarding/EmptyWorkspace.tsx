'use client';

import React from 'react';
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
} from 'lucide-react';
import { useStackfoldStore } from '@/store/useStackfoldStore';

export function EmptyWorkspace() {
  const setOnboardingModalOpen = useStackfoldStore(s => s.setOnboardingModalOpen);
  const scan = useStackfoldStore(s => s.scan);
  const recentProjects = useStackfoldStore(s => s.recentProjects);

  return (
    <div className="w-full h-full flex items-center justify-center p-6 bg-[#090a0f] overflow-y-auto select-none">
      <div className="max-w-3xl w-full space-y-8 text-center">
        {/* Hero Branding */}
        <div className="space-y-3 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-black border border-amber-500/40 flex flex-col justify-center items-center gap-1.5 p-3 shadow-2xl">
            <div className="w-8 h-1.5 bg-amber-400 rounded-full ml-2 shadow-sm" />
            <div className="w-8 h-1.5 bg-amber-400 rounded-full shadow-sm" />
            <div className="w-8 h-1.5 bg-amber-400 rounded-full mr-2 shadow-sm" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            Welcome to Stackfold
          </h1>
          <p className="text-sm text-slate-400 max-w-lg">
            A visual control center and intelligence layer for your software projects. Map routes, dependencies, database schemas, and blast-radius change impact.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
          {/* Open Local Repo */}
          <button
            onClick={() => setOnboardingModalOpen(true)}
            className="p-5 rounded-2xl bg-[#121522] hover:bg-[#181d2f] border border-[#22293e] hover:border-amber-500/60 shadow-xl transition-all group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <div className="font-bold text-slate-100 text-sm group-hover:text-amber-300">
                Open Local Repository
              </div>
              <p className="text-xs text-slate-400">
                Analyze any TypeScript/JavaScript codebase on your machine.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-amber-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Choose Path</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Sample E-Commerce Fixture */}
          <button
            onClick={() => scan({ fixture: 'sample-ecommerce-app' })}
            className="p-5 rounded-2xl bg-[#121522] hover:bg-[#181d2f] border border-[#22293e] hover:border-emerald-500/60 shadow-xl transition-all group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div className="font-bold text-slate-100 text-sm group-hover:text-emerald-300">
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
            className="p-5 rounded-2xl bg-[#121522] hover:bg-[#181d2f] border border-[#22293e] hover:border-purple-500/60 shadow-xl transition-all group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div className="font-bold text-slate-100 text-sm group-hover:text-purple-300">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-left text-xs">
          <div className="p-3 rounded-xl bg-[#10131e] border border-[#1b2133] space-y-1">
            <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
              <Globe className="w-4 h-4" />
              <span>Route Mapping</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic discovery of App &amp; Pages API endpoints.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#10131e] border border-[#1b2133] space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Database className="w-4 h-4" />
              <span>Schema Relations</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Parses Prisma models, foreign keys, and queries.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#10131e] border border-[#1b2133] space-y-1">
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <Activity className="w-4 h-4" />
              <span>Change Impact</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Traverse blast radius before making code changes.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#10131e] border border-[#1b2133] space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero Leakage</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Secret keys and private env values are never stored.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
