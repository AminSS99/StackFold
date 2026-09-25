'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Braces,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Clock3,
  Code2,
  FileCode2,
  KeyRound,
  LoaderCircle,
  Play,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  UserRound,
  XCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';
import { AppRail } from '@/components/shell/AppRail';
import { getPlatformAdapter } from '@stackfold/platform';
import { useStackfoldStore } from '@/store/useStackfoldStore';

type ProbeKind = 'html' | 'json' | 'production_build';

interface ProbeResult {
  id: string;
  label: string;
  kind: ProbeKind;
  path: string;
  status: 'isolated' | 'leak';
  sessionAStatus: number;
  sessionBStatus: number;
  cacheStatusA: string;
  cacheStatusB: string;
  cacheControl?: string;
  age?: string;
  durationMs: number;
  markerFingerprint: string;
}

interface LabResult {
  generatedAt: string;
  environment: string;
  baseUrl: string;
  authenticationHeader: string;
  probes: ProbeResult[];
  reproductionTest: string;
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'danger' | 'success' }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#74796d]">{label}</div>
      <div className={clsx('font-mono text-[11px]', tone === 'danger' ? 'text-[#ff7777]' : tone === 'success' ? 'text-[#62d49b]' : 'text-[#d9ddd0]')}>{value}</div>
    </div>
  );
}

function FlowArrow({ danger = false, running = false }: { danger?: boolean; running?: boolean }) {
  return (
    <div className="hidden lg:flex w-8 shrink-0 items-center justify-center" aria-hidden="true">
      <div className={clsx('relative h-px w-full', danger ? 'bg-[#ef4444]/60' : 'bg-[#f6c945]/45')}>
        <ArrowRight className={clsx('absolute -right-1.5 -top-2 h-4 w-4', danger ? 'text-[#ef4444]' : 'text-[#f6c945]', running && 'motion-safe:animate-pulse')} />
      </div>
    </div>
  );
}

function FlowCell({ icon, title, children, danger = false }: { icon: React.ReactNode; title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={clsx('min-w-0 flex-1 rounded-xl border p-3.5', danger ? 'border-[#ef4444]/60 bg-[#ef4444]/[0.055]' : 'border-[#34382e] bg-[#11130f]')}>
      <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[#74796d]">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function SessionLane({
  session,
  probe,
  running,
}: {
  session: 'A' | 'B';
  probe: ProbeResult;
  running: boolean;
}) {
  const isSecond = session === 'B';
  const leaked = isSecond && probe.status === 'leak';
  const accent = isSecond ? '#c084fc' : '#60a5fa';
  const cacheStatus = isSecond ? probe.cacheStatusB : probe.cacheStatusA;

  return (
    <div className="relative grid gap-3 lg:grid-cols-[150px_minmax(0,1fr)]" data-testid={`session-${session.toLowerCase()}-lane`}>
      <div className="rounded-xl border border-[#34382e] bg-[#10120e] p-4 overflow-hidden relative">
        <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} />
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: accent }}>Session {session}</span>
          <span className="rounded border border-[#3b3f31] px-1.5 py-0.5 font-mono text-[9px] text-[#a5aa9b]">AUTH</span>
        </div>
        <div className="mt-5 flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-full border border-[#3b3f31] bg-[#1b1e17]">
            <UserRound className="h-4 w-4" style={{ color: accent }} />
          </div>
          <div>
            <div className="text-[11px] font-medium text-[#f6f7f2]">Isolated context</div>
            <div className="mt-0.5 font-mono text-[9px] text-[#74796d]">context-{session.toLowerCase()}</div>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-2 items-stretch gap-2 lg:flex">
        <FlowCell icon={<TerminalSquare className="h-3.5 w-3.5" />} title="Request">
          <div className="font-mono text-[11px] text-[#f6f7f2]">GET {probe.path}</div>
          <div className="mt-2 truncate font-mono text-[9px] text-[#74796d]">{isSecond ? 'credential: session-b' : 'credential: session-a'}</div>
        </FlowCell>
        <FlowArrow running={running} />
        <FlowCell icon={<ServerCog className="h-3.5 w-3.5" />} title="Edge cache">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#f6c945]"><KeyRound className="h-3.5 w-3.5" /> Shared cache key</div>
          <div className="mt-2 font-mono text-[9px] text-[#74796d]">{probe.path}</div>
        </FlowCell>
        <FlowArrow danger={leaked} running={running} />
        <FlowCell icon={<Code2 className="h-3.5 w-3.5" />} title="Response">
          <div className="flex items-center gap-2">
            <span className={clsx('rounded px-1.5 py-0.5 font-mono text-[10px] font-bold', leaked ? 'bg-[#ef4444] text-white' : 'bg-[#62d49b]/15 text-[#62d49b]')}>200 OK</span>
            <span className={clsx('font-mono text-[10px]', leaked ? 'text-[#ff7777]' : 'text-[#a5aa9b]')}>{cacheStatus}</span>
          </div>
          <div className="mt-2 font-mono text-[9px] text-[#74796d]">{probe.cacheControl || 'no cache-control reported'}</div>
        </FlowCell>
        <FlowArrow danger={leaked} running={running} />
        <FlowCell icon={leaked ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />} title="Private marker" danger={leaked}>
          <div className={clsx('font-mono text-[10px]', leaked ? 'text-[#ff8b8b]' : 'text-[#62d49b]')}>fingerprint #{probe.markerFingerprint}</div>
          <div className={clsx('mt-3 flex items-center gap-1.5 text-[10px] font-semibold', leaked ? 'text-[#ff7777]' : 'text-[#62d49b]')}>
            {leaked ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {leaked ? 'Private marker exposed' : 'Private marker isolated'}
          </div>
        </FlowCell>
      </div>
    </div>
  );
}

