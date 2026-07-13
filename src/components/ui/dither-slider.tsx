"use client"

import * as React from "react"
import {
  Label,
  Slider,
  SliderFill,
  SliderOutput,
  SliderThumb,
  SliderTrack,
  type SliderProps,
} from "react-aria-components"

type ColorTuple = readonly [number, number, number]

type DitherSliderPaletteDefinition = {
  deep: ColorTuple
  body: ColorTuple
  warm: ColorTuple
  hot: ColorTuple
  swatch: string
}

const DITHER_SLIDER_PALETTES = {
  ember: {
    deep: [0.25, 0.015, 0.05],
    body: [0.68, 0.08, 0.17],
    warm: [1, 0.13, 0.22],
    hot: [1, 0.32, 0.4],
    swatch: "#d42b43",
  },
  blue: {
    deep: [0.015, 0.08, 0.15],
    body: [0.05, 0.37, 0.62],
    warm: [0.13, 0.65, 1],
    hot: [0.32, 0.82, 1],
    swatch: "#258bd1",
  },
  aqua: {
    deep: [0.015, 0.11, 0.1],
    body: [0.04, 0.42, 0.39],
    warm: [0.1, 0.78, 0.68],
    hot: [0.34, 0.95, 0.8],
    swatch: "#24aa9a",
  },
  violet: {
    deep: [0.1, 0.025, 0.17],
    body: [0.39, 0.11, 0.58],
    warm: [0.7, 0.27, 0.96],
    hot: [0.86, 0.49, 1],
    swatch: "#9349ca",
  },
} satisfies Record<string, DitherSliderPaletteDefinition>

type DitherSliderPalette = keyof typeof DITHER_SLIDER_PALETTES

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

  float spark(vec2 uv, vec2 position, float radius) {
    vec2 delta = uv - position;
    delta.x *= u_resolution.x / max(u_resolution.y, 1.0);
    float core = smoothstep(radius, 0.0, length(delta));
    float horizontal = smoothstep(radius * 2.4, 0.0, abs(delta.x))
      * smoothstep(radius * 0.11, 0.0, abs(delta.y));
    float vertical = smoothstep(radius * 1.5, 0.0, abs(delta.y))
      * smoothstep(radius * 0.11, 0.0, abs(delta.x));
    return max(core, max(horizontal, vertical) * 0.55);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / max(u_resolution, vec2(1.0));
    float time = u_time;

    float broadFlow = noise(vec2(uv.x * 7.0 - time * 0.28, uv.y * 2.8 + time * 0.12));
    float fineFlow = noise(vec2(uv.x * 17.0 + time * 0.35, uv.y * 5.0 - time * 0.18));
    float wave = 0.5 + 0.5 * sin(uv.x * 25.0 - time * 2.2 + broadFlow * 5.0);
    float field = broadFlow * 0.52 + fineFlow * 0.22 + wave * 0.26;

    float sparkCycle = floor(time * 0.48);
    float sparkPhase = fract(time * 0.48);
    float sparkPulse = pow(smoothstep(0.24, 0.0, abs(sparkPhase - 0.22)), 3.0);
    vec2 sparkPosition = vec2(
      0.12 + hash(vec2(sparkCycle, 2.7)) * 0.76,
      0.35 + hash(vec2(sparkCycle, 8.1)) * 0.3
    );
    float sparks = spark(uv, sparkPosition, 0.055) * sparkPulse;

    float threshold = bayer4(gl_FragCoord.xy / 1.5);
    float quantized = floor(clamp(field, 0.0, 0.999) * 4.0 + threshold) / 4.0;
    float ordered = step(threshold, clamp(field * 0.96 + sparks * 0.34, 0.0, 1.0));
    float microDither = step(
      bayer4(gl_FragCoord.xy),
      clamp(fineFlow * 0.72 + wave * 0.28, 0.0, 1.0)
    );

    vec3 color = mix(u_deep, u_body, quantized);
    color = mix(color, u_warm, ordered * 0.48);
    color = mix(color, u_warm, microDither * 0.1);
    color = mix(color, u_hot, clamp(sparks * 0.82, 0.0, 0.82));

    float edgeShade = smoothstep(0.0, 0.22, uv.y) * smoothstep(0.0, 0.22, 1.0 - uv.y);
    color *= 0.9 + edgeShade * 0.24;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
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

function DitherSliderField({ palette }: { palette: DitherSliderPalette }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
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

    const colors = DITHER_SLIDER_PALETTES[palette]
    gl.uniform3f(deepLocation, ...colors.deep)
    gl.uniform3f(bodyLocation, ...colors.body)
    gl.uniform3f(warmLocation, ...colors.warm)
    gl.uniform3f(hotLocation, ...colors.hot)

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let animationFrame = 0
    let stopped = false

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(bounds.width * pixelRatio))
      const height = Math.max(1, Math.round(bounds.height * pixelRatio))

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
    }

    const render = (now: number) => {
      if (stopped) return
      resize()
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
      gl.uniform1f(timeLocation, reducedMotion.matches ? 0.6 : now / 1000)
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

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    reducedMotion.addEventListener("change", updateMotion)
    render(performance.now())

    return () => {
      stopped = true
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      reducedMotion.removeEventListener("change", updateMotion)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
    }
  }, [palette])

  return <canvas ref={canvasRef} className="block size-full" aria-hidden="true" />
}

