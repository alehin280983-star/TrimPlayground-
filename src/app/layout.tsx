import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";
import PostHogProvider from "@/components/analytics/PostHogProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://trimplayground.com'),
  title: {
    default: "Trim Playground — Compare AI Model Costs",
    template: "%s | Trim Playground",
  },
  description: "Compare costs across 140+ AI models: GPT-4, Claude, Gemini, DeepSeek and more. See exact pricing per request and monthly spend — without reading documentation.",
  keywords: ["AI cost comparison", "LLM pricing", "GPT-4 cost", "Claude pricing", "Gemini cost", "AI model comparison", "AI API pricing calculator"],
  authors: [{ name: "Trim Playground" }],
  openGraph: {
    title: "Trim Playground — Compare AI Model Costs",
    description: "Compare costs across 140+ AI models in real-time. Make informed decisions and optimize your AI spending.",
    url: "https://trimplayground.com",
    siteName: "Trim Playground",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trim Playground — Compare AI Model Costs",
    description: "Compare costs across 140+ AI models: GPT-4, Claude, Gemini and more.",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: '6jlR9WtCVDDnq1UMQgkfgKy9t1gS5nAuiR24BMMVG0o',
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
            <PostHogProvider>
              {children}
            </PostHogProvider>
            <Analytics />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
