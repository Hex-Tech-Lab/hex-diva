# Hex-Diva Component Integration Guide

**Deprecation notice:** this guide previously documented a homegrown
`src/components/design-system/` component library (`Button`, `Card`, and the
`@/styles/design-system.css` entrypoint it described). That folder had zero
consumers anywhere in the codebase and was removed — the project's real,
in-use design system is [Astryx](https://www.npmjs.com/package/@astryxdesign/core)
(`@astryxdesign/core` + `@astryxdesign/theme-neutral`), wired up in
`src/app/layout.tsx` and `src/app/providers.tsx`, and has been the actual
pattern in use since early in the project.

## Current pattern

```typescript
// src/app/layout.tsx
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
```

```typescript
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { TextInput } from '@astryxdesign/core/TextInput';
```

Component prop shapes live under `node_modules/@astryxdesign/core/src` —
check there directly rather than relying on written docs, since the package
is actively versioned (`^0.1.4`).

## Live examples in this repo

For real, working usage patterns, read these files rather than a written guide:

- `src/app/(admin)/settings/page.tsx`
- `src/components/admin/AuditLogViewer.tsx`
- `src/components/admin/WebhookMonitor.tsx` (toast pattern via `react-hot-toast`)
- `src/components/admin/settings/PaymentProcessorsSection.tsx`
- `src/app/(admin)/orders/page.tsx`, `src/app/(admin)/products/page.tsx` (`Table`, `Badge`, `Selector`)
- `src/app/(dashboard)/upgrade-to-b2b/page.tsx` (`Banner`, `TextArea`, `CheckboxInput`)

Landing/marketing pages (`src/components/landing/*`, `src/app/page.tsx`) are an
intentional exception — they run on the bespoke `glamd-tokens.css`/`landing.css`
system, not Astryx, due to a prior conflict where Astryx's `<Theme>` wrapper's
`color-scheme` handling broke the marketing surface's light-mode-only design.
