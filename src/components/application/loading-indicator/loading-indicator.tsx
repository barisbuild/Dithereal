"use client"

import * as React from "react"

import { DITHER_PALETTES, type DitherPalette } from "@/lib/dither-palettes"
import { cn } from "@/lib/utils"

type LoadingIndicatorType = "line-spinner"
type LoadingIndicatorSize = "sm" | "md" | "lg" | "xl"
type LoadingIndicatorPalette = DitherPalette

type LoadingIndicatorProps = React.ComponentProps<"div"> & {
  type?: LoadingIndicatorType
  size?: LoadingIndicatorSize
  palette?: LoadingIndicatorPalette
  label?: string
}

const LOADING_INDICATOR_PALETTES = DITHER_PALETTES
const RENDER_SIZE = 24

const styles: Record<
  LoadingIndicatorSize,
  { root: string; label: string; spinner: string }
> = {
  sm: {
    root: "gap-4",
    label: "text-sm font-medium",
    spinner: "size-8",
  },
  md: {
    root: "gap-4",
    label: "text-sm font-medium",
    spinner: "size-12",
  },
  lg: {
    root: "gap-4",
    label: "text-lg font-medium",
    spinner: "size-14",
  },
  xl: {
    root: "gap-5",
    label: "text-lg font-medium",
    spinner: "size-16",
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

  vec2 ringPoint(float phase, float radius) {
    float angle = phase * TAU;
    return vec2(cos(angle), sin(angle)) * radius;
  }

  float pixelDust(vec2 point, vec2 position, float size) {
    vec2 delta = abs(point - position);
    return 1.0 - step(size, max(delta.x, delta.y));
  }

  vec3 paletteColor(float level) {
    if (level < 0.5) return u_deep;
    if (level < 1.5) return u_body;
    if (level < 2.5) return u_warm;
    return u_hot;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / max(u_resolution, vec2(1.0));
    vec2 point = (uv - 0.5) * 2.0;
    point.x *= u_resolution.x / max(u_resolution.y, 1.0);

    float radius = 0.72;
    float halfWidth = 0.155;
    float edge = 0.035;
    float phase = fract(u_time * 0.24);
    float angle = fract(atan(point.y, point.x) / TAU + 1.0);
    float relativeAngle = fract(angle - phase + 1.0);
    float arcLength = 0.61;

    float ring = 1.0 - smoothstep(
      halfWidth - edge,
      halfWidth + edge,
      abs(length(point) - radius)
    );
    float arcWindow = 1.0 - smoothstep(arcLength - 0.012, arcLength + 0.004, relativeAngle);
    float arc = ring * arcWindow;

    vec2 startPoint = ringPoint(phase, radius);
    vec2 endPoint = ringPoint(fract(phase + arcLength), radius);
    float startCap = 1.0 - smoothstep(
      halfWidth - edge,
      halfWidth + edge,
      distance(point, startPoint)
    );
    float endCap = 1.0 - smoothstep(
      halfWidth - edge,
      halfWidth + edge,
      distance(point, endPoint)
    );
    float arcMask = max(arc, max(startCap, endCap));

    float broadFlow = noise(vec2(angle * 9.0 - u_time * 0.12, length(point) * 6.5 + u_time * 0.07));
    float fineFlow = noise(vec2(point.x * 7.5 + u_time * 0.1, point.y * 7.5 - u_time * 0.08));
    float rings = 0.5 + 0.5 * sin(length(point) * 25.0 - angle * 29.0 - u_time * 0.72);
    float field = clamp(broadFlow * 0.5 + fineFlow * 0.27 + rings * 0.23, 0.0, 0.999);

    float threshold = bayer4(gl_FragCoord.xy);
    float scaled = field * 3.0;
    float level = min(3.0, floor(scaled) + step(threshold, fract(scaled)));
    vec3 color = paletteColor(level);

    float dust = 0.0;
    float dustHeat = 0.0;

    for (int index = 0; index < 24; index++) {
      float id = float(index);
      float seed = hash(vec2(id * 3.17 + 0.4, id * 7.31 + 1.8));
      float life = fract(u_time * (0.31 + seed * 0.13) + seed);
      float angularLag = 0.018 + life * (0.16 + seed * 0.16);
      float radialDrift = (seed - 0.5) * 0.26
        + sin(life * TAU + seed * 8.0) * 0.05
        + life * (seed - 0.46) * 0.16;
      vec2 dustPosition = ringPoint(fract(phase - angularLag), radius + radialDrift);
      float dustSize = mix(0.075, 0.028, life) * (0.82 + seed * 0.35);
      float particle = pixelDust(point, dustPosition, dustSize);
      float fade = 1.0 - smoothstep(0.62, 1.0, life);
      float flicker = mix(
        0.38,
        1.0,
        step(0.3, hash(vec2(floor(u_time * 8.0) + id * 2.4, seed * 19.0)))
      );
      float strength = particle * fade * flicker;
      dust = min(1.0, dust + strength);
      dustHeat = max(dustHeat, strength * (1.0 - life));
    }

    vec3 dustColor = mix(u_warm, u_hot, dustHeat);
    color = mix(color, dustColor, dust);
    float edgeDither = mix(0.7, 1.0, step(threshold, field));
    float alpha = max(arcMask * edgeDither, dust);

    if (alpha < 0.02) discard;
    gl_FragColor = vec4(color, alpha);
  }
`

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
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

function DitherLineSpinner({ palette }: { palette: LoadingIndicatorPalette }) {
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

    const render = (now: number) => {
      if (stopped) return
      gl.viewport(0, 0, RENDER_SIZE, RENDER_SIZE)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(resolutionLocation, RENDER_SIZE, RENDER_SIZE)
      gl.uniform1f(timeLocation, reducedMotion.matches ? 0.72 : now / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      if (!reducedMotion.matches) {
        animationFrame = window.requestAnimationFrame(render)
      }
    }

    const updateMotion = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      animationFrame = 0
      render(performance.now())
    }

    reducedMotion.addEventListener("change", updateMotion)
    render(performance.now())

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
      className="block size-full [image-rendering:pixelated]"
      aria-hidden="true"
    />
  )
}

function LoadingIndicator({
  type = "line-spinner",
  size = "sm",
  palette = "violet",
  label,
  className,
  ...props
}: LoadingIndicatorProps) {
  return (
    <div
      {...props}
      role="status"
      aria-label={label ?? "Loading"}
      className={cn(
        "flex flex-col items-center justify-center",
        styles[size].root,
        className
      )}
    >
      {type === "line-spinner" && (
        <span className={cn("block shrink-0", styles[size].spinner)}>
          <DitherLineSpinner palette={palette} />
        </span>
      )}

      {label ? (
        <span className={cn("text-neutral-600 dark:text-neutral-400", styles[size].label)}>
          {label}
        </span>
      ) : (
        <span className="sr-only">Loading...</span>
      )}
    </div>
  )
}

export { LOADING_INDICATOR_PALETTES, LoadingIndicator }
export type {
  LoadingIndicatorPalette,
  LoadingIndicatorProps,
  LoadingIndicatorSize,
  LoadingIndicatorType,
}
