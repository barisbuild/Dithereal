"use client"

import * as React from "react"

import { DITHER_PALETTES, type DitherPalette } from "@/lib/dither-palettes"
import { cn } from "@/lib/utils"

type ContentDividerColor = DitherPalette

type ContentDividerProps = Omit<React.ComponentProps<"div">, "color"> & {
  label?: React.ReactNode
  color?: ContentDividerColor
}

type DividerSide = "left" | "right"

const CONTENT_DIVIDER_PALETTES = DITHER_PALETTES
const RENDER_HEIGHT = 10

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
  uniform float u_side;
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
    float towardLabel = u_side < 0.5 ? uv.x : 1.0 - uv.x;
    float axis = abs(uv.y - 0.5);

    float broadFlow = noise(vec2(
      towardLabel * 6.2 - u_time * 0.18,
      uv.y * 3.4 + u_time * 0.09
    ));
    float fineFlow = noise(vec2(
      towardLabel * 17.0 + u_time * 0.25,
      uv.y * 8.0 - u_time * 0.15
    ));
    float curl = 0.5 + 0.5 * sin(
      towardLabel * 19.0
      - u_time * 1.15
      + broadFlow * 5.2
      + (uv.y - 0.5) * 8.0
    );
    float pulse = 0.5 + 0.5 * sin(towardLabel * 12.0 - u_time * 0.72);

    float halfWidth = 0.07
      + broadFlow * 0.12
      + curl * 0.045
      + towardLabel * 0.035;
    float beam = 1.0 - smoothstep(halfWidth, halfWidth + 0.085, axis);
    float core = 1.0 - smoothstep(0.018, 0.09, axis);
    float field = clamp(
      broadFlow * 0.42
      + fineFlow * 0.25
      + curl * 0.23
      + pulse * 0.1
      + towardLabel * 0.08,
      0.0,
      0.999
    );

    float threshold = bayer4(point);
    float scaled = field * 3.0;
    float level = min(3.0, floor(scaled) + step(threshold, fract(scaled)));
    float ordered = step(threshold, clamp(field * 0.92 + core * 0.24, 0.0, 1.0));
    vec3 ditherColor = paletteColor(level);
    vec3 color = mix(u_deep, ditherColor, 0.5 + field * 0.38);
    color = mix(color, u_warm, ordered * core * 0.14);
    color *= 0.86 + core * 0.17;
    float alpha = beam * mix(0.3, 0.92, ordered);

    float spark = 0.0;
    float sparkHeat = 0.0;
    float direction = u_side < 0.5 ? 1.0 : -1.0;

    for (int index = 0; index < 14; index++) {
      float id = float(index);
      float seed = hash(vec2(id * 2.71 + 0.3, id * 7.13 + 4.9));
      float life = fract(u_time * mix(0.12, 0.21, seed) + seed);
      float travel = -0.04 + (1.1 * (1.0 - pow(1.0 - life, 1.65)));
      float x = u_side < 0.5 ? travel : 1.0 - travel;
      float y = 0.5
        + (hash(vec2(id * 4.9, 3.7)) - 0.5) * 0.48
        + sin(life * TAU + seed * 11.0) * 0.045;
      vec2 position = vec2(x * u_resolution.x, y * u_resolution.y);
      float radius = mix(0.42, 0.88, hash(vec2(id, 8.2)));
      float head = pixelBox(point, position, radius);
      float trailOne = pixelBox(
        point,
        position - vec2(direction * 2.0, (seed - 0.5) * 0.7),
        radius * 0.7
      );
      float trailTwo = pixelBox(
        point,
        position - vec2(direction * 4.0, (0.5 - seed) * 0.6),
        radius * 0.46
      );
      float enter = smoothstep(0.0, 0.11, life);
      float dissolve = 1.0 - smoothstep(0.68, 0.98, life);
      float flicker = mix(
        0.48,
        1.0,
        step(0.52, hash(vec2(id * 1.8, floor(u_time * 7.0))))
      );
      float strength = (head + trailOne * 0.42 + trailTwo * 0.18)
        * enter
        * dissolve
        * flicker;

      spark = min(1.0, spark + strength);
      sparkHeat = max(sparkHeat, head * enter * dissolve * (1.0 - life));
    }

    vec3 sparkColor = mix(u_warm, u_hot, sparkHeat * 0.9);
    color = mix(color, sparkColor, spark);
    alpha = max(alpha, spark * 0.95);

    float outerFade = smoothstep(0.0, 0.055, towardLabel);
    alpha *= outerFade;

    if (alpha < 0.025) discard;
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

