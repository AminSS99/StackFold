'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText, Code2, Database } from 'lucide-react';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import { generateMermaidDiagram, generateMarkdownReport } from '@/lib/export/graph-export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const rawGraph = useStackfoldStore(s => s.rawGraph);
  const [activeTab, setActiveTab] = useState<'mermaid' | 'markdown' | 'json'>('mermaid');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !rawGraph) return null;

  const projectName = rawGraph.metadata.projectName || 'project';

  let content = '';
  let filename = '';
  let mimeType = 'text/plain';

  if (activeTab === 'mermaid') {
    content = generateMermaidDiagram(rawGraph);
    filename = `${projectName}-architecture.mmd`;
  } else if (activeTab === 'markdown') {
    content = generateMarkdownReport(rawGraph);
    filename = `${projectName}-ARCHITECTURE.md`;
    mimeType = 'text/markdown';
  } else {
    content = JSON.stringify(rawGraph, null, 2);
    filename = `${projectName}-stackfold-graph.json`;
    mimeType = 'application/json';
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="w-full max-w-3xl rounded-2xl bg-[#0f121d] border border-[#232a3f] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#1f2638] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Export System Architecture</h2>
              <p className="text-[11px] text-slate-400">
                Share or embed your codebase architecture into PRs, documentation, or design specs.
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

        {/* Tab Switcher */}
        <div className="px-4 pt-3 flex items-center justify-between border-b border-[#1a2030] bg-[#0b0e16]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('mermaid')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'mermaid'
                  ? 'border-amber-400 text-amber-300 bg-[#141824]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Mermaid Diagram (.mmd)</span>
            </button>
            <button
              onClick={() => setActiveTab('markdown')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'markdown'
                  ? 'border-amber-400 text-amber-300 bg-[#141824]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Markdown Report (.md)</span>
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'json'
                  ? 'border-amber-400 text-amber-300 bg-[#141824]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Raw JSON Graph</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-[#171b29] hover:bg-[#20273a] border border-[#2b334a] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Code Preview */}
        <div className="flex-1 p-4 bg-[#090b12] overflow-auto">
          <pre className="text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre select-all">
            {content}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1c2233] bg-[#0c0e16] flex items-center justify-between text-[11px] text-slate-500">
          <span>{filename}</span>
          <span>Zero sensitive credentials or secrets are ever included in exports.</span>
        </div>
      </div>
    </div>
  );
}
