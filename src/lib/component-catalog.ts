export type ComponentSlug =
  | "dither-agents"
  | "dither-slider"
  | "dither-loader"
  | "dither-checkbox"
  | "dither-button"
  | "dither-switch"
  | "dither-badge"
  | "dither-content-divider"
  | "dither-card"
  | "ditherize"

export type ComponentProp = {
  name: string
  type: string
  defaultValue: string
  description: string
}

export type ComponentReference = {
  label: string
  href: string
  description: string
}

export type ComponentCatalogItem = {
  slug: ComponentSlug
  title: string
  shortDescription: string
  description: string
  category: "Display" | "Input" | "Feedback" | "Layout" | "Effect"
  sourcePath: string
  example: string
  props: ComponentProp[]
  references?: ComponentReference[]
}

export const COMPONENTS: ComponentCatalogItem[] = [
  {
    slug: "dither-agents",
    title: "Dither Agents",
    shortDescription: "Pixel-built identities with living internal motion.",
    description:
      "A compact animated identity for agents, tasks, and system states. Each seed produces a stable visual while status controls its motion.",
    category: "Display",
    sourcePath: "src/components/ui/dither-orb-avatar.tsx",
    example: `import { DitherOrbAvatar } from "@/components/ui/dither-orb-avatar"

export function Demo() {
  return (
    <DitherOrbAvatar
      seed="violet-agent"
      size={64}
      palette="violet"
      status="running"
    />
  )
}`,
    props: [
      { name: "seed", type: "string", defaultValue: "required", description: "Creates a stable, unique pixel field." },
      { name: "size", type: "number", defaultValue: "32", description: "Rendered size in pixels." },
      { name: "palette", type: "DitherPalette | auto", defaultValue: "violet", description: "Controls the four-color dither ramp." },
      { name: "status", type: "DitherOrbStatus", defaultValue: "idle", description: "Adjusts the motion profile." },
    ],
  },
  {
    slug: "dither-slider",
    title: "Dither slider",
    shortDescription: "A tactile range input with a moving pixel field.",
    description:
      "A React Aria slider whose filled track is rendered as a smooth dither field with restrained sparks and four palette options.",
    category: "Input",
    sourcePath: "src/components/ui/dither-slider.tsx",
    example: `import { DitherSlider } from "@/components/ui/dither-slider"

export function Demo() {
  return <DitherSlider label="Grain" palette="violet" />
}`,
    props: [
      { name: "label", type: "string", defaultValue: "Grain", description: "Accessible and visible slider label." },
      { name: "palette", type: "DitherPalette", defaultValue: "violet", description: "Sets the dither color ramp." },
      { name: "defaultValue", type: "number", defaultValue: "62", description: "Initial uncontrolled value." },
    ],
    references: [
      {
        label: "React Aria Slider",
        href: "https://react-aria.adobe.com/Slider",
        description: "Accessible slider behavior and interaction primitives.",
      },
    ],
  },
  {
    slug: "dither-loader",
    title: "Dither loader",
    shortDescription: "A WebGL spinner with a granular light trail.",
    description:
      "A larger loading indicator designed to preserve dither detail at small interface scales without losing a smooth silhouette.",
    category: "Feedback",
    sourcePath: "src/components/application/loading-indicator/loading-indicator.tsx",
    example: `import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator"

export function Demo() {
  return (
    <LoadingIndicator
      type="line-spinner"
      size="xl"
      palette="violet"
    />
  )
}`,
    props: [
      { name: "type", type: "line-spinner", defaultValue: "line-spinner", description: "Selects the loading treatment." },
      { name: "size", type: "LoadingIndicatorSize", defaultValue: "md", description: "Controls the rendered dimensions." },
      { name: "palette", type: "DitherPalette", defaultValue: "violet", description: "Sets the animated color ramp." },
    ],
  },
  {
    slug: "dither-checkbox",
    title: "Dither checkbox",
    shortDescription: "Selection that grows outward from its center.",
    description:
      "An interactive checkbox with a center-origin WebGL reveal. The selected state fills through ordered pixels instead of a flat color transition.",
    category: "Input",
    sourcePath: "src/components/base/checkbox/checkbox.tsx",
    example: `import { Checkbox } from "@/components/base/checkbox/checkbox"

export function Demo() {
  return <Checkbox size="sm" palette="violet" aria-label="Select item" />
}`,
    props: [
      { name: "isSelected", type: "boolean", defaultValue: "false", description: "Controls the selected state." },
      { name: "dither", type: "boolean", defaultValue: "true", description: "Enables the WebGL fill." },
      { name: "palette", type: "DitherPalette", defaultValue: "violet", description: "Sets the fill palette." },
    ],
    references: [
      {
        label: "React Aria Checkbox",
        href: "https://react-aria.adobe.com/Checkbox",
        description: "Accessible checkbox state and interaction primitives.",
      },
    ],
  },
  {
    slug: "dither-button",
    title: "Dither button",
    shortDescription: "A focused action with restrained inner sparks.",
    description:
      "A primary action treatment that keeps the dither energy inside the button surface while preserving readable contrast in both themes.",
    category: "Input",
    sourcePath: "src/components/base/buttons/dither-button.tsx",
    example: `import { DitherButton } from "@/components/base/buttons/dither-button"

export function Demo() {
  return <DitherButton color="violet">Button</DitherButton>
}`,
    props: [
      { name: "color", type: "BadgeColor", defaultValue: "violet", description: "Sets the button dither palette." },
      { name: "size", type: "sm | md | lg", defaultValue: "md", description: "Controls button height and spacing." },
      { name: "children", type: "ReactNode", defaultValue: "required", description: "Button content." },
    ],
  },
  {
    slug: "dither-switch",
    title: "Dither switch",
    shortDescription: "A two-state control with directional pixel flow.",
    description:
      "A high-frame-rate switch that moves a dither field with the thumb and releases a short directional wake during state changes.",
    category: "Input",
    sourcePath: "src/components/base/switch/dither-switch.tsx",
    example: `import { DitherSwitch } from "@/components/base/switch/dither-switch"

export function Demo() {
  return <DitherSwitch defaultSelected palette="violet" aria-label="Dither switch" />
}`,
    props: [
      { name: "isSelected", type: "boolean", defaultValue: "undefined", description: "Controls the current state." },
      { name: "defaultSelected", type: "boolean", defaultValue: "false", description: "Sets the initial uncontrolled state." },
      { name: "palette", type: "DitherPalette", defaultValue: "violet", description: "Sets the active color field." },
    ],
    references: [
      {
        label: "React Aria Switch",
        href: "https://react-aria.adobe.com/Switch",
        description: "Accessible switch state and interaction primitives.",
      },
    ],
  },
  {
    slug: "dither-badge",
    title: "Dither badge",
    shortDescription: "A compact label with a quiet particle interior.",
    description:
      "A pill badge that adds a small dither field without compromising the clarity or density expected from status labels.",
    category: "Display",
    sourcePath: "src/components/base/badges/badges.tsx",
    example: `import { Badge } from "@/components/base/badges/badges"

export function Demo() {
  return <Badge type="pill-color" color="violet" size="md">Label</Badge>
}`,
    props: [
      { name: "type", type: "pill-color", defaultValue: "pill-color", description: "Selects the rendered badge style." },
      { name: "color", type: "BadgeColor", defaultValue: "violet", description: "Sets the dither palette." },
      { name: "size", type: "sm | md | lg", defaultValue: "md", description: "Controls text and pill dimensions." },
    ],
  },
  {
    slug: "dither-content-divider",
    title: "Dither content divider",
    shortDescription: "A label held between two pixel-built lines.",
    description:
      "A content separator whose lines are generated from moving dither pixels, giving quiet structure to otherwise static layouts.",
    category: "Layout",
    sourcePath: "src/components/base/dividers/content-divider.tsx",
    example: `import { ContentDivider } from "@/components/base/dividers/content-divider"

export function Demo() {
  return <ContentDivider label="Notifications" color="violet" />
}`,
    props: [
      { name: "label", type: "ReactNode", defaultValue: "undefined", description: "Content placed between the two lines." },
      { name: "color", type: "DitherPalette", defaultValue: "violet", description: "Sets the pixel line palette." },
      { name: "className", type: "string", defaultValue: "undefined", description: "Extends the outer layout." },
    ],
  },
  {
    slug: "dither-card",
    title: "Dither card",
    shortDescription: "A transparent surface with edge-bound pixel energy.",
    description:
      "A content-safe card treatment that keeps its WebGL texture close to the perimeter, leaving the center open for real product content.",
    category: "Layout",
    sourcePath: "src/components/base/cards/dither-card.tsx",
    example: `import { DitherCard } from "@/components/base/cards/dither-card"

export function Demo() {
  return <DitherCard palette="violet">Your content</DitherCard>
}`,
    props: [
      { name: "palette", type: "DitherPalette", defaultValue: "violet", description: "Sets the perimeter effect palette." },
      { name: "children", type: "ReactNode", defaultValue: "undefined", description: "Card content rendered over the effect." },
      { name: "className", type: "string", defaultValue: "undefined", description: "Extends the card layout." },
    ],
  },
  {
    slug: "ditherize",
    title: "Ditherize",
    shortDescription: "Turn an image into a living ordered-dither field.",
    description:
      "An image treatment that combines ordered dithering with a WebGL particle layer. Dot size, spacing, angle, and palette remain adjustable per image.",
    category: "Effect",
    sourcePath: "src/components/ui/ditherize.tsx",
    example: `import { Ditherize } from "@/components/ui/ditherize"

export function Demo() {
  return (
    <Ditherize
      src="/image.png"
      dotSize={3}
      spacing={5}
      angle={45}
      palette="violet"
    />
  )
}`,
    props: [
      { name: "src", type: "string", defaultValue: "required", description: "Source image URL." },
      { name: "dotSize", type: "number", defaultValue: "5", description: "Size of each ordered-dither mark." },
      { name: "spacing", type: "number", defaultValue: "9", description: "Distance between sample points." },
      { name: "angle", type: "number", defaultValue: "45", description: "Rotation of the sampling grid in degrees." },
      { name: "palette", type: "DitherPalette", defaultValue: "violet", description: "Sets the image and particle color ramp." },
    ],
  },
]

export function getComponent(slug: string) {
  return COMPONENTS.find((component) => component.slug === slug)
}
