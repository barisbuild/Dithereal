"use client"

import * as React from "react"
import {
  Switch as AriaSwitch,
  type SwitchProps as AriaSwitchProps,
} from "react-aria-components"

import { DITHER_PALETTES, type DitherPalette } from "@/lib/dither-palettes"
import { cn } from "@/lib/utils"

type DitherSwitchPalette = DitherPalette

type DitherSwitchProps = Omit<AriaSwitchProps, "children" | "className"> & {
  palette?: DitherSwitchPalette
  className?: string
}

const DITHER_SWITCH_PALETTES = DITHER_PALETTES
const RENDER_WIDTH = 128
const RENDER_HEIGHT = 64
const THUMB_TRAVEL = 64

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
  uniform float u_velocity;
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
    vec2 point = gl_FragCoord.xy;
    vec2 uv = point / max(u_resolution, vec2(1.0));
    vec2 centered = (uv - 0.5) * vec2(2.0, 1.0);

    float broadFlow = noise(vec2(
      uv.x * 5.1 - u_time * 0.12,
      uv.y * 4.2 + u_time * 0.09
    ));
    float fineFlow = noise(vec2(
      uv.x * 14.0 + u_time * 0.2,
      uv.y * 10.0 - u_time * 0.16
    ));
    float current = 0.5 + 0.5 * sin(
      uv.x * 19.0
      + centered.y * 5.0
      - u_time * 0.74
      + broadFlow * 4.2
    );

    float field = clamp(
      broadFlow * 0.42 + fineFlow * 0.31 + current * 0.27,
      0.0,
      0.999
    );
    float threshold = bayer4(point);
    float front = mix(-0.16, 1.22, clamp(u_progress, 0.0, 1.0));
    float revealDistance = uv.x
      + (broadFlow - 0.5) * 0.075
      + (fineFlow - 0.5) * 0.026;
    float coverage = 1.0 - smoothstep(
      front - 0.14,
      front + 0.05,
      revealDistance
    );
    float reveal = step(threshold, coverage) * step(0.002, coverage);

    float scaled = field * 3.0;
    float level = min(3.0, floor(scaled) + step(threshold, fract(scaled)));
    float ordered = step(threshold, field);
    vec3 color = paletteColor(level);
    color = mix(color, u_warm, ordered * 0.12);
    float alpha = reveal * mix(0.78, 0.98, ordered);

    float knobX = mix(0.25, 0.75, clamp(u_progress, 0.0, 1.0));
    float motion = smoothstep(0.025, 0.62, abs(u_velocity));
    float direction = u_velocity < 0.0 ? -1.0 : 1.0;
    float forwardMotion = step(0.0, u_velocity);
    float wake = exp(-abs(uv.x - knobX) * 28.0)
      * exp(-abs(centered.y) * 4.2)
      * motion;
    color = mix(color, u_hot, wake * mix(0.12, 0.28, forwardMotion));
    alpha = max(alpha, wake * mix(0.08, 0.2, forwardMotion));

    float spark = 0.0;
    float sparkHeat = 0.0;
    for (int index = 0; index < 10; index++) {
      float id = float(index);
      float seed = hash(vec2(id * 3.17 + 0.8, id * 7.11 + 2.4));
      float life = fract(u_time * mix(0.82, 1.38, seed) + seed);
      float trailLength = mix(0.09, 0.34, hash(vec2(id, 5.6)));
      vec2 position = vec2(knobX, 0.5);
      position.x -= direction * life * trailLength;
      position.x += (hash(vec2(id * 1.9, 8.2)) - 0.5) * 0.035;
      position.y += (seed - 0.5) * mix(0.18, 0.58, life);
      position.y += sin(life * TAU + seed * 13.0) * 0.035;

      float particle = pixelBox(
        point,
        position * u_resolution,
        mix(0.58, 1.15, hash(vec2(id * 2.3, 4.1)))
      );
      float fade = smoothstep(0.0, 0.1, life)
        * (1.0 - smoothstep(0.54, 1.0, life))
        * motion
        * mix(0.08, 0.42, forwardMotion);
      float pulse = mix(
        0.58,
        1.0,
        step(0.5, hash(vec2(id, floor(u_time * 10.0))))
      );
      float visible = particle * fade * pulse;
      spark = min(1.0, spark + visible);
      sparkHeat = max(sparkHeat, visible * (1.0 - life));
    }

    vec3 sparkColor = mix(u_warm, u_hot, sparkHeat);
    color = mix(color, sparkColor, spark);
    alpha = max(alpha, spark * 0.98);

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

