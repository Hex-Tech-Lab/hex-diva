# GlamD Motion & Interaction Language

**Philosophy**: Motion is intentional, sensual, never frantic. Ease-out creates a luxury feel (deceleration). Respect `prefers-reduced-motion`.

## Taste-Skill Integration (GSAP Motion Skeletons)

**Taste-Skill soft-skill outputs GSAP motion templates** for all components. CC integrates via:

### Option 1: Native GSAP (Recommended for Luxury Performance)
```javascript
// Taste-Skill output → CC uses directly
gsap.to(".button:hover", {
  duration: 0.2,
  ease: "power2.out",
  y: -2,
  boxShadow: "0 4px 12px rgba(212, 175, 55, 0.15)"
});
```

### Option 2: Framer Motion Wrapper (React-native)
```typescript
// Taste-Skill GSAP → CC converts to Framer Motion
<motion.button 
  whileHover={{ y: -2 }}
  transition={{ duration: 0.2, ease: "easeOut" }}
/>
```

**CC Decision**: Choose based on bundle size + performance needs. Both honor 200ms ease-out spec.

---

---

## Core Principles

1. **Luxury > Playfulness**: Motion suggests confidence and elegance, not impatience or cheapness.
2. **Sensual > Mechanical**: Curves (ease-out) > linear or ease-in. Feels organic, not robotic.
3. **Respect User Preference**: If `prefers-reduced-motion: reduce` is set, disable all animations (no parallax, no transitions, instant state changes).
4. **Performance First**: 60 FPS minimum. Test on mobile with CPU throttling.
5. **Accessibility**: Never auto-play video/animation with sound. No distracting motion in peripheral vision.

---

## Timing & Easing

### Duration Ranges

| Duration | Use Case | Example |
|----------|----------|---------|
| **100–150ms** | Hover states, micro-interactions | Button hover color change, icon hover lift |
| **200–250ms** | Standard UI transitions | Modal open, dropdown slide, form focus |
| **300–400ms** | Significant state changes | Page transitions, hero parallax, chart animations |
| **500–800ms** | Slow, deliberate, luxe feel | Hero fade-in on load, slow scroll reveals |
| **>1000ms** | Avoid in UI (feels sluggish) | Only for intentional delays (loading state) |

**Recommended defaults**: 200ms, 250ms, 300ms. Rarely exceed 400ms for UI; feels slow.

### Easing Functions

| Easing | CSS | Use Case | Feel |
|--------|-----|----------|------|
| **ease-out** | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | ✅ PRIMARY for all UI (default) | Luxury, confidence, deceleration |
| **ease-in-out** | `cubic-bezier(0.42, 0, 0.58, 1)` | ✅ Hover states, bouncy-but-controlled | Playful but professional |
| **ease-in** | `cubic-bezier(0.42, 0, 1, 1)` | Exit animations (page leave) | Feels rushed; use sparingly |
| **linear** | `linear` | ❌ Avoid for UI (feels mechanical) | Only for continuous loops (spinner) |
| **cubic-bezier(0.34, 1.56, 0.64, 1)** | Spring | Emphasis bounces (rare) | Fun; avoid for luxury brand |

**Default**: `ease-out 200ms` for all transitions unless specified.

---

## Component-Level Motion Rules

### Buttons

```css
/* Primary button (gold) */
button.primary {
  transition: background-color 200ms ease-out,
              transform 150ms ease-out,
              box-shadow 150ms ease-out;
}

button.primary:hover {
  background-color: primary-400; /* Slightly darker gold */
  transform: translateY(-2px); /* Subtle lift */
  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.15); /* Soft gold shadow */
}

button.primary:active {
  transform: translateY(0px); /* Press down */
  box-shadow: 0 2px 4px rgba(212, 175, 55, 0.1);
}
```

**Forbidden**: Spinning, pulsing, or color-shift animations on buttons (reads cheap).

### Links

```css
a {
  transition: color 150ms ease-out,
              text-decoration 150ms ease-out;
  text-decoration: underline;
  color: primary-600;
}

a:hover {
  color: primary-500;
  text-decoration-thickness: 2px; /* Slightly bolder underline */
}
```

**No fade-in on hover** (text is already visible).

### Cards (Product, B2B order history, affiliate commission)

```css
/* Hover lift */
.card {
  transition: transform 200ms ease-out,
              box-shadow 200ms ease-out;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}
```

**No image zoom** on hover (reads cheap; product images are best static).

### Forms (Input focus)

```css
input, textarea, select {
  transition: border-color 150ms ease-out,
              box-shadow 150ms ease-out,
              background-color 150ms ease-out;
  border: 1px solid neutral-300;
}

input:focus {
  border-color: primary-300;
  box-shadow: 0 0 0 2px primary-300;
  background-color: white (or neutral-50 for dark mode);
  outline: none;
}
```

**Duration**: 150ms (quick feedback, feels responsive).

### Dropdowns & Menus

```css
/* Dropdown slide-down */
.dropdown-menu {
  opacity: 0;
  transform: translateY(-8px);
  pointer-events: none;
  transition: opacity 200ms ease-out,
              transform 200ms ease-out;
}

.dropdown-menu.open {
  opacity: 1;
  transform: translateY(0px);
  pointer-events: auto;
}
```

**Alternative**: Fade-in only (no translate) if space is constrained.

### Modals

