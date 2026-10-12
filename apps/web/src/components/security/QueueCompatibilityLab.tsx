'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileCode2,
  Inbox,
  LoaderCircle,
  Play,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';
import { AppRail } from '@/components/shell/AppRail';
import { getPlatformAdapter } from '@stackfold/platform';
import { useStackfoldStore } from '@/store/useStackfoldStore';

type PayloadVerdict = 'compatible' | 'review' | 'fail';

interface QueueSummary {
  id: string;
  queue: string;
  consumerVersion: string;
  producerFile: string;
  consumerFile: string;
  payloadVersions: string[];
  compatible: number;
  review: number;
  fail: number;
}

interface QueuePayload {
  id: string;
  label: string;
  queue: string;
  jobName: string;
  payloadVersion: string;
  consumerVersion: string;
  verdict: PayloadVerdict;
  failingField: string | null;
  failingStep: string | null;
  dataFingerprint: string;
  comparison: string;
  appliedMigrations: string[];
  reason?: string;
}

interface QueueResult {
  generatedAt: string;
  queues: QueueSummary[];
  payloads: QueuePayload[];
  reproductionTest: string;
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'danger' | 'success' }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#74796d]">{label}</div>
      <div className={clsx('break-all font-mono text-[11px]', tone === 'danger' ? 'text-[#ff7777]' : tone === 'success' ? 'text-[#62d49b]' : 'text-[#d9ddd0]')}>{value}</div>
    </div>
  );
}

