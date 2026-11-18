# TrainerHub Design System & Live Workout Screen Notes

## 1. Overview & Visual Identity

TrainerHub is a calisthenics and outdoor street-workout platform designed to deliver instant, client-side, zero-latency workout generation and real-time workout tracking directly at the park.

The visual system is engineered for **high contrast under direct outdoor sunlight**, energetic athletic aesthetics, and fast comprehension during demanding physical sets.

### Color Palette Tokens
| Token | Hex | Role | Contrast on Deep Dark |
|---|---|---|---|
| `--th-lime` | `#B9F24A` | Primary kinetic energy, current active set, logo accents | > 12:1 |
| `--th-teal` | `#2DD4BF` | Functional equipment (bars, rings), progress fills, primary brand | > 10:1 |
| `--th-teal-subtle` | `#7FE9D9` | Supporting metrics, secondary badges, hints | > 8:1 |
| `--th-bg` | `#071210` | Deep obsidian background for maximum battery saving (OLED) | - |
| `--th-surface` | `#0E1D19` | Intermediate card surface | - |
| `--th-surface-card` | `#132622` | Foreground interactive cards | - |
| `--th-border` | `#233F38` | Subtle card borders and apparatus uprights | - |
| `--th-ink` | `#F6F8F6` | High-legibility typography | > 14:1 |
| `--th-muted` | `#9CA3AF` | Inactive states, metadata, target ranges | > 5:1 |

---

## 2. Logo Assets (`design/logo.svg`, `design/logo-icon.svg`)

- **Design Concept**: Combines a street-workout hexagonal rig badge, horizontal pull-up bar, and stylized athletic "TH" monogram that depicts both an athlete in bar transition and the brand initials.
- **`design/logo.svg`**: Full horizontal lockup (viewBox `0 0 440 100`) with vector mark, bold athletic wordmark "TRAINER", neon lime "HUB" pill badge, and Hebrew/English calisthenics subtitle.
- **`design/logo-icon.svg`**: Compact squircle app icon (viewBox `0 0 120 120`) optimized for home screens, favicons, PWA manifests, and mobile navigation headers.

---

## 3. Park / Street-Workout SVG Icons (`design/icons/`)

All icons are drafted on a uniform **64×64 vector grid** with strict geometric consistency:
- **Equipment & Apparatus** (bars, ground, dip handles): Drawn with `--th-teal` (`#2DD4BF`), stroke width `3.5px`, rounded caps.
- **Biomechanical Athlete Silhouette**: Drawn with high-contrast `--th-ink` (`#F6F8F6`) and `--th-lime` (`#B9F24A`) spine/core alignment, stroke width `3.0px`.
- **Dynamic Motion & Force Vectors**: Directional indicators and rotation arcs showing the kinetic plane of movement.

### The 8 Core Exercise Icons
1. **Pull-Up (`icons/pull-up.svg`)**: Overhead bar grip with flexed biceps and chin clearing the bar at peak contraction.
2. **Dip (`icons/dip.svg`)**: Parallel bars with athlete in 90-degree press and bent calisthenics leg clearance.
3. **Push-Up (`icons/push-up.svg`)**: Grounded floor line with rigid plank core alignment and tricep press angles.
4. **Muscle-Up (`icons/muscle-up.svg`)**: Explosive transition above the bar with curved momentum vector and straight-bar lockout.
5. **Leg Raise (`icons/leg-raise.svg`)**: Strict L-sit leg raise from dead hang with 90-degree horizontal leg extension and core activation badge.
6. **Squat (`icons/squat.svg`)**: Deep parallel bodyweight squat with forward arm counter-balance and shin angle geometry.
7. **Plank (`icons/plank.svg`)**: Forearm horizontal isometric hold with spine tension radiance and grounded toe pivot.
8. **Bar Hang (`icons/bar-hang.svg`)**: Full decompression active dead hang with elongated spine and shoulder engagement cues.
9. **Sprite Sheet (`icons/exercise-icons-sprite.svg`)**: Reusable SVG `<symbol>` bundle for `<svg><use href="#icon-[name]"/></svg>`.

---

## 4. Live Workout Screen Mockup (`design/live-workout-screen.svg`, `design/live-workout-mockup.html`)

The live workout screen provides an uninterrupted, distraction-free companion while training at the park:

### Core Modules
1. **Header & Context Bar**:
   - Workout title and current training phase (e.g. `אימון מתח וליבה בפארק • תרגיל 2 מתוך 5`).
   - Quick mute/audio toggle and safe exit dialog button.
2. **Overall Progress Strip**:
   - Multi-phase bar indicating elapsed workout completion percentage.
3. **Current Exercise Hero Card**:
   - High-visibility vector exercise icon thumbnail.
   - Large headline (`עליות מתח`) with category tag and key form cue (e.g., "chin over bar, no swinging").
4. **Active Rest Timer Circular Module**:
   - Circular SVG gauge with animated countdown stroke and high-contrast digital countdown (`01:15`).
   - Quick outdoor tap controls: `-15s`, `Pause/Resume`, `+30s`.
5. **Set & Rep Counter**:
   - Visual bubble indicators for completed, current, and upcoming sets (e.g., Set 2 of 4).
   - Generous, glove-friendly +/- rep increment buttons (minimum 48×48px tap targets) with clear target goal display.
6. **Next Exercise Preview Card**:
   - Sneak peek of the upcoming movement (`מקבילים בפארק`), target sets/reps, and required equipment so the athlete can prepare equipment during rest.
7. **Primary Action Footer**:
   - Large, prominent "Log Set & Continue" (`רשום סט והמשך`) button with electric gradient.
   - "Skip Rest" secondary option.

---

## 5. Implementation Guide

### Using Icons in HTML
```html
<!-- Standalone Image -->
<img src="./design/icons/pull-up.svg" width="32" height="32" alt="עליות מתח">

<!-- Or with SVG Sprite Sheet -->
<svg class="icon" width="32" height="32" aria-hidden="true">
  <use href="./design/icons/exercise-icons-sprite.svg#icon-pull-up"/>
</svg>
```

### Viewing Assets Locally
- **Icon & Logo Showcase**: Open `design/preview.html` in any web browser.
- **Interactive Live Workout Screen**: Open `design/live-workout-mockup.html` in any web browser or mobile emulator.
- **Vector Screen Artwork**: Open `design/live-workout-screen.svg` in any SVG viewer, Figma, or browser.
