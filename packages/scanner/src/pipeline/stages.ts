export type ScanStage =
  | 'VALIDATING_PATH'
  | 'DISCOVERING_FILES'
  | 'ANALYZING_WORKSPACE'
  | 'PARSING_PRISMA_SCHEMAS'
  | 'ANALYZING_NEXTJS_ROUTES'
  | 'PARSING_TYPESCRIPT_AST'
  | 'DETECTING_ENV_VARS'
  | 'DETECTING_EXTERNAL_SDKS'
  | 'ANALYZING_ENVIRONMENT_SAFETY'
  | 'ANALYZING_DRIFT_IMPACT'
  | 'ANALYZING_GUARDRAILS'
  | 'ANALYZING_CACHE_ISOLATION'
  | 'ANALYZING_SIGNATURE_COMPATIBILITY'
  | 'ANALYZING_QUEUE_COMPATIBILITY'
  | 'CROSS_LINKING_RELATIONS'
  | 'BUILDING_NORMALIZED_GRAPH'
  | 'COMPLETED';

export interface ScanProgress {
  stage: ScanStage;
  message: string;
  filesProcessed?: number;
  totalFiles?: number;
  percentage?: number;
}

export type ScanProgressCallback = (progress: ScanProgress) => void;

export const STAGE_DESCRIPTIONS: Record<ScanStage, { label: string; progressWeight: number }> = {
  VALIDATING_PATH: { label: 'Validating repository path & permissions', progressWeight: 5 },
  DISCOVERING_FILES: { label: 'Discovering project files & applying ignore filters', progressWeight: 15 },
  ANALYZING_WORKSPACE: { label: 'Analyzing package manifests and workspaces', progressWeight: 30 },
  PARSING_PRISMA_SCHEMAS: { label: 'Parsing Prisma database models & relations', progressWeight: 45 },
  ANALYZING_NEXTJS_ROUTES: { label: 'Detecting Next.js App & Pages routes', progressWeight: 60 },
  PARSING_TYPESCRIPT_AST: { label: 'Parsing TypeScript/JavaScript AST modules', progressWeight: 75 },
  DETECTING_ENV_VARS: { label: 'Mapping environment variables (zero secrets)', progressWeight: 85 },
  DETECTING_EXTERNAL_SDKS: { label: 'Detecting external cloud SDKs & services', progressWeight: 90 },
  ANALYZING_ENVIRONMENT_SAFETY: { label: 'Analyzing environment-to-resource safety boundaries', progressWeight: 93 },
  ANALYZING_DRIFT_IMPACT: { label: 'Mapping upstream changes to affected files and symbols', progressWeight: 94 },
  ANALYZING_GUARDRAILS: { label: 'Evaluating architecture guardrail rules', progressWeight: 95 },
  ANALYZING_CACHE_ISOLATION: { label: 'Mapping two-session cache-isolation probe results', progressWeight: 96 },
  ANALYZING_SIGNATURE_COMPATIBILITY: { label: 'Comparing signer and verifier canonical inputs', progressWeight: 97 },
  ANALYZING_QUEUE_COMPATIBILITY: { label: 'Replaying historical queue payloads against worker contracts', progressWeight: 97 },
  CROSS_LINKING_RELATIONS: { label: 'Cross-linking database & service relations', progressWeight: 95 },
  BUILDING_NORMALIZED_GRAPH: { label: 'Validating graph integrity & computing metrics', progressWeight: 98 },
  COMPLETED: { label: 'Scan completed successfully', progressWeight: 100 },
};
