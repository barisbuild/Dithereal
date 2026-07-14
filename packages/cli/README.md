# Dithereal CLI

Install Dithereal WebGL components into an existing shadcn project.

```bash
npx dithereal add dithereal
```

Install a single component:

```bash
npx dithereal add dither-checkbox
```

List available components:

```bash
npx dithereal list
```

The CLI resolves components from `https://dithereal.dev/r` and delegates file placement, aliases, and dependency installation to the official shadcn CLI.

Your project must contain a `components.json` file. If it does not, initialize shadcn first:

```bash
npx shadcn@latest init
```
