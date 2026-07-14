"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Ditherize, type DitherizePalette } from "@/components/ui/ditherize"

const DEFAULT_IMAGE = "/ditherobot.png"

function NumericControl({
  label,
  value,
  decreaseLabel,
  increaseLabel,
  onDecrease,
  onIncrease,
  canDecrease = true,
  canIncrease = true,
}: {
  label: string
  value: string
  decreaseLabel: string
  increaseLabel: string
  onDecrease: () => void
  onIncrease: () => void
  canDecrease?: boolean
  canIncrease?: boolean
}) {
  return (
    <div className="flex h-9 items-center justify-between gap-4 border-b border-neutral-200/70 last:border-b-0 dark:border-neutral-800">
      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <div className="flex items-center rounded-md border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-950">
        <button
          type="button"
          aria-label={decreaseLabel}
          disabled={!canDecrease}
          onClick={onDecrease}
          className="grid size-7 place-items-center text-sm text-neutral-500 outline-none transition-colors hover:text-neutral-950 disabled:opacity-25 dark:text-neutral-400 dark:hover:text-neutral-50"
        >
          −
        </button>
        <output className="min-w-11 border-x border-neutral-200 px-1 text-center font-mono text-[11px] tabular-nums dark:border-neutral-700">
          {value}
        </output>
        <button
          type="button"
          aria-label={increaseLabel}
          disabled={!canIncrease}
          onClick={onIncrease}
          className="grid size-7 place-items-center text-sm text-neutral-500 outline-none transition-colors hover:text-neutral-950 disabled:opacity-25 dark:text-neutral-400 dark:hover:text-neutral-50"
        >
          +
        </button>
      </div>
    </div>
  )
}

function DitherizeDemo({
  palette = "violet",
}: {
  palette?: DitherizePalette
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const objectUrlRef = React.useRef<string | null>(null)
  const [src, setSrc] = React.useState(DEFAULT_IMAGE)
  const [dotSize, setDotSize] = React.useState(3)
  const [spacing, setSpacing] = React.useState(5)
  const [angle, setAngle] = React.useState(45)

  React.useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const objectUrl = URL.createObjectURL(file)
    objectUrlRef.current = objectUrl
    setSrc(objectUrl)
    event.target.value = ""
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Ditherize
        src={src}
        width={280}
        height={215}
        dotSize={dotSize}
        spacing={spacing}
        shape="circle"
        angle={angle}
        threshold={0.06}
        palette={palette}
        className="rounded-xl"
        aria-label="Ditherized image"
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="sr-only"
        onChange={handleUpload}
        aria-label="Choose an image to ditherize"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        Upload image
      </Button>
      <div
        className="w-[280px] rounded-xl border border-neutral-200 bg-neutral-50/70 px-3 py-1 dark:border-neutral-800 dark:bg-neutral-950/45"
        aria-label="Ditherize controls"
      >
        <NumericControl
          label="Dot size"
          value={String(dotSize)}
          decreaseLabel="Decrease dot size"
          increaseLabel="Increase dot size"
          onDecrease={() => setDotSize((value) => Math.max(1, value - 1))}
          onIncrease={() => setDotSize((value) => Math.min(7, value + 1))}
          canDecrease={dotSize > 1}
          canIncrease={dotSize < 7}
        />
        <NumericControl
          label="Spacing"
          value={String(spacing)}
          decreaseLabel="Decrease spacing"
          increaseLabel="Increase spacing"
          onDecrease={() => setSpacing((value) => Math.max(4, value - 1))}
          onIncrease={() => setSpacing((value) => Math.min(6, value + 1))}
          canDecrease={spacing > 4}
          canIncrease={spacing < 6}
        />
        <NumericControl
          label="Angle"
          value={`${angle}°`}
          decreaseLabel="Decrease angle"
          increaseLabel="Increase angle"
          onDecrease={() => setAngle((value) => Math.max(0, value - 5))}
          onIncrease={() => setAngle((value) => Math.min(180, value + 5))}
          canDecrease={angle > 0}
          canIncrease={angle < 180}
        />
      </div>
    </div>
  )
}

export { DitherizeDemo }