function DitherSwitchScene({
  isSelected,
  palette,
}: {
  isSelected: boolean
  palette: DitherSwitchPalette
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const thumbRef = React.useRef<HTMLSpanElement>(null)
  const targetRef = React.useRef(isSelected ? 1 : 0)
  const progressRef = React.useRef(isSelected ? 1 : 0)
  const velocityRef = React.useRef(0)

  React.useEffect(() => {
    targetRef.current = isSelected ? 1 : 0
  }, [isSelected])

  React.useEffect(() => {
    const canvas = canvasRef.current
    const thumb = thumbRef.current
    if (!canvas || !thumb) return

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
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
    const velocityLocation = gl.getUniformLocation(program, "u_velocity")
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
      !velocityLocation ||
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

    const colors = DITHER_SWITCH_PALETTES[palette]
    gl.uniform3f(deepLocation, ...colors.deep)
    gl.uniform3f(bodyLocation, ...colors.body)
    gl.uniform3f(warmLocation, ...colors.warm)
    gl.uniform3f(hotLocation, ...colors.hot)

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let animationFrame = 0
    let lastTime = performance.now()
    let stopped = false

    const updateThumb = () => {
      const progress = Math.min(1, Math.max(0, progressRef.current))
      const stretch = Math.min(0.045, Math.abs(velocityRef.current) * 0.012)
      thumb.style.transform = `translate3d(${progress * THUMB_TRAVEL}px, 0, 0) scaleX(${1 + stretch})`
    }

    const render = (now: number) => {
      gl.viewport(0, 0, RENDER_WIDTH, RENDER_HEIGHT)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(resolutionLocation, RENDER_WIDTH, RENDER_HEIGHT)
      gl.uniform1f(timeLocation, reducedMotion.matches ? 1.8 : now / 1000)
      gl.uniform1f(progressLocation, progressRef.current)
      gl.uniform1f(velocityLocation, reducedMotion.matches ? 0 : velocityRef.current)
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
        const acceleration = displacement * 58 - velocityRef.current * 15.4
        velocityRef.current += acceleration * delta
        progressRef.current += velocityRef.current * delta

        if (
          Math.abs(displacement) < 0.0008 &&
          Math.abs(velocityRef.current) < 0.0008
        ) {
          progressRef.current = targetRef.current
          velocityRef.current = 0
        }
      }

      updateThumb()

      if (document.visibilityState === "visible") {
        render(now)
      }

      animationFrame = window.requestAnimationFrame(animate)
    }

    const updateMotion = () => {
      lastTime = performance.now()
      progressRef.current = reducedMotion.matches
        ? targetRef.current
        : progressRef.current
      velocityRef.current = 0
      updateThumb()
      render(lastTime)
    }

    reducedMotion.addEventListener("change", updateMotion)
    updateThumb()
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
    <>
      <canvas
        ref={canvasRef}
        width={RENDER_WIDTH}
        height={RENDER_HEIGHT}
        className="pointer-events-none absolute inset-0 size-full [image-rendering:pixelated]"
        aria-hidden="true"
      />
      <span
        ref={thumbRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-2 top-2 z-20 size-12 rounded-full border border-white/70 bg-[#f8f5f9] shadow-[0_2px_8px_rgb(10_4_14_/_0.32),inset_0_1px_0_white] will-change-transform dark:border-white/55 dark:bg-[#eee9f0]"
      />
    </>
  )
}

function DitherSwitch({
  palette = "violet",
  className,
  ...props
}: DitherSwitchProps) {
  const accessibilityLabel =
    props["aria-label"] ?? (props["aria-labelledby"] ? undefined : "Dither switch")

  return (
    <AriaSwitch
      {...props}
      aria-label={accessibilityLabel}
      className={cn(
        "inline-flex cursor-pointer touch-none select-none rounded-full outline-none disabled:cursor-not-allowed disabled:opacity-45",
        className
      )}
    >
      {({ isSelected, isPressed, isFocusVisible }) => (
        <span
          className={cn(
            "relative block h-16 w-32 overflow-hidden rounded-full border bg-[#1c1620] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.08),0_2px_10px_rgb(12_5_16_/_0.16)] transition-[transform,border-color,box-shadow] duration-200 ease-out dark:bg-[#171219]",
            isPressed && "scale-[0.97]",
            isFocusVisible &&
              "ring-2 ring-neutral-950 ring-offset-2 ring-offset-white dark:ring-neutral-50 dark:ring-offset-neutral-900",
            isSelected
              ? "shadow-[inset_0_1px_0_rgb(255_255_255_/_0.12),0_3px_14px_rgb(12_5_16_/_0.24)]"
              : "border-neutral-700/80",
            "motion-reduce:transition-none"
          )}
          style={{
            borderColor: isSelected
              ? DITHER_SWITCH_PALETTES[palette].swatch
              : undefined,
          }}
        >
          <DitherSwitchScene isSelected={isSelected} palette={palette} />
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-[18px] top-1/2 z-10 -translate-y-1/2 text-[11px] font-medium text-white transition-opacity duration-200",
              isSelected ? "opacity-85 delay-150" : "opacity-0"
            )}
          >
            On
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute right-[15px] top-1/2 z-10 -translate-y-1/2 text-[11px] font-medium text-neutral-300 transition-opacity duration-200",
              isSelected ? "opacity-0" : "opacity-80 delay-150"
            )}
          >
            Off
          </span>
        </span>
      )}
    </AriaSwitch>
  )
}

export { DITHER_SWITCH_PALETTES, DitherSwitch }
export type { DitherSwitchPalette, DitherSwitchProps }
