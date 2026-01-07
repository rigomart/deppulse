import "server-only";

import { graphql } from "@octokit/graphql";

export const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_PAT}`,
  },
});
