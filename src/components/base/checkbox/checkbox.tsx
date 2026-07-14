"use client"

import * as React from "react"
import { Check } from "lucide-react"
import {
  Checkbox as AriaCheckbox,
  type CheckboxProps as AriaCheckboxProps,
} from "react-aria-components"

import { DITHER_PALETTES, type DitherPalette } from "@/lib/dither-palettes"
import { cn } from "@/lib/utils"

type CheckboxSize = "sm" | "md"
type CheckboxPalette = DitherPalette

type CheckboxProps = Omit<AriaCheckboxProps, "children" | "className"> & {
  size?: CheckboxSize
  palette?: CheckboxPalette
  dither?: boolean
  className?: string
}

const CHECKBOX_PALETTES = DITHER_PALETTES
const RENDER_SIZE = 28
const CHECKBOX_FPS = 30

const sizeStyles: Record<
  CheckboxSize,
  { box: string; icon: string; radius: string }
> = {
  sm: {
    box: "size-16",
    icon: "size-7",
    radius: "rounded-[18px]",
  },
  md: {
    box: "size-20",
    icon: "size-9",
    radius: "rounded-[22px]",
  },
}

const VERTEX_SHADER = `
  attribute vec2 a_position;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

const FRAGMENT_SHADER = `
  precision mediump float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_progress;
  uniform vec3 u_deep;
  uniform vec3 u_body;
  uniform vec3 u_warm;
  uniform vec3 u_hot;

  const float TAU = 6.28318530718;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);

    float a = hash(cell);
    float b = hash(cell + vec2(1.0, 0.0));
    float c = hash(cell + vec2(0.0, 1.0));
    float d = hash(cell + vec2(1.0, 1.0));

    return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
  }

  float bayer4(vec2 point) {
    vec2 cell = mod(floor(point), 4.0);
    float x = cell.x;
    float y = cell.y;

    if (y < 1.0) {
      if (x < 1.0) return 0.0 / 16.0;
      if (x < 2.0) return 8.0 / 16.0;
      if (x < 3.0) return 2.0 / 16.0;
      return 10.0 / 16.0;
    }
    if (y < 2.0) {
      if (x < 1.0) return 12.0 / 16.0;
      if (x < 2.0) return 4.0 / 16.0;
      if (x < 3.0) return 14.0 / 16.0;
      return 6.0 / 16.0;
    }
    if (y < 3.0) {
      if (x < 1.0) return 3.0 / 16.0;
      if (x < 2.0) return 11.0 / 16.0;
      if (x < 3.0) return 1.0 / 16.0;
      return 9.0 / 16.0;
    }
    if (x < 1.0) return 15.0 / 16.0;
    if (x < 2.0) return 7.0 / 16.0;
    if (x < 3.0) return 13.0 / 16.0;
    return 5.0 / 16.0;
  }

  float pixelBox(vec2 point, vec2 center, float radius) {
    vec2 delta = abs(point - center);
    return 1.0 - step(radius, max(delta.x, delta.y));
  }

  vec3 paletteColor(float level) {
    if (level < 0.5) return u_deep;
    if (level < 1.5) return u_body;
    if (level < 2.5) return u_warm;
    return u_hot;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / max(u_resolution, vec2(1.0));
    vec2 point = gl_FragCoord.xy;
    vec2 centered = (uv - 0.5) * 2.0;
    float radius = length(centered);
    float angle = atan(centered.y, centered.x);

    float broadFlow = noise(vec2(
      centered.x * 1.7 + u_time * 0.14,
      centered.y * 1.7 - u_time * 0.11
    ));
    float fineFlow = noise(vec2(
      centered.x * 4.3 - u_time * 0.2,
      centered.y * 4.3 + u_time * 0.17
    ));
    float petals = 0.5 + 0.5 * cos(
      angle * 3.0
      + radius * 6.2
      - u_time * 0.68
      + broadFlow * 2.4
    );
    float rings = 0.5 + 0.5 * sin(
      radius * 18.0
      - broadFlow * 6.5
      - u_time * 1.22
    );
    float field = clamp(
      broadFlow * 0.4
      + fineFlow * 0.2
      + petals * 0.23
      + rings * 0.17,
      0.0,
      0.999
    );

    float radialDistance = length(uv - vec2(0.5)) / 0.70710678;
    float revealDistance = radialDistance
      + (broadFlow - 0.5) * 0.13
      + (fineFlow - 0.5) * 0.045
      + sin(angle * 4.0 - u_time * 0.42) * 0.018;
    float front = u_progress * 1.18 - 0.07;
    float reveal = 1.0 - smoothstep(front - 0.075, front + 0.1, revealDistance);
    reveal *= smoothstep(0.015, 0.09, u_progress);

    float threshold = bayer4(point);
    float scaled = field * 3.0;
    float level = min(3.0, floor(scaled) + step(threshold, fract(scaled)));
    float ordered = step(threshold, field);
    vec3 color = paletteColor(level);
    color = mix(color, u_warm, ordered * 0.16);
    float alpha = reveal * mix(0.76, 1.0, ordered);

    float dust = 0.0;
    float dustHeat = 0.0;
    for (int index = 0; index < 18; index++) {
      float id = float(index);
      float seed = hash(vec2(id * 2.91 + 0.5, id * 7.37 + 2.2));
      float life = fract(u_time * mix(0.08, 0.16, seed) + seed);
      vec2 position = vec2(
        mix(0.08, 0.92, hash(vec2(id * 4.1, 8.4))),
        mix(-0.05, 1.05, life)
      );
      position.x += sin(life * TAU + seed * 9.0) * 0.055;
      float particle = pixelBox(
        point,
        position * u_resolution,
        mix(0.42, 0.92, seed)
      );
      float fade = smoothstep(0.0, 0.14, life)
        * (1.0 - smoothstep(0.7, 1.0, life));
      float visible = particle * fade * reveal * u_progress;
      dust = min(1.0, dust + visible);
      dustHeat = max(dustHeat, visible * (1.0 - life));
    }

    vec3 dustColor = mix(u_warm, u_hot, dustHeat);
    color = mix(color, dustColor, dust);
    alpha = max(alpha, dust * 0.96);

    if (alpha < 0.02) discard;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), alpha);
  }
