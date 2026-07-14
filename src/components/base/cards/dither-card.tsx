"use client"

import * as React from "react"

import { DITHER_PALETTES, type DitherPalette } from "@/lib/dither-palettes"
import { cn } from "@/lib/utils"

type DitherCardPalette = DitherPalette

type DitherCardProps = React.ComponentProps<"div"> & {
  palette?: DitherCardPalette
}

const DITHER_CARD_PALETTES = DITHER_PALETTES
const RENDER_WIDTH = 168
const RENDER_HEIGHT = 108
const CARD_FPS = 45

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
  uniform float u_dark;
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

  vec2 edgeOrigin(float edge, float along) {
    if (edge < 0.5) return vec2(0.0, along);
    if (edge < 1.5) return vec2(1.0, along);
    if (edge < 2.5) return vec2(along, 0.0);
    return vec2(along, 1.0);
  }

  void main() {
    vec2 point = gl_FragCoord.xy;
    vec2 uv = point / max(u_resolution, vec2(1.0));
    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);

    float edgeDistance = min(
      min(uv.x, 1.0 - uv.x) * aspect.x,
      min(uv.y, 1.0 - uv.y)
    );

    float broadFlow = noise(vec2(
      uv.x * 6.2 - u_time * 0.11,
      uv.y * 3.1 + u_time * 0.065
    ));
    float fineFlow = noise(vec2(
      uv.x * 18.0 + u_time * 0.16,
      uv.y * 7.0 - u_time * 0.11
    ));
    float horizontalWave = 0.5 + 0.5 * sin(
      uv.x * 20.0
      - u_time * 0.82
      + broadFlow * 4.2
    );
    float perimeterFalloff = 1.0 - smoothstep(0.006, 0.075, edgeDistance);
    float edgeCluster = perimeterFalloff * 0.16;
    float layeredFlow = broadFlow * 0.54
      + fineFlow * 0.18
      + horizontalWave * 0.28;
    float field = clamp(
      edgeCluster
      * 0.51,
      0.0,
      0.999
    );

    float threshold = bayer4(point);
    float coverage = step(threshold, field) * step(0.002, field);
    float scaled = field * 3.0;
    float level = min(3.0, floor(scaled) + step(threshold, fract(scaled)));

    vec3 lightColor = mix(u_deep, u_body, 0.74);
    lightColor = mix(lightColor, u_warm, level / 9.0);
    vec3 darkColor = mix(u_body, u_warm, 0.26 + level / 5.2);
    darkColor = mix(darkColor, u_hot, step(2.5, level) * 0.24);
    vec3 color = mix(lightColor, darkColor, u_dark);
    color = mix(
      color,
      u_hot,
      smoothstep(0.7, 0.94, layeredFlow) * mix(0.025, 0.06, u_dark)
    );
    float lightAlpha = 0.22;
    float darkAlpha = 0.14;
    float alpha = coverage * mix(lightAlpha, darkAlpha, u_dark);

    float spark = 0.0;
    float sparkHeat = 0.0;
    for (int index = 0; index < 24; index++) {
      float id = float(index);
      float edge = mod(id, 4.0);
      float seed = hash(vec2(id * 2.73 + 0.4, id * 6.17 + 3.1));
      float life = fract(u_time * mix(0.11, 0.19, seed) + seed);
      float along = mix(0.04, 0.96, hash(vec2(id * 3.4, 5.9)));
      vec2 origin = edgeOrigin(edge, along);
      vec2 destination = vec2(0.5);
      vec2 position = mix(origin, destination, life * mix(0.08, 0.2, seed));

      vec2 tangent = normalize(vec2(
        destination.y - origin.y,
        origin.x - destination.x
      ));
      position += tangent * sin(life * TAU + seed * 11.0) * 0.035;
      position += vec2(
        hash(vec2(id, 7.2)) - 0.5,
        hash(vec2(id, 9.8)) - 0.5
      ) * life * 0.032;

      float particle = pixelBox(
        point,
        position * u_resolution,
        mix(0.46, 0.82, hash(vec2(id * 1.7, 4.8)))
      );
      float fade = smoothstep(0.0, 0.08, life)
        * (1.0 - smoothstep(0.62, 1.0, life));
      float twinkle = mix(
        0.52,
        1.0,
        step(0.54, hash(vec2(id, floor(u_time * 7.0))))
      );
      float visible = particle * fade * twinkle;
      spark = min(1.0, spark + visible);
      sparkHeat = max(sparkHeat, visible * (1.0 - life));
    }

    vec3 sparkLight = mix(u_body, u_warm, sparkHeat);
    vec3 sparkDark = mix(u_warm, u_hot, sparkHeat);
    vec3 sparkColor = mix(sparkLight, sparkDark, u_dark);
    color = mix(color, sparkColor, spark);
    alpha = max(alpha, spark * 0.74);

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
    console.error("Dither card shader compile error:", gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  return shader
}

