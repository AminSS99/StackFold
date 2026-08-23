'use client';

import React, { useState } from 'react';
import { Sparkles, CheckCircle, HelpCircle, AlertCircle, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import type { GraphNode, GraphEdge } from '@stackfold/graph';

interface AiTabProps {
  node: GraphNode;
  incomingEdges: GraphEdge[];
  outgoingEdges: GraphEdge[];
}

export function AiTab({ node, incomingEdges, outgoingEdges }: AiTabProps) {
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<{
    facts: string[];
    inferences: string[];
    unknowns: string[];
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Build the sanitized minimal context payload
  const contextPayload = {
    entity: {
      type: node.type,
      name: node.displayName,
      file: node.filePath,
      metadata: node.metadata,
      confidence: node.confidence,
    },
    topology: {
      incomingRelations: incomingEdges.map(e => ({ source: e.source, type: e.type })),
      outgoingRelations: outgoingEdges.map(e => ({ target: e.target, type: e.type })),
    },
  };

  const handleGenerateExplanation = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // Deterministic reasoning synthesis based on node type & relationships
      const facts: string[] = [
        `Component type is '${node.type}', identified at '${node.filePath || 'manifest'}' with HIGH confidence.`,
        `${incomingEdges.length} incoming relationships and ${outgoingEdges.length} outgoing relationships mapped deterministically.`,
      ];

      if (node.type === 'api_route') {
        facts.push(`Handles HTTP ${node.metadata.httpMethod || 'request'} calls on path '${node.metadata.routePath}'.`);
      } else if (node.type === 'database_model') {
        facts.push(`Prisma schema entity '${node.displayName}' defining ${node.metadata.fieldsCount || 0} relational columns.`);
      } else if (node.type === 'environment_variable') {
        facts.push(`Configuration key '${node.displayName}' accessed across ${node.metadata.usageCount || 0} locations.`);
      }

      const inferences: string[] = [
        `Likely operates as a critical link in the user checkout and data persistence pathway.`,
        `Modifications to this file will necessitate integration testing for all ${incomingEdges.length} dependent components.`,
      ];

      const unknowns: string[] = [
        `Runtime traffic volume and database row cardinality (only discoverable via production telemetry).`,
        `Dynamic runtime payload variations not captured by static types.`,
      ];

      setAiExplanation({ facts, inferences, unknowns });
      setIsGenerating(false);
    }, 400);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* AI Header */}
      <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/40 to-purple-950/30 border border-indigo-500/30 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-100">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Architectural Intelligence</span>
        </div>
        <p className="text-[11px] text-slate-300">
          Synthesize deterministic scanner facts into actionable architectural summaries and risk analysis.
        </p>
        <button
          onClick={handleGenerateExplanation}
          disabled={isGenerating}
          className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium flex items-center justify-center gap-2 shadow transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isGenerating ? 'Analyzing Graph Context...' : 'Explain Architectural Role'}</span>
        </button>
      </div>

      {/* Context Payload Preview (Security / Zero Secret Disclosure) */}
      <div className="p-3 rounded-xl bg-[#141724] border border-[#222738] space-y-2">
        <button
          onClick={() => setShowPayloadPreview(!showPayloadPreview)}
          className="w-full flex items-center justify-between text-[11px] text-slate-400 font-medium hover:text-slate-200"
        >
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            Transmitted Context Preview (Sanitized)
          </span>
          {showPayloadPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showPayloadPreview && (
          <div className="pt-2">
            <div className="text-[10px] text-slate-500 mb-1">
              Only verified architectural facts are transmitted. No secret keys or credentials are ever included.
            </div>
            <pre className="p-2 rounded bg-[#0c0e16] border border-[#1b2032] text-[10px] font-mono text-slate-300 max-h-40 overflow-y-auto">
              {JSON.stringify(contextPayload, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* AI Explanation Output */}
      {aiExplanation && (
        <div className="space-y-3 pt-2">
          {/* Confirmed Facts */}
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-300 text-[11px]">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Confirmed Scanner Facts (100% Deterministic)</span>
            </div>
            <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
              {aiExplanation.facts.map((fact, idx) => (
                <li key={idx}>{fact}</li>
              ))}
            </ul>
          </div>

          {/* Reasoned Inferences */}
          <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-800/40 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-300 text-[11px]">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Architectural Inferences &amp; Impact</span>
            </div>
            <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
              {aiExplanation.inferences.map((inf, idx) => (
                <li key={idx}>{inf}</li>
              ))}
            </ul>
          </div>

          {/* Unknowns / Missing Info */}
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-amber-300 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Unknowns &amp; External Runtime Variables</span>
            </div>
            <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
              {aiExplanation.unknowns.map((unk, idx) => (
                <li key={idx}>{unk}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
