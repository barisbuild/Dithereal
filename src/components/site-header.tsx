"use client"

import Image from "next/image"
import Link from "next/link"
import { useTheme } from "next-themes"
import { GitFork, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

export function SiteHeader() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/88 backdrop-blur-xl supports-[backdrop-filter]:bg-background/72">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src="/dithereal-mark.png"
            alt=""
            width={24}
            height={24}
            className="size-6 object-contain"
          />
          <span className="text-sm font-semibold tracking-[-0.02em]">
            dithereal
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary navigation">
          <Button asChild variant="ghost" size="icon" aria-label="GitHub repository">
            <a href="https://github.com/barisbuild/Dithereal" target="_blank" rel="noreferrer">
              <GitFork />
            </a>
          </Button>
          <Button
            type="button"
            aria-label="Toggle theme"
            variant="outline"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <Sun className="hidden dark:block" />
            <Moon className="dark:hidden" />
          </Button>
        </nav>
      </div>
    </header>
  )
}
