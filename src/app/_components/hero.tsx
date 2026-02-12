import { SearchForm } from "@/app/_components/search-form";
import { AsciiBackground } from "@/components/ascii-background";
import { Container } from "@/components/container";

export function Hero() {
  return (
    <Container className="py-8 sm:py-16">
      <div className="relative flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-10">
        <div className="relative z-10 flex flex-1 flex-col items-center text-center space-y-3 md:max-w-[50%] md:items-start md:text-left">
          <div className="flex flex-col items-center space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-300 md:items-start">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Is it maintained?
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground max-w-[440px] animate-in fade-in duration-300 delay-75 fill-mode-backwards">
            Paste a GitHub URL to check maintenance activity, issue
            responsiveness, and release health.
          </p>
          <div className="w-full pt-3 animate-in fade-in duration-300 delay-150 fill-mode-backwards">
            <SearchForm />
          </div>
        </div>
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 hidden h-[360px] w-[540px] md:block">
          <AsciiBackground />
        </div>
      </div>
    </Container>
  );
}
