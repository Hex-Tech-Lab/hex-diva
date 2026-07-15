# Hex-Diva Wave 1 Code Review Matrix

This consolidated review matrix lists code quality, architecture, performance, accessibility, and security findings identified in layout changes since commit `86fc436` (git diff `86fc436..HEAD`). It integrates multi-angle reviews based on five active disciplines:
* **code-reviewer** (layout stability, correctness, specificity)
* **vercel-react-best-practices** (hooks lifecycle, leak prevention)
* **vercel-composition-patterns** (separation of layout wrappers and tabbar state)
* **vercel-optimize** (asset preloading, accessibility attributes)
* **ponytail-review** (simplicity over over-engineering, clean styles)

---

## Review Matrix Summary

| Finding ID | Severity | Priority | File | Category / Rule | Description | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REV-001** | Low | **P3** | [layout.tsx](file:///home/kellyb_dev/projects/hex-diva/src/app/layout.tsx) | Import Ordering | Framework import `next/script` is placed after type definitions. Should follow: framework → thirdparty → internal → types. | Reorder imports to group framework libraries first. |
| **REV-002** | Medium | **P2** | [layout.tsx](file:///home/kellyb_dev/projects/hex-diva/src/app/layout.tsx) | Reserved Keyword | `type: 'website'` used inside the `openGraph` metadata object. Can trigger syntactic parse warning in strict AST configurations looking for identifier tokens. | Leave as-is for valid Next.js configuration properties, but ensure no variable bindings use JavaScript reserved keywords (e.g. `type`). |
| **REV-003** | Medium | **P1** | [HeroCarousel.tsx](file:///home/kellyb_dev/projects/hex-diva/src/components/landing/HeroCarousel.tsx) | Error Observability | Unhandled/silent `.catch(() => {})` on promise rejections from `video.play()` (three occurrences) swallows errors, preventing layout failure observability. | Change `.catch(() => {})` to `.catch(err => console.warn('[VideoPlay]', err))` or use structured logging. |
| **REV-004** | Low | **P3** | [landing.css](file:///home/kellyb_dev/projects/hex-diva/src/styles/landing.css) | Layout Stability | Global `html` and `body` rules contain high specificity `!important` declarations (`background-color`, `overflow-x: clip`). This overrides theme settings. | Refactor global resets in `landing.css` to respect theme tokens without using raw `!important`. |
| **REV-005** | Medium | **P2** | [landing.css](file:///home/kellyb_dev/projects/hex-diva/src/styles/landing.css) | Vercel-Optimize | Shimmer animations (`cart-pulse-shimmer`) run continuously on `.cart-skeleton-item` regardless of viewport visibility, increasing main thread paint tasks. | Add `content-visibility: auto` to offscreen cart containers or toggle animation only when the cart flyout is active. |
| **REV-006** | Medium | **P2** | [MobileTabBar.tsx](file:///home/kellyb_dev/projects/hex-diva/src/components/landing/MobileTabBar.tsx) | Composition Patterns | Clicking Search, Shop, and Account all trigger the generic `onMenuClick` drawer fallback rather than custom search panels or sub-views. | Route clicks to specific event handlers (`onSearchClick`, `onShopClick`) or separate drawer sections. |
| **REV-007** | Medium | **P2** | [SiteHeader.tsx](file:///home/kellyb_dev/projects/hex-diva/src/components/landing/SiteHeader.tsx) | Vercel-Optimize | Mega-menus (`MegaMenuPanel`) trigger on hover event listeners via mouse entering and leaving, causing potential layout shifts. | Implement debounce thresholds or delay state changes using `useTransition` to prevent accidental hover cascades. |
| **REV-008** | Low | **P3** | [MobileTabBar.tsx](file:///home/kellyb_dev/projects/hex-diva/src/components/landing/MobileTabBar.tsx) | React Hooks | The scroll event listener executes `handleScroll` on every scroll action. Without throttling, this causes high-frequency state updates (`setScrollState`) that degrades scroll performance. | Throttle or debounce the scroll event listener using a requestAnimationFrame wrapper. |
| **REV-009** | Low | **P3** | [landing.css](file:///home/kellyb_dev/projects/hex-diva/src/styles/landing.css) | Layout Stability | Overscroll gradient uses hardcoded `--charcoal` brand values in a linear-gradient instead of resolving completely through data-theme variables. | Update layout overscroll color stops to map strictly through dynamic data-theme tokens. |

---

## Detailed Findings & Recommended Fixes

### REV-001: Import Ordering (P3)
* **File:** [layout.tsx](file:///home/kellyb_dev/projects/hex-diva/src/app/layout.tsx)
* **Severity:** Low
* **Why:** Framework module imports should precede internal stylesheets and type definitions to allow proper styling cascades and static optimization tracking.
* **Recommended Fix:** Reorder the imports in `layout.tsx` to group `next/script` right after `next`:
  ```typescript
  import type { Metadata } from 'next';
  import Script from 'next/script'; // Move to top framework block
  ```

### REV-002: Metadata Configuration keyword parsing (P2)
* **File:** [layout.tsx](file:///home/kellyb_dev/projects/hex-diva/src/app/layout.tsx)
* **Severity:** Medium (QA-Intel Warning)
* **Why:** Property declarations using keywords like `type` inside config objects can occasionally flag security scanners using legacy regex keyword matching.
* **Recommended Fix:** Ensure strict separation. Since this is standard Next.js metadata format, it is safe, but avoid creating variable definitions named `type` in the scope.

### REV-003: Swallowed Promise Rejection on Autoplay (P1)
* **File:** [HeroCarousel.tsx](file:///home/kellyb_dev/projects/hex-diva/src/components/landing/HeroCarousel.tsx)
* **Severity:** Medium
* **Why:** High-frequency rendering pipelines can crash or freeze on mobile safari when `video.play()` is rejected due to user interaction constraints. Swallowing it silently makes debugging difficult.
* **Recommended Fix:** Log the rejection to standard output or telemetry handlers:
  ```typescript
  video.play().catch(e => console.warn('[Autoplay Blocked]', e));
  ```

### REV-004: Excessive Style Specificity Override (P3)
* **File:** [landing.css](file:///home/kellyb_dev/projects/hex-diva/src/styles/landing.css)
* **Severity:** Low
* **Why:** Global selector overrides (e.g., `html { background-color: ... !important; }`) break token containment.
* **Recommended Fix:** Remove `!important` overrides. The default layout container should cascade color from `glamd-tokens.css` values automatically.

### REV-005: Unbounded Shimmer Animations (P2)
* **File:** [landing.css](file:///home/kellyb_dev/projects/hex-diva/src/styles/landing.css)
* **Severity:** Medium
* **Why:** The cart skeleton animation is continuously processed in the background even when `cartOpen === false`.
* **Recommended Fix:** Scope the animation keyframes to execute only when `.cart-flyout.open` is active to optimize mobile CPU cycles:
  ```css
  .cart-flyout.open .cart-skeleton-item {
    animation: cart-pulse-shimmer 2s ease-in-out infinite;
  }
  ```

### REV-008: Unthrottled scroll event listener (P3)
* **File:** [MobileTabBar.tsx](file:///home/kellyb_dev/projects/hex-diva/src/components/landing/MobileTabBar.tsx)
* **Severity:** Low
* **Why:** Setting state (`setScrollState`) on every window scroll tick triggers repeated state recalculations in React, which can degrade animation performance on lower-end mobile devices during rapid scrolling.
* **Recommended Fix:** Throttle the scroll event listener with `requestAnimationFrame` or a debounce function to minimize state updates.

### REV-009: Hardcoded brand color in overscroll gradient (P3)
* **File:** [landing.css](file:///home/kellyb_dev/projects/hex-diva/src/styles/landing.css)
* **Severity:** Low
* **Why:** The rule `background: linear-gradient(to bottom, var(--color-background-body) 50%, var(--charcoal) 50%) !important;` contains a hardcoded `--charcoal` brand value stop. This fails to resolve completely through the data-theme config in dark mode.
* **Recommended Fix:** Map the second gradient stop to a custom background token (e.g. `var(--color-background-footer)` or similar) resolving dynamic colors correctly.

---

## Validation Status

* **TypeScript Compilation (`tsc --noEmit`):** ✅ Passed (no compilation type errors)
* **Production Build (`next build`):** ✅ Passed (production bundle optimized successfully)
* **Linter Checks (`pnpm lint`):** ⚠️ Circular ESLint structure error found in configuration setup (unrelated to layout changes).
* **QA-Intel Unit Tests (`wave9-new-rules`):** ✅ Passed (15 test suites executing successfully)
