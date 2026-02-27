import { parseProject } from "./parse-project";

describe("parseProject", () => {
  describe("owner/repo format", () => {
    it("parses simple owner/repo", () => {
      expect(parseProject("facebook/react")).toEqual({
        owner: "facebook",
        project: "react",
      });
    });

    it("parses owner/repo with .git suffix", () => {
      expect(parseProject("facebook/react.git")).toEqual({
        owner: "facebook",
        project: "react",
      });
    });

    it("handles extra path segments by taking first two", () => {
      expect(parseProject("facebook/react/issues")).toEqual({
        owner: "facebook",
        project: "react",
      });
    });

    it("trims whitespace", () => {
      expect(parseProject("  facebook/react  ")).toEqual({
        owner: "facebook",
        project: "react",
      });
    });
  });

  describe("GitHub URL format", () => {
    it("parses https URL", () => {
      expect(parseProject("https://github.com/facebook/react")).toEqual({
        owner: "facebook",
        project: "react",
      });
    });

    it("parses URL with trailing slash", () => {
      expect(parseProject("https://github.com/facebook/react/")).toEqual({
        owner: "facebook",
        project: "react",
      });
    });

    it("parses URL with .git suffix", () => {
      expect(parseProject("https://github.com/facebook/react.git")).toEqual({
        owner: "facebook",
        project: "react",
      });
    });

    it("parses URL with extra path segments", () => {
      expect(parseProject("https://github.com/facebook/react/issues")).toEqual({
        owner: "facebook",
        project: "react",
      });
      expect(
        parseProject("https://github.com/facebook/react/pull/12345"),
      ).toEqual({
        owner: "facebook",
        project: "react",
      });
    });

    it("parses URL with query params", () => {
      expect(
        parseProject("https://github.com/facebook/react?tab=readme"),
      ).toEqual({
        owner: "facebook",
        project: "react",
      });
    });
  });

  describe("invalid inputs", () => {
    it("returns null for empty string", () => {
      expect(parseProject("")).toBeNull();
    });

    it("returns null for whitespace only", () => {
      expect(parseProject("   ")).toBeNull();
    });

    it("returns null for single word (no slash)", () => {
      expect(parseProject("react")).toBeNull();
    });

    it("returns null for non-GitHub URL", () => {
      expect(parseProject("https://gitlab.com/owner/repo")).toBeNull();
    });

    it("returns null for GitHub URL without repo", () => {
      expect(parseProject("https://github.com/facebook")).toBeNull();
    });

    it("returns null for malformed input with only slash", () => {
      expect(parseProject("/")).toBeNull();
    });

    it("returns null for input starting with slash", () => {
      expect(parseProject("/facebook/react")).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles repos with dots in name", () => {
      expect(parseProject("angular/angular.js")).toEqual({
        owner: "angular",
        project: "angular.js",
      });
    });

    it("handles repos with hyphens", () => {
      expect(parseProject("styled-components/styled-components")).toEqual({
        owner: "styled-components",
        project: "styled-components",
      });
    });

    it("handles repos with underscores", () => {
      expect(parseProject("some_org/some_repo")).toEqual({
        owner: "some_org",
        project: "some_repo",
      });
    });

    it("preserves case", () => {
      expect(parseProject("Facebook/React")).toEqual({
        owner: "Facebook",
        project: "React",
      });
    });
  });
});
