export type NodeType =
  | 'repository'
  | 'application'
  | 'package'
  | 'directory'
  | 'source_module'
  | 'component'
  | 'api_route'
  | 'function'
  | 'database_model'
  | 'environment_variable'
  | 'external_service';

export type EdgeType =
  | 'contains'
  | 'imports'
  | 'calls'
  | 'exposes'
  | 'reads'
  | 'writes'
  | 'depends_on'
  | 'configured_by'
  | 'communicates_with';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SourceRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface Evidence {
  filePath?: string;
  sourceRange?: SourceRange;
  codeSnippet?: string;
  detectorId: string;
  rule: string;
  notes?: string;
}

export interface GraphNode {
  id: string;
  type: NodeType;
  displayName: string;
  filePath?: string;
  sourceRange?: SourceRange;
  metadata: Record<string, unknown>;
  evidence: Evidence;
  confidence: ConfidenceLevel;
  tags: string[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  metadata?: Record<string, unknown>;
  evidence: Evidence;
  confidence: ConfidenceLevel;
}

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface ScanDiagnostic {
  level: DiagnosticSeverity;
  code: string;
  message: string;
  filePath?: string;
  sourceRange?: SourceRange;
  details?: Record<string, unknown>;
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  nodeTypeCounts: Record<NodeType, number>;
  edgeTypeCounts: Record<EdgeType, number>;
}

export interface GraphMetadata {
  schemaVersion: '1.0.0';
  generatedAt: string;
  rootPath: string;
  projectName: string;
  packageManager?: 'pnpm' | 'npm' | 'yarn' | 'bun' | 'unknown';
  frameworks: string[];
  stats: GraphStats;
}

export interface ProjectGraph {
  metadata: GraphMetadata;
  nodes: GraphNode[];
  edges: GraphEdge[];
  diagnostics: ScanDiagnostic[];
}

export type GraphViewType = 'architecture' | 'api_flow' | 'database' | 'dependencies';

export interface NodePosition {
  x: number;
  y: number;
}

export interface LayoutedNode extends GraphNode {
  position: NodePosition;
  width: number;
  height: number;
  parentId?: string;
}

export interface LayoutedGraph {
  nodes: LayoutedNode[];
  edges: GraphEdge[];
  viewType: GraphViewType;
  dimensions: { width: number; height: number };
}

export interface ImpactNodeSummary {
  id: string;
  type: NodeType;
  displayName: string;
  filePath?: string;
  depth: number;
  reason: string;
  relationship: EdgeType;
}

export interface ChangeImpactResult {
  targetNodeId: string;
  targetNode?: GraphNode;
  directDependents: ImpactNodeSummary[];
  transitiveDependents: ImpactNodeSummary[];
  directDependencies: ImpactNodeSummary[];
  affectedApiRoutes: ImpactNodeSummary[];
  affectedDatabaseModels: ImpactNodeSummary[];
  affectedComponents: ImpactNodeSummary[];
  totalAffectedNodes: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}
