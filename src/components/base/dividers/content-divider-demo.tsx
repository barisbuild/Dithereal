import {
  ContentDivider,
  type ContentDividerColor,
} from "@/components/base/dividers/content-divider"

export function ContentDividerDemo({
  color = "violet",
}: {
  color?: ContentDividerColor
}) {
  return (
    <ContentDivider
      label="Notifications"
      color={color}
      className="w-full max-w-[340px]"
    />
  )
}
