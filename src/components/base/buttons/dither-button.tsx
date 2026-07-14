"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"

import { Badge } from "@/components/base/badges/badges"
import type {
  BadgeColor,
  BadgeSize,
} from "@/components/base/badges/badges"
import { cn } from "@/lib/utils"

type DitherButtonProps = Omit<
  React.ComponentProps<"button">,
  "color" | "children"
> & {
  color?: BadgeColor
  size?: BadgeSize
  children?: React.ReactNode
}

const iconSizes: Record<BadgeSize, number> = {
  sm: 12,
  md: 14,
  lg: 15,
}

function DitherButton({
  color = "violet",
  size = "lg",
  type = "button",
  children = "Button",
  className,
  disabled,
  ...props
}: DitherButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      data-slot="dither-button"
      className={cn(
        "group inline-flex rounded-full outline-none transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-45 motion-reduce:transition-none dark:focus-visible:ring-neutral-50 dark:focus-visible:ring-offset-neutral-900",
        className
      )}
    >
      <Badge
        type="pill-color"
        color={color}
        size={size}
        className="pointer-events-none transition-[filter] duration-150 ease-out group-hover:brightness-110 group-active:brightness-95 motion-reduce:transition-none"
      >
        <span className="flex items-center gap-1.5">
          <span>{children}</span>
          <Sparkles size={iconSizes[size]} strokeWidth={1.8} aria-hidden="true" />
        </span>
      </Badge>
    </button>
  )
}

export { DitherButton }
export type { DitherButtonProps }
