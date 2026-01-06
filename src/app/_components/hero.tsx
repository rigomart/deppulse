import { SearchForm } from "@/app/_components/search-form";
import { Container } from "@/components/container";
import { DeppulseIcon } from "@/components/deppulse-logo";

export function Hero() {
  return (
    <Container className="flex flex-col items-center text-center space-y-3 py-6">
      <div className="flex flex-col items-center space-y-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
        <DeppulseIcon className="size-16 text-muted-foreground" />
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
          Maintenance Checker
        </h1>
      </div>
      <p className="text-base sm:text-lg text-muted-foreground max-w-[600px] animate-in fade-in duration-300 delay-75 fill-mode-backwards">
        Quickly assess whether an open-source project is actively maintained.
      </p>
      <div className="w-full pt-6 flex justify-center animate-in fade-in duration-300 delay-150 fill-mode-backwards">
        <SearchForm />
      </div>
    </Container>
  );
}
