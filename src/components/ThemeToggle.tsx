"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <button className="p-2 ghost-button text-foreground opacity-50 cursor-wait">
                <Sun className="h-5 w-5" />
            </button>
        )
    }

    return (
        <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="p-2 hover:bg-card/50 rounded-md transition-colors text-foreground"
            aria-label="Toggle theme"
        >
            {theme === "light" ? (
                <Moon className="h-5 w-5" />
            ) : (
                <Sun className="h-5 w-5" />
            )}
        </button>
    )
}
