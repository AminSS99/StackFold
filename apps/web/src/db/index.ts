import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export * from './schema';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  if (!dbInstance) {
    // Configure neon connection
    const sql = neon(databaseUrl);
    dbInstance = drizzle(sql, { schema });
  }

  return dbInstance;
}
