"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const RENDER_SIZE = 24

const BAYER_4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
] as const

const PALETTES = {
  blue: [[11, 18, 24], [34, 73, 101], [87, 151, 184], [205, 228, 235]],
  violet: [[21, 15, 29], [76, 48, 104], [145, 103, 172], [222, 203, 230]],
  ember: [[72, 24, 35], [124, 43, 59], [190, 82, 99], [239, 187, 193]],
  aqua: [[11, 23, 24], [28, 90, 91], [66, 157, 153], [198, 230, 219]],
  moss: [[17, 23, 17], [55, 91, 61], [113, 158, 107], [216, 228, 193]],
} as const

type DitherOrbStatus =
  | "idle"
  | "armed"
  | "running"
  | "review"
  | "complete"
  | "attention"

type DitherOrbPalette = keyof typeof PALETTES | "auto"

type DitherOrbAvatarProps = Omit<React.ComponentProps<"span">, "children"> & {
  seed: string
  size?: number
  status?: DitherOrbStatus
  palette?: DitherOrbPalette
}

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function randomGrid(x: number, y: number, seed: number) {
  let value = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)
  value = Math.imul(value ^ (value >>> 13), 1274126177)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295
}

function smooth(value: number) {
  return value * value * (3 - 2 * value)
}

function valueNoise(x: number, y: number, seed: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = smooth(x - x0)
  const ty = smooth(y - y0)
  const top = randomGrid(x0, y0, seed) * (1 - tx) + randomGrid(x0 + 1, y0, seed) * tx
  const bottom = randomGrid(x0, y0 + 1, seed) * (1 - tx) + randomGrid(x0 + 1, y0 + 1, seed) * tx
  return top * (1 - ty) + bottom * ty
}

function fbm(x: number, y: number, seed: number) {
  return valueNoise(x, y, seed) * 0.57
    + valueNoise(x * 2.03 + 7.4, y * 2.03 - 3.1, seed + 17) * 0.29
    + valueNoise(x * 4.11 - 5.7, y * 4.11 + 8.2, seed + 37) * 0.14
}

function motionFor(status: DitherOrbStatus) {
  if (status === "running") return { fps: 14, speed: 1.15 }
  if (status === "attention") return { fps: 12, speed: 0.95 }
  if (status === "armed") return { fps: 12, speed: 0.82 }
  if (status === "review") return { fps: 10, speed: 0.68 }
  if (status === "complete") return { fps: 9, speed: 0.52 }
  return { fps: 10, speed: 0.64 }
}

function mixChannel(channel: number, light: boolean) {
  return light ? Math.round(channel * 0.82 + 25) : channel
}

function resolvePalette(seed: number, palette: DitherOrbPalette) {
  const names = Object.keys(PALETTES) as Array<keyof typeof PALETTES>
  return PALETTES[palette === "auto" ? names[seed % names.length] : palette]
}

