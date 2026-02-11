import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t border-foreground/10 bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
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
                                <Link href="/calculator" className="text-foreground/60 hover:text-foreground text-sm transition-colors">
                                    Cost Calculator
                                </Link>
                            </li>
                            <li>
                                <Link href="/pricing" className="text-foreground/60 hover:text-foreground text-sm transition-colors">
                                    Pricing
                                </Link>
                            </li>
                            <li>
                                <Link href="/changelog" className="text-foreground/60 hover:text-foreground text-sm transition-colors">
                                    Changelog
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-foreground text-sm uppercase tracking-wider mb-4">Resources</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/docs" className="text-foreground/60 hover:text-foreground text-sm transition-colors">
                                    Documentation
                                </Link>
                            </li>
                            <li>
                                <Link href="/blog" className="text-foreground/60 hover:text-foreground text-sm transition-colors">
                                    Blog
                                </Link>
                            </li>
                            <li>
                                <Link href="/api" className="text-foreground/60 hover:text-foreground text-sm transition-colors">
                                    API Reference
                                </Link>
                            </li>
                            <li>
                                <Link href="/status" className="text-foreground/60 hover:text-foreground text-sm transition-colors">
                                    Status
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-foreground text-sm uppercase tracking-wider mb-4">Company</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/about" className="text-foreground/60 hover:text-foreground text-sm transition-colors">
                                    About
                                </Link>
                            </li>
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
                            <li>
                                <Link href="/contact" className="text-foreground/60 hover:text-foreground text-sm transition-colors">
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-foreground/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-foreground/40 text-sm">
                        © {new Date().getFullYear()} AI Cost Platform. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-foreground transition-colors text-sm">
                            Twitter
                        </a>
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-foreground transition-colors text-sm">
                            GitHub
                        </a>
                        <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-foreground transition-colors text-sm">
                            Discord
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
