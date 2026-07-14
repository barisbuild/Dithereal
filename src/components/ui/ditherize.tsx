"use client"

import * as React from "react"

import { DITHER_PALETTES, type DitherPalette } from "@/lib/dither-palettes"
import { cn } from "@/lib/utils"

type DitherizeShape = "circle" | "square"
type DitherizeObjectFit = "cover" | "contain" | "fill"
type DitherizePalette = DitherPalette

type DitherizeProps = Omit<React.ComponentProps<"div">, "children"> & {
  src: string
  width?: number
  height?: number
  dotSize?: number
  spacing?: number
  shape?: DitherizeShape
  angle?: number
  threshold?: number
  palette?: DitherizePalette
  objectFit?: DitherizeObjectFit
}

type DitherSample = {
  x: number
  y: number
  energy: number
  alpha: number
  radius: number
  seed: number
  dynamic: boolean
}

const DITHERIZE_PALETTES = DITHER_PALETTES
const TAU = Math.PI * 2

const VERTEX_SHADER = `
  precision highp float;

  attribute vec2 a_position;
  attribute float a_seed;
  attribute float a_energy;
  attribute float a_size;
  attribute float a_kind;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_dpr;
  uniform float u_motion;

  varying float v_alpha;
  varying float v_heat;
  varying float v_density;

  const float TAU = 6.28318530718;

  void main() {
    float dust = step(0.5, a_kind);
    float speed = mix(0.16, 0.29, a_seed);
    float life = fract(u_time * speed + a_seed + a_kind * 0.19);
    float envelope = smoothstep(0.0, 0.1, life)
      * (1.0 - smoothstep(0.56, 1.0, life));
    float direction = a_seed * TAU + a_kind * 2.17;
    vec2 drift = vec2(cos(direction), sin(direction));
    drift *= life * mix(5.0, 13.0, a_seed) * dust * u_motion;
    drift.y -= sin(life * TAU + a_seed * 9.0) * 1.6 * dust * u_motion;

    float pulse = 0.5 + 0.5 * sin(u_time * 2.4 + a_seed * 17.0);
    vec2 position = a_position + drift;
    vec2 clip = position / u_resolution * 2.0 - 1.0;
    clip.y *= -1.0;
    gl_Position = vec4(clip, 0.0, 1.0);

    float coreSize = a_size * mix(0.82, 1.12, pulse);
    float dustSize = mix(1.0, 2.0, a_seed);
    gl_PointSize = max(1.0, mix(coreSize, dustSize, dust) * u_dpr);

    v_alpha = mix(0.52 + pulse * 0.38, envelope * 0.78, dust);
    v_heat = mix(pulse * 0.55 + a_energy * 0.35, 1.0 - life, dust);
    v_density = mix(0.72 + a_energy * 0.24, envelope, dust);
  }
`

