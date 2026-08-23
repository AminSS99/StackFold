import path from 'node:path';
import type { ScanContext, DetectorInterface } from '../types';
import { readSafeFile } from '../utils/file-system';

interface PrismaField {
  name: string;
  type: string;
  isList: boolean;
  isOptional: boolean;
  isId: boolean;
  isUnique: boolean;
  relation?: {
    targetModel: string;
    fields?: string[];
    references?: string[];
  };
}

interface PrismaModel {
  name: string;
  startLine: number;
  endLine: number;
  fields: PrismaField[];
  attributes: string[];
}

export function parsePrismaSchema(content: string): {
  provider?: string;
  models: PrismaModel[];
  enums: Array<{ name: string; values: string[] }>;
} {
  const lines = content.split('\n');
  const models: PrismaModel[] = [];
  const enums: Array<{ name: string; values: string[] }> = [];
  let provider: string | undefined;

  let currentModel: PrismaModel | null = null;
  let currentEnum: { name: string; values: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? '';
    const line = rawLine.trim();
    const lineNum = i + 1;

    if (line.startsWith('provider') && line.includes('=')) {
      const match = line.match(/provider\s*=\s*["']([^"']+)["']/);
      if (match && match[1] && !provider) {
        provider = match[1];
      }
    }

    if (line.startsWith('model ') && line.includes('{')) {
      const match = line.match(/model\s+(\w+)\s*\{/);
      if (match && match[1]) {
        currentModel = {
          name: match[1],
          startLine: lineNum,
          endLine: lineNum,
          fields: [],
          attributes: [],
        };
      }
      continue;
    }

    if (line.startsWith('enum ') && line.includes('{')) {
      const match = line.match(/enum\s+(\w+)\s*\{/);
      if (match && match[1]) {
        currentEnum = {
          name: match[1],
          values: [],
        };
      }
      continue;
    }

    if (line === '}') {
      if (currentModel) {
        currentModel.endLine = lineNum;
        models.push(currentModel);
        currentModel = null;
      }
      if (currentEnum) {
        enums.push(currentEnum);
        currentEnum = null;
      }
      continue;
    }

    if (currentModel && line && !line.startsWith('//')) {
      if (line.startsWith('@@')) {
        currentModel.attributes.push(line);
      } else {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const fieldName = parts[0]!;
          let rawType = parts[1]!;

          const isList = rawType.endsWith('[]');
          const isOptional = rawType.endsWith('?');
          const type = rawType.replace(/(\[\]|\?)/g, '');

          const isId = line.includes('@id');
          const isUnique = line.includes('@unique');

          let relation: PrismaField['relation'] | undefined;
          if (line.includes('@relation')) {
            const relMatch = line.match(/@relation\((.*)\)/);
            let fields: string[] | undefined;
            let references: string[] | undefined;

            if (relMatch && relMatch[1]) {
              const fieldsMatch = relMatch[1].match(/fields:\s*\[([^\]]+)\]/);
              const refMatch = relMatch[1].match(/references:\s*\[([^\]]+)\]/);
              if (fieldsMatch && fieldsMatch[1]) {
                fields = fieldsMatch[1].split(',').map(s => s.trim());
              }
              if (refMatch && refMatch[1]) {
                references = refMatch[1].split(',').map(s => s.trim());
              }
            }

            relation = {
              targetModel: type,
              fields,
              references,
            };
          }

          currentModel.fields.push({
            name: fieldName,
            type,
            isList,
            isOptional,
            isId,
            isUnique,
            relation,
          });
        }
      }
    }

    if (currentEnum && line && !line.startsWith('//')) {
      const val = line.split(/\s+/)[0];
      if (val) currentEnum.values.push(val);
    }
  }

  return { provider, models, enums };
}

export const prismaDetector: DetectorInterface = {
  id: 'prisma-detector',
  name: 'Prisma Schema Detector',

  async run(context: ScanContext) {
    const { rootPath, builder, prismaFiles } = context;

    for (const schemaRelPath of prismaFiles) {
      const fullPath = path.join(rootPath, schemaRelPath);
      const content = readSafeFile(fullPath);
      if (!content) continue;

      const { provider, models } = parsePrismaSchema(content);

      if (provider) {
        context.frameworks.add(`Prisma (${provider})`);
      }

      for (const model of models) {
        const modelNode = builder.createAndAddNode({
          type: 'database_model',
          key: model.name,
          displayName: model.name,
          filePath: schemaRelPath,
          sourceRange: {
            startLine: model.startLine,
            startColumn: 1,
            endLine: model.endLine,
            endColumn: 1,
          },
          metadata: {
            tableName: model.name,
            provider: provider || 'postgresql',
            fieldsCount: model.fields.length,
            fields: model.fields.map(f => ({
              name: f.name,
              type: f.type,
              isId: f.isId,
              isList: f.isList,
              isOptional: f.isOptional,
              isUnique: f.isUnique,
            })),
            attributes: model.attributes,
          },
          evidence: {
            detectorId: prismaDetector.id,
            rule: 'prisma-model-declaration',
            filePath: schemaRelPath,
            sourceRange: {
              startLine: model.startLine,
              startColumn: 1,
              endLine: model.endLine,
              endColumn: 1,
            },
            codeSnippet: `model ${model.name} { ... }`,
          },
          tags: ['database', 'prisma', provider || 'sql'],
        });

        for (const field of model.fields) {
          if (field.relation) {
            const targetModelId = `database_model:${field.relation.targetModel}`;
            builder.createAndAddEdge({
              source: modelNode.id,
              target: targetModelId,
              type: 'reads',
              metadata: {
                relationField: field.name,
                foreignKeys: field.relation.fields,
                references: field.relation.references,
              },
              evidence: {
                detectorId: prismaDetector.id,
                rule: 'prisma-relation',
                filePath: schemaRelPath,
                codeSnippet: `${field.name} ${field.type} @relation(...)`,
              },
            });
          }
        }
      }
    }
  },
};
