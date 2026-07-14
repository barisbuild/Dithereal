"use client"

import * as React from "react"

import {
  Checkbox,
  type CheckboxPalette,
} from "@/components/base/checkbox/checkbox"

type DemoPhase = "idle" | "transferring" | "collapsed"

export function CheckboxDemo({
  palette = "violet",
}: {
  palette?: CheckboxPalette
}) {
  const [phase, setPhase] = React.useState<DemoPhase>("idle")
  const transitionTimer = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (transitionTimer.current !== null) {
        window.clearTimeout(transitionTimer.current)
      }
    }
  }, [])

  const activateEmptyState = () => {
    if (phase !== "idle") return

    setPhase("transferring")
    transitionTimer.current = window.setTimeout(() => {
      setPhase("collapsed")
      transitionTimer.current = null
    }, 320)
  }

  const isTransferring = phase === "transferring"
  const isCollapsed = phase === "collapsed"

  return (
    <div
      className="relative h-20 w-40"
      role="group"
      aria-label="Dither checkbox states"
    >
      {!isCollapsed && (
        <div
          className="absolute left-0 top-2 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{
            transform: `translate3d(${isTransferring ? 48 : 0}px, 0, 0)`,
          }}
        >
          <Checkbox
            isSelected={false}
            dither={false}
            size="sm"
            palette={palette}
            aria-label="Empty dither checkbox"
            onChange={activateEmptyState}
          />
        </div>
      )}

      <div
        className="absolute top-2 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        style={{
          left: isCollapsed ? 48 : 96,
          opacity: isTransferring ? 0 : 1,
          transform: `scale(${isTransferring ? 0.82 : 1})`,
        }}
      >
        <Checkbox
          isSelected={!isTransferring}
          dither
          size="sm"
          palette={palette}
          aria-label="Selected dither checkbox"
        />
      </div>
    </div>
  )
}
