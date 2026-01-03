import { Activity, ExternalLink } from "lucide-react";
import Link from "next/link";

export function Header() {
  return (
    <header className="w-full border-b">
      <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <Activity className="size-5" />
          Deppulse
        </Link>
        <a
          href="https://github.com/rigomart/deppulse"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          GitHub
          <ExternalLink className="size-3" />
        </a>
      </div>
    </header>
  );
}