function DitherCardField({ palette }: { palette: DitherCardPalette }) {
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
    if (!gl) {
      console.error("Dither card could not create a WebGL context")
      return
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!vertexShader || !fragmentShader) return

    const program = gl.createProgram()
    if (!program) return

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Dither card shader link error:", gl.getProgramInfoLog(program))
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      return
    }

    const buffer = gl.createBuffer()
    const positionLocation = gl.getAttribLocation(program, "a_position")
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution")
    const timeLocation = gl.getUniformLocation(program, "u_time")
    const darkLocation = gl.getUniformLocation(program, "u_dark")
    const deepLocation = gl.getUniformLocation(program, "u_deep")
    const bodyLocation = gl.getUniformLocation(program, "u_body")
    const warmLocation = gl.getUniformLocation(program, "u_warm")
    const hotLocation = gl.getUniformLocation(program, "u_hot")
    if (
      !buffer ||
      positionLocation < 0 ||
      !resolutionLocation ||
      !timeLocation ||
      !darkLocation ||
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

    const colors = DITHER_CARD_PALETTES[palette]
    gl.uniform3f(deepLocation, ...colors.deep)
    gl.uniform3f(bodyLocation, ...colors.body)
    gl.uniform3f(warmLocation, ...colors.warm)
    gl.uniform3f(hotLocation, ...colors.hot)

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let animationFrame = 0
    let lastPaint = -Infinity
    let stopped = false

    const render = (now: number) => {
      gl.viewport(0, 0, RENDER_WIDTH, RENDER_HEIGHT)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(resolutionLocation, RENDER_WIDTH, RENDER_HEIGHT)
      gl.uniform1f(timeLocation, reducedMotion.matches ? 3.1 : now / 1000)
      gl.uniform1f(
        darkLocation,
        document.documentElement.classList.contains("dark") ? 1 : 0
      )
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    const animate = (now: number) => {
      if (stopped) return

      if (
        document.visibilityState === "visible" &&
        now - lastPaint >= 1000 / CARD_FPS
      ) {
        render(now)
        lastPaint = now
      }

      animationFrame = window.requestAnimationFrame(animate)
    }

    const updateMotion = () => render(performance.now())

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
      width={RENDER_WIDTH}
      height={RENDER_HEIGHT}
      className="pointer-events-none absolute inset-0 size-full [image-rendering:pixelated]"
      aria-hidden="true"
    />
  )
}

function DitherCard({
  palette = "violet",
  className,
  style,
  ...props
}: DitherCardProps) {
  return (
    <div
      {...props}
      className={cn(
        "relative aspect-[1.55] w-full max-w-[320px] overflow-hidden rounded-2xl border border-neutral-200/75 bg-transparent dark:border-neutral-800/80",
        className
      )}
      style={style}
    >
      <DitherCardField palette={palette} />
    </div>
  )
}

export { DITHER_CARD_PALETTES, DitherCard }
export type { DitherCardPalette, DitherCardProps }
