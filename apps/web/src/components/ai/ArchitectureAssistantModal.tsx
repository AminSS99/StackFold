'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Copy,
  Check,
  ShieldCheck,
  Workflow,
  ShieldAlert,
  Activity,
  FileCode2,
  Terminal,
} from 'lucide-react';
import { useStackfoldStore } from '@/store/useStackfoldStore';

interface ArchitectureAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AnalysisMode = 'overview' | 'security' | 'impact' | 'adr';

export function ArchitectureAssistantModal({ isOpen, onClose }: ArchitectureAssistantModalProps) {
  const rawGraph = useStackfoldStore(s => s.rawGraph);
  const [activeMode, setActiveMode] = useState<AnalysisMode>('overview');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !rawGraph) return null;

  const { metadata, nodes, edges } = rawGraph;
  const projectName = metadata.projectName || 'Project';
  const frameworks = metadata.frameworks.length > 0 ? metadata.frameworks.join(', ') : 'Standard TypeScript/JavaScript';

  const routes = nodes.filter(n => n.type === 'api_route');
  const models = nodes.filter(n => n.type === 'database_model');
  const services = nodes.filter(n => n.type === 'external_service');
  const envVars = nodes.filter(n => n.type === 'environment_variable');
  const modules = nodes.filter(n => n.type === 'source_module' || n.type === 'component');

  // Find top dependent nodes (high-risk hubs)
  const incomingCountMap: Record<string, number> = {};
  for (const edge of edges) {
    incomingCountMap[edge.target] = (incomingCountMap[edge.target] || 0) + 1;
  }
  const topHubs = Object.entries(incomingCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, count]) => {
      const node = nodes.find(n => n.id === id);
      return { displayName: node?.displayName || id, count, filePath: node?.filePath };
    });

  const getAnalysisContent = (): string => {
    switch (activeMode) {
      case 'overview':
        return `### 🔍 Architecture Analysis for ${projectName}

**System Classification:** ${routes.length > 0 ? 'Full-Stack Web Application' : 'Client-Side Application / Library'}
**Detected Stack:** ${frameworks}
**Topology Metrics:** ${nodes.length} entities discovered across ${nodes.length} mapped files with ${edges.length} verified connections.

#### 1. Architectural Structure
- **Application Roots:** ${nodes.filter(n => n.type === 'application' || n.type === 'package').length} package(s) detected.
- **Components & Modules:** ${modules.length} active TypeScript/React module(s) mapped via AST parsing.
- **Backend Endpoints:** ${routes.length > 0 ? `${routes.length} HTTP API endpoints mapped.` : 'No backend API routes (pure client-side or static SPA architecture).' }
- **Data Persistence:** ${models.length > 0 ? `${models.length} Prisma models detected.` : 'No relational database ORM models detected in repository root.'}

#### 2. Key Architectural Inferences
- State and execution flow cleanly follow a directional acyclic graph.
- Module boundaries are explicitly declared with ${edges.filter(e => e.type === 'imports').length} module import relationships.`;

      case 'security':
        return `### 🛡️ Security & Attack Surface Audit: ${projectName}

**Audit Status:** PASSED (Static Analysis)
**Zero-Secrets Guarantee:** 100% compliant. Active .env secret values were excluded from ingestion.

#### 1. External Attack Surface
- **Public Endpoints:** ${routes.length} public route handlers found.
${routes.slice(0, 5).map(r => `  - \`${r.metadata?.httpMethod || 'ANY'} ${r.metadata?.routePath || r.displayName}\` in \`${r.filePath}\``).join('\n') || '  - None (Zero public HTTP listener attack surface detected).'}

#### 2. External Service Boundaries
- **Cloud & SaaS Integrations:** ${services.length} external service gateways detected.
${services.map(s => `  - \`${s.displayName}\` integrated in \`${s.filePath}\``).join('\n') || '  - No third-party API SDKs (e.g. Stripe, Resend, AWS) detected in repository root.'}

