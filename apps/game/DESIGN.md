# Design System Document

## 1. Overview & Creative North Star

### Creative North Star: "The Obsidian Tactical"

This design system is built for the high-stakes, high-tension world of extraction RPGs. It moves away from the cluttered "HUD" aesthetic typical of the genre, opting instead for a **"Digital Curator"** approach. By blending the sleek, depth-driven aesthetics of Apple’s Big Sur with a dark, cinematic palette, we create a sense of elite professionalism.

The interface should feel like a premium piece of tactical hardware. We break the "template" look through:

- **Intentional Asymmetry:** Important tactical data is offset against wide, negative-space backgrounds.
- **Overlapping Layers:** Translucent cards should float over 3D maps or inventory scenes, creating a sense of physical space.
- **Extreme Contrast Scales:** We pair massive `display-lg` stats with microscopic, high-precision `label-sm` metadata to emphasize the data's hierarchy.

---

## 2. Colors

The palette is rooted in deep obsidian blacks and graphite grays, punctuated by neon accents that feel like energy pulses in the dark.

### The Color Roles

- **Primary (`#85adff`):** Electric Blue. Use for high-value navigation, active objective paths, and "Success" states.
- **Secondary (`#ff7162`):** Pulse Red. Reserved for combat indicators, "Extraction Required" states, and critical health.
- **Tertiary (`#b8ffb9`):** Tactical Green. Used for inventory sorting, secure items, and teammate status.
- **Surface Hierarchy:** `surface` (#0e0e0e) is our baseline. `surface-container-low` (#131313) and `high` (#201f1f) create the physical structure of the UI.

### The "No-Line" Rule

**Explicit Instruction:** Do not use 1px solid borders to section off content. In this system, boundaries are defined by tonal shifts. A `surface-container-highest` card should simply "exist" on a `surface` background. The difference in hex value is the border.

### The "Glass & Gradient" Rule

To achieve the premium Big Sur feel, use **Glassmorphism**. Floating panels must use semi-transparent surface colors with a `backdrop-blur` (16px to 32px).

- **Signature Gradients:** For primary CTAs, transition from `primary` (#85adff) to `primary-container` (#6c9fff) at a 135-degree angle. This prevents the "flat" look and adds a subtle glow reminiscent of a screen backlight.

---

## 3. Typography

The system utilizes **Inter** (as a San Francisco alternative) to maintain a modern, clean, and highly legible interface in low-light environments.

- **Display & Headlines:** Used for "Infil/Exfil" status and mission titles. These should be tight-tracked (-0.02em) to feel authoritative and dense.
- **Title & Body:** Large body text (`body-lg`) ensures readability during high-intensity gameplay.
- **Labels:** Use `label-sm` for technical data (coordinates, ammo counts). These should be all-caps with a slight letter-spacing (+0.05em) to mimic military hardware engraving.

The typographic hierarchy communicates the brand’s "Tactical Minimalism"—only the most vital information is shouted; the rest is whispered in the background.

---

## 4. Elevation & Depth

We avoid traditional drop shadows in favor of **Tonal Layering**.

- **The Layering Principle:** Stacking is the key to depth.
  - _Base:_ `surface` (#0e0e0e)
  - _Mid:_ `surface-container-low` (#131313) for secondary content groups.
  - _High:_ `surface-container-highest` (#262626) for active modals or character equipment slots.
- **Ambient Shadows:** For floating elements, use a shadow color derived from the background (e.g., #000000 at 40% opacity) with a blur of `40px` and `0px` spread. It should feel like an object blocking light, not a "glow."
- **The "Ghost Border" Fallback:** If accessibility requires a stroke, use `outline-variant` (#494847) at 15% opacity. It should be felt, not seen.
- **Frosted Glass:** UI elements that overlay the game world (3D maps/Inventory) must use 70% opacity of the `surface-container` tokens with a heavy backdrop blur.

---

## 5. Components

### Cards & Lists

**Forbid the use of divider lines.** Separate inventory items or mission logs using `1.5` (0.375rem) or `2` (0.5rem) spacing blocks or subtle background shifts between `surface-container-low` and `surface-container-lowest`.

### Buttons

- **Primary:** Roundedness `full`. Gradient of `primary` to `primary_container`. White text.
- **Tertiary:** No background. `primary` text with a `label-md` weight. Used for "Cancel" or "Back."

### Input Fields

- **Style:** `surface-container-highest` background. No border.
- **State:** When active, a subtle `primary` glow (2px outer blur) should pulse from the container.

### Tactical Components (Bespoke)

- **Extraction Timer:** A large `display-sm` font in `secondary` (Pulse Red) sitting on a glassmorphic blur.
- **Inventory Slots:** Square containers with `md` (0.75rem) roundedness. Use `surface-container-highest` for occupied slots and `surface-container-low` for empty ones.

---

## 6. Do's and Don'ts

### Do

- **DO** use plenty of negative space. In a dark theme, space equals focus.
- **DO** use vibrant neons (`primary`, `secondary`) sparingly. They should act as "beacons" in the obsidian environment.
- **DO** lean into the Big Sur roundedness (`xl` for large cards, `full` for interactive pills).

### Don't

- **DON'T** use 100% white (#ffffff) for large blocks of text; use `on_surface_variant` (#adaaaa) for secondary info to reduce eye strain.
- **DON'T** ever use a solid 1px border. It breaks the "Tactical Obsidian" immersion.
- **DON'T** use traditional harsh drop shadows. If it doesn't look like glass, it doesn't belong in the system.
- **DON'T** use "Standard" grid alignment for everything. Offset labels to create a more bespoke, editorial look.
