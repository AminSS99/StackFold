'use client';

import React, { useState, useEffect } from 'react';
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
  FileCode,
  Share2,
  Lock,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { stackfoldLinks } from '@/config/links';
import { currentRelease } from '@/config/release';
import { detectUserPlatform, type UserPlatform } from '@/lib/media';

type StoryKey = 'architecture' | 'impact' | 'database';

interface Story {
  id: StoryKey;
  label: string;
  headline: string;
  description: string;
  image: string;
  icon: React.ReactNode;
}

const STORIES: Story[] = [
  {
    id: 'architecture',
    label: 'Architecture Map',
    headline: 'Unified System Topology',
    description:
      'Deterministic Dagre layout maps Next.js applications, API handlers, Prisma models, and workspace packages in one responsive canvas.',
    image: '/screenshots/04-architecture-view.png',
    icon: <Layers className="w-4 h-4" />,
  },
  {
    id: 'impact',
    label: 'Impact & Evidence',
    headline: 'Blast-Radius Change Analysis',
    description:
      'Select any entity to trace direct and transitive dependents. Every relationship links directly to source file line ranges and AST rules.',
    image: '/screenshots/07-node-inspector.png',
    icon: <Activity className="w-4 h-4" />,
  },
  {
    id: 'database',
    label: 'Database Relations',
    headline: 'Prisma & Relational Models',
    description:
      'Inspect database schema structures, foreign key relationships, and connected route handlers without running a live database.',
    image: '/screenshots/06-database-view.png',
    icon: <Database className="w-4 h-4" />,
  },
];

const CAPABILITIES = [
  {
    title: 'Deterministic AST Analysis',
    desc: 'Compilers parse real TypeScript, Next.js routes, Prisma schemas, and package exports in milliseconds without hallucinated connections.',
    icon: <Workflow className="w-5 h-5 text-[#f6c945]" />,
  },
  {
    title: 'Blast-Radius Traversal',
    desc: 'Identify direct and transitive downstream dependencies before refactoring. Know what will break before pushing code.',
    icon: <Activity className="w-5 h-5 text-[#62d49b]" />,
  },
  {
    title: '100% Local-First & Private',
    desc: 'Runs on your device. Zero secrets or environment credential values are read or transmitted across the network.',
    icon: <ShieldCheck className="w-5 h-5 text-[#f6c945]" />,
  },
  {
    title: 'Evidence-Backed Verification',
    desc: 'Every diagram node and edge provides inspectable source coordinates with one-click deep links to VS Code, Cursor, and WebStorm.',
    icon: <FileCode className="w-5 h-5 text-[#a78bfa]" />,
  },
  {
    title: 'Multi-Format Architecture Export',
    desc: 'Export current system maps to Mermaid sequence/flow diagrams, Markdown architecture briefs, or raw JSON graphs.',
    icon: <Share2 className="w-5 h-5 text-[#38bdf8]" />,
  },
  {
    title: 'Native macOS Performance',
    desc: 'Packaged with Tauri 2 and Rust for instant startup, low memory footprint, and native OS folder picker integration.',
    icon: <Apple className="w-5 h-5 text-[#f6c945]" />,
  },
];

