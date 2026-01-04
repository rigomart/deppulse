"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function getUserFriendlyError(error: Error): {
  title: string;
  description: string;
} {
  const msg = error.message.toLowerCase();

  if (msg.includes("not found") || msg.includes("404")) {
    return {
      title: "Repository not found",
      description:
        "The repository doesn't exist or is private. Please check the owner and repository name.",
    };
  }
  if (msg.includes("rate limit")) {
    return {
      title: "Rate limit exceeded",
      description:
        "GitHub API rate limit reached. Please wait a few minutes and try again.",
    };
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return {
      title: "Network error",
      description:
        "Could not connect to GitHub. Please check your connection and try again.",
    };
  }
  if (msg.includes("unauthorized") || msg.includes("401")) {
    return {
      title: "Authentication error",
      description:
        "There was an issue with GitHub authentication. Please try again later.",
    };
  }

  return {
    title: "Analysis failed",
    description:
      "Something went wrong while analyzing this repository. Please try again.",
  };
}

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { title, description } = getUserFriendlyError(error);

  return (
    <Container className="py-12">
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h1 className="font-semibold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={reset} variant="outline" size="sm">
              <RefreshCw className="size-4" />
              Try again
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/">Search another</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