const FRAGMENT_SHADER = `
  precision mediump float;

  uniform float u_shape;
  uniform float u_dark;
  uniform vec3 u_deep;
  uniform vec3 u_body;
  uniform vec3 u_warm;
  uniform vec3 u_hot;

  varying float v_alpha;
  varying float v_heat;
  varying float v_density;

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

  void main() {
    vec2 local = gl_PointCoord - 0.5;
    if (u_shape < 0.5 && length(local) > 0.5) discard;

    float ordered = step(bayer4(gl_FragCoord.xy), v_density);
    if (ordered < 0.5 || v_alpha < 0.02) discard;

    vec3 lightColor = mix(u_deep, u_body, 0.62 + v_heat * 0.24);
    vec3 darkColor = mix(u_warm, u_hot, v_heat * 0.72);
    vec3 color = mix(lightColor, darkColor, u_dark);
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), v_alpha);
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
    console.error("Ditherize shader compile error:", gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  return shader
}

function hash2D(x: number, y: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123
  return value - Math.floor(value)
}

function bayer4(x: number, y: number) {
  const matrix = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ]

  return matrix[((y % 4) + 4) % 4][((x % 4) + 4) % 4] / 16
}

function mixColor(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  amount: number
) {
  return from.map((channel, index) =>
    Math.round((channel + (to[index] - channel) * amount) * 255)
  ) as [number, number, number]
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  objectFit: DitherizeObjectFit
) {
  if (objectFit === "fill") {
    context.drawImage(image, 0, 0, width, height)
    return
  }

  const scale =
    objectFit === "contain"
      ? Math.min(width / image.naturalWidth, height / image.naturalHeight)
      : Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale

  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  )
}

function Ditherize({
  src,
  width = 320,
  height = 240,
  dotSize = 5,
  spacing = 9,
  shape = "square",
  angle = 45,
  threshold = 0.06,
  palette = "violet",
  objectFit = "cover",
  className,
  style,
  ...props
}: DitherizeProps) {
  const baseCanvasRef = React.useRef<HTMLCanvasElement>(null)
  const glCanvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const baseCanvas = baseCanvasRef.current
    const glCanvas = glCanvasRef.current
    if (!baseCanvas || !glCanvas) return

    const baseContext = baseCanvas.getContext("2d")
    const gl = glCanvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    })
    if (!baseContext || !gl) return

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!vertexShader || !fragmentShader) return

    const program = gl.createProgram()
    if (!program) return

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Ditherize shader link error:", gl.getProgramInfoLog(program))
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      return
    }

    const buffer = gl.createBuffer()
    const positionLocation = gl.getAttribLocation(program, "a_position")
    const seedLocation = gl.getAttribLocation(program, "a_seed")
    const energyLocation = gl.getAttribLocation(program, "a_energy")
    const sizeLocation = gl.getAttribLocation(program, "a_size")
    const kindLocation = gl.getAttribLocation(program, "a_kind")
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution")
    const timeLocation = gl.getUniformLocation(program, "u_time")
    const dprLocation = gl.getUniformLocation(program, "u_dpr")
    const motionLocation = gl.getUniformLocation(program, "u_motion")
    const shapeLocation = gl.getUniformLocation(program, "u_shape")
    const darkLocation = gl.getUniformLocation(program, "u_dark")
    const deepLocation = gl.getUniformLocation(program, "u_deep")
    const bodyLocation = gl.getUniformLocation(program, "u_body")
    const warmLocation = gl.getUniformLocation(program, "u_warm")
    const hotLocation = gl.getUniformLocation(program, "u_hot")

    if (
      !buffer ||
      positionLocation < 0 ||
      seedLocation < 0 ||
      energyLocation < 0 ||
      sizeLocation < 0 ||
      kindLocation < 0 ||
      !resolutionLocation ||
      !timeLocation ||
      !dprLocation ||
      !motionLocation ||
      !shapeLocation ||
      !darkLocation ||
      !deepLocation ||
      !bodyLocation ||
      !warmLocation ||
      !hotLocation
    )
      return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    baseCanvas.width = Math.max(1, Math.floor(width * dpr))
    baseCanvas.height = Math.max(1, Math.floor(height * dpr))
    glCanvas.width = Math.max(1, Math.floor(width * dpr))
    glCanvas.height = Math.max(1, Math.floor(height * dpr))
    baseContext.setTransform(dpr, 0, 0, dpr, 0, 0)

    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    const stride = 7 * Float32Array.BYTES_PER_ELEMENT
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0)
    gl.enableVertexAttribArray(seedLocation)
    gl.vertexAttribPointer(
      seedLocation,
      1,
      gl.FLOAT,
      false,
      stride,
      2 * Float32Array.BYTES_PER_ELEMENT
    )
    gl.enableVertexAttribArray(energyLocation)
    gl.vertexAttribPointer(
      energyLocation,
      1,
      gl.FLOAT,
      false,
      stride,
      3 * Float32Array.BYTES_PER_ELEMENT
    )
    gl.enableVertexAttribArray(sizeLocation)
    gl.vertexAttribPointer(
      sizeLocation,
      1,
      gl.FLOAT,
      false,
      stride,
      4 * Float32Array.BYTES_PER_ELEMENT
    )
    gl.enableVertexAttribArray(kindLocation)
    gl.vertexAttribPointer(
      kindLocation,
      1,
      gl.FLOAT,
      false,
      stride,
      5 * Float32Array.BYTES_PER_ELEMENT
    )

    const colors = DITHERIZE_PALETTES[palette]
    gl.uniform3f(deepLocation, ...colors.deep)
    gl.uniform3f(bodyLocation, ...colors.body)
    gl.uniform3f(warmLocation, ...colors.warm)
    gl.uniform3f(hotLocation, ...colors.hot)
    gl.uniform1f(shapeLocation, shape === "circle" ? 0 : 1)
    gl.uniform1f(dprLocation, dpr)

    const image = new Image()
    image.crossOrigin = "anonymous"
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let animationFrame = 0
    let vertexCount = 0
    let samples: DitherSample[] = []
    let stopped = false

    const isDark = () => document.documentElement.classList.contains("dark")

    const drawBase = () => {
      baseContext.clearRect(0, 0, width, height)
      const dark = isDark()
      const from = dark ? colors.body : colors.deep
      const to = dark ? colors.warm : colors.body

      for (const sample of samples) {
        if (sample.dynamic) continue

        const color = mixColor(from, to, 0.22 + sample.energy * 0.68)
        baseContext.globalAlpha =
          sample.alpha * (dark ? 0.54 : 0.68) * (0.48 + sample.energy * 0.52)
        baseContext.fillStyle = `rgb(${color[0]} ${color[1]} ${color[2]})`

        if (shape === "circle") {
          baseContext.beginPath()
          baseContext.arc(sample.x, sample.y, sample.radius, 0, TAU)
          baseContext.fill()
        } else {
          const size = sample.radius * 2
          baseContext.fillRect(sample.x - sample.radius, sample.y - sample.radius, size, size)
        }
      }

      baseContext.globalAlpha = 1
    }

    const render = (now: number) => {
      gl.viewport(0, 0, glCanvas.width, glCanvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(resolutionLocation, width, height)
      gl.uniform1f(timeLocation, reducedMotion.matches ? 2.8 : now / 1000)
      gl.uniform1f(motionLocation, reducedMotion.matches ? 0 : 1)
      gl.uniform1f(darkLocation, isDark() ? 1 : 0)
      gl.drawArrays(gl.POINTS, 0, vertexCount)
    }

    const animate = (now: number) => {
      if (stopped) return
      if (document.visibilityState === "visible") render(now)
      animationFrame = window.requestAnimationFrame(animate)
    }

    const compute = () => {
      const sourceCanvas = document.createElement("canvas")
      sourceCanvas.width = width
      sourceCanvas.height = height
      const sourceContext = sourceCanvas.getContext("2d", {
        willReadFrequently: true,
      })
      if (!sourceContext) return

      drawImageCover(sourceContext, image, width, height, objectFit)
      const imageData = sourceContext.getImageData(0, 0, width, height)
      const data = imageData.data
      const radians = (angle * Math.PI) / 180
      const cosine = Math.cos(radians)
      const sine = Math.sin(radians)
      const extent = Math.hypot(width, height)
      const nextSamples: DitherSample[] = []
      const vertices: number[] = []
      let gridY = 0

      for (let y = -extent; y <= extent; y += spacing) {
        let gridX = 0
        for (let x = -extent; x <= extent; x += spacing) {
          const sampleX = width / 2 + x * cosine - y * sine
          const sampleY = height / 2 + x * sine + y * cosine
          gridX += 1
          if (sampleX < 0 || sampleY < 0 || sampleX >= width || sampleY >= height)
            continue

          const pixelX = Math.min(width - 1, Math.max(0, Math.round(sampleX)))
          const pixelY = Math.min(height - 1, Math.max(0, Math.round(sampleY)))
          const index = (pixelY * width + pixelX) * 4
          const red = data[index]
          const green = data[index + 1]
          const blue = data[index + 2]
          const alpha = data[index + 3] / 255
          const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
          const darkness = 1 - luminance
          const orderedDarkness = darkness + (0.5 - bayer4(gridX, gridY)) * 0.1
          if (alpha < 0.02 || orderedDarkness <= threshold) continue

          const energy = Math.min(
            1,
            Math.max(0, (orderedDarkness - threshold) / (1 - threshold))
          )
          const seed = hash2D(gridX, gridY)
          const dynamic = energy > 0.12 && seed < 0.075 + energy * 0.035
          const radius = Math.max(0.65, (dotSize * (0.3 + Math.sqrt(energy) * 0.7)) / 2)
          const sample = {
            x: sampleX,
            y: sampleY,
            energy,
            alpha,
            radius,
            seed,
            dynamic,
          }
          nextSamples.push(sample)

          if (dynamic) {
            const size = radius * 2
            for (let kind = 0; kind < 3; kind += 1) {
              vertices.push(sampleX, sampleY, seed, energy, size, kind, 0)
            }
          }
        }
        gridY += 1
      }

      samples = nextSamples
      vertexCount = vertices.length / 7
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
      drawBase()
      render(performance.now())
    }

    const handleThemeChange = () => {
      drawBase()
      render(performance.now())
    }
    const themeObserver = new MutationObserver(handleThemeChange)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    image.onload = () => {
      if (stopped) return
      compute()
      animationFrame = window.requestAnimationFrame(animate)
    }
    image.onerror = () => {
      console.error("Ditherize could not load image:", src)
    }
    image.src = src

    const handleMotionChange = () => render(performance.now())
    reducedMotion.addEventListener("change", handleMotionChange)

    return () => {
      stopped = true
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      reducedMotion.removeEventListener("change", handleMotionChange)
      themeObserver.disconnect()
      image.onload = null
      image.onerror = null
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
    }
  }, [
    angle,
    dotSize,
    height,
    objectFit,
    palette,
    shape,
    spacing,
    src,
    threshold,
    width,
  ])

  const accessibilityLabel =
    props["aria-label"] ?? "Ditherized rendering of source image"

  return (
    <div
      {...props}
      aria-label={accessibilityLabel}
      role="img"
      className={cn("relative isolate overflow-hidden bg-transparent", className)}
      style={{ width, height, ...style }}
    >
      <canvas
        ref={baseCanvasRef}
        className="pointer-events-none absolute inset-0 size-full"
        aria-hidden="true"
      />
      <canvas
        ref={glCanvasRef}
        className="pointer-events-none absolute inset-0 size-full"
        aria-hidden="true"
      />
    </div>
  )
}

export { DITHERIZE_PALETTES, Ditherize }
export type {
  DitherizeObjectFit,
  DitherizePalette,
  DitherizeProps,
  DitherizeShape,
}
