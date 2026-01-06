import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { DeppulseIcon } from "./deppulse-logo";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-surface-1 backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-300 border-b border-border/20">
      <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-semibold text-foreground/90 hover:text-foreground transition-colors"
        >
          <DeppulseIcon className="size-7" />
          <span className="tracking-tight">Deppulse</span>
        </Link>
        <a
          href="https://github.com/rigomart/deppulse"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
        >
          GitHub
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </header>
  );
}
