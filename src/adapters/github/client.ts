import "server-only";

import { createGraphqlClient } from "./client.core";

if (!process.env.GITHUB_PAT) {
  throw new Error("GITHUB_PAT environment variable is required");
}

export const graphqlWithAuth = createGraphqlClient(process.env.GITHUB_PAT);
