"use client"

import * as React from "react"

import { LineSpinnerDemo } from "@/components/application/loading-indicator/line-spinner-demo"
import { BadgeDemo } from "@/components/base/badges/badge-demo"
import type { BadgeColor } from "@/components/base/badges/badges"
import { DitherButtonDemo } from "@/components/base/buttons/dither-button-demo"
import { DitherCardDemo } from "@/components/base/cards/dither-card-demo"
import { CheckboxDemo } from "@/components/base/checkbox/checkbox-demo"
import { ContentDividerDemo } from "@/components/base/dividers/content-divider-demo"
import { DitherSwitchDemo } from "@/components/base/switch/dither-switch-demo"
import { DitherizeDemo } from "@/components/ui/ditherize-demo"
import { DitherOrbAvatar } from "@/components/ui/dither-orb-avatar"
import { DitherSlider } from "@/components/ui/dither-slider"
import { DITHER_PALETTES, type DitherPalette } from "@/lib/dither-palettes"
import type { ComponentSlug } from "@/lib/component-catalog"
import { cn } from "@/lib/utils"

const PALETTES = ["violet", "aqua", "blue", "ember"] as const

function PalettePicker({
  value,
  onChange,
  label,
}: {
  value: DitherPalette
  onChange: (palette: DitherPalette) => void
  label: string
}) {
  return (
    <div className="flex items-center justify-center gap-1" aria-label={label}>
      {PALETTES.map((palette) => {
        const selected = palette === value

        return (
          <button
            key={palette}
            type="button"
            aria-label={`${palette} palette`}
            aria-pressed={selected}
            onClick={() => onChange(palette)}
            className="grid size-8 place-items-center rounded-full outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span
              className={cn(
                "size-3.5 rounded-full border border-black/10 dark:border-white/10",
                selected &&
                  "ring-2 ring-foreground ring-offset-2 ring-offset-background"
              )}
              style={{ backgroundColor: DITHER_PALETTES[palette].swatch }}
            />
          </button>
        )
      })}
    </div>
  )
}

function Agents({ size = 64 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center gap-2.5 sm:gap-3">
      <DitherOrbAvatar
        seed="violet-orb"
        size={size}
        palette="violet"
        status="running"
        aria-label="Animated violet dither agent"
      />
      <DitherOrbAvatar
        seed="aqua-orb"
        size={size}
        palette="aqua"
        status="armed"
        aria-label="Animated aqua dither agent"
      />
      <DitherOrbAvatar
        seed="blue-orb"
        size={size}
        palette="blue"
        status="complete"
        aria-label="Animated blue dither agent"
      />
      <DitherOrbAvatar
        seed="ember-orb"
        size={size}
        palette="ember"
        status="review"
        aria-label="Animated ember dither agent"
      />
    </div>
  )
}

export function ComponentPreview({
  slug,
  className,
  showPalette = true,
  size = "card",
}: {
  slug: ComponentSlug
  className?: string
  showPalette?: boolean
  size?: "card" | "detail"
}) {
  const [palette, setPalette] = React.useState<DitherPalette>("violet")
  const badgeColor: BadgeColor = palette === "ember" ? "brand" : palette
  const agentSize = size === "detail" ? 86 : 58

  let preview: React.ReactNode

  switch (slug) {
    case "dither-agents":
      preview = <Agents size={agentSize} />
      break
    case "dither-slider":
      preview = <DitherSlider label="Grain" palette={palette} />
      break
    case "dither-loader":
      preview = <LineSpinnerDemo palette={palette} />
      break
    case "dither-checkbox":
      preview = <CheckboxDemo palette={palette} />
      break
    case "dither-button":
      preview = <DitherButtonDemo color={badgeColor} />
      break
    case "dither-switch":
      preview = <DitherSwitchDemo palette={palette} />
      break
    case "dither-badge":
      preview = <BadgeDemo color={badgeColor} />
      break
    case "dither-content-divider":
      preview = <ContentDividerDemo color={palette} />
      break
    case "dither-card":
      preview = <DitherCardDemo palette={palette} />
      break
    case "ditherize":
      preview = <DitherizeDemo palette={palette} />
      break
  }

  const canChangePalette = slug !== "dither-agents"

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col items-stretch justify-between",
        className
      )}
    >
      <div
        className={cn(
          "grid min-h-0 flex-1 place-items-center px-3",
          slug === "ditherize" ? "py-5" : "py-10",
          size === "detail" && "min-h-[380px] py-14"
        )}
      >
        {preview}
      </div>

      {showPalette && canChangePalette ? (
        <div className="pb-4">
          <PalettePicker
            value={palette}
            onChange={setPalette}
            label={`${slug} palettes`}
          />
        </div>
      ) : null}
    </div>
  )
}
