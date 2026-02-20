import Link from "next/link";
import { DeppulseIcon } from "./deppulse-logo";

export function Footer() {
  return (
    <footer className="border-t border-border/20 py-6 mt-8">
      <div className="container max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <Link
          href="/"
          className="flex items-center gap-2 hover:text-foreground transition-colors"
        >
          <DeppulseIcon className="size-4" />
          <span>Deppulse</span>
        </Link>
        <a
          href="https://github.com/rigomart/deppulse"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          Open source
        </a>
      </div>
    </footer>
  );
}
