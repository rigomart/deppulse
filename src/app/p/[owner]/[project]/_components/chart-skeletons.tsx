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