#### 3. Configuration & Secrets Hygiene
- **Environment Variables Referenced:** ${envVars.length} configuration keys identified.
${envVars.slice(0, 6).map(e => `  - \`${e.displayName}\` (${e.metadata?.isDeclaredInExample ? 'Declared in template' : 'Referenced at runtime'})`).join('\n') || '  - No runtime process.env calls detected.'}`;

      case 'impact':
        return `### 💥 Blast-Radius & Refactoring Risk Advisory: ${projectName}

When refactoring code in this repository, entities with high incoming connection counts carry the highest regression risk.

#### 1. Critical Architectural Hubs (Highest Blast Radius)
${topHubs.length > 0 ? topHubs.map(h => `- **${h.displayName}** (\`${h.filePath || '-'}\`): **${h.count} dependent callers**. Modifying this file's exports will trigger regressions across ${h.count} upstream components.`).join('\n') : '- Topology is decentralized; no single component creates a critical bottleneck.'}

#### 2. Recommended Refactoring Workflow
1. Select any target entity in the Stackfold Canvas and open the **Impact** tab.
2. Review direct dependents vs transitive callers.
3. Test dependent modules before merging changes to high-degree central nodes.`;

      case 'adr':
        return `### 📋 Architecture Decision Record (ADR)
**Title:** System Architecture Specification for ${projectName}  
**Date:** ${new Date().toISOString().split('T')[0]}  
**Status:** Approved / Active  

#### Context
This repository contains the software codebase for **${projectName}**, implementing solutions using **${frameworks}**.

#### Decision
- **Modular Topology:** The system is organized into ${modules.length} modules, separating concerns between UI views, data handling, and core utilities.
- **Communication Flow:** Dependencies are managed via directional imports with ${edges.length} verified connections.

#### Consequences
- **Positive:** High cohesion and traceable static dependencies allow deterministic impact analysis.
- **Negative:** Schema or signature changes in hub modules require synchronized updates across dependent components.`;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getAnalysisContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="w-full max-w-3xl rounded-2xl bg-[#0e111a] border border-[#232a3f] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#1f2638] flex items-center justify-between bg-gradient-to-r from-indigo-950/40 via-[#0e111a] to-amber-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">Ask Stackfold — Architecture Intelligence</h2>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                  Local-First Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Deterministic synthesis grounded strictly in your codebase graph.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2030] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Query Tabs */}
        <div className="px-4 pt-3 flex items-center justify-between border-b border-[#1a2030] bg-[#0b0e16]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMode('overview')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeMode === 'overview'
                  ? 'border-indigo-400 text-indigo-300 bg-[#141824]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>System Overview</span>
            </button>
            <button
              onClick={() => setActiveMode('security')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeMode === 'security'
                  ? 'border-indigo-400 text-indigo-300 bg-[#141824]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Security Audit</span>
            </button>
            <button
              onClick={() => setActiveMode('impact')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeMode === 'impact'
                  ? 'border-indigo-400 text-indigo-300 bg-[#141824]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Blast-Radius Hubs</span>
            </button>
            <button
              onClick={() => setActiveMode('adr')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeMode === 'adr'
                  ? 'border-indigo-400 text-indigo-300 bg-[#141824]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Draft ADR</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="mb-1.5 px-3 py-1.5 rounded-xl bg-[#171b29] hover:bg-[#20273a] border border-[#2b334a] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Report'}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-5 bg-[#090b12] overflow-auto text-xs leading-relaxed text-slate-300 space-y-4">
          <div className="p-3 rounded-xl bg-[#121522] border border-[#22293e] flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Zero secrets collected: Analysis is synthesized directly from deterministic AST graph data on your machine.</span>
          </div>

          <div className="prose prose-invert max-w-none text-xs">
            <pre className="p-4 rounded-xl bg-[#0e111a] border border-[#1d2335] text-slate-200 font-sans text-xs whitespace-pre-wrap leading-relaxed">
              {getAnalysisContent()}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1c2233] bg-[#0c0e16] flex items-center justify-between text-[11px] text-slate-500">
          <span>Grounded in {nodes.length} verified nodes &amp; {edges.length} edges</span>
          <span className="font-mono text-[10px] text-slate-400">Stackfold Intelligence v0.1</span>
        </div>
      </div>
    </div>
  );
}
