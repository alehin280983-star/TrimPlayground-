import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trim Playground",
  description: "Compare AI model costs in real-time. Understand your AI economics in 5 minutes without reading documentation.",
  keywords: ["AI", "cost comparison", "GPT-4", "Claude", "Gemini", "pricing", "LLM"],
  authors: [{ name: "AI Cost Platform" }],
  openGraph: {
    title: "Trim Playground",
    description: "Compare AI model costs in real-time",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className="font-sans antialiased min-h-screen bg-background text-foreground"
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Analytics />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
