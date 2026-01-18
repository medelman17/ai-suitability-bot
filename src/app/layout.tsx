import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Suitability Screener | Is Your Problem Ready for AI?",
  description:
    "A diagnostic tool that evaluates whether your business problem is a good candidate for AI/LLM implementation. Get honest, data-driven recommendations in 60 seconds.",
  keywords: [
    "AI evaluation",
    "LLM suitability",
    "AI implementation",
    "machine learning assessment",
    "AI readiness",
    "business AI",
  ],
  authors: [{ name: "AI Suitability Screener" }],
  openGraph: {
    title: "AI Suitability Screener",
    description: "Find out if your problem is ready for AI in 60 seconds.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFBFC" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
