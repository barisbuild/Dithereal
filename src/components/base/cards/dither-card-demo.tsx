import {
  DitherCard,
  type DitherCardPalette,
} from "@/components/base/cards/dither-card"

export function DitherCardDemo({
  palette = "violet",
}: {
  palette?: DitherCardPalette
}) {
  return (
    <DitherCard
      palette={palette}
      role="img"
      aria-label="Empty dither card"
    />
  )
}