export default function DownloadPage() {
  const [activeStory, setActiveStory] = useState<StoryKey>('architecture');
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [userPlatform, setUserPlatform] = useState<UserPlatform>('macos');

  useEffect(() => {
    setUserPlatform(detectUserPlatform());
  }, []);

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

  const currentStoryData: Story = STORIES.find(s => s.id === activeStory) || STORIES[0]!;

  return (
    <div className="min-h-screen bg-[#070806] text-[#f6f7f2] flex flex-col selection:bg-[#f6c945] selection:text-[#070806]">
      {/* Sticky Header */}
      <header className="h-16 border-b border-[#2a2d24] bg-[#0d0f0c]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <Logo size="md" versionBadge={currentRelease.version} />
        </Link>

        <nav className="flex items-center gap-4 text-xs font-medium text-[#a5aa9b]" aria-label="Product navigation">
          <a
            href="#proof"
            className="hidden sm:inline-block hover:text-[#f6f7f2] transition-colors"
          >
            Product
          </a>
          <a
            href="#capabilities"
            className="hidden sm:inline-block hover:text-[#f6f7f2] transition-colors"
          >
            Capabilities
          </a>
          <a
            href={stackfoldLinks.documentation}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-block hover:text-[#f6f7f2] transition-colors"
          >
            Docs
          </a>
          <a
            href={stackfoldLinks.repository}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-[#141611] hover:bg-[#1b1e17] border border-[#2a2d24] text-[#f6f7f2] transition-colors"
            title="GitHub Repository"
          >
            <Github className="w-4 h-4" />
          </a>
          <Link href="/">
            <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Launch Web Studio
            </Button>
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 space-y-20 w-full">
        {/* Hero Section */}
        <section className="text-center space-y-6 max-w-3xl mx-auto pt-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(246,201,69,0.12)] border border-[#f6c945]/30 text-[#f6c945] text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Industrial Architecture Intelligence • Apache 2.0</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#f6f7f2] leading-[1.1]">
            See how your codebase fits together—and what changes when you touch it.
          </h1>

          <p className="text-base text-[#a5aa9b] leading-relaxed max-w-2xl mx-auto">
            Stackfold scans locally and turns routes, schemas, services, and dependencies into an evidence-backed system map.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href={currentRelease.macosAppleSilicon}
              className="w-full sm:w-auto"
            >
              <Button
                variant="primary"
                size="lg"
                leftIcon={<Apple className="w-5 h-5 text-[#070806]" />}
                rightIcon={<Download className="w-4 h-4 text-[#070806]" />}
                className="w-full sm:w-auto font-bold px-8 shadow-xl shadow-[#f6c945]/15"
              >
                Download for macOS (Apple Silicon)
              </Button>
            </a>

            <a
              href={stackfoldLinks.repository}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                variant="secondary"
                size="lg"
                leftIcon={<Github className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                View on GitHub
              </Button>
            </a>
          </div>

          <div className="text-xs text-[#74796d] flex flex-wrap items-center justify-center gap-3 pt-1">
            <span>{currentRelease.platformLabel}</span>
            <span>•</span>
            <span>Version {currentRelease.version}</span>
            <span>•</span>
            <span>Standalone {currentRelease.size} DMG</span>
            {userPlatform !== 'macos' && (
              <>
                <span>•</span>
                <span className="text-[#f6c945]">Windows/Linux available via Web Studio</span>
              </>
            )}
          </div>
        </section>

        {/* Trust Strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-[#2a2d24] text-xs">
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#0d0f0c] border border-[#2a2d24]">
            <ShieldCheck className="w-4 h-4 text-[#62d49b] shrink-0" />
            <div>
              <div className="font-semibold text-[#f6f7f2]">100% Local-Only</div>
              <div className="text-[10px] text-[#74796d]">Source never leaves device</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#0d0f0c] border border-[#2a2d24]">
            <Workflow className="w-4 h-4 text-[#f6c945] shrink-0" />
            <div>
              <div className="font-semibold text-[#f6f7f2]">Deterministic AST</div>
              <div className="text-[10px] text-[#74796d]">Zero AI hallucinations</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#0d0f0c] border border-[#2a2d24]">
            <Lock className="w-4 h-4 text-[#f6c945] shrink-0" />
            <div>
              <div className="font-semibold text-[#f6f7f2]">Zero Secrets Read</div>
              <div className="text-[10px] text-[#74796d]">Environment values ignored</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#0d0f0c] border border-[#2a2d24]">
            <FileCode className="w-4 h-4 text-[#a78bfa] shrink-0" />
            <div>
              <div className="font-semibold text-[#f6f7f2]">Apache 2.0 License</div>
              <div className="text-[10px] text-[#74796d]">Open-source &amp; verifiable</div>
            </div>
          </div>
        </section>

        {/* Interactive Product Proof */}
        <section id="proof" className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#f6f7f2]">
              Interactive Architecture Proof
            </h2>
            <p className="text-xs sm:text-sm text-[#a5aa9b]">
              Real product captures from our bundled e-commerce architecture fixture.
            </p>
          </div>

          {/* Story Selector Tabs */}
          <div className="flex items-center justify-center gap-2">
            {STORIES.map(story => {
              const isActive = activeStory === story.id;
              return (
                <button
                  key={story.id}
                  onClick={() => setActiveStory(story.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#f6c945] text-[#070806] font-semibold shadow-sm'
                      : 'bg-[#141611] text-[#a5aa9b] hover:text-[#f6f7f2] hover:bg-[#1b1e17] border border-[#2a2d24]'
                  }`}
                >
                  {story.icon}
                  <span>{story.label}</span>
                </button>
              );
            })}
          </div>

          {/* Large Framed Product Screenshot */}
          <div className="rounded-2xl border border-[#2a2d24] bg-[#0d0f0c] p-3 shadow-2xl overflow-hidden space-y-3">
            <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-[#2a2d24]">
              <Image
                src={currentStoryData.image}
                alt={currentStoryData.headline}
                fill
                className="object-cover object-top"
                priority
                unoptimized
              />
            </div>

            <div className="p-3 bg-[#141611] rounded-xl border border-[#2a2d24] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-semibold text-[#f6f7f2] text-sm mb-0.5">
                  {currentStoryData.headline}
                </div>
                <div className="text-[#a5aa9b] text-xs leading-relaxed max-w-2xl">
                  {currentStoryData.description}
                </div>
              </div>
              <Link href="/">
                <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Explore in Studio
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Three-step Workflow */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#f6f7f2]">
              Three Steps. Zero Configuration.
            </h2>
            <p className="text-xs sm:text-sm text-[#a5aa9b]">
              Complete your inspection in seconds without setting up databases or cloud servers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-[#0d0f0c] border border-[#2a2d24] space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[rgba(246,201,69,0.12)] border border-[#f6c945]/30 text-[#f6c945] font-mono text-xs font-bold flex items-center justify-center">
                01
              </div>
              <h3 className="font-semibold text-sm text-[#f6f7f2]">Scan Local Repository</h3>
              <p className="text-xs text-[#a5aa9b] leading-relaxed">
                Choose any project folder or try the bundled fixture. Stackfold uses native AST compilers to parse routes, schemas, and components in under 200ms.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#0d0f0c] border border-[#2a2d24] space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[rgba(246,201,69,0.12)] border border-[#f6c945]/30 text-[#f6c945] font-mono text-xs font-bold flex items-center justify-center">
                02
              </div>
              <h3 className="font-semibold text-sm text-[#f6f7f2]">Explore Architecture</h3>
              <p className="text-xs text-[#a5aa9b] leading-relaxed">
                Switch seamlessly between high-level Architecture, API Flow, Database Models, and Workspace Dependencies with preserved zoom coordinates.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#0d0f0c] border border-[#2a2d24] space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[rgba(246,201,69,0.12)] border border-[#f6c945]/30 text-[#f6c945] font-mono text-xs font-bold flex items-center justify-center">
                03
              </div>
              <h3 className="font-semibold text-sm text-[#f6f7f2]">Change With Confidence</h3>
              <p className="text-xs text-[#a5aa9b] leading-relaxed">
                Select any database table or endpoint to inspect direct and transitive blast-radius impact. Open exact AST coordinates in your editor.
              </p>
            </div>
          </div>
        </section>

        {/* Capability Grid */}
        <section id="capabilities" className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#f6f7f2]">
              Engineered for Industrial Precision
            </h2>
            <p className="text-xs sm:text-sm text-[#a5aa9b]">
              Every capability is designed to build trust through deterministic proof.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAPABILITIES.map(cap => (
              <div
                key={cap.title}
                className="p-5 rounded-xl bg-[#0d0f0c] border border-[#2a2d24] space-y-2.5 hover:border-[#3b3f31] transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[#141611] border border-[#2a2d24] flex items-center justify-center">
                  {cap.icon}
                </div>
                <h3 className="font-semibold text-xs text-[#f6f7f2]">{cap.title}</h3>
                <p className="text-xs text-[#a5aa9b] leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Download & Verification Panel */}
        <section id="download" className="p-6 rounded-2xl bg-[#0d0f0c] border border-[#2a2d24] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2a2d24] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#f6f7f2]">Download Stackfold for macOS</h2>
                <Badge variant="yellow">{currentRelease.version}</Badge>
              </div>
              <p className="text-xs text-[#a5aa9b] mt-1">
                Optimized for Apple Silicon (M1, M2, M3, M4). Native DMG installer.
              </p>
            </div>

            <a href={currentRelease.macosAppleSilicon}>
              <Button
                variant="primary"
                size="md"
                leftIcon={<Apple className="w-4 h-4 text-[#070806]" />}
                rightIcon={<Download className="w-4 h-4 text-[#070806]" />}
                className="font-bold whitespace-nowrap"
              >
                Download DMG ({currentRelease.size})
              </Button>
            </a>
          </div>

          {/* Gatekeeper Notice */}
          <div className="p-4 rounded-xl bg-[#141611] border border-[#2a2d24] text-xs space-y-2">
            <div className="flex items-center justify-between text-[#f6f7f2] font-semibold">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#f6c945]" />
                <span>macOS Gatekeeper Notice (Unsigned Alpha Build)</span>
              </div>
              <button
                onClick={() => copyToClipboard(currentRelease.gatekeeperCommand, 'cmd')}
                className="flex items-center gap-1 text-[#a5aa9b] hover:text-[#f6c945] font-mono transition-colors"
              >
                {copiedCmd ? <Check className="w-3.5 h-3.5 text-[#62d49b]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCmd ? 'Copied' : 'Copy Command'}</span>
              </button>
            </div>
            <p className="text-[11px] text-[#a5aa9b] leading-relaxed">
              Because this early release is self-distributed, macOS may quarantine the unsigned app upon first launch. If blocked, drag to <code>/Applications</code> and execute:
            </p>
            <div className="p-2.5 rounded-lg bg-[#070806] border border-[#2a2d24] font-mono text-[11px] text-[#f6c945] flex items-center justify-between select-all">
              <code>{currentRelease.gatekeeperCommand}</code>
            </div>
          </div>

          {/* SHA-256 Checksum */}
          <div className="p-4 rounded-xl bg-[#141611] border border-[#2a2d24] text-xs space-y-2">
            <div className="flex items-center justify-between text-[#a5aa9b]">
              <span className="font-semibold text-[#f6f7f2]">SHA-256 Release Checksum</span>
              <button
                onClick={() => copyToClipboard(currentRelease.sha256, 'hash')}
                className="flex items-center gap-1 hover:text-[#f6c945] font-mono transition-colors"
              >
                {copiedHash ? <Check className="w-3.5 h-3.5 text-[#62d49b]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
              </button>
            </div>
            <code className="block p-2.5 rounded-lg bg-[#070806] border border-[#2a2d24] font-mono text-[11px] text-[#a5aa9b] break-all select-all">
              {currentRelease.sha256}
            </code>
          </div>
        </section>

        {/* Open Source / Community CTA */}
        <section className="text-center p-10 rounded-2xl bg-gradient-to-b from-[#141611] to-[#0d0f0c] border border-[#2a2d24] space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#f6f7f2]">
            Free, Open Source, and Built in Public
          </h2>
          <p className="text-xs sm:text-sm text-[#a5aa9b] max-w-xl mx-auto leading-relaxed">
            Stackfold is published under the Apache 2.0 license. Star the project, file an issue, or contribute new parser detectors on GitHub.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a href={stackfoldLinks.repository} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" size="md" leftIcon={<Github className="w-4 h-4 text-[#070806]" />}>
                Star on GitHub
              </Button>
            </a>
            <a href={stackfoldLinks.contributing} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="md">
                Contributor Guide
              </Button>
            </a>
            <a href={stackfoldLinks.issues} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="md" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                Report an Issue
              </Button>
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a2d24] py-8 text-center text-xs text-[#74796d] space-y-3 bg-[#0d0f0c]">
        <div className="flex flex-wrap items-center justify-center gap-6 text-[#a5aa9b]">
          <a
            href={stackfoldLinks.repository}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#f6c945] flex items-center gap-1 transition-colors"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={stackfoldLinks.documentation}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#f6c945] flex items-center gap-1 transition-colors"
          >
            <span>Documentation</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={stackfoldLinks.releases}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#f6c945] flex items-center gap-1 transition-colors"
          >
            <span>Releases</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={stackfoldLinks.security}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#f6c945] flex items-center gap-1 transition-colors"
          >
            <span>Security Policy</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={stackfoldLinks.license}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#f6c945] flex items-center gap-1 transition-colors"
          >
            <span>License (Apache 2.0)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div>Stackfold Architecture Intelligence • Developed with Industrial Precision</div>
      </footer>
    </div>
  );
}
