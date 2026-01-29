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
