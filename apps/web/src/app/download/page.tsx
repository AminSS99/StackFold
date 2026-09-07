'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Download,
  Apple,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Layers,
  Workflow,
  Database,
  Activity,
  Github,
  Terminal,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const RELEASE_VERSION = 'v0.1.0';
const DOWNLOAD_URL =
  'https://github.com/AminSS99/StackFold/releases/download/v0.1.0/Stackfold_0.1.0_aarch64.dmg';
const SHA256_HASH = 'b7e54cc819ba0affee5615423b9bae7ea9cb6f234c025360fb3db7b82b9b5422';
const GATEKEEPER_CMD = 'xattr -cr /Applications/Stackfold.app';

export default function DownloadPage() {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState<
    'architecture' | 'inspector' | 'database'
  >('architecture');

  const copyToClipboard = (text: string, type: 'hash' | 'cmd') => {
    navigator.clipboard.writeText(text);
    if (type === 'hash') {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } else {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col selection:bg-amber-400 selection:text-black">
      {/* Navigation */}
      <header className="h-16 border-b border-[#1c2233] bg-[#0c0e16]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          {/* Approved Brand Symbol: Black background with 3 yellow bars */}
          <div className="w-8 h-8 rounded-lg bg-black border border-amber-500/40 flex flex-col justify-center items-center gap-[3px] p-1.5 shadow-md shrink-0">
            <div className="w-4 h-[3px] bg-amber-400 rounded-full ml-1" />
            <div className="w-4 h-[3px] bg-amber-400 rounded-full" />
            <div className="w-4 h-[3px] bg-amber-400 rounded-full mr-1" />
          </div>
          <span className="font-bold text-sm tracking-wider text-slate-100">STACKFOLD</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800/60">
            {RELEASE_VERSION}
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-xl bg-[#141724] hover:bg-[#1b2032] border border-[#252c42] text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span>Launch Web Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <a
            href="https://github.com/AminSS99/StackFold"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-[#141724] hover:bg-[#1b2032] border border-[#252c42] text-slate-300 hover:text-white transition-colors"
            title="GitHub Repository"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 space-y-16">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-700/60 text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Public Open-Source Release — Apache 2.0</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-100">
            Visual control center for software projects.
          </h1>

          <p className="text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Scan any local codebase and turn it into an interactive system map. Trace API routes,
            Prisma schemas, dependencies, and blast-radius change impact with zero secret exposure.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href={DOWNLOAD_URL}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-xl hover:shadow-amber-400/20 transition-all flex items-center justify-center gap-2.5 group"
            >
              <Apple className="w-5 h-5 text-slate-950" />
              <span>Download for macOS (Apple Silicon)</span>
              <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            </a>

            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-[#141724] hover:bg-[#1b2032] border border-[#252c42] hover:border-slate-600 text-slate-200 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>Try Online in Browser</span>
            </Link>
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-center gap-3">
            <span>macOS 12+ (M1/M2/M3/M4)</span>
            <span>•</span>
            <span>Version {RELEASE_VERSION}</span>
            <span>•</span>
            <span>Standalone 5.8 MB DMG</span>
          </div>
        </div>

        {/* macOS Unsigned Gatekeeper Helper */}
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-[#121522] border border-[#232a3f] text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-300 font-semibold">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>macOS Gatekeeper Notice (Unsigned Alpha Build)</span>
            </div>
            <button
              onClick={() => copyToClipboard(GATEKEEPER_CMD, 'cmd')}
              className="flex items-center gap-1 text-slate-400 hover:text-amber-300 font-mono transition-colors"
            >
              {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Because this early release is self-distributed, macOS may quarantine it on first download.
            If blocked, drag to <code>/Applications</code> and run:
          </p>
          <div className="p-2.5 rounded-xl bg-black/60 border border-[#1d2335] font-mono text-[11px] text-amber-300 flex items-center justify-between">
            <code>{GATEKEEPER_CMD}</code>
          </div>
        </div>

        {/* Interactive Screenshot Showcase */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setActiveScreenshot('architecture')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
                activeScreenshot === 'architecture'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-[#141724] text-slate-400 hover:text-white border border-[#222738]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Architecture Map</span>
            </button>
            <button
              onClick={() => setActiveScreenshot('inspector')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
                activeScreenshot === 'inspector'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-[#141724] text-slate-400 hover:text-white border border-[#222738]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Impact &amp; Evidence</span>
            </button>
            <button
              onClick={() => setActiveScreenshot('database')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
                activeScreenshot === 'database'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-[#141724] text-slate-400 hover:text-white border border-[#222738]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Database Relations</span>
            </button>
          </div>

          <div className="rounded-2xl border border-[#232a3f] bg-[#0c0e16] p-2 shadow-2xl overflow-hidden">
            {activeScreenshot === 'architecture' && (
              <Image
                src="/screenshots/04-architecture-view.png"
                alt="Stackfold Architecture System Map"
                width={1440}
                height={900}
                className="w-full h-auto rounded-xl"
                unoptimized
              />
            )}
            {activeScreenshot === 'inspector' && (
              <Image
                src="/screenshots/07-node-inspector.png"
                alt="Stackfold Node Inspector and Impact Analysis"
                width={1440}
                height={900}
                className="w-full h-auto rounded-xl"
                unoptimized
              />
            )}
            {activeScreenshot === 'database' && (
              <Image
                src="/screenshots/06-database-view.png"
                alt="Stackfold Database Schema View"
                width={1440}
                height={900}
                className="w-full h-auto rounded-xl"
                unoptimized
              />
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#121522] border border-[#232a3f] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Workflow className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-100 text-sm">Deterministic AST Analysis</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No guessing or LLM hallucinations. AST compilers parse real TypeScript, Next.js routes,
              Prisma schemas, and package exports in 150ms.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#121522] border border-[#232a3f] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-100 text-sm">Blast-Radius Impact Traversal</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Select any table or endpoint to inspect direct and transitive dependents. Know exactly
              what will break before refactoring code.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#121522] border border-[#232a3f] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-100 text-sm">Local-First &amp; Zero Secrets</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Runs 100% offline. Active environment files are excluded. Config keys are mapped to
              call-sites, but secret values are never read or stored.
            </p>
          </div>
        </div>

        {/* Checksum Card */}
        <div className="p-5 rounded-2xl bg-[#0f121d] border border-[#1f2638] text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold text-slate-300">SHA-256 Checksum (Apple Silicon DMG)</span>
            <button
              onClick={() => copyToClipboard(SHA256_HASH, 'hash')}
              className="flex items-center gap-1 hover:text-amber-300 font-mono transition-colors"
            >
              {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
            </button>
          </div>
          <code className="block p-2.5 rounded-xl bg-black/60 border border-[#1d2335] font-mono text-[11px] text-slate-300 break-all select-all">
            {SHA256_HASH}
          </code>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1c2233] py-8 text-center text-xs text-slate-500 space-y-2">
        <div className="flex items-center justify-center gap-6 text-slate-400">
          <a
            href="https://github.com/AminSS99/StackFold"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://github.com/AminSS99/StackFold/blob/main/DOCUMENTATION.md"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>Manual &amp; Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://github.com/AminSS99/StackFold/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>Releases</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div>Released under the Apache License 2.0 • Stackfold Contributors</div>
      </footer>
    </div>
  );
}
