import Link from "next/link";
import { Container } from "@/components/container";
import { DeppulseIcon } from "@/components/deppulse-logo";

function CurrentHeader() {
  return (
    <header className="w-full bg-surface-1/20 backdrop-blur-xs border-b border-border/20">
      <div className="container max-w-5xl mx-auto px-4 py-2 sm:py-3 flex items-center">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-semibold text-foreground/90 hover:text-foreground transition-colors"
        >
          <DeppulseIcon className="size-7" />
          <span className="tracking-tight">Deppulse</span>
        </Link>
      </div>
    </header>
  );
}

function FloatingPillHeader() {
  return (
    <div className="w-full px-4 pt-3">
      <header className="mx-auto max-w-5xl rounded-full bg-surface-2/60 backdrop-blur-md border border-border/15 shadow-lg shadow-black/20 px-5 py-2 flex items-center">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-semibold text-foreground/90 hover:text-foreground transition-colors"
        >
          <DeppulseIcon className="size-7" />
          <span className="tracking-tight">Deppulse</span>
        </Link>
      </header>
    </div>
  );
}

function GlassHeader() {
  return (
    <header className="w-full bg-surface-2/40 backdrop-blur-lg border-b border-border/10 shadow-md shadow-black/15 ring-1 ring-white/5">
      <div className="container max-w-5xl mx-auto px-4 py-2 sm:py-3 flex items-center">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-semibold text-foreground/90 hover:text-foreground transition-colors"
        >
          <DeppulseIcon className="size-7" />
          <span className="tracking-tight">Deppulse</span>
        </Link>
      </div>
    </header>
  );
}

function GradientBorderHeader() {
  return (
    <header className="relative w-full bg-surface-1/20 backdrop-blur-xs">
      <div className="container max-w-5xl mx-auto px-4 py-2 sm:py-3 flex items-center">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-semibold text-foreground/90 hover:text-foreground transition-colors"
        >
          <DeppulseIcon className="size-7" />
          <span className="tracking-tight">Deppulse</span>
        </Link>
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.15) 70%, transparent 100%)",
        }}
      />
    </header>
  );
}

export default function HeaderShowcasePage() {
  return (
    <main>
      <Container className="py-8 space-y-10">
        <div>
          <h1 className="text-2xl font-bold">Header Showcase</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare header styles side by side.
          </p>
        </div>

        {[
          { label: "Current", node: <CurrentHeader /> },
          { label: "Floating Pill", node: <FloatingPillHeader /> },
          { label: "Glass", node: <GlassHeader /> },
          { label: "Gradient Border", node: <GradientBorderHeader /> },
        ].map(({ label, node }) => (
          <div key={label} className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              {label}
            </div>
            <div className="overflow-hidden rounded-lg border border-border/20 bg-surface-1">
              {node}
            </div>
          </div>
        ))}
      </Container>
    </main>
  );
}
