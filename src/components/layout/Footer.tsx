import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t border-foreground/10 bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="font-extrabold text-xl tracking-tighter text-foreground">
                            TRIM <span className="opacity-50">PLAYGROUND</span>
                        </Link>
                        <p className="mt-4 text-foreground/60 text-sm max-w-xs">
                            Understand your AI economics in 5 minutes without reading documentation.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-foreground text-sm uppercase tracking-wider mb-4">Product</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/playground" className="text-foreground/60 hover:text-foreground text-sm transition-colors">
                                    Trim Playground
                                </Link>
                            </li>
<li>
                                <Link href="/pro" className="text-foreground/60 hover:text-foreground text-sm transition-colors">
                                    Pro
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-foreground text-sm uppercase tracking-wider mb-4">Legal</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/privacy" className="text-foreground/60 hover:text-foreground text-sm transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-foreground/60 hover:text-foreground text-sm transition-colors">
                                    Terms of Service
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-foreground/10">
                    <p className="text-foreground/40 text-sm text-center">
                        © {new Date().getFullYear()} Trim Playground. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