function PayloadDetail({ payload }: { payload: QueuePayload }) {
  const failed = payload.verdict === 'fail';
  const needsReview = payload.verdict === 'review';
  return (
    <div className="space-y-3" data-testid={`queue-payload-${payload.id}`}>
      <div className={clsx('rounded-xl border p-4', failed ? 'border-[#ef4444]/40 bg-[#ef4444]/[0.055]' : needsReview ? 'border-[#f6c945]/40 bg-[#f6c945]/[0.055]' : 'border-[#34382e] bg-[#11130f]')}>
        <div className={clsx('flex items-center gap-2 text-xs font-semibold', failed ? 'text-[#ff7777]' : needsReview ? 'text-[#f6c945]' : 'text-[#62d49b]')}>
          {failed ? <ShieldAlert className="h-4 w-4" /> : needsReview ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          {failed
            ? `Worker rejects this payload — field '${payload.failingField}' at step '${payload.failingStep}'`
            : needsReview
              ? 'Requires review — undecidable with the configured contract'
              : 'Compatible with the current worker contract'}
        </div>
        {needsReview && (
          <p className="mt-2 text-[11px] leading-relaxed text-[#a5aa9b]">{payload.reason || 'This payload could not be decided with the configured adapters.'}</p>
        )}
      </div>

      <div className="rounded-xl border border-[#34382e] bg-[#11130f] p-4">
        <div className="text-[10px] uppercase tracking-[0.14em] text-[#74796d]">Exact comparison (fingerprints and field paths only)</div>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-[#c8cfbf]">{payload.comparison}</pre>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Metric label="Job" value={`${payload.jobName} · ${payload.payloadVersion} → ${payload.consumerVersion}`} />
          <Metric label="Payload fingerprint" value={`#${payload.dataFingerprint}`} tone={failed ? 'danger' : 'success'} />
          <Metric label="Failing field" value={payload.failingField || '—'} tone={failed ? 'danger' : 'neutral'} />
          <Metric label="Validation step" value={payload.failingStep || 'all checks passed'} tone={failed || needsReview ? 'danger' : 'success'} />
        </div>
      </div>

      {payload.appliedMigrations.length > 0 && (
        <div className="rounded-xl border border-[#34382e] bg-[#11130f] p-4">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[#74796d]">Applied migration path</div>
          <ul className="mt-2 space-y-1 font-mono text-[10px] text-[#c8cfbf]">
            {payload.appliedMigrations.map(step => <li key={step}>→ {step}</li>)}
          </ul>
        </div>
      )}

      {(failed || needsReview) && (
        <div className="rounded-xl border border-[#34382e] bg-[#11130f] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#f6f7f2]"><ShieldCheck className="h-4 w-4 text-[#62d49b]" />Repair guidance</div>
          <ol className="mt-3 space-y-2 text-[11px] leading-relaxed text-[#a5aa9b]">
            {failed ? (
              <>
                <li className="flex gap-2"><span className="font-mono text-[#f6c945]">01</span><span>Backfill or migrate <code className="font-mono text-[#f6f7f2]">{payload.failingField}</code> in the producer, or declare a migration step for it in the queue contract.</span></li>
                <li className="flex gap-2"><span className="font-mono text-[#f6c945]">02</span><span>Drain or requeue already-written historical jobs only after the migration is deployed and verified.</span></li>
                <li className="flex gap-2"><span className="font-mono text-[#f6c945]">03</span><span>Re-run the generated reproduction before closing the finding.</span></li>
              </>
            ) : (
              <>
                <li className="flex gap-2"><span className="font-mono text-[#f6c945]">01</span><span>Confirm the worker tolerates this payload: ignore the extra field, add it to the contract, or declare a removal.</span></li>
                <li className="flex gap-2"><span className="font-mono text-[#f6c945]">02</span><span>Record the decision in the queue contract so the next replay is decisive instead of review.</span></li>
              </>
            )}
          </ol>
        </div>
      )}
    </div>
  );
}

type DemoId = 'queue-compatibility-failing' | 'queue-compatibility-passing';

export function QueueCompatibilityLab() {
  const currentRootPath = useStackfoldStore(s => s.currentRootPath);
  const [sourceMode, setSourceMode] = useState<'project' | DemoId>('project');
  const [result, setResult] = useState<QueueResult | null>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [running, setRunning] = useState(false);
  const [loadingRecorded, setLoadingRecorded] = useState(true);
  const [error, setError] = useState<string>();
  const [errorCode, setErrorCode] = useState<string>();
  const [source, setSource] = useState('recorded result');
  const [configPath, setConfigPath] = useState<string>();
  const [platformId, setPlatformId] = useState<string>('');

  const effectiveRoot = sourceMode === 'project' ? currentRootPath || undefined : undefined;

  const applyPayload = (payload: {
    success: boolean;
    result?: QueueResult;
    source?: string;
    configPath?: string;
    error?: string;
    code?: string;
  }, live: boolean) => {
    if (payload.success && payload.result) {
      setResult(payload.result);
      setSource(payload.source || (live ? 'live check' : 'recorded result'));
      if (payload.configPath) setConfigPath(payload.configPath);
      setSelectedId(payload.result.payloads.find(item => item.verdict === 'fail')?.id || payload.result.payloads[0]?.id);
      setError(undefined);
      setErrorCode(undefined);
    } else {
      setError(payload.error || (live ? 'The queue check failed.' : 'Unable to load queue check.'));
      setErrorCode(payload.code);
      if (!live) setResult(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingRecorded(true);
    setError(undefined);
    setErrorCode(undefined);
    (async () => {
      try {
        const adapter = getPlatformAdapter();
        setPlatformId(adapter.id);
        const recordPayload = sourceMode === 'project'
          ? effectiveRoot
            ? await adapter.loadQueueCompatibilityRecorded({ rootPath: effectiveRoot })
            : await adapter.loadQueueCompatibilityRecorded({ fixture: 'queue-compatibility-failing' })
          : await adapter.loadQueueCompatibilityRecorded({ fixture: sourceMode });
        if (!cancelled) applyPayload(recordPayload as never, false);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Unable to load queue check.');
          setErrorCode('RECORDED_LOAD_FAILED');
        }
      } finally {
        if (!cancelled) setLoadingRecorded(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceMode, currentRootPath]);

  const selected = useMemo(() => result?.payloads.find(item => item.id === selectedId) || result?.payloads[0], [result, selectedId]);
  const failCount = result?.payloads.filter(item => item.verdict === 'fail').length || 0;
  const reviewCount = result?.payloads.filter(item => item.verdict === 'review').length || 0;

  const runCheck = async () => {
    setRunning(true);
    setError(undefined);
    setErrorCode(undefined);
    try {
      const adapter = getPlatformAdapter();
      const livePayload = sourceMode === 'project'
        ? effectiveRoot
          ? await adapter.runQueueCompatibilityCheck({ rootPath: effectiveRoot })
          : await adapter.runQueueCompatibilityCheck({ fixture: 'queue-compatibility-failing' })
        : await adapter.runQueueCompatibilityCheck({ fixture: sourceMode });
      applyPayload(livePayload as never, true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The queue check failed.');
      setErrorCode('CHECK_FAILED');
    } finally {
      setRunning(false);
    }
  };

  const stateLabel = sourceMode === 'project'
    ? effectiveRoot || 'No project open · demo fallback'
    : `Demo fixture · ${sourceMode}`;

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#070806] text-[#f6f7f2]">
      <AppRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[#2a2d24] bg-[#0d0f0c] px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold"><Inbox className="h-4 w-4 text-[#f6c945]" />Security Lab</div>
            <span className="hidden h-4 w-px bg-[#34382e] sm:block" />
            <span className="hidden truncate font-mono text-[10px] text-[#74796d] sm:block">{stateLabel}</span>
            <span className="hidden items-center gap-1.5 text-[10px] text-[#62d49b] lg:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#62d49b]" />{source} · {platformId || 'web'}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <nav className="hidden items-center gap-1 text-[10px] font-medium md:flex" aria-label="Security Lab modules">
              <Link href="/security-lab" className="rounded-md px-2.5 py-1.5 text-[#a5aa9b] transition-colors hover:text-[#f6f7f2]">Cache Isolation</Link>
              <Link href="/security-lab/signature" className="rounded-md px-2.5 py-1.5 text-[#a5aa9b] transition-colors hover:text-[#f6f7f2]">Signature</Link>
              <span className="rounded-md bg-[#f6c945] px-2.5 py-1.5 font-bold text-[#070806]">Queue</span>
            </nav>
            <div className="hidden items-center rounded-lg border border-[#34382e] p-0.5 text-[10px] font-medium xl:flex" role="tablist" aria-label="Result source">
              <button role="tab" aria-selected={sourceMode === 'project'} onClick={() => setSourceMode('project')} className={clsx('rounded-md px-2.5 py-1.5 transition-colors', sourceMode === 'project' ? 'bg-[#f6c945] font-bold text-[#070806]' : 'text-[#a5aa9b] hover:text-[#f6f7f2]')}>Selected project</button>
              <button role="tab" aria-selected={sourceMode === 'queue-compatibility-failing'} onClick={() => setSourceMode('queue-compatibility-failing')} className={clsx('rounded-md px-2.5 py-1.5 transition-colors', sourceMode === 'queue-compatibility-failing' ? 'bg-[#f6c945] font-bold text-[#070806]' : 'text-[#a5aa9b] hover:text-[#f6f7f2]')}>Failing demo</button>
              <button role="tab" aria-selected={sourceMode === 'queue-compatibility-passing'} onClick={() => setSourceMode('queue-compatibility-passing')} className={clsx('rounded-md px-2.5 py-1.5 transition-colors', sourceMode === 'queue-compatibility-passing' ? 'bg-[#f6c945] font-bold text-[#070806]' : 'text-[#a5aa9b] hover:text-[#f6f7f2]')}>Passing demo</button>
            </div>
            <button onClick={runCheck} disabled={running} className="flex h-9 items-center gap-2 rounded-lg bg-[#f6c945] px-3.5 text-[11px] font-bold text-[#070806] transition-colors hover:bg-[#ffda67] disabled:cursor-wait disabled:opacity-70" data-testid="run-queue-check">{running ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}{running ? 'Replaying payloads…' : 'Run queue check'}</button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
          <main className="sf-grid min-w-0 flex-none overflow-visible p-4 lg:p-5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
            <div className="mx-auto max-w-[1120px] space-y-4">
              <div className="flex flex-col gap-4 border-b border-[#25291f] pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-[-0.025em]">Queue Compatibility</h1>
                  <p className="mt-1 text-[11px] text-[#a5aa9b]">Replay historical BullMQ payloads against the current worker contract — offline, no live Redis.</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className={clsx('rounded border px-2 py-0.5 font-medium', sourceMode === 'project' ? 'border-[#62d49b]/40 bg-[#62d49b]/10 text-[#62d49b]' : 'border-[#f6c945]/40 bg-[#f6c945]/10 text-[#f6c945]')}>{sourceMode === 'project' ? 'Selected project' : 'Explicitly labeled demo'}</span>
                    {configPath && <span className="rounded border border-[#34382e] px-2 py-0.5 font-mono text-[#a5aa9b]">{configPath.split('/').slice(-2).join('/')}</span>}
                    {result && <span className="rounded border border-[#34382e] px-2 py-0.5 font-mono text-[#74796d]" title="Payload values are never displayed — only fingerprints and field paths">values never shown</span>}
                  </div>
                </div>
                {result && (
                  <div className={clsx('flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold', failCount > 0 ? 'border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ff7777]' : reviewCount > 0 ? 'border-[#f6c945]/40 bg-[#f6c945]/10 text-[#f6c945]' : 'border-[#62d49b]/40 bg-[#62d49b]/10 text-[#62d49b]')}>
                    {failCount > 0 ? <XCircle className="h-4 w-4" /> : reviewCount > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {failCount > 0 ? `${failCount} failed` : reviewCount > 0 ? `${reviewCount} need review` : 'All payloads compatible'}
                  </div>
                )}
              </div>

              {result && result.queues.length > 0 && (
                <section className="grid gap-3 md:grid-cols-2">
                  {result.queues.map(queue => (
                    <div key={queue.id} className="rounded-xl border border-[#2a2d24] bg-[#0d0f0c] p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-[11px] font-semibold text-[#f6f7f2]">{queue.queue}</div>
                        <div className="font-mono text-[10px] text-[#74796d]">worker {queue.consumerVersion}</div>
                      </div>
                      <div className="mt-1 truncate font-mono text-[9px] text-[#74796d]">{queue.producerFile} → {queue.consumerFile}</div>
                      <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold">
                        <span className="flex items-center gap-1 text-[#62d49b]"><CheckCircle2 className="h-3.5 w-3.5" />{queue.compatible}</span>
                        <span className="flex items-center gap-1 text-[#f6c945]"><AlertTriangle className="h-3.5 w-3.5" />{queue.review}</span>
                        <span className="flex items-center gap-1 text-[#ff7777]"><XCircle className="h-3.5 w-3.5" />{queue.fail}</span>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {error && (
                <div className="space-y-2 rounded-xl border border-[#ef4444]/50 bg-[#ef4444]/10 px-4 py-3 text-[11px] text-[#ff8b8b]" data-testid="queue-error" data-error-code={errorCode}>
                  <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</div>
                  {errorCode === 'MISSING_CONFIGURATION' && <p className="pl-6 text-[10px] leading-relaxed text-[#a5aa9b]">Add <code className="font-mono text-[#f6f7f2]">.stackfold/queue-compatibility.json</code> with queues, producer/consumer adapters, payload versions, and historical payload fixtures. Switch to a labeled demo to explore the expected shape.</p>}
                  {errorCode === 'MISSING_RECORDED_RESULT' && <p className="pl-6 text-[10px] leading-relaxed text-[#a5aa9b]">No recorded result exists yet for this source. Run a live queue check to generate one.</p>}
                </div>
              )}

              {running && (
                <div className="flex items-center gap-2 rounded-xl border border-[#f6c945]/40 bg-[#f6c945]/10 px-4 py-3 text-[11px] text-[#f6c945]"><LoaderCircle className="h-4 w-4 animate-spin" />Replaying historical payloads against worker contracts…</div>
              )}

              {loadingRecorded || !result || !selected ? (
                !error ? (
                  <div className="grid min-h-[420px] place-items-center rounded-xl border border-[#2a2d24] bg-[#0d0f0c]"><div className="text-center"><LoaderCircle className="mx-auto h-6 w-6 animate-spin text-[#f6c945]" /><div className="mt-3 text-xs text-[#a5aa9b]">Loading queue payloads…</div></div></div>
                ) : null
              ) : (
                <>
                  <section className="overflow-hidden rounded-xl border border-[#2a2d24] bg-[#0d0f0c]">
                    <div className="flex items-center justify-between border-b border-[#2a2d24] px-4 py-3">
                      <div>
                        <h2 className="text-xs font-semibold text-[#f6f7f2]">Historical payloads</h2>
                        <p className="mt-0.5 font-mono text-[10px] text-[#74796d]">offline replay · no live Redis</p>
                      </div>
                      <span className="font-mono text-[10px] text-[#74796d]">{result.payloads.length} payloads</span>
                    </div>
                    <div className="divide-y divide-[#25291f]">
                      {result.payloads.map(item => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                          className={clsx('grid w-full grid-cols-[minmax(0,1fr)_110px_20px] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#141611]', selectedId === item.id && 'bg-[#171a14]')}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className={item.verdict === 'fail' ? 'text-[#ff7777]' : item.verdict === 'review' ? 'text-[#f6c945]' : 'text-[#62d49b]'}><FileCode2 className="h-4 w-4" /></span>
                            <div className="min-w-0"><div className="truncate text-[11px] font-medium text-[#f6f7f2]">{item.label}</div><div className="mt-0.5 truncate font-mono text-[9px] text-[#74796d]">{item.jobName} · {item.payloadVersion} → {item.consumerVersion}</div></div>
                          </div>
                          <span className={clsx('flex items-center gap-1.5 text-[10px] font-semibold', item.verdict === 'fail' ? 'text-[#ff7777]' : item.verdict === 'review' ? 'text-[#f6c945]' : 'text-[#62d49b]')}>
                            {item.verdict === 'fail' ? <XCircle className="h-3.5 w-3.5" /> : item.verdict === 'review' ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            {item.verdict === 'fail' ? 'Fails' : item.verdict === 'review' ? 'Review' : 'Compatible'}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-[#74796d]" />
                        </button>
                      ))}
                    </div>
                  </section>
                  <PayloadDetail payload={selected} />
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
