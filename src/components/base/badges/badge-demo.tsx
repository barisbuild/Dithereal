import { Badge } from "@/components/base/badges/badges"
import type { BadgeColor } from "@/components/base/badges/badges"

export function BadgeDemo({ color = "violet" }: { color?: BadgeColor }) {
  return (
    <div className="flex items-center gap-3">
      <Badge type="pill-color" color={color} size="sm">
        Label
      </Badge>
      <Badge type="pill-color" color={color} size="md">
        Label
      </Badge>
      <Badge type="pill-color" color={color} size="lg">
        Label
      </Badge>
    </div>
  )
}
