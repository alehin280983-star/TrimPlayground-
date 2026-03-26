import Link from 'next/link';
import { Header, Footer } from '@/components/layout';
import { providers } from '@/lib/config';

export default function Home() {
  return (
    <>
      <Header />
      <main className="bg-background min-h-screen">
        {/* Hero Section */}
        <section className="relative pt-32 pb-48 px-4 overflow-hidden bg-background">
          <div className="max-w-5xl mx-auto text-center relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-foreground/5 border border-foreground/10 mb-12 animate-fadeIn">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground"></span>
              </span>
              <span className="text-xs font-medium text-foreground/80">Compare 140+ AI models across 10 providers</span>
            </div>

            {/* Title */}
            <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight tracking-tight">
              <span className="opacity-40 block text-4xl mb-2">Trim Your AI Costs</span>
              <span className="text-foreground">with Trim Playground</span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-foreground/60 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
              Compare costs across GPT-4, Claude, Gemini, and more.
              Make informed decisions and optimize your AI spending without reading documentation.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/playground"
                className="px-10 py-4 rounded-lg bg-foreground text-background font-bold text-lg hover:scale-105 transition-all shadow-lg"
              >
                Start Comparing Free
              </Link>
            </div>

            {/* Mini Features */}
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm font-medium text-foreground/40">
              {[
                "No credit card required",
                "Always free to use",
                "Real-time pricing"
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Providers Section */}
        <section className="py-24 bg-background border-t border-foreground/5">
          <div className="max-w-6xl mx-auto px-4">
            <p className="text-center text-foreground/30 font-bold tracking-widest uppercase text-xs mb-12">
              Trusted AI providers supported
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-8 items-center justify-items-center opacity-60">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex flex-col items-center gap-2 text-center group"
                >
                  <span className="text-sm font-bold text-foreground/60 group-hover:text-foreground transition-colors">{provider.name}</span>
                  <span className="text-[10px] text-foreground/20 group-hover:text-foreground/80 transition-colors font-bold uppercase">
                    {provider.models.length} models
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Rest of the page can be restored if needed, but the image focuses on hero/providers */}
      </main>
      <Footer />
    </>
  );
}