type DitherSliderProps = Omit<SliderProps<number>, "children"> & {
  label?: string
  palette?: DitherSliderPalette
}

function DitherSlider({
  label = "Grain",
  defaultValue = 62,
  minValue = 0,
  maxValue = 100,
  step = 1,
  palette = "ember",
  ...props
}: DitherSliderProps) {
  return (
    <Slider
      {...props}
      defaultValue={defaultValue}
      minValue={minValue}
      maxValue={maxValue}
      step={step}
      className="group w-full max-w-[320px] select-none data-[disabled]:opacity-45"
    >
      <div className="flex items-baseline justify-between gap-4 px-0.5">
        <Label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </Label>
        <SliderOutput className="font-mono text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
          {({ state }) => String(state.values[0]).padStart(2, "0")}
        </SliderOutput>
      </div>

      <SliderTrack className="relative mt-3 h-14 w-full touch-none">
        <div
          className="absolute inset-x-0 top-1/2 h-[18px] -translate-y-1/2 overflow-hidden rounded-full"
          style={{
            backgroundColor: "var(--dither-slider-track-bg)",
            backgroundImage:
              "radial-gradient(circle, var(--dither-slider-track-dot) 0 0.8px, transparent 0.9px)",
            backgroundSize: "4px 4px",
            boxShadow: "inset 0 0 0 1px var(--dither-slider-track-edge)",
          }}
        />
        <SliderFill
          className="overflow-hidden rounded-full"
          style={{
            top: "50%",
            height: 18,
            transform: "translateY(-50%)",
            backgroundColor: DITHER_SLIDER_PALETTES[palette].swatch,
            boxShadow: "inset 0 0 0 1px var(--dither-slider-fill-edge)",
          }}
        >
          <DitherSliderField palette={palette} />
        </SliderFill>
        <SliderThumb className="absolute top-1/2 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-neutral-950 data-[focus-visible]:ring-offset-2 data-[focus-visible]:ring-offset-white dark:data-[focus-visible]:ring-neutral-50 dark:data-[focus-visible]:ring-offset-neutral-900" />
      </SliderTrack>

      <div className="flex justify-between px-0.5 font-mono text-[9px] tabular-nums text-neutral-400 dark:text-neutral-600">
        <span>{minValue}</span>
        <span>{maxValue}</span>
      </div>
    </Slider>
  )
}

export { DITHER_SLIDER_PALETTES, DitherSlider }
export type { DitherSliderPalette, DitherSliderProps }
