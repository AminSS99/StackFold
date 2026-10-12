import type { ScanContext } from '../types';

export interface GuardrailRuleAdapter {
  id: string;
  name: string;
  analyze(context: ScanContext): Promise<void> | void;
}
