import type { Metadata } from "next";
import { DM_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { DotBackground } from "@/components/dot-background";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: true,
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deppulse.rigos.dev"),
  title: {
    default: "Deppulse - Open Source Maintenance Checker",
    template: "%s | Deppulse",
  },
  description:
    "Quickly assess whether an open-source project is actively maintained. Get maintenance risk scores and issue responsiveness data for GitHub repositories.",
  keywords: [
    "open source",
    "github",
    "repository health",
    "maintenance",
    "risk assessment",
    "npm packages",
    "dependencies",
  ],
  authors: [{ name: "Deppulse" }],
  creator: "Deppulse",
  publisher: "Deppulse",
  openGraph: {
    type: "website",
    siteName: "Deppulse",
    title: "Deppulse - Open Source Maintenance Checker",
    description:
      "Quickly assess whether an open-source project is actively maintained.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deppulse - Open Source Maintenance Checker",
    description:
      "Quickly assess whether an open-source project is actively maintained.",
    creator: "@deppulse",
    site: "@deppulse",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${dmMono.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <ConvexClientProvider>
          <DotBackground />
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
