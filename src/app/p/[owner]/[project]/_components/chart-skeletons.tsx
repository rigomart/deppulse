import { Container } from "@/components/container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function CommitChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="h-4 w-36 bg-muted animate-pulse rounded" />
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] bg-muted/50 animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}

export function ScoreSkeleton() {
  return (
    <Card className="bg-surface-3 w-full sm:w-auto min-w-64">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="h-4 w-28 bg-muted animate-pulse rounded" />
            <div className="h-6 w-16 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-6 w-20 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-px bg-border" />
        <div className="h-3 w-32 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}

export function ProjectPageSkeleton() {
  return (
    <>
      {/* Header skeleton */}
      <Container>
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="h-16 w-16 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="space-y-2 min-w-0 flex-1">
              <div className="h-8 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-full max-w-md bg-muted animate-pulse rounded" />
            </div>
          </div>
          <ScoreSkeleton />
        </div>
      </Container>

      {/* Recent activity skeleton */}
      <Container>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </Container>

      {/* Activity chart skeleton */}
      <Container>
        <section className="space-y-4">
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          <CommitChartSkeleton />
        </section>
      </Container>

      {/* Maintenance health skeleton */}
      <Container>
        <section className="space-y-4">
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="space-y-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </Container>
    </>
  );
}
