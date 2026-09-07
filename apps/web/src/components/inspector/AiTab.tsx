'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import type { GraphNode, GraphEdge } from '@stackfold/graph';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import {
  buildSanitizedContextPayload,
  formatContextAsMarkdownPrompt,
} from '@/lib/ai/context-builder';

interface AiTabProps {
  node: GraphNode;
  incomingEdges: GraphEdge[];
  outgoingEdges: GraphEdge[];
}

export function AiTab({ node, incomingEdges, outgoingEdges }: AiTabProps) {
  const rawGraph = useStackfoldStore(s => s.rawGraph);
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const contextPayload = buildSanitizedContextPayload(
    node,
    incomingEdges,
    outgoingEdges,
    rawGraph
  );

  const markdownPrompt = formatContextAsMarkdownPrompt(contextPayload);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(markdownPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Deterministic facts strictly from static graph
  const verifiedFacts: string[] = [
    `Entity '${node.displayName}' classified as '${node.type}'.`,
    `Source location: ${node.filePath || 'manifest/virtual'} (Confidence: ${node.confidence}).`,
    `Discovered via rule: \`${node.evidence.rule}\` by detector \`${node.evidence.detectorId}\`.`,
    `${incomingEdges.length} incoming dependency link(s) and ${outgoingEdges.length} outgoing link(s).`,
  ];

  if (node.type === 'api_route') {
    verifiedFacts.push(
      `Exposes HTTP ${node.metadata.httpMethod || 'ANY'} on path '${node.metadata.routePath || ''}'.`
    );
  } else if (node.type === 'database_model') {
    verifiedFacts.push(
      `Table '${node.displayName}' with ${node.metadata.fieldsCount || 0} relational field definitions.`
    );
  } else if (node.type === 'environment_variable') {
    verifiedFacts.push(
      `Referenced across ${node.metadata.usageCount || 0} location(s). Declaration status: ${
        node.metadata.isDeclaredInExample ? 'Declared in template' : 'Undeclared'
      }.`
    );
  }

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Optional AI Banner */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/30 via-[#131625] to-purple-950/20 border border-indigo-500/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-100">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>AI Architecture Intelligence</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] bg-[#1d2338] text-slate-300 border border-[#2b3552]">
            Optional Layer
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Stackfold separates deterministic scanner facts from AI reasoning. No external AI keys are required for core graph analysis.
        </p>

        {/* Copy Sanitized Context Prompt */}
        <button
          onClick={handleCopyPrompt}
          className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-colors shadow-md text-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-300" />
              <span>Prompt Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Sanitized Context for ChatGPT / Claude</span>
            </>
          )}
        </button>
      </div>

      {/* Confirmed Scanner Facts (100% Deterministic) */}
      <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-300 text-[11px]">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Confirmed Facts (Deterministic Static Analysis)</span>
        </div>
        <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
          {verifiedFacts.map((fact, idx) => (
            <li key={idx}>{fact}</li>
          ))}
        </ul>
      </div>

      {/* Reasoning Guidelines & Inferences */}
      <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-indigo-300 text-[11px]">
          <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
          <span>Architectural Role &amp; Data Flow Context</span>
        </div>
        <p className="text-[11px] text-slate-400">
          This component has {incomingEdges.length} upstream caller(s) and connects to {outgoingEdges.length} downstream service(s).
          Changes to its signature will directly impact connected routes and database models.
        </p>
      </div>

      {/* Unknowns & External Boundaries */}
      <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-amber-300 text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Runtime Boundaries &amp; Unknowns</span>
        </div>
        <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
          <li>Production traffic volume and query latency (requires runtime APM telemetry).</li>
          <li>Database table cardinality and dynamic runtime payload mutations.</li>
        </ul>
      </div>

      {/* Context Payload Preview (Zero Secret Guarantee) */}
      <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
        <button
          onClick={() => setShowPayloadPreview(!showPayloadPreview)}
          className="w-full flex items-center justify-between text-[11px] text-slate-400 font-medium hover:text-slate-200"
        >
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            Inspect Sanitized Context Payload
          </span>
          {showPayloadPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showPayloadPreview && (
          <div className="pt-2">
            <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Zero secret keys or private credential values are ever transmitted.</span>
            </div>
            <pre className="p-2.5 rounded-lg bg-[#0c0e16] border border-[#1b2032] text-[10px] font-mono text-slate-300 max-h-40 overflow-y-auto">
              {JSON.stringify(contextPayload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
