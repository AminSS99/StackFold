import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  scanRepository,
  parsePrismaSchema,
  normalizeRoutePath,
  parseEnvExample,
} from '../index';
import { validateProjectGraph } from '@stackfold/graph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_PATH = path.resolve(__dirname, '../../../../fixtures/sample-ecommerce-app');

describe('Prisma Schema Parser', () => {
  it('correctly parses models, fields, and relational attributes', () => {
    const prismaContent = `
      datasource db {
        provider = "postgresql"
        url = env("DATABASE_URL")
      }
      model User {
        id String @id @default(uuid())
        email String @unique
        orders Order[]
      }
      model Order {
        id String @id @default(uuid())
        userId String
        user User @relation(fields: [userId], references: [id])
      }
    `;

    const result = parsePrismaSchema(prismaContent);
    expect(result.provider).toBe('postgresql');
    expect(result.models.length).toBe(2);

    const userModel = result.models.find(m => m.name === 'User');
    expect(userModel).toBeDefined();
    expect(userModel?.fields.find(f => f.name === 'email')?.isUnique).toBe(true);

    const orderModel = result.models.find(m => m.name === 'Order');
    expect(orderModel).toBeDefined();
    const userRel = orderModel?.fields.find(f => f.name === 'user');
    expect(userRel?.relation?.targetModel).toBe('User');
    expect(userRel?.relation?.fields).toEqual(['userId']);
    expect(userRel?.relation?.references).toEqual(['id']);
  });
});

describe('Next.js Route Normalizer', () => {
  it('normalizes dynamic routes and app router endpoints', () => {
    expect(normalizeRoutePath('app/api/checkout/route.ts').routePath).toBe('/api/checkout');
    expect(normalizeRoutePath('app/products/[id]/page.tsx').routePath).toBe('/products/:id');
    expect(normalizeRoutePath('app/(marketing)/about/page.tsx').routePath).toBe('/about');
  });
});

describe('Environment Variable Parser', () => {
  it('parses only variable names and preserves zero secrets', () => {
    const envExample = `
      # Database
      DATABASE_URL="postgres://user:password@localhost:5432/db"
      STRIPE_SECRET_KEY="sk_live_12345"
      RESEND_API_KEY="re_12345"
    `;

    const vars = parseEnvExample(envExample);
    expect(vars.has('DATABASE_URL')).toBe(true);
    expect(vars.has('STRIPE_SECRET_KEY')).toBe(true);
    expect(vars.has('RESEND_API_KEY')).toBe(true);
    expect(vars.has('sk_live_12345')).toBe(false);
  });
});

describe('End-to-End Scanner on Realistic E-Commerce Fixture', () => {
  it('scans fixture repo and produces a valid deterministic graph', async () => {
    const result = await scanRepository({
      rootPath: FIXTURE_PATH,
      projectName: 'sample-ecommerce-app',
    });

    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.scannedFilesCount).toBeGreaterThan(5);

    const { graph } = result;

    const validated = validateProjectGraph(graph);
    expect(validated).toBeDefined();

    const nodeTypes = new Set(graph.nodes.map(n => n.type));
    expect(nodeTypes.has('application')).toBe(true);
    expect(nodeTypes.has('api_route')).toBe(true);
    expect(nodeTypes.has('database_model')).toBe(true);
    expect(nodeTypes.has('external_service')).toBe(true);
    expect(nodeTypes.has('environment_variable')).toBe(true);

    const routeDisplayNames = graph.nodes
      .filter(n => n.type === 'api_route')
      .map(n => n.displayName);

    expect(routeDisplayNames).toContain('GET /api/products');
    expect(routeDisplayNames).toContain('POST /api/products');
    expect(routeDisplayNames).toContain('POST /api/checkout');
    expect(routeDisplayNames).toContain('POST /api/webhooks/stripe');

    const modelNames = graph.nodes
      .filter(n => n.type === 'database_model')
      .map(n => n.displayName);

    expect(modelNames).toContain('User');
    expect(modelNames).toContain('Product');
    expect(modelNames).toContain('Category');
    expect(modelNames).toContain('Order');
    expect(modelNames).toContain('OrderItem');

    const serviceNames = graph.nodes
      .filter(n => n.type === 'external_service')
      .map(n => n.displayName);

    expect(serviceNames).toContain('Stripe');
    expect(serviceNames).toContain('Resend');

    for (const node of graph.nodes) {
      const json = JSON.stringify(node);
      expect(json).not.toContain('sk_test_123456789');
      expect(json).not.toContain('whsec_123456789');
      expect(json).not.toContain('re_123456789');
    }

    for (const node of graph.nodes) {
      expect(node.evidence.detectorId).toBeDefined();
      expect(node.evidence.rule).toBeDefined();
    }
  });
});
