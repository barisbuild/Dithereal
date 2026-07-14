import assert from "node:assert/strict"
import test from "node:test"

import {
  buildShadcnCommand,
  parseArgs,
  resolveRequestedNames,
} from "../src/cli.mjs"

const items = [
  { name: "dither-checkbox" },
  { name: "dither-switch" },
  { name: "ditherize" },
]

test("parses add options in any position", () => {
  const options = parseArgs([
    "add",
    "dither-checkbox",
    "--yes",
    "--overwrite",
    "--cwd",
    "/tmp/project",
  ])

  assert.equal(options.command, "add")
  assert.deepEqual(options.names, ["dither-checkbox"])
  assert.equal(options.yes, true)
  assert.equal(options.overwrite, true)
  assert.equal(options.cwd, "/tmp/project")
})

test("dithereal alias resolves every registry item", () => {
  assert.deepEqual(resolveRequestedNames(["dithereal"], items), [
    "dither-checkbox",
    "dither-switch",
    "ditherize",
  ])
})

test("rejects unknown component names", () => {
  assert.throws(
    () => resolveRequestedNames(["missing"], items),
    /unknown component: missing/
  )
})

test("builds the npm shadcn delegation command", () => {
  const result = buildShadcnCommand(
    "/tmp/project",
    ["https://dithereal.dev/r/dither-checkbox.json"],
    { runner: "npm", yes: true, overwrite: true }
  )

  assert.deepEqual(result, {
    command: "npx",
    args: [
      "--yes",
      "shadcn@latest",
      "add",
      "https://dithereal.dev/r/dither-checkbox.json",
      "--cwd",
      "/tmp/project",
      "--yes",
      "--overwrite",
    ],
  })
})
