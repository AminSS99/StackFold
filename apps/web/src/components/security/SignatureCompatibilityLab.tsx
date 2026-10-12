'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileCode2,
  Fingerprint,
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

type VectorStatus = 'pass' | 'fail' | 'uncertain';

interface SigVector {
  id: string;
  label: string;
  kind: string;
  status: VectorStatus;
  signerCanonical: string;
  verifierCanonical: string;
  signerCanonicalFingerprint: string;
  verifierCanonicalFingerprint: string;
  signerSignatureFingerprint: string;
  verifierSignatureFingerprint: string;
  firstDifferingByte: number | null;
  firstDifferingStep: string | null;
  comparison: string;
  reason?: string;
}

interface SigResult {
  generatedAt: string;
  algorithm: string;
  secretEnv: string;
  signerFile: string;
  signerFunction: string;
  verifierFile: string;
  verifierFunction: string;
  vectors: SigVector[];
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

function VectorDetail({ vector, secretEnv }: { vector: SigVector; secretEnv: string }) {
  const failed = vector.status === 'fail';
  return (
    <div className="space-y-3" data-testid={`signature-vector-${vector.id}`}>
      <div className={clsx('rounded-xl border p-4', failed ? 'border-[#ef4444]/40 bg-[#ef4444]/[0.055]' : 'border-[#34382e] bg-[#11130f]')}>
        <div className={clsx('flex items-center gap-2 text-xs font-semibold', failed ? 'text-[#ff7777]' : 'text-[#62d49b]')}>
          {failed ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          {failed ? `Verification fails — first differing byte ${vector.firstDifferingByte}` : vector.status === 'uncertain' ? 'Uncertain — unsupported case' : 'Signer and verifier agree'}
        </div>
        {failed && vector.firstDifferingStep && (
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-[#a5aa9b]">{vector.firstDifferingStep}</p>
        )}
        {vector.status === 'uncertain' && (
          <p className="mt-2 text-[11px] leading-relaxed text-[#a5aa9b]">{vector.reason || 'This vector could not be decided with the configured adapters.'}</p>
        )}
      </div>

      <div className="rounded-xl border border-[#34382e] bg-[#11130f] p-4">
        <div className="text-[10px] uppercase tracking-[0.14em] text-[#74796d]">Exact comparison (synthetic inputs only)</div>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-[#c8cfbf]">{vector.comparison}</pre>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Metric label="Signer canonical" value={`#${vector.signerCanonicalFingerprint}`} />
          <Metric label="Verifier canonical" value={`#${vector.verifierCanonicalFingerprint}`} tone={failed ? 'danger' : 'success'} />
          <Metric label="Signer HMAC" value={`#${vector.signerSignatureFingerprint}`} />
          <Metric label="Verifier HMAC" value={`#${vector.verifierSignatureFingerprint}`} tone={failed ? 'danger' : 'success'} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-[#34382e] bg-[#090b08]">
          <div className="border-b border-[#2a2d24] px-3 py-2 font-mono text-[10px] text-[#d9ddd0]">signer canonical ({vector.signerCanonical.length} bytes)</div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap p-3 font-mono text-[9px] leading-relaxed text-[#c8cfbf]">{vector.signerCanonical}</pre>
        </div>
        <div className="overflow-hidden rounded-xl border border-[#34382e] bg-[#090b08]">
          <div className="border-b border-[#2a2d24] px-3 py-2 font-mono text-[10px] text-[#d9ddd0]">verifier canonical ({vector.verifierCanonical.length} bytes)</div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap p-3 font-mono text-[9px] leading-relaxed text-[#c8cfbf]">{vector.verifierCanonical}</pre>
        </div>
      </div>

      {failed && (
        <div className="rounded-xl border border-[#34382e] bg-[#11130f] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#f6f7f2]"><ShieldCheck className="h-4 w-4 text-[#62d49b]" />Repair guidance</div>
          <ol className="mt-3 space-y-2 text-[11px] leading-relaxed text-[#a5aa9b]">
            <li className="flex gap-2"><span className="font-mono text-[#f6c945]">01</span><span>Align the reported normalization step so <code className="font-mono text-[#f6f7f2]">{secretEnv}</code>-keyed HMACs sign identical bytes on both sides.</span></li>
            <li className="flex gap-2"><span className="font-mono text-[#f6c945]">02</span><span>Apply the fix in the weaker side (usually the verifier), keeping the stricter canonicalization.</span></li>
            <li className="flex gap-2"><span className="font-mono text-[#f6c945]">03</span><span>Re-run the generated reproduction with a synthetic secret before closing the finding.</span></li>
          </ol>
        </div>
      )}
    </div>
  );
}

type DemoId = 'signature-compatibility-vulnerable' | 'signature-compatibility-passing';

export function SignatureCompatibilityLab() {
  const currentRootPath = useStackfoldStore(s => s.currentRootPath);
  const [sourceMode, setSourceMode] = useState<'project' | DemoId>('project');
  const [result, setResult] = useState<SigResult | null>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [running, setRunning] = useState(false);
  const [loadingRecorded, setLoadingRecorded] = useState(true);
  const [error, setError] = useState<string>();
  const [errorCode, setErrorCode] = useState<string>();
  const [missingEnv, setMissingEnv] = useState<string[]>();
  const [source, setSource] = useState('recorded result');
  const [configPath, setConfigPath] = useState<string>();
  const [platformId, setPlatformId] = useState<string>('');

  const effectiveRoot = sourceMode === 'project' ? currentRootPath || undefined : undefined;

  const applyPayload = (payload: {
    success: boolean;
    result?: SigResult;
    source?: string;
    configPath?: string;
    error?: string;
    code?: string;
    missingEnv?: string[];
  }, live: boolean) => {
    if (payload.success && payload.result) {
      setResult(payload.result);
      setSource(payload.source || (live ? 'live check' : 'recorded result'));
      if (payload.configPath) setConfigPath(payload.configPath);
      setSelectedId(payload.result.vectors.find(vector => vector.status === 'fail')?.id || payload.result.vectors[0]?.id);
      setError(undefined);
      setErrorCode(undefined);
      setMissingEnv(undefined);
    } else {
      setError(payload.error || (live ? 'The signature check failed.' : 'Unable to load signature check.'));
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
        const payload = sourceMode === 'project'
          ? effectiveRoot
            ? await adapter.loadSignatureCompatibilityRecorded({ rootPath: effectiveRoot })
            : await adapter.loadSignatureCompatibilityRecorded({ fixture: 'signature-compatibility-vulnerable' })
          : await adapter.loadSignatureCompatibilityRecorded({ fixture: sourceMode });
        if (!cancelled) applyPayload(payload as never, false);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Unable to load signature check.');
          setErrorCode('RECORDED_LOAD_FAILED');
        }
      } finally {
        if (!cancelled) setLoadingRecorded(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceMode, currentRootPath]);

  const selected = useMemo(() => result?.vectors.find(vector => vector.id === selectedId) || result?.vectors[0], [result, selectedId]);
  const failCount = result?.vectors.filter(vector => vector.status === 'fail').length || 0;

  const runCheck = async () => {
    setRunning(true);
    setError(undefined);
    setErrorCode(undefined);
    setMissingEnv(undefined);
    try {
      const adapter = getPlatformAdapter();
      const payload = sourceMode === 'project'
        ? effectiveRoot
          ? await adapter.runSignatureCompatibilityProbe({ rootPath: effectiveRoot })
          : await adapter.runSignatureCompatibilityProbe({ fixture: 'signature-compatibility-vulnerable' })
        : await adapter.runSignatureCompatibilityProbe({ fixture: sourceMode });
      applyPayload(payload as never, true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The signature check failed.');
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
            <div className="flex items-center gap-2 text-xs font-semibold"><Fingerprint className="h-4 w-4 text-[#f6c945]" />Security Lab</div>
            <span className="hidden h-4 w-px bg-[#34382e] sm:block" />
            <span className="hidden truncate font-mono text-[10px] text-[#74796d] sm:block">{stateLabel}</span>
            <span className="hidden items-center gap-1.5 text-[10px] text-[#62d49b] lg:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#62d49b]" />{source} · {platformId || 'web'}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <nav className="hidden items-center gap-1 text-[10px] font-medium md:flex" aria-label="Security Lab modules">
              <Link href="/security-lab" className="rounded-md px-2.5 py-1.5 text-[#a5aa9b] transition-colors hover:text-[#f6f7f2]">Cache Isolation</Link>
              <span className="rounded-md bg-[#f6c945] px-2.5 py-1.5 font-bold text-[#070806]">Signature</span>
              <Link href="/security-lab/queue" className="rounded-md px-2.5 py-1.5 text-[#a5aa9b] transition-colors hover:text-[#f6f7f2]">Queue</Link>
            </nav>
            <div className="hidden items-center rounded-lg border border-[#34382e] p-0.5 text-[10px] font-medium xl:flex" role="tablist" aria-label="Result source">
              <button role="tab" aria-selected={sourceMode === 'project'} onClick={() => setSourceMode('project')} className={clsx('rounded-md px-2.5 py-1.5 transition-colors', sourceMode === 'project' ? 'bg-[#f6c945] font-bold text-[#070806]' : 'text-[#a5aa9b] hover:text-[#f6f7f2]')}>Selected project</button>
              <button role="tab" aria-selected={sourceMode === 'signature-compatibility-vulnerable'} onClick={() => setSourceMode('signature-compatibility-vulnerable')} className={clsx('rounded-md px-2.5 py-1.5 transition-colors', sourceMode === 'signature-compatibility-vulnerable' ? 'bg-[#f6c945] font-bold text-[#070806]' : 'text-[#a5aa9b] hover:text-[#f6f7f2]')}>Mismatch demo</button>
              <button role="tab" aria-selected={sourceMode === 'signature-compatibility-passing'} onClick={() => setSourceMode('signature-compatibility-passing')} className={clsx('rounded-md px-2.5 py-1.5 transition-colors', sourceMode === 'signature-compatibility-passing' ? 'bg-[#f6c945] font-bold text-[#070806]' : 'text-[#a5aa9b] hover:text-[#f6f7f2]')}>Passing demo</button>
            </div>
            <button onClick={runCheck} disabled={running} className="flex h-9 items-center gap-2 rounded-lg bg-[#f6c945] px-3.5 text-[11px] font-bold text-[#070806] transition-colors hover:bg-[#ffda67] disabled:cursor-wait disabled:opacity-70" data-testid="run-signature-check">{running ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}{running ? 'Checking signatures…' : 'Run signature check'}</button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
          <main className="sf-grid min-w-0 flex-none overflow-visible p-4 lg:p-5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
            <div className="mx-auto max-w-[1120px] space-y-4">
              <div className="flex flex-col gap-4 border-b border-[#25291f] pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-[-0.025em]">Signature Compatibility</h1>
                  <p className="mt-1 text-[11px] text-[#a5aa9b]">Test the signer and verifier together and pinpoint the exact normalization mismatch.</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className={clsx('rounded border px-2 py-0.5 font-medium', sourceMode === 'project' ? 'border-[#62d49b]/40 bg-[#62d49b]/10 text-[#62d49b]' : 'border-[#f6c945]/40 bg-[#f6c945]/10 text-[#f6c945]')}>{sourceMode === 'project' ? 'Selected project' : 'Explicitly labeled demo'}</span>
                    {configPath && <span className="rounded border border-[#34382e] px-2 py-0.5 font-mono text-[#a5aa9b]">{configPath.split('/').slice(-2).join('/')}</span>}
                    {result && <span className="rounded border border-[#34382e] px-2 py-0.5 font-mono text-[#74796d]" title="Secret environment-variable reference only — the value is never displayed">secret ref: {result.secretEnv}</span>}
                    {result && <span className="rounded border border-[#34382e] px-2 py-0.5 font-mono text-[#74796d]">{result.algorithm}</span>}
                  </div>
                </div>
                {result && (
                  <div className={clsx('flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold', failCount > 0 ? 'border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ff7777]' : 'border-[#62d49b]/40 bg-[#62d49b]/10 text-[#62d49b]')}>
                    {failCount > 0 ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {failCount > 0 ? `${failCount}/${result.vectors.length} mismatched` : 'All vectors agree'}
                  </div>
                )}
              </div>

              {error && (
                <div className="space-y-2 rounded-xl border border-[#ef4444]/50 bg-[#ef4444]/10 px-4 py-3 text-[11px] text-[#ff8b8b]" data-testid="signature-error" data-error-code={errorCode}>
                  <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</div>
                  {errorCode === 'MISSING_CONFIGURATION' && <p className="pl-6 text-[10px] leading-relaxed text-[#a5aa9b]">Add <code className="font-mono text-[#f6f7f2]">.stackfold/signature-compatibility.json</code> with algorithm, secret reference, signer/verifier adapters, and test vectors. Switch to a labeled demo to explore the expected shape.</p>}
                  {errorCode === 'MISSING_ENVIRONMENT' && missingEnv && <p className="pl-6 font-mono text-[10px] text-[#a5aa9b]">Missing reference: {missingEnv.join(', ')} (name only — set a synthetic value in the check environment).</p>}
                </div>
              )}

              {running && (
                <div className="flex items-center gap-2 rounded-xl border border-[#f6c945]/40 bg-[#f6c945]/10 px-4 py-3 text-[11px] text-[#f6c945]"><LoaderCircle className="h-4 w-4 animate-spin" />Comparing signer and verifier canonical inputs…</div>
              )}

              {loadingRecorded || !result || !selected ? (
                !error ? (
                  <div className="grid min-h-[420px] place-items-center rounded-xl border border-[#2a2d24] bg-[#0d0f0c]"><div className="text-center"><LoaderCircle className="mx-auto h-6 w-6 animate-spin text-[#f6c945]" /><div className="mt-3 text-xs text-[#a5aa9b]">Loading signature vectors…</div></div></div>
                ) : null
              ) : (
                <>
                  <section className="overflow-hidden rounded-xl border border-[#2a2d24] bg-[#0d0f0c]">
                    <div className="flex items-center justify-between border-b border-[#2a2d24] px-4 py-3">
                      <div>
                        <h2 className="text-xs font-semibold text-[#f6f7f2]">Test vectors</h2>
                        <p className="mt-0.5 font-mono text-[10px] text-[#74796d]">{result.signerFile}#{result.signerFunction} vs {result.verifierFile}#{result.verifierFunction}</p>
                      </div>
                      <span className="font-mono text-[10px] text-[#74796d]">{result.vectors.length} vectors</span>
                    </div>
                    <div className="divide-y divide-[#25291f]">
                      {result.vectors.map(vector => (
                        <button
                          key={vector.id}
                          onClick={() => setSelectedId(vector.id)}
                          className={clsx('grid w-full grid-cols-[minmax(0,1fr)_110px_20px] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#141611]', selectedId === vector.id && 'bg-[#171a14]')}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className={vector.status === 'fail' ? 'text-[#ff7777]' : vector.status === 'uncertain' ? 'text-[#f6c945]' : 'text-[#62d49b]'}><FileCode2 className="h-4 w-4" /></span>
                            <div className="min-w-0"><div className="truncate text-[11px] font-medium text-[#f6f7f2]">{vector.label}</div><div className="mt-0.5 truncate font-mono text-[9px] text-[#74796d]">{vector.kind} · byte {vector.firstDifferingByte ?? '—'}</div></div>
                          </div>
                          <span className={clsx('flex items-center gap-1.5 text-[10px] font-semibold', vector.status === 'fail' ? 'text-[#ff7777]' : vector.status === 'uncertain' ? 'text-[#f6c945]' : 'text-[#62d49b]')}>
                            {vector.status === 'fail' ? <XCircle className="h-3.5 w-3.5" /> : vector.status === 'uncertain' ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            {vector.status === 'fail' ? 'Mismatch' : vector.status === 'uncertain' ? 'Uncertain' : 'Agree'}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-[#74796d]" />
                        </button>
                      ))}
                    </div>
                  </section>
                  <VectorDetail vector={selected} secretEnv={result.secretEnv} />
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