const probeIcons: Record<ProbeKind, React.ReactNode> = {
  html: <FileCode2 className="h-4 w-4" />,
  json: <Braces className="h-4 w-4" />,
  production_build: <ServerCog className="h-4 w-4" />,
};

function ProbeSummary({ probes, selectedId, onSelect }: { probes: ProbeResult[]; selectedId?: string; onSelect: (probe: ProbeResult) => void }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#2a2d24] bg-[#0d0f0c]">
      <div className="flex items-center justify-between border-b border-[#2a2d24] px-4 py-3">
        <div>
          <h2 className="text-xs font-semibold text-[#f6f7f2]">Run summary</h2>
          <p className="mt-0.5 text-[10px] text-[#74796d]">HTML, JSON, and production-build behavior</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-[#ef4444]/40 bg-[#ef4444]/10 px-2 py-1 text-[10px] font-medium text-[#ff7777]">
          <AlertTriangle className="h-3.5 w-3.5" />
          {probes.filter(probe => probe.status === 'leak').length}/{probes.length} failed
        </div>
      </div>
      <div className="divide-y divide-[#25291f]">
        {probes.map(probe => (
          <button
            key={probe.id}
            onClick={() => onSelect(probe)}
            className={clsx('grid w-full grid-cols-[minmax(0,1fr)_92px_20px] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#141611] sm:grid-cols-[minmax(0,1fr)_72px_72px_120px_20px]', selectedId === probe.id && 'bg-[#171a14]')}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className={probe.status === 'leak' ? 'text-[#ff7777]' : 'text-[#a5aa9b]'}>{probeIcons[probe.kind]}</span>
              <div className="min-w-0"><div className="truncate text-[11px] font-medium text-[#f6f7f2]">{probe.label}</div><div className="mt-0.5 truncate font-mono text-[9px] text-[#74796d]">{probe.path}</div></div>
            </div>
            <span className="hidden font-mono text-[10px] text-[#62d49b] sm:block">{probe.sessionAStatus} OK</span>
            <span className="hidden font-mono text-[10px] text-[#62d49b] sm:block">{probe.sessionBStatus} OK</span>
            <span className={clsx('flex items-center gap-1.5 text-[10px] font-semibold', probe.status === 'leak' ? 'text-[#ff7777]' : 'text-[#62d49b]')}>
              {probe.status === 'leak' ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {probe.status === 'leak' ? 'Confirmed leak' : 'Isolated'}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-[#74796d]" />
          </button>
        ))}
      </div>
    </section>
  );
}

function CodePreview({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const lines = code.split('\n');
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="overflow-hidden rounded-xl border border-[#34382e] bg-[#090b08]">
      <div className="flex items-center justify-between border-b border-[#2a2d24] px-3 py-2">
        <div className="flex items-center gap-2"><Code2 className="h-3.5 w-3.5 text-[#f6c945]" /><span className="font-mono text-[10px] text-[#d9ddd0]">cache-isolation.spec.ts</span></div>
        <button onClick={copy} className="flex items-center gap-1.5 rounded-md border border-[#34382e] px-2 py-1 text-[9px] text-[#a5aa9b] transition-colors hover:border-[#f6c945]/50 hover:text-[#f6c945]">
          {copied ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}{copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="max-h-[430px] overflow-auto py-2 font-mono text-[9px] leading-[1.65]">
        {lines.map((line, index) => (
          <div key={`${index}-${line}`} className="grid grid-cols-[34px_1fr] hover:bg-[#141611]">
            <span className="select-none pr-2 text-right text-[#4f5447]">{index + 1}</span>
            <code className="whitespace-pre pr-3 text-[#c8cfbf]">{line}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeakInspector({ result, probe }: { result: LabResult; probe: ProbeResult }) {
  const [tab, setTab] = useState<'evidence' | 'reproduction' | 'fix'>('reproduction');
  const leaked = probe.status === 'leak';
  return (
    <aside className="flex min-h-0 flex-none flex-col border-t border-[#2a2d24] bg-[#0b0d0a] xl:w-[410px] xl:shrink-0 xl:border-l xl:border-t-0" data-testid="security-inspector">
      <div className="border-b border-[#2a2d24] p-5">
        <div className={clsx('flex items-center gap-2 text-xs font-semibold', leaked ? 'text-[#ff7777]' : 'text-[#62d49b]')}>
          {leaked ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          {leaked ? 'Confirmed leak' : 'Isolation verified'}
        </div>
        <h2 className="mt-4 text-[17px] font-semibold leading-tight text-[#f6f7f2]">{leaked ? 'Private marker exposed in cached response' : `${probe.label} remained isolated`}</h2>
        <p className="mt-2 text-[11px] leading-relaxed text-[#a5aa9b]">{leaked ? 'Session B received fingerprinted private data from Session A through a shared cache key.' : 'The second authenticated context did not receive Session A’s private marker.'}</p>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#25291f] pt-4">
          <Metric label="Cache key" value={probe.path} />
          <Metric label="Session B" value={probe.cacheStatusB} tone={leaked ? 'danger' : 'success'} />
          <Metric label="Response" value={`${probe.sessionBStatus} OK`} tone="success" />
          <Metric label="Duration" value={`${probe.durationMs} ms`} />
        </div>
      </div>
      <div className="grid grid-cols-3 border-b border-[#2a2d24] px-3 pt-2">
        {(['evidence', 'reproduction', 'fix'] as const).map(item => (
          <button key={item} onClick={() => setTab(item)} className={clsx('border-b-2 px-2 py-2.5 text-[10px] font-medium capitalize transition-colors', tab === item ? 'border-[#f6c945] text-[#f6c945]' : 'border-transparent text-[#74796d] hover:text-[#d9ddd0]')}>{item === 'fix' ? 'Fix guidance' : item}</button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'reproduction' && <div className="space-y-3"><div className="flex items-center justify-between"><div><div className="text-xs font-semibold text-[#f6f7f2]">Playwright test (generated)</div><div className="mt-1 text-[10px] text-[#74796d]">Environment references only; no session values embedded.</div></div><span className="flex items-center gap-1.5 rounded-md border border-[#34382e] px-2 py-1 font-mono text-[9px] text-[#d9ddd0]"><Sparkles className="h-3 w-3 text-[#f6c945]" />playwright</span></div><CodePreview code={result.reproductionTest} /></div>}
        {tab === 'evidence' && <div className="space-y-3"><div className="rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/[0.055] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-[#ff7777]"><AlertTriangle className="h-4 w-4" />Private marker exposed</div><p className="mt-2 text-[11px] leading-relaxed text-[#a5aa9b]">Session A warmed <span className="font-mono text-[#f6f7f2]">{probe.path}</span>. Session B then received the same fingerprint <span className="font-mono text-[#ff8b8b]">#{probe.markerFingerprint}</span>.</p></div><div className="rounded-xl border border-[#34382e] bg-[#11130f] p-4"><div className="text-[10px] uppercase tracking-[0.14em] text-[#74796d]">Response evidence</div><div className="mt-4 grid grid-cols-2 gap-4"><Metric label="Warm request" value={probe.cacheStatusA} /><Metric label="Second request" value={probe.cacheStatusB} tone={leaked ? 'danger' : 'success'} /><Metric label="Cache-Control" value={probe.cacheControl || 'unreported'} /><Metric label="Age" value={probe.age || 'unreported'} /></div></div></div>}
        {tab === 'fix' && <div className="space-y-3"><div className="rounded-xl border border-[#34382e] bg-[#11130f] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-[#f6f7f2]"><ShieldCheck className="h-4 w-4 text-[#62d49b]" />Repair the cache boundary</div><ol className="mt-4 space-y-3 text-[11px] leading-relaxed text-[#a5aa9b]"><li className="flex gap-2"><span className="font-mono text-[#f6c945]">01</span><span>Mark authenticated HTML and JSON responses <code className="text-[#f6f7f2]">private, no-store</code> unless the cache key includes identity.</span></li><li className="flex gap-2"><span className="font-mono text-[#f6c945]">02</span><span>Vary on the actual authentication boundary, then verify CDN behavior rather than trusting framework defaults.</span></li><li className="flex gap-2"><span className="font-mono text-[#f6c945]">03</span><span>Run this generated two-session reproduction against the production build before closing the finding.</span></li></ol></div><div className="rounded-xl border border-[#f6c945]/30 bg-[#f6c945]/[0.055] p-4 text-[10px] leading-relaxed text-[#a5aa9b]">Stackfold reports a reproducible boundary failure. It does not claim security certification.</div></div>}
      </div>
    </aside>
  );
}

export function CacheIsolationLab() {
  const currentRootPath = useStackfoldStore(s => s.currentRootPath);
  const rawGraph = useStackfoldStore(s => s.rawGraph);
  const [sourceMode, setSourceMode] = useState<'project' | 'demo'>('project');
  const [result, setResult] = useState<LabResult | null>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [running, setRunning] = useState(false);
  const [loadingRecorded, setLoadingRecorded] = useState(true);
  const [error, setError] = useState<string>();
  const [errorCode, setErrorCode] = useState<string>();
  const [missingEnv, setMissingEnv] = useState<string[]>();
  const [source, setSource] = useState('recorded result');
  const [configPath, setConfigPath] = useState<string>();
  const [platformId, setPlatformId] = useState<string>('');

  const effectiveRoot = sourceMode === 'demo' ? undefined : currentRootPath || undefined;
  const demoFixture = 'cache-isolation-vulnerable';

  const applyPayload = (payload: {
    success: boolean;
    result?: LabResult;
    source?: string;
    configPath?: string;
    error?: string;
    code?: string;
    missingEnv?: string[];
  }, live: boolean) => {
    if (payload.success && payload.result) {
      setResult(payload.result);
      setSource(payload.source || (live ? 'live two-session probe' : 'recorded result'));
      if (payload.configPath) setConfigPath(payload.configPath);
      setSelectedId(payload.result.probes.find(probe => probe.status === 'leak')?.id || payload.result.probes[0]?.id);
      setError(undefined);
      setErrorCode(undefined);
      setMissingEnv(undefined);
    } else {
      setError(payload.error || (live ? 'The security probe failed.' : 'Unable to load security probe.'));
      setErrorCode(payload.code);
      setMissingEnv(payload.missingEnv);
      if (!live) setResult(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingRecorded(true);
    setError(undefined);
    setErrorCode(undefined);
    setMissingEnv(undefined);
    (async () => {
      try {
        const adapter = getPlatformAdapter();
        setPlatformId(adapter.id);
        const payload = sourceMode === 'demo'
          ? await adapter.loadCacheIsolationRecorded({ fixture: demoFixture })
          : effectiveRoot
            ? await adapter.loadCacheIsolationRecorded({ rootPath: effectiveRoot })
            : await adapter.loadCacheIsolationRecorded({ fixture: demoFixture });
        if (!cancelled) {
          applyPayload(payload as never, false);
          if (!effectiveRoot && sourceMode === 'project') {
            setSource(prev => (payload as { success: boolean }).success ? `${prev} · demo fallback (no project open)` : prev);
          }
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Unable to load security probe.');
          setErrorCode('RECORDED_LOAD_FAILED');
        }
      } finally {
        if (!cancelled) setLoadingRecorded(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceMode, currentRootPath]);

  const selected = useMemo(() => result?.probes.find(probe => probe.id === selectedId) || result?.probes[0], [result, selectedId]);

  // Environment-variable references only — never credential or marker values.
  const envReferences = useMemo(() => {
    if (!result) return [];
    const names = new Set<string>();
    for (const match of result.reproductionTest.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      if (match[1]) names.add(match[1]);
    }
    return [...names];
  }, [result]);

  const runProbe = async () => {
    setRunning(true);
    setError(undefined);
    setErrorCode(undefined);
    setMissingEnv(undefined);
    try {
      const adapter = getPlatformAdapter();
      const payload = sourceMode === 'demo'
        ? await adapter.runCacheIsolationProbe({ fixture: demoFixture })
        : effectiveRoot
          ? await adapter.runCacheIsolationProbe({ rootPath: effectiveRoot })
          : await adapter.runCacheIsolationProbe({ fixture: demoFixture });
      applyPayload(payload as never, true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The security probe failed.');
      setErrorCode('PROBE_FAILED');
    } finally {
      setRunning(false);
    }
  };

  const stateLabel = sourceMode === 'demo'
    ? 'Demo fixture · cache-isolation-vulnerable'
    : effectiveRoot || rawGraph?.metadata.projectName || 'No project open';

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#070806] text-[#f6f7f2]">
      <AppRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[#2a2d24] bg-[#0d0f0c] px-4">
          <div className="flex min-w-0 items-center gap-3"><div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="h-4 w-4 text-[#f6c945]" />Security Lab</div><span className="hidden h-4 w-px bg-[#34382e] sm:block" /><span className="hidden truncate font-mono text-[10px] text-[#74796d] sm:block">{stateLabel}</span><span className="hidden items-center gap-1.5 text-[10px] text-[#62d49b] lg:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#62d49b]" />{source} · {platformId || 'web'}</span></div>
          <div className="flex shrink-0 items-center gap-2">
            <nav className="hidden items-center gap-1 text-[10px] font-medium md:flex" aria-label="Security Lab modules">
              <span className="rounded-md bg-[#f6c945] px-2.5 py-1.5 font-bold text-[#070806]">Cache Isolation</span>
              <Link href="/security-lab/signature" className="rounded-md px-2.5 py-1.5 text-[#a5aa9b] transition-colors hover:text-[#f6f7f2]">Signature</Link>
              <Link href="/security-lab/queue" className="rounded-md px-2.5 py-1.5 text-[#a5aa9b] transition-colors hover:text-[#f6f7f2]">Queue</Link>
            </nav>
            <div className="hidden items-center rounded-lg border border-[#34382e] p-0.5 text-[10px] font-medium sm:flex" role="tablist" aria-label="Result source">
              <button role="tab" aria-selected={sourceMode === 'project'} onClick={() => setSourceMode('project')} className={clsx('rounded-md px-2.5 py-1.5 transition-colors', sourceMode === 'project' ? 'bg-[#f6c945] text-[#070806] font-bold' : 'text-[#a5aa9b] hover:text-[#f6f7f2]')}>Selected project</button>
              <button role="tab" aria-selected={sourceMode === 'demo'} onClick={() => setSourceMode('demo')} className={clsx('rounded-md px-2.5 py-1.5 transition-colors', sourceMode === 'demo' ? 'bg-[#f6c945] text-[#070806] font-bold' : 'text-[#a5aa9b] hover:text-[#f6f7f2]')}>Labeled demo</button>
            </div>
            <button onClick={runProbe} disabled={running} className="flex h-9 items-center gap-2 rounded-lg bg-[#f6c945] px-3.5 text-[11px] font-bold text-[#070806] shadow-[0_0_24px_rgba(246,201,69,0.12)] transition-colors hover:bg-[#ffda67] disabled:cursor-wait disabled:opacity-70" data-testid="run-cache-probe">{running ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}{running ? 'Running isolated sessions…' : 'Run two-session probe'}</button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
          <main className="sf-grid min-w-0 flex-none overflow-visible p-4 lg:p-5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
            <div className="mx-auto max-w-[1120px] space-y-4">
              <div className="flex flex-col gap-4 border-b border-[#25291f] pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div><h1 className="text-2xl font-semibold tracking-[-0.025em]">Cache Isolation</h1><p className="mt-1 text-[11px] text-[#a5aa9b]">Verify that private, user-specific responses never cross authenticated browser sessions.</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className={clsx('rounded border px-2 py-0.5 font-medium', sourceMode === 'demo' ? 'border-[#f6c945]/40 bg-[#f6c945]/10 text-[#f6c945]' : 'border-[#62d49b]/40 bg-[#62d49b]/10 text-[#62d49b]')}>{sourceMode === 'demo' ? 'Explicitly labeled demo' : 'Selected project'}</span>
                    {configPath && <span className="rounded border border-[#34382e] px-2 py-0.5 font-mono text-[#a5aa9b]">{configPath.split('/').slice(-2).join('/')}</span>}
                    {envReferences.length > 0 && <span className="rounded border border-[#34382e] px-2 py-0.5 font-mono text-[#74796d]" title="Environment-variable references only — values are never displayed">refs: {envReferences.join(', ')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-[#34382e] bg-[#11130f] px-3 py-2"><span className="text-[10px] text-[#74796d]">Environment</span><span className="h-3 w-px bg-[#34382e]" /><span className="font-mono text-[10px] text-[#f6f7f2]">{result?.environment || '—'}</span></div>
              </div>

              {error && (
                <div className="space-y-2 rounded-xl border border-[#ef4444]/50 bg-[#ef4444]/10 px-4 py-3 text-[11px] text-[#ff8b8b]" data-testid="cache-isolation-error" data-error-code={errorCode}>
                  <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</div>
                  {errorCode === 'MISSING_CONFIGURATION' && <p className="pl-6 text-[10px] leading-relaxed text-[#a5aa9b]">Add <code className="font-mono text-[#f6f7f2]">.stackfold/cache-isolation.json</code> to the selected repository with baseUrl, header authentication, marker references, and probes. Switch to the labeled demo to explore the expected shape.</p>}
                  {errorCode === 'MISSING_RECORDED_RESULT' && <p className="pl-6 text-[10px] leading-relaxed text-[#a5aa9b]">No recorded result exists yet for this source. Run a live two-session probe to generate one.</p>}
                  {errorCode === 'MISSING_ENVIRONMENT' && missingEnv && <p className="pl-6 font-mono text-[10px] text-[#a5aa9b]">Missing references: {missingEnv.join(', ')} (names only — set values in the probe environment).</p>}
                  {errorCode === 'PLAYWRIGHT_UNAVAILABLE' && <p className="pl-6 text-[10px] leading-relaxed text-[#a5aa9b]">Browser automation is unavailable on this platform. Recorded results and graph evidence remain available.</p>}
                  {errorCode === 'TARGET_UNAVAILABLE' && <p className="pl-6 text-[10px] leading-relaxed text-[#a5aa9b]">Start the target application first, then re-run the probe.</p>}
                </div>
              )}

              {running && (
                <div className="flex items-center gap-2 rounded-xl border border-[#f6c945]/40 bg-[#f6c945]/10 px-4 py-3 text-[11px] text-[#f6c945]" data-testid="cache-isolation-running"><LoaderCircle className="h-4 w-4 animate-spin" />Running two isolated authenticated sessions…</div>
              )}

              {loadingRecorded || !result || !selected ? (
                !error ? (
                  <div className="grid min-h-[520px] place-items-center rounded-xl border border-[#2a2d24] bg-[#0d0f0c]"><div className="text-center"><LoaderCircle className="mx-auto h-6 w-6 animate-spin text-[#f6c945]" /><div className="mt-3 text-xs text-[#a5aa9b]">Loading session topology…</div></div></div>
                ) : null
              ) : (
                <>
                  <section className="relative space-y-4 overflow-hidden rounded-xl border border-[#2a2d24] bg-[#0b0d0a]/95 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.24)]">
                    <div className="flex items-center justify-between border-b border-[#25291f] pb-3"><div className="flex items-center gap-2 text-[10px] text-[#74796d]"><span className="h-2 w-2 rounded-full bg-[#62d49b]" />Isolated pass<span className="ml-2 h-2 w-2 rounded-full bg-[#ef4444]" />Leak<span className="ml-2 h-px w-5 bg-[#f6c945]/60" />Request flow</div><div className="flex items-center gap-1.5 font-mono text-[9px] text-[#74796d]"><Clock3 className="h-3 w-3" />{new Date(result.generatedAt).toLocaleTimeString()}</div></div>
                    <SessionLane session="A" probe={selected} running={running} />
                    <div className="relative h-8"><div className={clsx('absolute left-[52%] top-0 h-full w-px', selected.status === 'leak' ? 'bg-gradient-to-b from-[#f6c945] to-[#ef4444]' : 'bg-[#34382e]')} /><div className={clsx('absolute left-[calc(52%-62px)] top-2 rounded-md border px-2 py-1 font-mono text-[9px]', selected.status === 'leak' ? 'border-[#ef4444]/50 bg-[#2b1111] text-[#ff7777]' : 'border-[#34382e] bg-[#11130f] text-[#74796d]')}>{selected.status === 'leak' ? 'shared response crosses session' : 'response remains isolated'}</div></div>
                    <SessionLane session="B" probe={selected} running={running} />
                  </section>
                  <ProbeSummary probes={result.probes} selectedId={selected.id} onSelect={probe => setSelectedId(probe.id)} />
                </>
              )}
            </div>
          </main>
          {result && selected && <LeakInspector result={result} probe={selected} />}
        </div>
      </div>
    </div>
  );
}
