import React from 'react';
import { X, Layers, Globe, Database, Cloud, KeyRound, FileCode, Component, Boxes, CloudCog, HardDrive, GitCompareArrows, ShieldAlert, Fingerprint, GitPullRequestArrow, ShieldCheck, Activity, UserRound, ServerCog, PenLine, Stamp, ListChecks, Inbox, Upload, Download } from 'lucide-react';

interface GraphLegendProps {
  isOpen: boolean;
  onClose: () => void;
}

const TAXONOMY = [
  { label: 'Applications', icon: <Layers className="w-3.5 h-3.5 text-purple-400" />, desc: 'Next.js, Remix, Vite entrypoints' },
  { label: 'API Routes', icon: <Globe className="w-3.5 h-3.5 text-emerald-400" />, desc: 'HTTP route handlers & endpoints' },
  { label: 'Database Models', icon: <Database className="w-3.5 h-3.5 text-cyan-400" />, desc: 'Prisma models & SQL entities' },
  { label: 'External Services', icon: <Cloud className="w-3.5 h-3.5 text-sky-400" />, desc: 'Stripe, AWS, external APIs' },
  { label: 'Environment Vars', icon: <KeyRound className="w-3.5 h-3.5 text-amber-400" />, desc: 'Config keys (zero secret values)' },
  { label: 'Source Modules', icon: <FileCode className="w-3.5 h-3.5 text-slate-400" />, desc: 'TypeScript/JavaScript source files' },
  { label: 'Components', icon: <Component className="w-3.5 h-3.5 text-indigo-400" />, desc: 'React/UI components' },
  { label: 'Packages', icon: <Boxes className="w-3.5 h-3.5 text-blue-400" />, desc: 'Monorepo workspace packages' },
  { label: 'Environments', icon: <CloudCog className="w-3.5 h-3.5 text-violet-400" />, desc: 'Vercel deployment boundaries' },
  { label: 'Cloud Resources', icon: <HardDrive className="w-3.5 h-3.5 text-rose-400" />, desc: 'Fingerprint-only provider resources' },
  { label: 'Upstream Changes', icon: <GitCompareArrows className="w-3.5 h-3.5 text-orange-400" />, desc: 'Evidence-backed dependency drift' },
  { label: 'Risk Boundaries', icon: <ShieldAlert className="w-3.5 h-3.5 text-red-400" />, desc: 'Confirmed architecture guardrails' },
  { label: 'API Operations', icon: <GitPullRequestArrow className="w-3.5 h-3.5 text-sky-400" />, desc: 'Provider REST operations' },
  { label: 'Permission Scopes', icon: <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />, desc: 'Declared and required app access' },
  { label: 'Identity Domains', icon: <Fingerprint className="w-3.5 h-3.5 text-fuchsia-400" />, desc: 'Explicit typed identifier boundaries' },
  { label: 'Security Probes', icon: <Activity className="w-3.5 h-3.5 text-emerald-400" />, desc: 'Executable isolation checks' },
  { label: 'Browser Sessions', icon: <UserRound className="w-3.5 h-3.5 text-indigo-400" />, desc: 'Independent authenticated contexts' },
  { label: 'Cache Layers', icon: <ServerCog className="w-3.5 h-3.5 text-yellow-400" />, desc: 'Shared response boundaries' },
  { label: 'Signers', icon: <PenLine className="w-3.5 h-3.5 text-sky-400" />, desc: 'Request signing implementations' },
  { label: 'Verifiers', icon: <Stamp className="w-3.5 h-3.5 text-indigo-400" />, desc: 'Signature verification endpoints' },
  { label: 'Signature Vectors', icon: <ListChecks className="w-3.5 h-3.5 text-emerald-400" />, desc: 'Normalization test cases' },
  { label: 'Queues', icon: <Inbox className="w-3.5 h-3.5 text-yellow-400" />, desc: 'BullMQ queue boundaries' },
  { label: 'Queue Producers', icon: <Upload className="w-3.5 h-3.5 text-sky-400" />, desc: 'Historical job writers' },
  { label: 'Queue Consumers', icon: <Download className="w-3.5 h-3.5 text-indigo-400" />, desc: 'Current worker contracts' },
  { label: 'Job Payloads', icon: <FileCode className="w-3.5 h-3.5 text-emerald-400" />, desc: 'Historical replay cases' },
];

export function GraphLegend({ isOpen, onClose }: GraphLegendProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-16 left-4 z-30 w-80 bg-[#0d0f0c]/95 backdrop-blur-md border border-[#2a2d24] rounded-xl shadow-2xl p-4 select-none text-xs animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2a2d24]">
        <span className="font-semibold text-[#f6f7f2] tracking-wide text-xs">
          Graph Legend &amp; Taxonomy
        </span>
        <button
          onClick={onClose}
          aria-label="Close legend"
          className="p-1 rounded text-[#a5aa9b] hover:text-[#f6f7f2] hover:bg-[#1b1e17] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Node taxonomy */}
      <div className="space-y-2 mb-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#74796d]">
          Node Taxonomy
        </div>
        <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {TAXONOMY.map(item => (
            <div key={item.label} className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[#141611]">
              <div className="flex items-center gap-2">
                {item.icon}
                <span className="text-[#f6f7f2] font-medium">{item.label}</span>
              </div>
              <span className="text-[10px] text-[#74796d] truncate max-w-[120px]">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas Interaction Guide */}
      <div className="pt-3 border-t border-[#2a2d24] space-y-1.5 text-[11px] text-[#a5aa9b]">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#74796d] mb-1">
          Interaction Hints
        </div>
        <div className="flex items-center justify-between">
          <span>Select Node</span>
          <span className="text-[#f6c945] font-mono">Highlights relationships</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Double-click Node</span>
          <span className="text-[#f6c945] font-mono">Isolates subgraph</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Hover Edge</span>
          <span className="text-[#f6c945] font-mono">Shows relationship label</span>
        </div>
      </div>
    </div>
  );
}
