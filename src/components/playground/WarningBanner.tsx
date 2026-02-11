'use client';

interface WarningBannerProps {
    warnings: string[];
}

export default function WarningBanner({ warnings }: WarningBannerProps) {
    if (warnings.length === 0) return null;

    return (
        <div className="p-4 bg-foreground/5 border border-foreground/10 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                <span>⚠️</span>
                <span>Important Notes</span>
            </div>
            <ul className="space-y-1">
                {warnings.map((warning, i) => (
                    <li key={i} className="text-xs text-foreground/60 pl-6">
                        • {warning}
                    </li>
                ))}
            </ul>
        </div>
    );
}