function liftColor(
  color: readonly [number, number, number],
  amount: number
) {
  return color.map((channel) => channel * (1 - amount) + amount) as [
    number,
    number,
    number,
  ]
}

function DitherDividerSegment({
  side,
  color,
}: {
  side: DividerSide
  color: ContentDividerColor
}) {
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
    const sideLocation = gl.getUniformLocation(program, "u_side")
    const deepLocation = gl.getUniformLocation(program, "u_deep")
    const bodyLocation = gl.getUniformLocation(program, "u_body")
    const warmLocation = gl.getUniformLocation(program, "u_warm")
    const hotLocation = gl.getUniformLocation(program, "u_hot")
    if (
      !buffer ||
      positionLocation < 0 ||
      !resolutionLocation ||
      !timeLocation ||
      !sideLocation ||
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
    gl.uniform1f(sideLocation, side === "left" ? 0 : 1)

    const source = CONTENT_DIVIDER_PALETTES[color]
    const setThemeColors = () => {
      const isDark = document.documentElement.classList.contains("dark")
      const deep = source.deep
      const body = source.body
      const warm = source.warm
      const hot = isDark ? liftColor(source.hot, 0.1) : source.hot

      gl.uniform3f(deepLocation, ...deep)
      gl.uniform3f(bodyLocation, ...body)
      gl.uniform3f(warmLocation, ...warm)
      gl.uniform3f(hotLocation, ...hot)
    }

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.round(bounds.width * 0.58))
      canvas.height = RENDER_HEIGHT
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let animationFrame = 0
    let lastPaint = -Infinity
    let stopped = false

    const render = (now: number) => {
      if (stopped) return

      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
      gl.uniform1f(timeLocation, reducedMotion.matches ? 2.8 : now / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    const animate = (now: number) => {
      if (stopped || reducedMotion.matches) return

      if (document.visibilityState === "visible" && now - lastPaint >= 1000 / 18) {
        render(now)
        lastPaint = now
      }
      animationFrame = window.requestAnimationFrame(animate)
    }

    const refresh = () => {
      resize()
      setThemeColors()
      render(performance.now())
    }

    const updateMotion = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      animationFrame = 0
      refresh()
      if (!reducedMotion.matches) {
        animationFrame = window.requestAnimationFrame(animate)
      }
    }

    const resizeObserver = new ResizeObserver(refresh)
    const themeObserver = new MutationObserver(refresh)
    resizeObserver.observe(canvas)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    reducedMotion.addEventListener("change", updateMotion)
    refresh()

    if (!reducedMotion.matches) {
      animationFrame = window.requestAnimationFrame(animate)
    }

    return () => {
      stopped = true
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      themeObserver.disconnect()
      reducedMotion.removeEventListener("change", updateMotion)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
    }
  }, [color, side])

  return (
    <canvas
      ref={canvasRef}
      className="h-4 min-w-0 flex-1 [image-rendering:pixelated]"
      aria-hidden="true"
    />
  )
}

function ContentDivider({
  label = "Notifications",
  color = "violet",
  className,
  ...props
}: ContentDividerProps) {
  const ariaLabel = typeof label === "string" ? label : "Content divider"

  return (
    <div
      {...props}
      role="separator"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      className={cn("flex w-full flex-col gap-1.5", className)}
    >
      <span className="text-center text-[11px] font-medium leading-none tracking-[0.01em] text-neutral-500 dark:text-neutral-300">
        {label}
      </span>
      <span className="flex w-full items-center" aria-hidden="true">
        <DitherDividerSegment side="left" color={color} />
        <DitherDividerSegment side="right" color={color} />
      </span>
    </div>
  )
}

export { CONTENT_DIVIDER_PALETTES, ContentDivider }
export type { ContentDividerColor, ContentDividerProps }
