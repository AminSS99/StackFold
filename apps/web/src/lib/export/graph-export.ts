import type { ProjectGraph } from '@stackfold/graph';

/**
 * Generate Mermaid diagram syntax from a ProjectGraph.
 */
export function generateMermaidDiagram(graph: ProjectGraph): string {
  const lines: string[] = ['graph TD'];

  // Group nodes by category
  const apps = graph.nodes.filter(n => n.type === 'application' || n.type === 'package');
  const routes = graph.nodes.filter(n => n.type === 'api_route');
  const models = graph.nodes.filter(n => n.type === 'database_model');
  const services = graph.nodes.filter(n => n.type === 'external_service');
  const envs = graph.nodes.filter(n => n.type === 'environment_variable');
  const modules = graph.nodes.filter(n => n.type === 'source_module' || n.type === 'component');

  const sanitizeId = (id: string) => id.replace(/[^a-zA-Z0-9_]/g, '_');
  const sanitizeLabel = (label: string) => label.replace(/["<>{}[\]]/g, '');

  if (apps.length > 0) {
    lines.push('  subgraph Applications');
    for (const n of apps) {
      lines.push(`    ${sanitizeId(n.id)}["📦 ${sanitizeLabel(n.displayName)}"]`);
    }
    lines.push('  end');
  }

  if (routes.length > 0) {
    lines.push('  subgraph API_Routes["API Endpoints"]');
    for (const n of routes) {
      lines.push(`    ${sanitizeId(n.id)}["⚡ ${sanitizeLabel(n.displayName)}"]`);
    }
    lines.push('  end');
  }

  if (models.length > 0) {
    lines.push('  subgraph Database["Database Models"]');
    for (const n of models) {
      lines.push(`    ${sanitizeId(n.id)}[("🗄️ ${sanitizeLabel(n.displayName)}")]`);
    }
    lines.push('  end');
  }

  if (services.length > 0) {
    lines.push('  subgraph Services["External Services"]');
    for (const n of services) {
      lines.push(`    ${sanitizeId(n.id)}["☁️ ${sanitizeLabel(n.displayName)}"]`);
    }
    lines.push('  end');
  }

  if (envs.length > 0 && envs.length <= 15) {
    lines.push('  subgraph Config["Environment Variables"]');
    for (const n of envs) {
      lines.push(`    ${sanitizeId(n.id)}["🔑 ${sanitizeLabel(n.displayName)}"]`);
    }
    lines.push('  end');
  }

  if (modules.length > 0) {
    lines.push('  subgraph Modules["Source Modules & Components"]');
    for (const n of modules.slice(0, 40)) {
      lines.push(`    ${sanitizeId(n.id)}["📄 ${sanitizeLabel(n.displayName)}"]`);
    }
    lines.push('  end');
  }

  // Add edges
  const activeIds = new Set(graph.nodes.map(n => n.id));
  for (const edge of graph.edges) {
    if (activeIds.has(edge.source) && activeIds.has(edge.target)) {
      const src = sanitizeId(edge.source);
      const tgt = sanitizeId(edge.target);
      const label = sanitizeLabel(edge.type);
      lines.push(`  ${src} -->|${label}| ${tgt}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate Markdown Architecture Report from a ProjectGraph.
 */
export function generateMarkdownReport(graph: ProjectGraph): string {
  const date = new Date().toISOString().split('T')[0];
  const lines: string[] = [
    `# System Architecture Report: ${graph.metadata.projectName || 'Project'}`,
    `> Generated automatically by **Stackfold** on ${date}.`,
    '',
    '## 1. Executive Summary',
    `- **Root Path:** \`${graph.metadata.rootPath}\``,
    `- **Frameworks Detected:** ${graph.metadata.frameworks.map(f => `\`${f}\``).join(', ') || 'Standard JavaScript/TypeScript'}`,
    `- **Total Entities:** ${graph.metadata.stats.nodeCount}`,
    `- **Total Connections:** ${graph.metadata.stats.edgeCount}`,
    '',
  ];

  const routes = graph.nodes.filter(n => n.type === 'api_route');
  if (routes.length > 0) {
    lines.push('## 2. API Endpoints');
    lines.push('| Method | Route | File Path |');
    lines.push('| :--- | :--- | :--- |');
    for (const r of routes) {
      const method = (r.metadata?.httpMethod as string) || 'ALL';
      const path = (r.metadata?.routePath as string) || r.displayName;
      lines.push(`| \`${method}\` | \`${path}\` | \`${r.filePath || '-'}\` |`);
    }
    lines.push('');
  }

  const models = graph.nodes.filter(n => n.type === 'database_model');
  if (models.length > 0) {
    lines.push('## 3. Database Schema');
    lines.push('| Model / Table | Fields Count | File Path |');
    lines.push('| :--- | :--- | :--- |');
    for (const m of models) {
      const count = (m.metadata?.fieldsCount as number) || '-';
      lines.push(`| **${m.displayName}** | ${count} | \`${m.filePath || '-'}\` |`);
    }
    lines.push('');
  }

  const services = graph.nodes.filter(n => n.type === 'external_service');
  if (services.length > 0) {
    lines.push('## 4. External Services & Integrations');
    for (const s of services) {
      lines.push(`- **${s.displayName}**: Integrated in \`${s.filePath || '-'}\``);
    }
    lines.push('');
  }

  const modules = graph.nodes.filter(n => n.type === 'source_module' || n.type === 'component');
  if (modules.length > 0) {
    lines.push('## 5. Primary Source Modules & Components');
    lines.push('| Component / Module | Path | Exports | Functions |');
    lines.push('| :--- | :--- | :--- | :--- |');
    for (const m of modules.slice(0, 30)) {
      const exports = ((m.metadata?.exports as string[]) || []).join(', ') || '-';
      const funcs = ((m.metadata?.functions as string[]) || []).join(', ') || '-';
      lines.push(`| \`${m.displayName}\` | \`${m.filePath || '-'}\` | \`${exports}\` | \`${funcs}\` |`);
    }
    lines.push('');
  }

  lines.push('## 6. Architecture Diagram (Mermaid)');
  lines.push('```mermaid');
  lines.push(generateMermaidDiagram(graph));
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}
