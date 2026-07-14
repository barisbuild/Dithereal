import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="grid min-h-[70dvh] place-items-center px-4 py-20 text-center">
      <div>
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Component not found.</h1>
        <p className="mt-3 text-muted-foreground">The pixel field ends here.</p>
        <Button asChild className="mt-7">
          <Link href="/#components">Browse components</Link>
        </Button>
      </div>
    </main>
  )
}
