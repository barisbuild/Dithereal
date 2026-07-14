import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator"
import type { LoadingIndicatorPalette } from "@/components/application/loading-indicator/loading-indicator"

export const LineSpinnerDemo = ({
  palette = "violet",
}: {
  palette?: LoadingIndicatorPalette
}) => {
  return <LoadingIndicator type="line-spinner" size="xl" palette={palette} />
}
