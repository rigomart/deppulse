import "server-only";

import { createOctokitClient } from "./client.core";

if (!process.env.GITHUB_PAT) {
  throw new Error("GITHUB_PAT environment variable is required");
}

export const octokit = createOctokitClient(process.env.GITHUB_PAT);
export const graphqlWithAuth = octokit.graphql;