function drawOrb(
  canvas: HTMLCanvasElement,
  seed: number,
  status: DitherOrbStatus,
  paletteName: DitherOrbPalette,
  seconds: number,
  light: boolean
) {
  const context = canvas.getContext("2d", { alpha: true })
  if (!context) return

  const image = context.createImageData(RENDER_SIZE, RENDER_SIZE)
  const palette = resolvePalette(seed, paletteName)
  const time = seconds * motionFor(status).speed
  const offsetX = ((seed >>> 7) & 255) / 37
  const offsetY = ((seed >>> 15) & 255) / 41

  for (let y = 0; y < RENDER_SIZE; y += 1) {
    for (let x = 0; x < RENDER_SIZE; x += 1) {
      const px = ((x + 0.5) / RENDER_SIZE) * 2 - 1
      const py = ((y + 0.5) / RENDER_SIZE) * 2 - 1
      const radius = Math.hypot(px, py)
      const index = (y * RENDER_SIZE + x) * 4

      const angle = Math.atan2(py, px)
      const noise = fbm(px * 1.65 + offsetX + time * 0.17, py * 1.65 + offsetY - time * 0.13, seed)
      const warpedAngle = angle + (noise - 0.5) * 1.55 + Math.sin(radius * 8.2 - time) * 0.12
      const petals = 0.5 + 0.5 * Math.cos(warpedAngle * 3 + radius * 6.5 - time * 0.7)
      const rings = 0.5 + 0.5 * Math.sin(radius * 18 - noise * 7.5 - time * 1.35)
      const core = Math.max(0, 1 - radius * 0.82)
      const edge = Math.min(1, (1 - radius) * 7)
      let field = core * 0.42 + petals * 0.31 + rings * 0.27
      field = Math.max(0, Math.min(0.999, field * (0.78 + noise * 0.4) * edge))

      const scaled = field * (palette.length - 1)
      const lower = Math.floor(scaled)
      const threshold = (BAYER_4[(y % 4) * 4 + (x % 4)] + 0.5) / 16
      const colorIndex = Math.min(palette.length - 1, lower + (scaled - lower > threshold ? 1 : 0))
      const color = palette[colorIndex]

      image.data[index] = mixChannel(color[0], light)
      image.data[index + 1] = mixChannel(color[1], light)
      image.data[index + 2] = mixChannel(color[2], light)
      image.data[index + 3] = 255
    }
  }

  context.putImageData(image, 0, 0)
}

function DitherOrbAvatar({
  seed,
  size = 32,
  status = "idle",
  palette = "ember",
  className,
  style,
  ...props
}: DitherOrbAvatarProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const edgePalette = resolvePalette(hashString(seed), palette)
  const darkEdge = edgePalette[0]
  const lightEdge = darkEdge.map((channel) => mixChannel(channel, true))
  const orbStyle = {
    width: size,
    height: size,
    "--orb-edge-light": `rgb(${lightEdge.join(" ")})`,
    "--orb-edge-dark": `rgb(${darkEdge.join(" ")})`,
    ...style,
  } as React.CSSProperties

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const numericSeed = hashString(seed)
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let frame = 0
    let lastPaint = -Infinity
    let stopped = false

    const paint = (now: number) => {
      if (stopped) return
      drawOrb(
        canvas,
        numericSeed,
        status,
        palette,
        now / 1000,
        !document.documentElement.classList.contains("dark")
      )
    }

    const animate = (now: number) => {
      if (reducedMotion.matches) {
        frame = 0
        return
      }
      const { fps } = motionFor(status)
      if (document.visibilityState === "visible" && now - lastPaint >= 1000 / fps) {
        paint(now)
        lastPaint = now
      }
      frame = window.requestAnimationFrame(animate)
    }

    const refresh = () => paint(performance.now())
    const updateMotion = () => {
      refresh()
      if (reducedMotion.matches && frame) {
        window.cancelAnimationFrame(frame)
        frame = 0
      } else if (!reducedMotion.matches && !frame) {
        frame = window.requestAnimationFrame(animate)
      }
    }

    const themeObserver = new MutationObserver(refresh)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    reducedMotion.addEventListener("change", updateMotion)
    refresh()

    if (!reducedMotion.matches) frame = window.requestAnimationFrame(animate)

    return () => {
      stopped = true
      if (frame) window.cancelAnimationFrame(frame)
      themeObserver.disconnect()
      reducedMotion.removeEventListener("change", updateMotion)
    }
  }, [palette, seed, status])

  return (
    <span
      data-slot="dither-orb-avatar"
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full [clip-path:circle(50%_at_50%_50%)]",
        className
      )}
      style={orbStyle}
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    >
      <canvas
        ref={canvasRef}
        width={RENDER_SIZE}
        height={RENDER_SIZE}
        className="block size-full [image-rendering:pixelated]"
        aria-hidden="true"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_2.5px_var(--orb-edge-light)] dark:shadow-[inset_0_0_0_2.5px_var(--orb-edge-dark)]"
      />
    </span>
  )
}

export { DitherOrbAvatar }
export type { DitherOrbAvatarProps, DitherOrbPalette, DitherOrbStatus }
