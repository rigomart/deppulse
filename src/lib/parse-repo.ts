export function parseRepo(
  input: string,
): { owner: string; repo: string } | null {
  const trimmed = input.trim();

  if (!trimmed) return null;

  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    if (parts.length >= 2) {
      const owner = parts[0];
      const repo = parts[1].replace(/\.git$/, "").replace(/\/$/, "");
      if (owner && repo) {
        return { owner, repo };
      }
    }
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname === "github.com") {
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 2) {
        return {
          owner: pathParts[0],
          repo: pathParts[1].replace(/\.git$/, ""),
        };
      }
    }
  } catch {
    return null;
  }

  return null;
}
