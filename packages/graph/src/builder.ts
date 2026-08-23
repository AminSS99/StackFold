import type {
  GraphNode,
  GraphEdge,
  ProjectGraph,
  ScanDiagnostic,
  NodeType,
  EdgeType,
  ConfidenceLevel,
  Evidence,
  SourceRange,
} from './types';
import { validateProjectGraph } from './schema';

export function createNodeId(type: NodeType, key: string): string {
  const normalizedKey = key.replace(/\\/g, '/').trim();
  return `${type}:${normalizedKey}`;
}

export function createEdgeId(source: string, target: string, type: EdgeType): string {
  return `edge:${source}->${target}:${type}`;
}

export class GraphBuilder {
  private nodes = new Map<string, GraphNode>();
  private edges = new Map<string, GraphEdge>();
  private diagnostics: ScanDiagnostic[] = [];

  public addNode(node: GraphNode): this {
    if (this.nodes.has(node.id)) {
      // Merge tags & metadata if already present
      const existing = this.nodes.get(node.id)!;
      const mergedTags = Array.from(new Set([...existing.tags, ...node.tags]));
      const mergedMetadata = { ...existing.metadata, ...node.metadata };
      this.nodes.set(node.id, {
        ...existing,
        ...node,
        tags: mergedTags,
        metadata: mergedMetadata,
      });
      return this;
    }
    this.nodes.set(node.id, node);
    return this;
  }

  public createAndAddNode(params: {
    type: NodeType;
    key: string;
    displayName: string;
    filePath?: string;
    sourceRange?: SourceRange;
    metadata?: Record<string, unknown>;
    evidence: Evidence;
    confidence?: ConfidenceLevel;
    tags?: string[];
  }): GraphNode {
    const id = createNodeId(params.type, params.key);
    const node: GraphNode = {
      id,
      type: params.type,
      displayName: params.displayName,
      filePath: params.filePath?.replace(/\\/g, '/'),
      sourceRange: params.sourceRange,
      metadata: params.metadata || {},
      evidence: params.evidence,
      confidence: params.confidence || 'HIGH',
      tags: params.tags || [],
    };
    this.addNode(node);
    return node;
  }

  public addEdge(edge: GraphEdge): this {
    this.edges.set(edge.id, edge);
    return this;
  }

  public createAndAddEdge(params: {
    source: string;
    target: string;
    type: EdgeType;
    metadata?: Record<string, unknown>;
    evidence: Evidence;
    confidence?: ConfidenceLevel;
  }): GraphEdge | null {
    if (!params.source || !params.target) {
      return null;
    }
    const id = createEdgeId(params.source, params.target, params.type);
    const edge: GraphEdge = {
      id,
      source: params.source,
      target: params.target,
      type: params.type,
      metadata: params.metadata,
      evidence: params.evidence,
      confidence: params.confidence || 'HIGH',
    };
    this.addEdge(edge);
    return edge;
  }

  public addDiagnostic(diagnostic: ScanDiagnostic): this {
    this.diagnostics.push(diagnostic);
    return this;
  }

  public getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  public hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  public getNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  public getEdges(): GraphEdge[] {
    return Array.from(this.edges.values());
  }

  public getDiagnostics(): ScanDiagnostic[] {
    return [...this.diagnostics];
  }

  public build(metadata: {
    rootPath: string;
    projectName: string;
    packageManager?: 'pnpm' | 'npm' | 'yarn' | 'bun' | 'unknown';
    frameworks?: string[];
    generatedAt?: string;
  }): ProjectGraph {
    const validEdges: GraphEdge[] = [];
    const nodeIds = new Set(this.nodes.keys());

    // Validate edge integrity
    for (const edge of this.edges.values()) {
      const hasSource = nodeIds.has(edge.source);
      const hasTarget = nodeIds.has(edge.target);

      if (!hasSource || !hasTarget) {
        const missing = !hasSource ? `Source '${edge.source}'` : `Target '${edge.target}'`;
        this.diagnostics.push({
          level: 'warning',
          code: 'DANGLING_EDGE_REF',
          message: `${missing} referenced in edge '${edge.id}' does not exist in graph nodes.`,
          details: { edgeId: edge.id, source: edge.source, target: edge.target, edgeType: edge.type },
        });
      } else {
        validEdges.push(edge);
      }
    }

    const initialNodeCounts: Record<NodeType, number> = {
      repository: 0,
      application: 0,
      package: 0,
      directory: 0,
      source_module: 0,
      component: 0,
      api_route: 0,
      function: 0,
      database_model: 0,
      environment_variable: 0,
      external_service: 0,
    };

    const initialEdgeCounts: Record<EdgeType, number> = {
      contains: 0,
      imports: 0,
      calls: 0,
      exposes: 0,
      reads: 0,
      writes: 0,
      depends_on: 0,
      configured_by: 0,
      communicates_with: 0,
    };

    const nodeTypeCounts = this.getNodes().reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, initialNodeCounts);

    const edgeTypeCounts = validEdges.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, initialEdgeCounts);

    const fullMetadata = {
      schemaVersion: '1.0.0' as const,
      generatedAt: metadata.generatedAt || new Date().toISOString(),
      rootPath: metadata.rootPath,
      projectName: metadata.projectName,
      packageManager: metadata.packageManager || 'unknown',
      frameworks: metadata.frameworks || [],
      stats: {
        nodeCount: this.nodes.size,
        edgeCount: validEdges.length,
        nodeTypeCounts,
        edgeTypeCounts,
      },
    };

    const graph: ProjectGraph = {
      metadata: fullMetadata,
      nodes: this.getNodes(),
      edges: validEdges,
      diagnostics: this.diagnostics,
    };

    return validateProjectGraph(graph);
  }
}