`

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
) {
  const shader = gl.createShader(type)
  if (!shader) return null

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }

  return shader
}

function DitherCheckboxField({
  isSelected,
  palette,
}: {
  isSelected: boolean
  palette: CheckboxPalette
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const targetRef = React.useRef(isSelected ? 1 : 0)
  const progressRef = React.useRef(isSelected ? 1 : 0)
  const velocityRef = React.useRef(0)

  React.useEffect(() => {
    targetRef.current = isSelected ? 1 : 0
  }, [isSelected])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    })
    if (!gl) return

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!vertexShader || !fragmentShader) return

    const program = gl.createProgram()
    if (!program) return

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      return
    }

    const buffer = gl.createBuffer()
    const positionLocation = gl.getAttribLocation(program, "a_position")
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution")
    const timeLocation = gl.getUniformLocation(program, "u_time")
    const progressLocation = gl.getUniformLocation(program, "u_progress")
    const deepLocation = gl.getUniformLocation(program, "u_deep")
    const bodyLocation = gl.getUniformLocation(program, "u_body")
    const warmLocation = gl.getUniformLocation(program, "u_warm")
    const hotLocation = gl.getUniformLocation(program, "u_hot")
    if (
      !buffer ||
      positionLocation < 0 ||
      !resolutionLocation ||
      !timeLocation ||
      !progressLocation ||
      !deepLocation ||
      !bodyLocation ||
      !warmLocation ||
      !hotLocation
    )
      return

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    )

    gl.useProgram(program)
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    const colors = CHECKBOX_PALETTES[palette]
    gl.uniform3f(deepLocation, ...colors.deep)
    gl.uniform3f(bodyLocation, ...colors.body)
    gl.uniform3f(warmLocation, ...colors.warm)
    gl.uniform3f(hotLocation, ...colors.hot)

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let animationFrame = 0
    let lastTime = performance.now()
    let lastPaint = -Infinity
    let stopped = false

    const render = (now: number) => {
      gl.viewport(0, 0, RENDER_SIZE, RENDER_SIZE)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(resolutionLocation, RENDER_SIZE, RENDER_SIZE)
      gl.uniform1f(timeLocation, reducedMotion.matches ? 2.6 : now / 1000)
      gl.uniform1f(progressLocation, progressRef.current)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    const animate = (now: number) => {
      if (stopped) return

      const delta = Math.min(0.05, Math.max(0, (now - lastTime) / 1000))
      lastTime = now

      if (reducedMotion.matches) {
        progressRef.current = targetRef.current
        velocityRef.current = 0
      } else {
        const displacement = targetRef.current - progressRef.current
        const acceleration = displacement * 52 - velocityRef.current * 14.5
        velocityRef.current += acceleration * delta
        progressRef.current += velocityRef.current * delta

        if (
          Math.abs(displacement) < 0.001 &&
          Math.abs(velocityRef.current) < 0.001
        ) {
          progressRef.current = targetRef.current
          velocityRef.current = 0
        }
      }

      if (document.visibilityState === "visible" && now - lastPaint >= 1000 / CHECKBOX_FPS) {
        render(now)
        lastPaint = now
      }

      animationFrame = window.requestAnimationFrame(animate)
    }

    const updateMotion = () => {
      lastTime = performance.now()
      progressRef.current = reducedMotion.matches
        ? targetRef.current
        : progressRef.current
      render(lastTime)
    }

    reducedMotion.addEventListener("change", updateMotion)
    render(performance.now())
    animationFrame = window.requestAnimationFrame(animate)

    return () => {
      stopped = true
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      reducedMotion.removeEventListener("change", updateMotion)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
    }
  }, [palette])

  return (
    <canvas
      ref={canvasRef}
      width={RENDER_SIZE}
      height={RENDER_SIZE}
      className="pointer-events-none absolute inset-0 size-full [image-rendering:pixelated]"
      aria-hidden="true"
    />
  )
}

function Checkbox({
  size = "sm",
  palette = "violet",
  dither = true,
  className,
  ...props
}: CheckboxProps) {
  const styles = sizeStyles[size]
  const accessibilityLabel =
    props["aria-label"] ?? (props["aria-labelledby"] ? undefined : "Checkbox")

  return (
    <AriaCheckbox
      {...props}
      aria-label={accessibilityLabel}
      className={cn(
        "inline-flex cursor-pointer touch-none select-none rounded-[20px] outline-none disabled:cursor-not-allowed disabled:opacity-45",
        className
      )}
    >
      {({ isSelected, isFocusVisible, isPressed }) => (
        <span
          className={cn(
            "relative grid place-items-center overflow-hidden border-2 bg-white/35 shadow-[0_1px_2px_rgb(0_0_0_/_0.06)] transition-[transform,border-color,box-shadow] duration-200 ease-out dark:bg-neutral-950/35",
            styles.box,
            styles.radius,
            isPressed && "scale-[0.96]",
            isFocusVisible &&
              "ring-2 ring-neutral-950 ring-offset-2 ring-offset-white dark:ring-neutral-50 dark:ring-offset-neutral-900",
            isSelected
              ? "shadow-[0_2px_10px_rgb(0_0_0_/_0.15)]"
              : "border-neutral-300 dark:border-neutral-700",
            "motion-reduce:transition-none"
          )}
          style={{
            borderColor: isSelected
              ? CHECKBOX_PALETTES[palette].swatch
              : undefined,
          }}
        >
          {dither && (
            <DitherCheckboxField
              isSelected={isSelected}
              palette={palette}
            />
          )}
          <Check
            aria-hidden="true"
            strokeWidth={2.25}
            className={cn(
              "relative z-10 text-white drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.35)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
              styles.icon,
              isSelected
                ? "scale-100 opacity-100 delay-200"
                : "scale-75 opacity-0 delay-0"
            )}
          />
        </span>
      )}
    </AriaCheckbox>
  )
}

export { CHECKBOX_PALETTES, Checkbox }
export type { CheckboxPalette, CheckboxProps, CheckboxSize }
