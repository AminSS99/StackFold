import type { GraphNode, GraphEdge, ProjectGraph } from '@stackfold/graph';
import type { AIExplanationPayload } from './types';

export function buildSanitizedContextPayload(
  node: GraphNode,
  incomingEdges: GraphEdge[],
  outgoingEdges: GraphEdge[],
  graph?: ProjectGraph | null
): AIExplanationPayload {
  return {
    entity: {
      id: node.id,
      type: node.type,
      displayName: node.displayName,
      filePath: node.filePath,
      confidence: node.confidence,
      detectorRule: node.evidence.rule,
      metadata: node.metadata,
    },
    topology: {
      incomingRelations: incomingEdges.map(e => ({ source: e.source, type: e.type })),
      outgoingRelations: outgoingEdges.map(e => ({ target: e.target, type: e.type })),
    },
    projectSummary: {
      name: graph?.metadata.projectName || 'Project',
      frameworks: graph?.metadata.frameworks || [],
      packageManager: graph?.metadata.packageManager,
    },
  };
}

export function formatContextAsMarkdownPrompt(payload: AIExplanationPayload): string {
  return `### Stackfold Architectural Context
**Entity Name:** ${payload.entity.displayName} (${payload.entity.type})
**File Path:** ${payload.entity.filePath || 'Manifest / Virtual'}
**Confidence:** ${payload.entity.confidence} (Extracted via rule \`${payload.entity.detectorRule || 'deterministic-ast'}\`)

**Incoming Relationships (${payload.topology.incomingRelations.length}):**
${payload.topology.incomingRelations.map(r => `- ${r.type} from \`${r.source}\``).join('\n') || '- None'}

**Outgoing Relationships (${payload.topology.outgoingRelations.length}):**
${payload.topology.outgoingRelations.map(r => `- ${r.type} to \`${r.target}\``).join('\n') || '- None'}

**Task for AI Assistant:**
Please analyze this component within the architecture:
1. State **Confirmed Facts** based solely on the static graph context.
2. Provide **Architectural Inferences** regarding data flow, dependencies, and change risk.
3. List **Unknowns / Runtime Assumptions** that static analysis cannot verify.`;
}
