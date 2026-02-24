import { Container } from "@/components/container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ProjectCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-5 w-36" />
        </div>
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonSectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  );
}

export default function CompareLoading() {
  return (
    <>
      <section className="bg-surface-2">
        <Container className="py-6 space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="size-9 self-center" />
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-24" />
          </div>
        </Container>
      </section>

      <Container>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      </Container>

      <Container>
        <div className="space-y-4">
          <ComparisonSectionSkeleton />
          <ComparisonSectionSkeleton />
          <ComparisonSectionSkeleton />
          <ComparisonSectionSkeleton />
        </div>
      </Container>

      <Container>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[220px] w-full" />
          </CardContent>
        </Card>
      </Container>
    </>
  );
}
