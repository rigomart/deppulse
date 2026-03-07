import { Container } from "@/components/container";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function StripStatSkeleton({ width = "w-28" }: { width?: string }) {
  return (
    <div className="flex items-stretch gap-3">
      <div className="w-0.5 shrink-0 rounded-full bg-muted" />
      <div className="py-0.5 space-y-1.5">
        <div className="h-3 w-16 rounded bg-muted" />
        <div className={`h-4 ${width} rounded bg-muted`} />
      </div>
    </div>
  );
}

function BentoCellSkeleton({ width = "w-12" }: { width?: string }) {
  return (
    <div className="bg-background px-4 py-3">
      <div className="h-3 w-16 rounded bg-muted" />
      <div className={`h-5 ${width} rounded bg-muted mt-2`} />
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <section className="bg-surface-2">
      <Container className="py-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-7 w-48" />
            </div>
            <Skeleton className="h-4 w-80 max-w-full" />
            <div className="flex flex-wrap gap-x-5 gap-y-2.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Separator className="sm:hidden" />
          <Separator
            orientation="vertical"
            className="hidden sm:block self-stretch"
          />
          <div className="sm:min-w-72 shrink-0 space-y-3">
            {["dev", "issues", "releases"].map((id) => (
              <div key={id} className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
            <Skeleton className="h-3.5 w-36" />
          </div>
        </div>
      </Container>
    </section>
  );
}

function RecentActivitySkeleton() {
  return (
    <Container>
      <section className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="flex flex-col lg:flex-row gap-4 animate-pulse">
          <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:justify-center lg:shrink-0">
            <StripStatSkeleton width="w-28" />
            <StripStatSkeleton width="w-24" />
            <StripStatSkeleton width="w-28" />
            <StripStatSkeleton width="w-24" />
          </div>
          <Skeleton className="h-[200px] flex-1 min-w-0" />
        </div>
      </section>
    </Container>
  );
}

function DevelopmentActivitySkeleton() {
  return (
    <Container>
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-lg border border-border bg-border animate-pulse">
          <BentoCellSkeleton />
          <BentoCellSkeleton width="w-10" />
          <BentoCellSkeleton width="w-10" />
          <BentoCellSkeleton width="w-20" />
        </div>
        <Skeleton className="h-[220px] w-full" />
      </section>
    </Container>
  );
}

function IssueManagementSkeleton() {
  return (
    <Container>
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px overflow-hidden rounded-lg border border-border bg-border animate-pulse">
          <BentoCellSkeleton />
          <BentoCellSkeleton />
          <BentoCellSkeleton width="w-10" />
          <BentoCellSkeleton width="w-10" />
          <BentoCellSkeleton />
        </div>
      </section>
    </Container>
  );
}

function ReleaseCadenceSkeleton() {
  return (
    <Container>
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border animate-pulse">
          <BentoCellSkeleton />
          <BentoCellSkeleton />
          <BentoCellSkeleton width="w-20" />
        </div>
        <div className="space-y-2 animate-pulse">
          <Skeleton className="h-3 w-24" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <div className="size-2 shrink-0 rounded-full bg-muted" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </Container>
  );
}

function ReadmeSkeleton() {
  return (
    <Container>
      <section className="space-y-4">
        <Skeleton className="h-4 w-20" />
        <div className="space-y-3 py-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </section>
    </Container>
  );
}

export default function ProjectLoading() {
  return (
    <>
      <HeaderSkeleton />
      <RecentActivitySkeleton />
      <DevelopmentActivitySkeleton />
      <IssueManagementSkeleton />
      <ReleaseCadenceSkeleton />
      <ReadmeSkeleton />
    </>
  );
}
