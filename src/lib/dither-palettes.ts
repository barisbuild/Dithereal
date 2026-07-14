type DitherColorTuple = readonly [number, number, number]

type DitherPaletteDefinition = {
  deep: DitherColorTuple
  body: DitherColorTuple
  warm: DitherColorTuple
  hot: DitherColorTuple
  swatch: string
}

const DITHER_PALETTES = {
  violet: {
    deep: [0.1, 0.025, 0.17],
    body: [0.39, 0.11, 0.58],
    warm: [0.7, 0.27, 0.96],
    hot: [0.86, 0.49, 1],
    swatch: "#9349ca",
  },
  aqua: {
    deep: [0.015, 0.11, 0.1],
    body: [0.04, 0.42, 0.39],
    warm: [0.1, 0.78, 0.68],
    hot: [0.34, 0.95, 0.8],
    swatch: "#24aa9a",
  },
  blue: {
    deep: [0.015, 0.08, 0.15],
    body: [0.05, 0.37, 0.62],
    warm: [0.13, 0.65, 1],
    hot: [0.32, 0.82, 1],
    swatch: "#258bd1",
  },
  ember: {
    deep: [0.25, 0.015, 0.05],
    body: [0.68, 0.08, 0.17],
    warm: [1, 0.13, 0.22],
    hot: [1, 0.32, 0.4],
    swatch: "#d42b43",
  },
} satisfies Record<string, DitherPaletteDefinition>

type DitherPalette = keyof typeof DITHER_PALETTES

export { DITHER_PALETTES }
export type { DitherPalette, DitherPaletteDefinition }
