import { graphql } from "@octokit/graphql";

export function createGraphqlClient(token: string) {
  return graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });
}
