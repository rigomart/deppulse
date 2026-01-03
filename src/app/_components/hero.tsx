import { Activity } from "lucide-react";
import { SearchForm } from "@/app/_components/search-form";

export function Hero() {
  return (
    <div className="flex flex-col items-center text-center space-y-3">
      <div className="flex flex-col items-center space-y-4">
        <Activity className="size-10 text-muted-foreground" />
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
          Maintenance Checker
        </h1>
      </div>
      <p className="text-base sm:text-lg text-muted-foreground max-w-[600px]">
        Quickly assess whether an open-source project is actively maintained.
      </p>
      <div className="w-full pt-6 flex justify-center">
        <SearchForm />
      </div>
    </div>
  );
}
