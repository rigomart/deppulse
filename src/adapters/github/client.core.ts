import { Octokit } from "@octokit/core";

export function createOctokitClient(token: string) {
  return new Octokit({ auth: token });
}
