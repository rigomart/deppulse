import { SearchForm } from "@/app/_components/search-form";
import { Container } from "@/components/container";
import { DeppulseIcon } from "@/components/deppulse-logo";

export function Hero() {
  return (
    <Container className="flex flex-col items-center text-center space-y-3 py-6">
      <div className="flex flex-col items-center space-y-4">
        <DeppulseIcon className="size-16 text-muted-foreground" />
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
    </Container>
  );
}
