import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { ComponentPreview } from "@/components/component-preview"
import { CopyButton } from "@/components/copy-button"
import { Button } from "@/components/ui/button"
import {
  COMPONENTS,
  type ComponentCatalogItem,
  type ComponentSlug,
} from "@/lib/component-catalog"

const COLLECTION_ORDER: ComponentSlug[] = [
  "dither-agents",
  "dither-checkbox",
  "dither-loader",
  "dither-slider",
  "dither-button",
  "dither-switch",
  "dither-badge",
  "dither-card",
  "dither-content-divider",
  "ditherize",
]

function ShowcaseCard({ component }: { component: ComponentCatalogItem }) {
  const installCommand = `npx dithereal add ${component.slug}`

  return (
    <article
      id={component.slug}
      className="group flex h-[600px] min-w-0 scroll-mt-24 flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors duration-300 hover:border-foreground/25 motion-reduce:transition-none"
    >
      <header className="flex items-start justify-between gap-5 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="min-w-0">
          <p className="mb-1.5 text-xs text-muted-foreground">{component.category}</p>
          <h3 className="text-base font-semibold tracking-[-0.025em]">
            {component.title}
          </h3>
          <p className="mt-1.5 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
            {component.shortDescription}
          </p>
        </div>
        <div className="-mr-2 -mt-2 flex shrink-0 items-center gap-1">
          <CopyButton value={installCommand} />
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={`Open ${component.title}`}
          >
            <Link href={`/components/${component.slug}`}>
              <ArrowUpRight className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Button>
        </div>
      </header>

      <ComponentPreview slug={component.slug} />
    </article>
  )
}

export function ComponentGallery() {
  const collection = COLLECTION_ORDER.map(
    (slug) => COMPONENTS.find((component) => component.slug === slug)!
  )

  return (
    <main className="overflow-hidden">
      <section className="mx-auto max-w-[1440px] px-4 pb-14 pt-16 sm:px-6 md:pb-20 md:pt-24 lg:px-8">
        <div className="max-w-[900px]">
          <h1 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            dithereal
          </h1>
          <p className="mt-7 max-w-[760px] text-lg leading-relaxed text-foreground/88 sm:text-xl">
            Ten React components on one compact dither system: animated controls, agent identities, feedback states, and image treatments.
          </p>
          <p className="mt-5 max-w-[820px] text-base leading-relaxed text-muted-foreground sm:text-lg">
            Ordered-pixel fields stay legible in light and dark, with center-out reveals, directional trails, palette controls, dust-like sparks, and reduced-motion fallbacks.
          </p>
          <div className="mt-8 flex w-fit max-w-full items-center gap-2 rounded-xl border border-border bg-card p-1.5 pl-4">
            <code className="overflow-x-auto whitespace-nowrap font-mono text-xs text-muted-foreground sm:text-sm">
              npx dithereal add dithereal
            </code>
            <CopyButton value="npx dithereal add dithereal" />
          </div>
        </div>
      </section>

      <section
        id="components"
        className="mx-auto max-w-[1440px] scroll-mt-24 px-4 pb-24 sm:px-6 md:pb-32 lg:px-8"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {collection.map((component) => (
            <ShowcaseCard key={component.slug} component={component} />
          ))}
        </div>
      </section>
    </main>
  )
}
