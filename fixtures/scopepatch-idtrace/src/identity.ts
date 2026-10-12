export type GitHubUserId = string & { readonly __identityDomain: 'github-user' };
export type DatabaseUserId = string & { readonly __identityDomain: 'database-user' };
export type WorkspaceId = string & { readonly __identityDomain: 'workspace' };

function loadDatabaseUser(id: DatabaseUserId) {
  return { id };
}

function resolveDatabaseUserId(id: GitHubUserId): DatabaseUserId {
  return id as unknown as DatabaseUserId;
}

export function unsafeProviderLookup(id: GitHubUserId) {
  return loadDatabaseUser(id);
}

export function supportedProviderLookup(id: GitHubUserId) {
  return loadDatabaseUser(resolveDatabaseUserId(id));
}

export function untypedNamesAreNotEvidence() {
  const databaseUserId = 'not-strong-type-evidence';
  return loadDatabaseUser(databaseUserId as never);
}
