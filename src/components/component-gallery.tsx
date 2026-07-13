"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DitherOrbAvatar } from "@/components/ui/dither-orb-avatar"
import {
  DITHER_SLIDER_PALETTES,
  DitherSlider,
  type DitherSliderPalette,
} from "@/components/ui/dither-slider"

const sliderPalettes = ["ember", "blue", "aqua", "violet"] as const

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      aria-label="Temayı değiştir"
      variant="outline"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  )
}

export function ComponentGallery() {
  const [sliderPalette, setSliderPalette] =
    useState<DitherSliderPalette>("ember")

  return (
    <main className="min-h-[100dvh] bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <header className="flex h-16 items-center justify-end">
          <ThemeToggle />
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="flex aspect-square flex-col rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <header className="flex items-center justify-between text-xs">
              <h2 className="font-medium">Dither orb avatar</h2>
              <span className="text-neutral-400 dark:text-neutral-600">01</span>
            </header>
            <div className="flex flex-1 items-center justify-center gap-3">
              <DitherOrbAvatar
                seed="dither-minimal"
                size={64}
                status="running"
                aria-label="Animated ember dither orb"
              />
              <DitherOrbAvatar seed="blue-orb" size={64} palette="blue" />
              <DitherOrbAvatar seed="aqua-orb" size={64} palette="aqua" status="armed" />
              <DitherOrbAvatar seed="violet-orb" size={64} palette="violet" status="review" />
            </div>
          </article>

          <article className="flex aspect-square flex-col rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <header className="flex items-center justify-between text-xs">
              <h2 className="font-medium">Dither slider</h2>
              <span className="text-neutral-400 dark:text-neutral-600">02</span>
            </header>
            <div className="grid flex-1 place-items-center">
              <DitherSlider label="Grain" palette={sliderPalette} />
            </div>
            <div
              className="flex items-center justify-center gap-1.5 pb-1"
              aria-label="Slider renkleri"
            >
              {sliderPalettes.map((palette) => {
                const isSelected = sliderPalette === palette

                return (
                  <button
                    key={palette}
                    type="button"
                    aria-label={`${palette} rengi`}
                    aria-pressed={isSelected}
                    onClick={() => setSliderPalette(palette)}
                    className="grid size-8 place-items-center rounded-full outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-neutral-50 dark:focus-visible:ring-offset-neutral-900"
                  >
                    <span
                      className={`size-4 rounded-full border border-black/10 dark:border-white/10 ${
                        isSelected
                          ? "ring-2 ring-neutral-950 ring-offset-2 ring-offset-white dark:ring-neutral-50 dark:ring-offset-neutral-900"
                          : ""
                      }`}
                      style={{
                        backgroundColor:
                          DITHER_SLIDER_PALETTES[palette].swatch,
                      }}
                    />
                  </button>
                )
              })}
            </div>
          </article>

          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="aspect-square rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
            />
          ))}
        </section>
      </div>
    </main>
  )
}
