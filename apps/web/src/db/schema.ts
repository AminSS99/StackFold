import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: varchar('id', { length: 256 }).primaryKey(), // Clerk user ID (e.g. user_2...)
  email: text('email'),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 256 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  repositoryUrl: text('repository_url'),
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const architectureSnapshots = pgTable('architecture_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  versionLabel: text('version_label').default('latest').notNull(),
  nodeCount: integer('node_count').default(0).notNull(),
  edgeCount: integer('edge_count').default(0).notNull(),
  graphData: jsonb('graph_data').notNull(), // nodes, edges, metadata
  scanStats: jsonb('scan_stats'), // duration, files scanned, cache
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sharedLinks = pgTable('shared_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  snapshotId: uuid('snapshot_id').notNull().references(() => architectureSnapshots.id, { onDelete: 'cascade' }),
  shareToken: text('share_token').unique().notNull(),
  accessLevel: text('access_level').default('view').notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  snapshots: many(architectureSnapshots),
}));

export const architectureSnapshotsRelations = relations(architectureSnapshots, ({ one, many }) => ({
  project: one(projects, {
    fields: [architectureSnapshots.projectId],
    references: [projects.id],
  }),
  sharedLinks: many(sharedLinks),
}));

export const sharedLinksRelations = relations(sharedLinks, ({ one }) => ({
  snapshot: one(architectureSnapshots, {
    fields: [sharedLinks.snapshotId],
    references: [architectureSnapshots.id],
  }),
}));
