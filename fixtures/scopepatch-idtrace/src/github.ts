import { Octokit } from 'octokit';

const github = new Octokit({ auth: process.env.GITHUB_APP_TOKEN });

export async function createTrackingIssue(owner: string, repo: string, title: string) {
  return github.rest.issues.create({ owner, repo, title });
}

export async function readReadme(owner: string, repo: string) {
  return github.rest.repos.getContent({ owner, repo, path: 'README.md' });
}

export async function graphQlIsExcluded() {
  return github.graphql('query { viewer { login } }');
}
