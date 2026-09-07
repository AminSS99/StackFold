export type ScanStage =
  | 'VALIDATING_PATH'
  | 'DISCOVERING_FILES'
  | 'ANALYZING_WORKSPACE'
  | 'PARSING_PRISMA_SCHEMAS'
  | 'ANALYZING_NEXTJS_ROUTES'
  | 'PARSING_TYPESCRIPT_AST'
  | 'DETECTING_ENV_VARS'
  | 'DETECTING_EXTERNAL_SDKS'
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
  CROSS_LINKING_RELATIONS: { label: 'Cross-linking database & service relations', progressWeight: 95 },
  BUILDING_NORMALIZED_GRAPH: { label: 'Validating graph integrity & computing metrics', progressWeight: 98 },
  COMPLETED: { label: 'Scan completed successfully', progressWeight: 100 },
};
