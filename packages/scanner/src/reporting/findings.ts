import type { StackfoldFinding } from '@stackfold/graph';

export type FindingReportFormat = 'terminal' | 'json' | 'github-actions' | 'circleci';

const severityRank: Record<StackfoldFinding['severity'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

function ordered(findings: StackfoldFinding[]): StackfoldFinding[] {
  return [...findings].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

function location(finding: StackfoldFinding): string {
  const line = finding.sourceLocation.sourceRange?.startLine;
  return `${finding.sourceLocation.filePath}${line ? `:${line}` : ''}`;
}

function escapeWorkflowCommand(value: string): string {
  return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

export function formatFindings(
  findings: StackfoldFinding[],
  format: FindingReportFormat = 'terminal'
): string {
  const sorted = ordered(findings);
  if (format === 'json') {
    return JSON.stringify({ findings: sorted, summary: summarizeFindings(sorted) }, null, 2);
  }

  if (format === 'github-actions') {
    return sorted
      .map(finding => {
        const level = finding.severity === 'info' ? 'notice' : finding.severity === 'low' ? 'notice' : 'warning';
        const range = finding.sourceLocation.sourceRange;
        const attrs = [
          `file=${escapeWorkflowCommand(finding.sourceLocation.filePath)}`,
          range ? `line=${range.startLine}` : '',
          `title=${escapeWorkflowCommand(`${finding.ruleId} (${finding.status})`)}`,
        ].filter(Boolean).join(',');
        return `::${level} ${attrs}::${escapeWorkflowCommand(`${finding.title}. ${finding.suggestedAction}`)}`;
      })
      .join('\n');
  }

  if (format === 'circleci') {
    return sorted
      .map(finding => `${location(finding)}: ${finding.severity.toUpperCase()} [${finding.ruleId}] ${finding.title} (${finding.status})`)
      .join('\n');
  }

  if (sorted.length === 0) return 'Stackfold: no findings.';
  const lines = sorted.flatMap(finding => [
    `[${finding.severity.toUpperCase()}] ${finding.title}`,
    `  Rule: ${finding.ruleId} · ${finding.status}`,
    `  At: ${location(finding)}`,
    `  Why: ${finding.explanation}`,
    `  Action: ${finding.suggestedAction}`,
  ]);
  const summary = summarizeFindings(sorted);
  return [`Stackfold found ${summary.total} issue${summary.total === 1 ? '' : 's'} (${summary.confirmed} confirmed, ${summary.uncertain} uncertain).`, '', ...lines].join('\n');
}

export function summarizeFindings(findings: StackfoldFinding[]) {
  return {
    total: findings.length,
    confirmed: findings.filter(finding => finding.status === 'confirmed').length,
    uncertain: findings.filter(finding => finding.status === 'uncertain').length,
    bySeverity: findings.reduce<Record<string, number>>((counts, finding) => {
      counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
      return counts;
    }, {}),
  };
}
