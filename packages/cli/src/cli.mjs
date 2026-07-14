import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"

export const VERSION = "0.1.0"
export const DEFAULT_REGISTRY = "https://dithereal.dev"

const HELP = `
Dithereal

Install animated WebGL components into a shadcn project.

Usage:
  dithereal add <component...> [options]
  dithereal list [options]

Examples:
  npx dithereal add dithereal
  npx dithereal add dither-checkbox
  npx dithereal add dither-slider dither-switch
  npx dithereal list

Options:
  --cwd <path>       project directory
  --registry <url>   registry base URL
  -y, --yes          skip confirmation prompts
  --overwrite        overwrite existing component files
  -n, --dry-run      print the delegated command without writing
  -h, --help         show help
  -v, --version      print the version

Requires a shadcn project with components.json.
Website: https://dithereal.dev
`

export function parseArgs(argv, env = process.env) {
  const options = {
    command: undefined,
    names: [],
    cwd: process.cwd(),
    registry: env.DITHEREAL_REGISTRY || DEFAULT_REGISTRY,
    yes: false,
    overwrite: false,
    dryRun: false,
    help: false,
    version: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (argument === "-h" || argument === "--help") {
      options.help = true
    } else if (argument === "-v" || argument === "--version") {
      options.version = true
    } else if (argument === "-y" || argument === "--yes") {
      options.yes = true
    } else if (argument === "-n" || argument === "--dry-run") {
      options.dryRun = true
    } else if (argument === "--overwrite") {
      options.overwrite = true
    } else if (argument === "--cwd" || argument === "--dir") {
      const value = argv[index + 1]
      if (!value) throw new Error(`${argument} requires a path`)
      options.cwd = path.resolve(value)
      index += 1
    } else if (argument === "--registry") {
      const value = argv[index + 1]
      if (!value) throw new Error("--registry requires a URL")
      options.registry = value
      index += 1
    } else if (argument.startsWith("-")) {
      throw new Error(`unknown option: ${argument}`)
    } else if (!options.command) {
      options.command = argument
    } else {
      options.names.push(argument)
    }
  }

  options.registry = options.registry.replace(/\/+$/, "")
  return options
}

export function resolveRequestedNames(requested, items) {
  const available = new Set(items.map((item) => item.name))
  const wantsAll = requested.some(
    (name) => name === "dithereal" || name === "all"
  )

  if (wantsAll) return items.map((item) => item.name)

  const unique = [...new Set(requested)]
  const missing = unique.filter((name) => !available.has(name))

  if (missing.length > 0) {
    throw new Error(
      `unknown component${missing.length > 1 ? "s" : ""}: ${missing.join(
        ", "
      )}\nAvailable: ${[...available].join(", ")}`
    )
  }

  return unique
}

export function findProject(start) {
  let current = path.resolve(start)

  while (true) {
    if (existsSync(path.join(current, "components.json"))) return current
    const parent = path.dirname(current)
    if (parent === current) return null
    current = parent
  }
}

function detectRunner(root) {
  if (existsSync(path.join(root, "bun.lockb")) || existsSync(path.join(root, "bun.lock"))) {
    return "bun"
  }
  if (existsSync(path.join(root, "pnpm-lock.yaml"))) return "pnpm"
  if (existsSync(path.join(root, "yarn.lock"))) return "yarn"
  return "npm"
}

export function buildShadcnCommand(root, urls, options = {}) {
  const args = ["shadcn@latest", "add", ...urls, "--cwd", root]
  if (options.yes) args.push("--yes")
  if (options.overwrite) args.push("--overwrite")

  switch (options.runner || detectRunner(root)) {
    case "pnpm":
      return { command: "pnpm", args: ["dlx", ...args] }
    case "yarn":
      return { command: "yarn", args: ["dlx", ...args] }
    case "bun":
      return { command: "bunx", args }
    default:
      return { command: "npx", args: ["--yes", ...args] }
  }
}

async function fetchCatalog(registry) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(`${registry}/r/registry.json`, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`registry responded with ${response.status}`)
    }

    const catalog = await response.json()
    if (!catalog || !Array.isArray(catalog.items)) {
      throw new Error("registry returned an invalid catalog")
    }
    return catalog
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("registry request timed out")
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function formatCommand(command, args) {
  return [command, ...args]
    .map((part) => (/\s/.test(part) ? JSON.stringify(part) : part))
    .join(" ")
}

function runChild(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: "inherit",
    })

    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`shadcn exited with code ${code ?? "unknown"}`))
    })
  })
}

function printList(items) {
  const groups = new Map()

  for (const item of items) {
    const category = item.categories?.[0] || "other"
    const group = groups.get(category) || []
    group.push(item)
    groups.set(category, group)
  }

  process.stdout.write("\nDithereal components\n")
  for (const [category, group] of groups) {
    process.stdout.write(`\n${category}\n`)
    for (const item of group) {
      process.stdout.write(`  ${item.name.padEnd(26)} ${item.description || ""}\n`)
    }
  }
  process.stdout.write("\nInstall all: npx dithereal add dithereal\n")
}

export async function run(argv) {
  const options = parseArgs(argv)

  if (options.version) {
    process.stdout.write(`${VERSION}\n`)
    return
  }

  if (options.help || !options.command) {
    process.stdout.write(HELP)
    return
  }

  if (options.command !== "add" && options.command !== "list") {
    throw new Error(`unknown command: ${options.command}`)
  }

  const catalog = await fetchCatalog(options.registry)

  if (options.command === "list") {
    printList(catalog.items)
    return
  }

  if (options.names.length === 0) {
    throw new Error(
      "add requires a component name. Run `npx dithereal list` or use `npx dithereal add dithereal`."
    )
  }

  const root = findProject(options.cwd)
  if (!root) {
    throw new Error(
      "components.json was not found. Run `npx shadcn@latest init` first."
    )
  }

  const names = resolveRequestedNames(options.names, catalog.items)
  const urls = names.map((name) => `${options.registry}/r/${name}.json`)
  const delegated = buildShadcnCommand(root, urls, {
    yes: options.yes || !process.stdin.isTTY,
    overwrite: options.overwrite,
  })

  process.stdout.write(`\nDithereal\nInstalling ${names.join(", ")}\n\n`)

  if (options.dryRun) {
    process.stdout.write(`${formatCommand(delegated.command, delegated.args)}\n`)
    return
  }

  await runChild(delegated.command, delegated.args, root)
  process.stdout.write(`\nInstalled ${names.length} component${names.length === 1 ? "" : "s"}.\n`)
}
