import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRight, ChevronLeft } from "lucide-react"

import { ComponentPreview } from "@/components/component-preview"
import { CopyButton } from "@/components/copy-button"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { COMPONENTS, getComponent } from "@/lib/component-catalog"

export function generateStaticParams() {
  return COMPONENTS.map((component) => ({ slug: component.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const component = getComponent(slug)

  if (!component) return {}

  return {
    title: component.title,
    description: component.description,
  }
}

export default async function ComponentPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const component = getComponent(slug)

  if (!component) notFound()

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-24 pt-8 sm:px-6 md:pb-32 md:pt-12 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/#components">
          <ChevronLeft /> All components
        </Link>
      </Button>

      <header className="max-w-3xl pb-10 pt-14 md:pb-14 md:pt-20">
        <p className="mb-4 text-sm text-muted-foreground">{component.category}</p>
        <h1 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl md:text-6xl">
          {component.title}
        </h1>
        <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
          {component.description}
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <ComponentPreview slug={component.slug} size="detail" />
      </div>

      <Tabs defaultValue="code" className="mt-12 md:mt-16">
        <TabsList variant="line" aria-label="Component details">
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="source">Source</TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="pt-7">
          <div className="overflow-hidden rounded-2xl border border-border bg-neutral-950 text-neutral-100">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
              <span className="font-mono text-xs text-neutral-400">example.tsx</span>
              <CopyButton value={component.example} />
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6 sm:p-6">
              <code>{component.example}</code>
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="api" className="pt-7">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-muted/45 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Prop</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Default</th>
                    <th className="px-5 py-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {component.props.map((prop) => (
                    <tr key={prop.name} className="border-t border-border">
                      <td className="px-5 py-4 font-mono text-xs text-foreground">
                        {prop.name}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                        {prop.type}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                        {prop.defaultValue}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {prop.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="source" className="pt-7">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-lg font-semibold tracking-[-0.025em]">Own the component code</h2>
            <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-muted-foreground">
              Components are kept as source files, so shader values, palettes, and motion can be adapted directly to your product.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild variant="outline">
                <a
                  href={`https://github.com/barisbuild/Dithereal/blob/main/${component.sourcePath}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View source <ArrowUpRight />
                </a>
              </Button>
              <code className="rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                {component.sourcePath}
              </code>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {component.references?.length ? (
        <section className="mt-12 border-t border-border pt-7 md:mt-16">
          <h2 className="text-sm font-semibold tracking-[-0.02em]">References</h2>
          <div className="mt-3 flex flex-col gap-2">
            {component.references.map((reference) => (
              <p key={reference.href} className="text-sm leading-relaxed text-muted-foreground">
                <a
                  className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-muted-foreground"
                  href={reference.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {reference.label}
                </a>
                {" "}- {reference.description}
              </p>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
