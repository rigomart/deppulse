/**
 * Renders the page footer containing a centered link to the project's GitHub repository.
 *
 * @returns The footer JSX element with a full-width top border, padded area, and a centered "View on GitHub" anchor that opens the repository in a new tab.
 */
export function Footer() {
  return (
    <footer className="w-full border-t py-6 mt-12">
      <div className="container max-w-5xl mx-auto px-4 text-center text-sm text-muted-foreground">
        <a
          href="https://github.com/rigomart/deppulse"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          View on GitHub
        </a>
      </div>
    </footer>
  );
}
