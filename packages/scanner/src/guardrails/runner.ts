import type { ScanContext } from '../types';
import type { GuardrailRuleAdapter } from './types';
import { txEscapeRule } from './rules/tx-escape';
import { scopePatchRule } from './rules/scope-patch';
import { idTraceRule } from './rules/id-trace';

export const builtInGuardrailRules: GuardrailRuleAdapter[] = [txEscapeRule, scopePatchRule, idTraceRule];

export async function runGuardrailRules(
  context: ScanContext,
  rules: GuardrailRuleAdapter[] = builtInGuardrailRules
): Promise<void> {
  for (const rule of rules) {
    if (context.signal?.aborted) throw new Error('Scan aborted by user');
    await rule.analyze(context);
  }
}
