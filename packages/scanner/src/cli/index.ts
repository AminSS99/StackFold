#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { scanRepository } from '../index';
import { formatFindings, type FindingReportFormat } from '../reporting/findings';
import { loadCacheIsolationConfig, runCacheIsolationProbe } from '../security/cache-isolation';
import { loadSignatureCompatibilityConfig, runSignatureCompatibilityCheck } from '../security/signature-compatibility';
import { loadQueueCompatibilityConfig, runQueueCompatibilityCheck } from '../security/queue-compatibility';

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === 'cache-isolation') {
    const rootPath = args[1];
    if (!rootPath || args.includes('--help')) {
      process.stdout.write('Usage: stackfold cache-isolation <repository> [--out result.json] [--headed]\n');
      process.exit(args.includes('--help') ? 0 : 1);
    }
    const canonicalRoot = path.resolve(rootPath);
    const { config } = loadCacheIsolationConfig(canonicalRoot);
    const result = await runCacheIsolationProbe(config, { headless: !args.includes('--headed') });
    const output = `${JSON.stringify(result, null, 2)}\n`;
    const outputPath = valueAfter(args, '--out');
    if (outputPath) {
      const resolvedOutput = path.resolve(outputPath);
      fs.writeFileSync(resolvedOutput, output, { encoding: 'utf8', mode: 0o600 });
      process.stdout.write(`Cache Isolation wrote privacy-safe results to ${resolvedOutput}\n`);
    } else {
      process.stdout.write(output);
    }
    if (result.probes.some(probe => probe.status === 'leak')) process.exitCode = 1;
    return;
  }
  if (args[0] === 'signature-compatibility') {
    const rootPath = args[1];
    if (!rootPath || args.includes('--help')) {
      process.stdout.write('Usage: stackfold signature-compatibility <repository> [--out result.json]\n');
      process.exit(args.includes('--help') ? 0 : 1);
    }
    const canonicalRoot = path.resolve(rootPath);
    const { config } = loadSignatureCompatibilityConfig(canonicalRoot);
    const checkResult = await runSignatureCompatibilityCheck(config);
    const output = `${JSON.stringify(checkResult, null, 2)}\n`;
    const outputPath = valueAfter(args, '--out');
    if (outputPath) {
      const resolvedOutput = path.resolve(outputPath);
      fs.writeFileSync(resolvedOutput, output, { encoding: 'utf8', mode: 0o600 });
      process.stdout.write(`Signature Compatibility wrote privacy-safe results to ${resolvedOutput}\n`);
    } else {
      process.stdout.write(output);
    }
    if (checkResult.vectors.some(vector => vector.status === 'fail')) process.exitCode = 1;
    return;
  }
  if (args[0] === 'queue-compatibility') {
    const rootPath = args[1];
    if (!rootPath || args.includes('--help')) {
      process.stdout.write('Usage: stackfold queue-compatibility <repository> [--out result.json]\n');
      process.exit(args.includes('--help') ? 0 : 1);
    }
    const canonicalRoot = path.resolve(rootPath);
    const { config } = loadQueueCompatibilityConfig(canonicalRoot);
    const queueResult = await runQueueCompatibilityCheck(config, { rootPath: canonicalRoot });
    const output = `${JSON.stringify(queueResult, null, 2)}\n`;
    const outputPath = valueAfter(args, '--out');
    if (outputPath) {
      const resolvedOutput = path.resolve(outputPath);
      fs.writeFileSync(resolvedOutput, output, { encoding: 'utf8', mode: 0o600 });
      process.stdout.write(`Queue Compatibility wrote privacy-safe results to ${resolvedOutput}\n`);
    } else {
      process.stdout.write(output);
    }
    if (queueResult.payloads.some(payload => payload.verdict === 'fail')) process.exitCode = 1;
    return;
  }
  const rootPath = args.find(arg => !arg.startsWith('-'));
  const format = (valueAfter(args, '--format') || 'terminal') as FindingReportFormat;
  const supported: FindingReportFormat[] = ['terminal', 'json', 'github-actions', 'circleci'];

  if (!rootPath || args.includes('--help')) {
    process.stdout.write('Usage: stackfold <repository> [--format terminal|json|github-actions|circleci] [--fail-on-findings]\n       stackfold cache-isolation <repository> [--out result.json] [--headed]\n       stackfold signature-compatibility <repository> [--out result.json]\n       stackfold queue-compatibility <repository> [--out result.json]\n');
    process.exit(args.includes('--help') ? 0 : 1);
  }
  if (!supported.includes(format)) {
    throw new Error(`Unsupported format '${format}'.`);
  }

  const result = await scanRepository({ rootPath, useCache: false });
  process.stdout.write(`${formatFindings(result.graph.findings, format)}\n`);
  if (args.includes('--fail-on-findings') && result.graph.findings.some(finding => finding.status === 'confirmed')) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  process.stderr.write(`Stackfold scan failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