```css
/* Modal backdrop fade + dialog scale */
.modal-backdrop {
  opacity: 0;
  transition: opacity 200ms ease-out;
}

.modal-backdrop.open {
  opacity: 1;
}

.modal-dialog {
  transform: scale(0.95);
  opacity: 0;
  transition: transform 250ms ease-out,
              opacity 250ms ease-out;
}

.modal-dialog.open {
  transform: scale(1);
  opacity: 1;
}
```

**No bounce**: Scale up smoothly (ease-out, not bounce).

### Page Transitions (Route change)

```css
/* Fade-out on leave, fade-in on enter */
.page-exit {
  animation: fadeOut 200ms ease-out forwards;
}

.page-enter {
  animation: fadeIn 200ms ease-out forwards;
  animation-delay: 150ms; /* Slight stagger */
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Duration**: 200ms fade (light, quick).

---

## Parallax & Scroll Effects (B2C Landing Hero Only)

**Parallax is allowed only on hero section**, not on general scroll. It should:
- Move at 30–50% of scroll speed (not 1:1)
- Rotate max ±5° (never more; reads silly)
- Be disabled if `prefers-reduced-motion: reduce`

```css
/* Hero video/image parallax */
.hero-parallax {
  position: relative;
  overflow: hidden;
}

.hero-image {
  will-change: transform;
  transition: transform 200ms ease-out;
}

/* On scroll (JS-driven) */
window.addEventListener('scroll', () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const offset = window.scrollY * 0.3; /* 30% parallax */
  heroImage.style.transform = `translateY(${offset}px)`;
});
```

**Fallback**: If parallax JS fails, static background image (no CSS parallax).

---

## Reduced Motion Compliance

**Mandatory**: If user has set `prefers-reduced-motion: reduce`, ALL animations and transitions must be disabled.

```css
/* Global media query */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**In component-level CSS**:
```css
@media (prefers-reduced-motion: reduce) {
  button {
    transition: none;
  }
  
  button:hover {
    transform: none;
  }
}
```

**Test**: Enable "Reduce motion" in macOS/Windows accessibility settings and verify all motion stops.

---

## Animation Checklist (Before Ship)

- [ ] All buttons have 200ms ease-out hover state (no spinning, no gradient animations)
- [ ] Cards have subtle lift on hover (4px translateY)
- [ ] Form inputs have 150ms focus ring animation
- [ ] Dropdowns/modals use fade + scale (no bounce)
- [ ] Page transitions are 200ms fade (not slides or complex effects)
- [ ] Parallax disabled if `prefers-reduced-motion: reduce` is set
- [ ] No auto-playing video with sound (user-initiated play only)
- [ ] No infinite spinners or pulsing animations (except loading states)
- [ ] No color animations on text or backgrounds (only on hover states)
- [ ] All durations are 150–300ms (nothing >500ms unless intentional delay)

---

## Video & Media (Hero Section)

### Hero Video (B2C Landing)

- **Format**: MP4 (H.264), WebM (VP9) fallback
- **Size**: 60% of screen width on desktop, 80% on mobile
- **Aspect ratio**: 16:9
- **Duration**: 5–15 seconds (loop; don't autoplay)
- **Audio**: None (or opt-in via button)
- **Fallback**: Static image (hand/wrist gesture, high-quality flat-lay)

```html
<!-- HTML -->
<video class="hero-video" controls muted loop>
  <source src="hero-video.mp4" type="video/mp4" />
  <source src="hero-video.webm" type="video/webm" />
  <img src="hero-fallback.jpg" alt="Luxury lashes showcase" />
</video>

<!-- CSS -->
.hero-video {
  width: 100%;
  max-width: 60vw;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
```

**Accessibility**:
- Muted by default (no surprise audio)
- Manual play control (user initiative)
- Fallback image if video fails to load
- Captions if voice-over is used

---

## Loading States

```css
/* Spinner (linear, continuous) */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}

/* Skeleton (pulse, subtle) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeleton {
  animation: pulse 2s ease-in-out infinite;
  background: linear-gradient(90deg, neutral-100, neutral-50, neutral-100);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: calc(200% + 200px) 0; }
}
```

**Duration**: 1–2 seconds (feel of progress, not too fast, not too slow).

---

## Accessibility Best Practices

1. **No motion in peripheral vision**: If something moves outside user's direct focus, it's distracting. Avoid.
2. **No color-only animations**: Don't use color change alone to convey state (e.g., button "success"). Add text or icon change.
3. **No fast flashing**: Nothing > 3 flashes per second (seizure risk).
4. **Keyboard-accessible animations**: All hover-triggered animations must also work on focus (for keyboard users).
5. **Touch-friendly hover**: On mobile, hover doesn't exist. Use `:active` or touch-triggered states instead.

---

## Summary: The GlamD Motion Feeling

- **Luxury**: Ease-out, not linear. Smooth deceleration = confidence.
- **Sensual**: Gentle, intentional, never frantic.
- **Accessible**: Respect reduced-motion, provide keyboard equivalents.
- **Fast**: 200–250ms default (feels responsive on modern devices).
- **Subtle**: Lift, fade, subtle color shift (not spinning or bouncing).

**Forbidden**: Skeuomorphism, bounce, spin, gradient text, auto-play audio, distracting peripheral motion.

**Encouraged**: Ease-out, gentle lift, soft shadows, fade transitions, intentional parallax on hero, keyboard focus states.
