'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  X,
  Compass,
  ArrowRight,
  Clock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Package,
  Layers,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useStackfoldStore } from '@/store/useStackfoldStore';
import { getPlatformAdapter } from '@stackfold/platform';

export function OnboardingModal() {
  const isOpen = useStackfoldStore(s => s.isOnboardingModalOpen);
  const setOpen = useStackfoldStore(s => s.setOnboardingModalOpen);
  const scan = useStackfoldStore(s => s.scan);
  const isLoading = useStackfoldStore(s => s.isLoading);
  const error = useStackfoldStore(s => s.error);
  const recentProjects = useStackfoldStore(s => s.recentProjects);
  const loadRecentProjects = useStackfoldStore(s => s.loadRecentProjects);
  const removeRecentProject = useStackfoldStore(s => s.removeRecentProject);
  const openNativeFolderPicker = useStackfoldStore(s => s.openNativeFolderPicker);

  const [inputPath, setInputPath] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    projectName?: string;
    hasPackageJson?: boolean;
    hasTsConfig?: boolean;
    hasPrisma?: boolean;
    isMonorepo?: boolean;
    errorMessage?: string;
  } | null>(null);

  const adapter = getPlatformAdapter();
  const isDesktop = adapter.isDesktop();

  useEffect(() => {
    if (isOpen) {
      loadRecentProjects();
    }
  }, [isOpen, loadRecentProjects]);

  // Debounced path validation via platform adapter
  useEffect(() => {
    if (!inputPath.trim()) {
      setValidationResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setValidating(true);
      try {
        const result = await adapter.validateRepository(inputPath.trim());
        setValidationResult(result);
      } catch {
        setValidationResult({ isValid: false, errorMessage: 'Failed to validate directory path' });
      } finally {
        setValidating(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputPath, adapter]);

  if (!isOpen) return null;

  const handleNativeFolderPick = async () => {
    const selected = await openNativeFolderPicker();
    if (selected) {
      setInputPath(selected);
      scan({ rootPath: selected });
    }
  };

  const handleScanPath = () => {
    if (!inputPath.trim()) return;
    scan({ rootPath: inputPath.trim() });
  };

  const handleScanFixture = (fixtureId: string) => {
    scan({ fixture: fixtureId });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-[#0f121d] border border-[#232a3f] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#1c2233] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black border border-amber-500/40 flex flex-col justify-center items-center gap-[3px] p-1.5 shadow-md shrink-0">
              <div className="w-4 h-[3px] bg-amber-400 rounded-full ml-1" />
              <div className="w-4 h-[3px] bg-amber-400 rounded-full" />
              <div className="w-4 h-[3px] bg-amber-400 rounded-full mr-1" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 tracking-wide">Open Project in Stackfold</h2>
                {isDesktop && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono">
                    Desktop Native
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Deterministic architecture mapping &amp; change-impact intelligence
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1a2030]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Scan Error</div>
                <div className="text-[11px] mt-0.5">{error}</div>
              </div>
            </div>
          )}

          {/* Section 1: Local Path / Native Picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                <FolderGit2 className="w-4 h-4 text-indigo-400" />
                Local Repository Directory
              </label>
              <span className="text-[11px] text-slate-400">
                {isDesktop ? 'Native folder dialog available' : 'Absolute path on host machine'}
              </span>
            </div>

            {isDesktop && (
              <button
                onClick={handleNativeFolderPick}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 hover:border-amber-400/80 rounded-xl text-amber-200 font-semibold flex items-center justify-center gap-2 transition-all shadow-sm group"
              >
                <FolderOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Select Folder with Native Picker</span>
              </button>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputPath}
                  onChange={e => setInputPath(e.target.value)}
                  placeholder="/Users/username/projects/my-app or C:\projects\my-app"
                  className="flex-1 bg-[#141724] border border-[#283149] focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                />
                <button
                  onClick={handleScanPath}
                  disabled={isLoading || !validationResult?.isValid}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold disabled:opacity-40 rounded-xl flex items-center gap-1.5 transition-colors shadow-md shrink-0"
                >
                  <RefreshCw className={clsx('w-3.5 h-3.5', isLoading && 'animate-spin')} />
                  <span>{isLoading ? 'Scanning...' : 'Scan'}</span>
                </button>
              </div>

              {/* Validation Status Preview */}
              {validating && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pl-1">
                  <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Validating repository...</span>
                </div>
              )}

              {validationResult && !validating && (
                <div
                  className={clsx(
                    'p-3 rounded-xl border text-xs flex items-center justify-between',
                    validationResult.isValid
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                      : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {validationResult.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold text-slate-200">
                        {validationResult.isValid
                          ? `Ready: ${validationResult.projectName || 'Project'}`
                          : 'Invalid Directory'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {validationResult.errorMessage ||
                          'Supported JavaScript/TypeScript project detected.'}
                      </div>
                    </div>
                  </div>

                  {validationResult.isValid && (
                    <div className="flex items-center gap-1">
                      {validationResult.isMonorepo && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300 text-[10px]">
                          Monorepo
                        </span>
                      )}
                      {validationResult.hasPrisma && (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 text-[10px]">
                          Prisma
                        </span>
                      )}
                      {validationResult.hasTsConfig && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300 text-[10px]">
                          TypeScript
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Bundled Sample Fixtures */}
          <div className="space-y-2 pt-2 border-t border-[#1c2233]">
            <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
              Or Explore Test Fixtures
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleScanFixture('sample-ecommerce-app')}
                disabled={isLoading}
                className="p-3 rounded-xl bg-[#141724] hover:bg-[#1a1f30] border border-[#232a3f] hover:border-indigo-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-slate-200 group-hover:text-indigo-300 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-400" />
                    E-Commerce Store
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  Next.js 14 App Router, Prisma PostgreSQL, Stripe &amp; Resend
                </p>
              </button>

              <button
                onClick={() => handleScanFixture('sample-monorepo-platform')}
                disabled={isLoading}
                className="p-3 rounded-xl bg-[#141724] hover:bg-[#1a1f30] border border-[#232a3f] hover:border-indigo-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-slate-200 group-hover:text-indigo-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    Monorepo Platform
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  pnpm Workspaces: 2 Next.js apps, shared Prisma DB &amp; utilities
                </p>
              </button>
            </div>
          </div>

          {/* Section 3: Recent Scans */}
          {recentProjects.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#1c2233]">
              <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span>Recent Projects</span>
                <Clock className="w-3 h-3 text-slate-500" />
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {recentProjects.map(p => (
                  <div
                    key={p.path}
                    className="p-2.5 rounded-xl bg-[#141724] border border-[#222738] flex items-center justify-between hover:bg-[#1a1f30] transition-colors group"
                  >
                    <button
                      onClick={() =>
                        p.isFixture && p.fixtureId
                          ? handleScanFixture(p.fixtureId)
                          : scan({ rootPath: p.path })
                      }
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="font-medium text-slate-200 group-hover:text-indigo-300 truncate">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{p.path}</div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {p.nodeCount} nodes
                      </span>
                      <button
                        onClick={() => removeRecentProject(p.path)}
                        title="Remove from recents"
                        className="p-1 text-slate-500 hover:text-rose-400 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy Note */}
          <div className="p-3 rounded-xl bg-[#111420] border border-[#1d2335] text-[11px] text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong>Local-First Guarantee:</strong> Static analysis runs locally on your machine. Secrets &amp; credentials are never collected.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
