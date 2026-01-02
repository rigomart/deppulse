import { describe, expect, it } from "vitest";
import { parseRepo } from "./parse-repo";

describe("parseRepo", () => {
  describe("owner/repo format", () => {
    it("parses simple owner/repo", () => {
      expect(parseRepo("facebook/react")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("parses owner/repo with .git suffix", () => {
      expect(parseRepo("facebook/react.git")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("handles extra path segments by taking first two", () => {
      expect(parseRepo("facebook/react/issues")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("trims whitespace", () => {
      expect(parseRepo("  facebook/react  ")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });
  });

  describe("GitHub URL format", () => {
    it("parses https URL", () => {
      expect(parseRepo("https://github.com/facebook/react")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("parses URL with trailing slash", () => {
      expect(parseRepo("https://github.com/facebook/react/")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("parses URL with .git suffix", () => {
      expect(parseRepo("https://github.com/facebook/react.git")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("parses URL with extra path segments", () => {
      expect(parseRepo("https://github.com/facebook/react/issues")).toEqual({
        owner: "facebook",
        repo: "react",
      });
      expect(parseRepo("https://github.com/facebook/react/pull/12345")).toEqual(
        {
          owner: "facebook",
          repo: "react",
        },
      );
    });

    it("parses URL with query params", () => {
      expect(parseRepo("https://github.com/facebook/react?tab=readme")).toEqual(
        {
          owner: "facebook",
          repo: "react",
        },
      );
    });
  });

  describe("invalid inputs", () => {
    it("returns null for empty string", () => {
      expect(parseRepo("")).toBeNull();
    });

    it("returns null for whitespace only", () => {
      expect(parseRepo("   ")).toBeNull();
    });

    it("returns null for single word (no slash)", () => {
      expect(parseRepo("react")).toBeNull();
    });

    it("returns null for non-GitHub URL", () => {
      expect(parseRepo("https://gitlab.com/owner/repo")).toBeNull();
    });

    it("returns null for GitHub URL without repo", () => {
      expect(parseRepo("https://github.com/facebook")).toBeNull();
    });

    it("returns null for malformed input with only slash", () => {
      expect(parseRepo("/")).toBeNull();
    });

    it("returns null for input starting with slash", () => {
      expect(parseRepo("/facebook/react")).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles repos with dots in name", () => {
      expect(parseRepo("angular/angular.js")).toEqual({
        owner: "angular",
        repo: "angular.js",
      });
    });

    it("handles repos with hyphens", () => {
      expect(parseRepo("styled-components/styled-components")).toEqual({
        owner: "styled-components",
        repo: "styled-components",
      });
    });

    it("handles repos with underscores", () => {
      expect(parseRepo("some_org/some_repo")).toEqual({
        owner: "some_org",
        repo: "some_repo",
      });
    });

    it("preserves case", () => {
      expect(parseRepo("Facebook/React")).toEqual({
        owner: "Facebook",
        repo: "React",
      });
    });
  });
});
