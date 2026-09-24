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
} from 'lucide-react';
import type { GraphNode, GraphEdge } from '@stackfold/graph';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import {
  buildSanitizedContextPayload,
  formatContextAsMarkdownPrompt,
} from '@/lib/ai/context-builder';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

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
      {/* AI Interpretation Header */}
      <div className="p-3.5 rounded-lg bg-[#141611] border border-[#f6c945]/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-[#f6f7f2]">
            <Sparkles className="w-4 h-4 text-[#f6c945]" />
            <span>AI Architecture Interpretation</span>
          </div>
          <Badge variant="yellow" size="sm">
            Interpretation Layer
          </Badge>
        </div>
        <p className="text-[11px] text-[#a5aa9b] leading-relaxed">
          Stackfold clearly separates deterministic scanner facts from AI reasoning. Sanitized context can be copied directly to LLM tools without exposing local secrets.
        </p>

        {/* Copy Sanitized Context Prompt */}
        <Button
          variant="primary"
          size="sm"
          onClick={handleCopyPrompt}
          className="w-full"
          leftIcon={copied ? <Check className="w-3.5 h-3.5 text-[#070806]" /> : <Copy className="w-3.5 h-3.5" />}
        >
          {copied ? 'Prompt Copied to Clipboard!' : 'Copy Sanitized Context for LLM'}
        </Button>
      </div>

      {/* Confirmed Scanner Facts (100% Deterministic) */}
      <div className="p-3 rounded-lg bg-[#141611] border border-[#2a2d24] space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-[#62d49b] text-[11px]">
          <CheckCircle className="w-3.5 h-3.5 text-[#62d49b]" />
          <span>Deterministic Facts (Static Analysis)</span>
        </div>
        <ul className="space-y-1.5 text-[11px] text-[#f6f7f2] list-disc list-inside">
          {verifiedFacts.map((fact, idx) => (
            <li key={idx}>{fact}</li>
          ))}
        </ul>
      </div>

      {/* Reasoning Guidelines & Inferences */}
      <div className="p-3 rounded-lg bg-[#141611] border border-[#2a2d24] space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-[#f6c945] text-[11px]">
          <HelpCircle className="w-3.5 h-3.5 text-[#f6c945]" />
          <span>Architectural Role &amp; Data Flow Context</span>
        </div>
        <p className="text-[11px] text-[#a5aa9b] leading-relaxed">
          This entity has {incomingEdges.length} upstream caller(s) and connects to {outgoingEdges.length} downstream service(s).
          Modifications to its interface will propagate to connected API routes and database models.
        </p>
      </div>

      {/* Unknowns & External Boundaries */}
      <div className="p-3 rounded-lg bg-[#141611] border border-[#2a2d24] space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-[#f6c945] text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 text-[#f6c945]" />
          <span>Runtime Boundaries &amp; Unknowns</span>
        </div>
        <ul className="space-y-1 text-[11px] text-[#a5aa9b] list-disc list-inside">
          <li>Production traffic volume and query latency (requires runtime APM).</li>
          <li>Database table cardinality and dynamic runtime payload mutations.</li>
        </ul>
      </div>

      {/* Context Payload Preview (Zero Secret Guarantee) */}
      <div className="p-3 rounded-lg bg-[#141611] border border-[#2a2d24] space-y-2">
        <button
          onClick={() => setShowPayloadPreview(!showPayloadPreview)}
          className="w-full flex items-center justify-between text-[11px] text-[#a5aa9b] font-medium hover:text-[#f6f7f2]"
        >
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[#f6c945]" />
            Inspect Sanitized Context Payload
          </span>
          {showPayloadPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showPayloadPreview && (
          <div className="pt-2">
            <div className="text-[10px] text-[#74796d] mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#62d49b]" />
              <span>Zero secret keys or private credential values are ever transmitted.</span>
            </div>
            <pre className="p-2.5 rounded-lg bg-[#070806] border border-[#2a2d24] text-[10px] font-mono text-[#a5aa9b] max-h-40 overflow-y-auto">
              {JSON.stringify(contextPayload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
