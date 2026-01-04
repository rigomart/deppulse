// Valid GitHub username/repo: alphanumeric, hyphens, underscores, periods
const VALID_NAME = /^[a-zA-Z0-9._-]+$/;

/**
 * Validates that owner and repo names contain only allowed characters.
 */
function isValidName(name: string): boolean {
  return VALID_NAME.test(name) && name.length <= 100;
}

/**
 * Parse a GitHub project identifier from a string into its owner and project components.
 *
 * Supports "owner/repository" shorthand and full GitHub URLs (e.g. "https://github.com/owner/repository").
 * The repository segment will have a trailing ".git" and trailing slash removed before returning.
 *
 * @param input - The project reference string to parse.
 * @returns An object with `owner` and `project` when parsing succeeds, `null` otherwise.
 */
export function parseProject(
  input: string,
): { owner: string; project: string } | null {
  const trimmed = input.trim();

  if (!trimmed) return null;

  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    if (parts.length >= 2) {
      const owner = parts[0];
      const project = parts[1].replace(/\.git$/, "").replace(/\/$/, "");
      if (owner && project && isValidName(owner) && isValidName(project)) {
        return { owner, project };
      }
    }
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname === "github.com") {
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 2) {
        const owner = pathParts[0];
        const project = pathParts[1].replace(/\.git$/, "");
        if (isValidName(owner) && isValidName(project)) {
          return { owner, project };
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}
