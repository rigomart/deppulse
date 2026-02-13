import "server-only";

import { graphql } from "@octokit/graphql";

if (!process.env.GITHUB_PAT) {
  throw new Error("GITHUB_PAT environment variable is required");
}

export const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_PAT}`,
  },
});
