import type { BadgeColor } from "@/components/base/badges/badges"
import { DitherButton } from "@/components/base/buttons/dither-button"

export function DitherButtonDemo({
  color = "violet",
}: {
  color?: BadgeColor
}) {
  return (
    <DitherButton color={color} size="lg">
      Button
    </DitherButton>
  )
}
