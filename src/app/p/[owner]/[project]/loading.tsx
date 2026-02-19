import { Container } from "@/components/container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="py-3 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-16" />
      </CardContent>
    </Card>
  );
}

function HealthCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-1">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function HeaderSkeleton() {
  return (
    <section className="bg-surface-2">
      <Container className="py-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          {/* Left: avatar + title + description + stats */}
          <div className="flex-1 space-y-3">
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
          {/* Right: score card */}
          <Card className="min-w-64">
            <CardHeader>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
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
        <Skeleton className="h-[200px] w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </section>
    </Container>
  );
}

function CommitActivitySkeleton() {
  return (
    <Container>
      <section className="space-y-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-[220px] w-full" />
      </section>
    </Container>
  );
}

function MaintenanceHealthSkeleton() {
  return (
    <Container>
      <section className="space-y-4">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <HealthCardSkeleton />
          <HealthCardSkeleton />
          <HealthCardSkeleton />
          <HealthCardSkeleton />
          <HealthCardSkeleton />
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
        <Card>
          <CardContent className="space-y-3 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </section>
    </Container>
  );
}

export default function ProjectLoading() {
  return (
    <>
      <HeaderSkeleton />
      <RecentActivitySkeleton />
      <CommitActivitySkeleton />
      <MaintenanceHealthSkeleton />
      <ReadmeSkeleton />
    </>
  );
}
