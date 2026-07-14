"use client"

import * as React from "react"

import { DITHER_PALETTES, type DitherPalette } from "@/lib/dither-palettes"
import { cn } from "@/lib/utils"

type BadgeType = "pill-color"
type BadgeColor = "brand" | "blue" | "aqua" | "violet"
type BadgeSize = "sm" | "md" | "lg"

type BadgeProps = Omit<React.ComponentProps<"span">, "color"> & {
  type?: BadgeType
  color?: BadgeColor
  size?: BadgeSize
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs font-medium",
  md: "px-2.5 py-0.5 text-sm font-medium",
  lg: "px-3 py-1 text-sm font-medium",
}

const BADGE_COLORS = {
  violet: {
    palette: "violet",
    swatch: DITHER_PALETTES.violet.swatch,
    root: "bg-[#251331] text-[#dcb4f6] ring-[#5b3273]",
  },
  aqua: {
    palette: "aqua",
    swatch: DITHER_PALETTES.aqua.swatch,
    root: "bg-[#0c2b27] text-[#9ce8da] ring-[#245f56]",
  },
  blue: {
    palette: "blue",
    swatch: DITHER_PALETTES.blue.swatch,
    root: "bg-[#0b2233] text-[#a6dcff] ring-[#245576]",
  },
  brand: {
    palette: "ember",
    swatch: DITHER_PALETTES.ember.swatch,
    root: "bg-[#351016] text-[#ffb2bd] ring-[#7c2a39]",
  },
} satisfies Record<
  BadgeColor,
  { palette: DitherPalette; swatch: string; root: string }
