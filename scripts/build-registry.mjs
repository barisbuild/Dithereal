import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourcePath = path.join(root, "registry.json")
const outputDir = path.join(root, "public", "r")

const source = JSON.parse(await readFile(sourcePath, "utf8"))

const importReplacements = new Map([
  [
    'from "@/components/base/badges/badges"',
    'from "@/registry/dithereal/dither-badge"',
  ],
  [
    'from "@/lib/dither-palettes"',
    'from "@/registry/dithereal/dither-palettes"',
  ],
])

function registryPath(file) {
  const target = file.target?.replace(/^@(ui|lib|components|hooks)\//, "")
  return `registry/dithereal/${target ?? path.basename(file.path)}`
}

function rewriteImports(content) {
  let next = content
  for (const [from, to] of importReplacements) {
    next = next.replaceAll(from, to)
  }
  return next
}

async function buildFile(file) {
  const content = rewriteImports(
    await readFile(path.join(root, file.path), "utf8")
  )

  return {
    path: registryPath(file),
    type: file.type,
    target: file.target,
    content,
  }
}

await mkdir(outputDir, { recursive: true })

const builtItems = []

for (const item of source.items) {
  const files = await Promise.all(item.files.map(buildFile))
  const built = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    ...item,
    files,
  }

  builtItems.push(built)
  await writeFile(
    path.join(outputDir, `${item.name}.json`),
    `${JSON.stringify(built, null, 2)}\n`
  )
}

const catalog = {
  $schema: source.$schema,
  name: source.name,
  homepage: source.homepage,
  items: builtItems.map((item) => {
    const catalogItem = { ...item }
    delete catalogItem.$schema
    catalogItem.files = item.files.map((file) => {
      const catalogFile = { ...file }
      delete catalogFile.content
      return catalogFile
    })
    return catalogItem
  }),
}

await writeFile(
  path.join(outputDir, "registry.json"),
  `${JSON.stringify(catalog, null, 2)}\n`
)

console.log(`Built ${builtItems.length} registry items in public/r`)
