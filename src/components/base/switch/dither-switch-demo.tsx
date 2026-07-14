import {
  DitherSwitch,
  type DitherSwitchPalette,
} from "@/components/base/switch/dither-switch"

export function DitherSwitchDemo({
  palette = "violet",
}: {
  palette?: DitherSwitchPalette
}) {
  return (
    <DitherSwitch
      defaultSelected
      palette={palette}
      aria-label="Dither switch"
    />
  )
}