>

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

  void main() {
    vec2 point = gl_FragCoord.xy;
    vec2 uv = point / max(u_resolution, vec2(1.0));

    float broadFlow = noise(vec2(uv.x * 5.2 - u_time * 0.14, uv.y * 3.1 + u_time * 0.08));
    float fineFlow = noise(vec2(uv.x * 13.0 + u_time * 0.19, uv.y * 6.0 - u_time * 0.12));
    float wave = 0.5 + 0.5 * sin(uv.x * 18.0 - u_time * 0.85 + broadFlow * 4.0);
    float leftEdge = 1.0 - smoothstep(0.0, 0.52, uv.x);
    float rightEdge = 1.0 - smoothstep(0.0, 0.52, 1.0 - uv.x);
    float edgeField = max(leftEdge, rightEdge);
    float innerBand = smoothstep(0.02, 0.22, uv.y)
      * smoothstep(0.02, 0.22, 1.0 - uv.y);
    float field = (broadFlow * 0.48 + fineFlow * 0.27 + wave * 0.25)
      * mix(0.22, 1.0, edgeField)
      * innerBand;
    float threshold = bayer4(point);
    float scaledField = clamp(field, 0.0, 0.999) * 3.0;
    float level = min(3.0, floor(scaledField) + step(threshold, fract(scaledField)));
    vec3 fieldColor = mix(u_deep, u_body, level / 3.0);
    fieldColor = mix(fieldColor, u_warm, step(2.5, level) * 0.28);
    float microDither = step(
      threshold,
      clamp(fineFlow * 0.58 + wave * 0.25 + edgeField * 0.17, 0.0, 1.0)
    );
    fieldColor = mix(fieldColor, u_warm, microDither * 0.13);
    float fieldAlpha = (0.095 + level * 0.06) * mix(0.48, 1.0, edgeField);
    fieldAlpha += microDither * 0.032 * mix(0.4, 1.0, edgeField);

    float spark = 0.0;
    float heat = 0.0;

    for (int index = 0; index < 16; index++) {
      float id = float(index);
      float seed = hash(vec2(id * 2.37 + 0.7, id * 6.91 + 2.1));
      float speed = mix(0.105, 0.18, seed);
      float life = fract(u_time * speed + seed);
      float side = mod(id, 2.0);
      float direction = side < 1.0 ? 1.0 : -1.0;
      float origin = side < 1.0 ? -1.0 : u_resolution.x + 1.0;
      float travel = u_resolution.x * mix(0.34, 0.47, seed);
      float ease = 1.0 - pow(1.0 - life, 1.6);

      float verticalSeed = hash(vec2(id * 4.13, 9.4));
      float y = mix(4.0, max(4.0, u_resolution.y - 4.0), verticalSeed);
      y += sin(life * TAU + seed * 12.0) * mix(0.25, 0.72, seed);
      float x = origin + direction * travel * ease;

      float radius = mix(0.42, 0.9, hash(vec2(id, 4.8)));
      float head = pixelBox(point, vec2(x, y), radius);
      float trailOne = pixelBox(
        point,
        vec2(x - direction * 1.8, y + (seed - 0.5) * 0.8),
        radius * 0.7
      );
      float trailTwo = pixelBox(
        point,
        vec2(x - direction * 3.4, y - (seed - 0.5) * 0.7),
        radius * 0.48
      );
      float enter = smoothstep(0.0, 0.12, life);
      float dissolve = 1.0 - smoothstep(0.64, 0.96, life);
      float pulse = mix(
        0.5,
        1.0,
        step(0.48, hash(vec2(id * 1.7, floor(u_time * 6.0))))
      );
      float fade = enter * dissolve * pulse;
      float strength = head * fade;
      float trail = (trailOne * 0.46 + trailTwo * 0.22) * fade;

      spark = min(1.0, spark + strength + trail);
      heat = max(heat, strength * (1.0 - life));
    }

    vec3 sparkColor = mix(u_body, u_warm, smoothstep(0.15, 0.72, spark));
    sparkColor = mix(sparkColor, u_hot, heat * 0.82);
    float sparkAlpha = spark * 0.9;
    float alpha = max(fieldAlpha, sparkAlpha);
    vec3 color = mix(fieldColor, sparkColor, clamp(sparkAlpha / max(alpha, 0.001), 0.0, 1.0));

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

function BadgeSparkField({ palette }: { palette: DitherPalette }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

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
    const deepLocation = gl.getUniformLocation(program, "u_deep")
    const bodyLocation = gl.getUniformLocation(program, "u_body")
    const warmLocation = gl.getUniformLocation(program, "u_warm")
    const hotLocation = gl.getUniformLocation(program, "u_hot")
    if (
      !buffer ||
      positionLocation < 0 ||
      !resolutionLocation ||
      !timeLocation ||
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

    const colors = DITHER_PALETTES[palette]
    gl.uniform3f(deepLocation, ...colors.deep)
    gl.uniform3f(bodyLocation, ...colors.body)
    gl.uniform3f(warmLocation, ...colors.warm)
    gl.uniform3f(hotLocation, ...colors.hot)

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let animationFrame = 0
    let stopped = false

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.round(bounds.width * 0.8))
      canvas.height = Math.max(1, Math.round(bounds.height * 0.8))
    }

    const render = (now: number) => {
      if (stopped) return

      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
      gl.uniform1f(timeLocation, reducedMotion.matches ? 3.8 : now / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      if (!reducedMotion.matches) {
        animationFrame = window.requestAnimationFrame(render)
      }
    }

    const refresh = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      animationFrame = 0
      resize()
      render(performance.now())
    }

    const resizeObserver = new ResizeObserver(refresh)
    resizeObserver.observe(canvas)
    reducedMotion.addEventListener("change", refresh)
    refresh()

    return () => {
      stopped = true
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      reducedMotion.removeEventListener("change", refresh)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
    }
  }, [palette])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 size-full opacity-80 [image-rendering:pixelated]"
      aria-hidden="true"
    />
  )
}

function Badge({
  type = "pill-color",
  color = "violet",
  size = "md",
  className,
  children,
  ...props
}: BadgeProps) {
  const badgeColor = BADGE_COLORS[color]

  return (
    <span
      {...props}
      data-color={color}
      data-type={type}
      className={cn(
        "relative isolate flex size-max items-center overflow-hidden whitespace-nowrap rounded-full shadow-[0_1px_2px_rgb(0_0_0_/_0.16)] ring-1 ring-inset dark:shadow-none",
        badgeColor.root,
        sizeStyles[size],
        className
      )}
    >
      <BadgeSparkField palette={badgeColor.palette} />
      <span className="relative z-10 [text-shadow:0_1px_0_rgb(0_0_0_/_0.22)]">
        {children}
      </span>
    </span>
  )
}

export { BADGE_COLORS, Badge }
export type { BadgeColor, BadgeProps, BadgeSize, BadgeType }
