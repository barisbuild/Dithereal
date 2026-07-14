# Dithereal

Dithered WebGL components for React.

```bash
npx dithereal add dithereal
```

Install a single component:

```bash
npx dithereal add dither-checkbox
```

The registry is served from `https://dithereal.dev/r` and the CLI delegates installation to shadcn.

A small working gallery for original, low-noise interface components.

## Dither orb avatar

`DitherOrbAvatar` combines a noise-driven polar field with 4x4 Bayer ordered dithering. It renders through one low-resolution Canvas2D surface and scales with crisp pixels.

```tsx
import { DitherOrbAvatar } from "@/components/ui/dither-orb-avatar"

<DitherOrbAvatar
  seed="project-path"
  size={32}
  palette="ember"
  status="running"
/>
```

The same seed always produces the same field. Available palettes are `blue`, `violet`, `ember`, `aqua`, `moss`, and `auto`. Animation speed follows `idle`, `armed`, `running`, `review`, `complete`, or `attention`, and automatically respects reduced-motion preferences.

## Run the gallery

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
