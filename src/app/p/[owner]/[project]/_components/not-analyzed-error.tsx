import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

interface NotAnalyzedErrorProps {
  owner: string;
  project: string;
}

export function NotAnalyzedError({ owner, project }: NotAnalyzedErrorProps) {
  return (
    <Container className="py-16">
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <SearchIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">
            No analysis found for{" "}
            <span className="font-mono">
              {owner}/{project}
            </span>
          </h1>
          <p className="text-muted-foreground max-w-md">
            This project hasn&apos;t been analyzed yet. Search for it on the
            homepage to start an analysis.
          </p>
        </div>
        <Button variant="outline" className="mt-2" asChild>
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    </Container>
  );
}
