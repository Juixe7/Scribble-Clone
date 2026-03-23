# SKRIBBL-CLONE: FRONTEND UI/UX BLUEPRINT
### Complete Design System, Screen Specifications & Interaction Logic

---

## TABLE OF CONTENTS
1. [Design Philosophy & Aesthetic Direction](#1-design-philosophy--aesthetic-direction)
2. [Design System (Tokens, Typography, Color)](#2-design-system-tokens-typography-color)
3. [Component Library](#3-component-library)
4. [Screen Architecture & Route Map](#4-screen-architecture--route-map)
5. [Screen 1: Landing Page](#5-screen-1-landing-page)
6. [Screen 2: Lobby Screen](#6-screen-2-lobby-screen)
7. [Screen 3: Game Screen (Core)](#7-screen-3-game-screen-core)
8. [Screen 4: Word Selection Overlay](#8-screen-4-word-selection-overlay)
9. [Screen 5: Turn End Overlay](#9-screen-5-turn-end-overlay)
10. [Screen 6: Round End Overlay](#10-screen-6-round-end-overlay)
11. [Screen 7: Game End Screen](#11-screen-7-game-end-screen)
12. [Screen 8: Spectator View](#12-screen-8-spectator-view)
13. [Animation & Motion System](#13-animation--motion-system)
14. [Canvas Engine (Drawing Interface)](#14-canvas-engine-drawing-interface)
15. [Chat & Guess Panel](#15-chat--guess-panel)
16. [Player List & Scoreboard Panel](#16-player-list--scoreboard-panel)
17. [Timer Component](#17-timer-component)
18. [State-Driven UI Logic (Connected to Backend)](#18-state-driven-ui-logic-connected-to-backend)
19. [Responsive & Mobile Layout](#19-responsive--mobile-layout)
20. [Accessibility](#20-accessibility)
21. [Performance Guidelines](#21-performance-guidelines)

---

## 1. DESIGN PHILOSOPHY & AESTHETIC DIRECTION

### 1.1 Core Identity

**Tone**: Playful-premium. The app must feel like it belongs alongside top-tier consumer products — not a Flash game from 2010 — while radiating warmth, fun, and creative energy. Think "Figma meets a children's art studio." Clean, intentional, joyful.

**The One Thing People Remember**: A canvas that feels *alive* — buttery smooth brush strokes, tactile tool switching, and a satisfying pop when someone guesses correctly. The drawing experience IS the product.

**Design Pillars**:
1. **Clarity First**: Every player always knows whose turn it is, what phase the game is in, and how much time remains. Zero ambiguity.
2. **Expressive Restraint**: High-quality whitespace. Decorative elements are purposeful, never decorative for its own sake.
3. **Micro-delight**: Small animations (score bounce, correct guess confetti, timer pulse) elevate the feel without overwhelming.
4. **Inclusive Legibility**: High-contrast text, clear hierarchy, readable at a glance during fast-paced gameplay.

### 1.2 Visual Theme

**Primary Aesthetic**: Modern Toybox — a blend of bold geometric shapes, a warm off-white base, ink-black text, and a vibrant accent palette reminiscent of physical art supplies (marker ink, chalk, crayon).

**NOT**: Purple gradients, glassmorphism for its own sake, neon on dark (it's been done), corporate SaaS blue.

**YES**: Tactile textures on surfaces, hand-drawn doodle accents as decoration, thick stroke outlines on UI cards, bold rounded corners with personality.

---

## 2. DESIGN SYSTEM (TOKENS, TYPOGRAPHY, COLOR)

### 2.1 Color Palette

```css
:root {
  /* Base */
  --color-canvas:       #FAFAF7;   /* Warm off-white — main background */
  --color-surface:      #FFFFFF;   /* Pure white — cards, panels */
  --color-surface-alt:  #F3F2EE;   /* Tinted surface — secondary areas */
  --color-ink:          #1A1A18;   /* Near-black — primary text */
  --color-ink-muted:    #6B6B66;   /* Muted gray — secondary text */
  --color-ink-ghost:    #B8B8B2;   /* Very muted — placeholders, dividers */
  --color-border:       #1A1A18;   /* Ink borders — thick, confident strokes */

  /* Brand Accent */
  --color-accent:       #FF4D1C;   /* Marker red-orange — primary CTA, active states */
  --color-accent-soft:  #FFE8E1;   /* Tinted accent background */
  --color-accent-hover: #E03D10;   /* Darker on hover */

  /* Game Status Colors */
  --color-drawing:      #2563EB;   /* Active drawing turn */
  --color-correct:      #16A34A;   /* Correct guess */
  --color-wrong:        #DC2626;   /* Wrong / time out */
  --color-warning:      #D97706;   /* Low timer warning */
  --color-neutral:      #6B7280;   /* Neutral/waiting */

  /* Player Avatar Colors (8 options) */
  --avatar-1: #FF6B6B;
  --avatar-2: #4ECDC4;
  --avatar-3: #45B7D1;
  --avatar-4: #96CEB4;
  --avatar-5: #FECA57;
  --avatar-6: #FF9FF3;
  --avatar-7: #54A0FF;
  --avatar-8: #5F27CD;

  /* Shadows */
  --shadow-card:    3px 3px 0px 0px var(--color-ink);    /* Hard shadow — toybox style */
  --shadow-card-lg: 5px 5px 0px 0px var(--color-ink);
  --shadow-card-xl: 8px 8px 0px 0px var(--color-ink);
  --shadow-inset:   inset 2px 2px 0px rgba(0,0,0,0.12);

  /* Spacing Scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Border Radius */
  --radius-sm:   6px;
  --radius-md:   12px;
  --radius-lg:   20px;
  --radius-xl:   28px;
  --radius-full: 9999px;

  /* Border Width */
  --border-thin:   1.5px;
  --border-normal: 2px;
  --border-thick:  3px;
}
```

### 2.2 Typography

```css
/* Font Imports (Google Fonts) */
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Syne:wght@700;800&display=swap');

:root {
  /* Display Font: Syne — geometric, bold, distinctive */
  --font-display: 'Syne', sans-serif;

  /* Body Font: Nunito — rounded, friendly, highly legible */
  --font-body: 'Nunito', sans-serif;

  /* Scale */
  --text-xs:   12px;
  --text-sm:   14px;
  --text-md:   16px;
  --text-lg:   18px;
  --text-xl:   22px;
  --text-2xl:  28px;
  --text-3xl:  36px;
  --text-4xl:  48px;
  --text-hero: 72px;

  /* Line Heights */
  --leading-tight:  1.15;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;
}

/* Usage Rules */
/* Display (Syne 700/800): Game name, score reveals, section headers */
/* Body (Nunito 400/600/700): All UI text, chat, player names, instructions */
/* Monospace (system mono): Word hint underscores only */
```

### 2.3 Elevation & Surface Hierarchy

```
Level 0: --color-canvas  (page background)
Level 1: --color-surface + border + --shadow-card (panels, cards)
Level 2: --color-surface + border + --shadow-card-lg (modal backgrounds)
Level 3: --color-surface + border + --shadow-card-xl (top-level overlays)
```

All cards and panels use a **2px solid var(--color-ink) border** + **hard drop shadow**. This "neo-brutalist toybox" card style gives every element visual weight and tactility. Nothing floats — everything is grounded.

---

## 3. COMPONENT LIBRARY

### 3.1 Button Component

**Variants**: Primary | Secondary | Ghost | Danger | Icon-only

```
PRIMARY BUTTON
──────────────
Background:   var(--color-accent)
Text:         white, Nunito 700, 16px
Border:       2px solid var(--color-ink)
Shadow:       3px 3px 0px var(--color-ink)
Border-radius: var(--radius-md)
Padding:      12px 24px
Transition:   transform 60ms, box-shadow 60ms

:hover  → shadow: 4px 4px 0px var(--color-ink), translateY(-1px)
:active → shadow: 1px 1px 0px var(--color-ink), translateY(2px)
          (gives physical "click" feel)

SECONDARY BUTTON
────────────────
Background:   var(--color-surface)
Text:         var(--color-ink)
Border:       2px solid var(--color-ink)
Shadow:       3px 3px 0px var(--color-ink)

GHOST BUTTON
─────────────
Background:   transparent
Text:         var(--color-ink-muted)
Border:       2px solid var(--color-ink-ghost)
No shadow

DANGER BUTTON
─────────────
Background:   #FEE2E2
Text:         var(--color-wrong)
Border:       2px solid var(--color-wrong)
Shadow:       3px 3px 0px var(--color-wrong)
```

### 3.2 Input Field

```
Text Input
──────────
Background:   var(--color-surface-alt)
Border:       2px solid var(--color-ink)
Border-radius: var(--radius-md)
Padding:      12px 16px
Font:         Nunito 600, 16px
Placeholder:  var(--color-ink-ghost)
Shadow:       --shadow-inset

:focus → border-color: var(--color-accent)
         outline: 3px solid var(--color-accent-soft)
         box-shadow: none (replace with accent border)
```

### 3.3 Avatar Component

```
Avatar Circle
─────────────
Shape:         Circle (border-radius: 50%)
Size:          36px (sm) | 48px (md) | 64px (lg)
Background:    one of 8 --avatar-X colors
Border:        2px solid var(--color-ink)
Content:       First 2 characters of username, Nunito 800, white
Shadow:        2px 2px 0px var(--color-ink)

Special states:
  - Drawer:    pulsing accent ring animation (see §13)
  - Guessed:   green checkmark overlay badge
  - Disconnected: grayscale filter + opacity 0.5
  - Spectator: [👁] badge overlay
```

### 3.4 Toast / Notification

```
Toast
──────
Position:   fixed, top-right (16px from edge)
Width:      320px max
Background: var(--color-surface)
Border:     2px solid var(--color-ink)
Shadow:     --shadow-card
Radius:     var(--radius-md)

Animation:
  Enter → slideInRight (300ms cubic-bezier(0.34, 1.56, 0.64, 1))
  Exit  → slideOutRight (200ms ease-in)

Types:
  Success → left border 4px var(--color-correct), ✅ icon
  Error   → left border 4px var(--color-wrong), ❌ icon
  Info    → left border 4px var(--color-drawing), ℹ️ icon
  Close   → left border 4px var(--color-warning)
```

### 3.5 Badge / Pill

```
Badge
──────
Font:   Nunito 700, 12px
Padding: 3px 8px
Radius: var(--radius-full)
Border: 1.5px solid currentColor

Variants:
  Round:    (round number) — accent fill
  Spectator: ink-ghost fill, muted text
  Owner:    star icon + "Host" text, accent-soft fill
```

### 3.6 Modal / Overlay

```
Overlay Backdrop: rgba(0,0,0,0.6), backdrop-filter: blur(4px)
Modal Card:
  Background:   var(--color-surface)
  Border:       3px solid var(--color-ink)
  Shadow:       --shadow-card-xl
  Radius:       var(--radius-xl)
  Max-width:    480px (sm) | 640px (md) | full (game overlays)

Animation:
  Enter → scaleUp (0.85→1, opacity 0→1, 250ms cubic-bezier(0.34,1.56,0.64,1))
  Exit  → scaleDown (1→0.9, opacity 1→0, 180ms ease-in)
```

---

## 4. SCREEN ARCHITECTURE & ROUTE MAP

```
/                     → Landing Page
/room/create          → Create Room (modal on landing)
/room/:roomId/lobby   → Lobby Screen
/room/:roomId/game    → Game Screen
/room/:roomId/results → Game End Screen
/join/:inviteCode     → Resolves code → redirects to lobby
/leaderboard          → Global Leaderboard (optional)
/profile              → User Profile (optional, authenticated)
```

**Note**: Routes `/lobby` and `/game` use the same URL. The UI transitions between phases by reading the room's `phase` field from the socket. No page reload ever occurs during a game session — it's a single persistent WebSocket connection.

**Route Guard**: If a user navigates to `/room/:roomId/game` without an active socket session for that room → redirect to `/` with a toast: "Session expired or room not found."

---

## 5. SCREEN 1: LANDING PAGE

### 5.1 Layout

```
┌──────────────────────────────────────────────────────┐
│  [LOGO] Skribbl       [Login]  [Register]            │  ← Nav (64px tall)
├──────────────────────────────────────────────────────┤
│                                                      │
│         ████████████████████                        │
│         ██  DRAW. GUESS.  ██    ← Hero headline     │
│         ██   LAUGH.       ██      Syne 800, 64-72px │
│         ████████████████████                        │
│                                                      │
│   [────── Enter your name ──────]  ← Input field    │
│                                                      │
│   [▶  Start Playing!  ]  [+ Create Room]            │  ← CTAs
│                                                      │
│   ─────────── OR ───────────                        │
│                                                      │
│   [Enter invite code: ______]  [Join →]             │
│                                                      │
│   ╔════════════════════════════╗                     │
│   ║ OPEN ROOMS  (3 waiting)   ║                     │  ← Public room list
│   ║ ┌──────┐ ┌──────┐        ║                     │
│   ║ │ 4/8  │ │ 2/6  │  ...  ║                     │
│   ║ │[Join]│ │[Join]│        ║                     │
│   ║ └──────┘ └──────┘        ║                     │
│   ╚════════════════════════════╝                     │
│                                                      │
│   [Animated doodle decorations in corners]          │
└──────────────────────────────────────────────────────┘
```

### 5.2 Hero Section Details

- **Headline**: "DRAW. GUESS. LAUGH." — three words, each on its own line, Syne 800.
- **Decoration**: Behind the headline, a large faint doodle of a crayon or pencil (SVG, 20% opacity, rotated ~15°). Adds personality without competing with text.
- **Background**: `--color-canvas` with a very subtle dot grid pattern (SVG data-uri, 4px dot spacing, 5% opacity ink dots). Feels like graph paper.

### 5.3 Name Input Behavior

- Autofocused on page load.
- Character limit: 16 chars. Shows live counter `12/16` in bottom-right of field.
- On Enter key → same action as "Start Playing" button.
- If name is empty → shake animation on button click + red border flash on input.
- Name is stored in `localStorage` and pre-filled on return visits.

### 5.4 "Start Playing" Flow

```
User clicks "Start Playing" (name entered)
    ↓
Button shows loading state: spinner replaces arrow icon, disabled
    ↓
Socket emits: joinPublic { displayName }
    ↓
Server responds: roomJoined { roomId, roomState }
    ↓
Client navigates to /room/:roomId/lobby (no reload, push state)
Button returns to normal (if error)
```

### 5.5 "Create Room" Flow

```
User clicks "+ Create Room"
    ↓
Create Room modal appears (see below)
```

**Create Room Modal Content:**
```
┌─────────────────────────────────────┐
│ ✏️  Create a Room           [✕]    │
├─────────────────────────────────────┤
│  Room Type                          │
│  [● Public]  [○ Private]            │
│                                     │
│  Max Players     [────────O───] 8   │  ← Range slider
│  Rounds          [──O─────────] 3   │
│  Draw Time       [────O───────] 80s │
│  Word Count      [O───────────] 3   │  (choices per turn)
│  Language        [English ▾]        │
│                                     │
│  Custom Words (optional)            │
│  [____________________________]     │
│  [Add] apple, banana, rocket ship   │  ← Tag-style custom words
│  ☐ Use custom words only            │
│                                     │
│  [Cancel]         [Create Room →]   │
└─────────────────────────────────────┘
```

- Sliders use a custom styled range input with the thumb being a circle with hard border (matching design system).
- Custom words appear as removable tags below the input.
- Tags: small pill, accent-soft background, ✕ button to remove.

### 5.6 Public Room Cards

```
Room Card
─────────
┌───────────────────┐
│  🎨  Room #abc123 │
│  ████████░░ 6/8   │  ← Players bar
│  ⏱ 80s  🌐 3 rds  │
│  [   Join Room   ]│
└───────────────────┘
Background: var(--color-surface)
Border: 2px solid var(--color-ink)
Shadow: --shadow-card
Radius: var(--radius-lg)
Width: 180px
```

- Player count bar is a progress bar style (filled = players joined, empty = available slots).
- Cards animate in staggered (50ms delay between each).
- If 0 rooms → show "No open rooms right now — create one!" with a doodle.
- Room list polls every 10 seconds via HTTP (not via WebSocket — user isn't in a room yet).

---

## 6. SCREEN 2: LOBBY SCREEN

### 6.1 Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [←] Leave    🎨 Room: abc123    [Invite Code: XK9PLM 📋]   │  ← Topbar
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────┐  ┌──────────────────────┐ │
│  │       PLAYERS (4/8)          │  │    ROOM SETTINGS      │ │
│  │                              │  │   (owner only edit)  │ │
│  │  [👤] Alice     ⭐ Host      │  │                      │ │
│  │  [👤] Bob                   │  │  Rounds:  [──O──] 3  │ │
│  │  [👤] Carol                 │  │  Draw:    [────O] 80s│ │
│  │  [👤] Dan   [Waiting...]    │  │  Players: [───O─] 8  │ │
│  │                              │  │  Words:   [O────] 3  │ │
│  │  Waiting for more players... │  │  Language:[EN ▾]     │ │
│  │                              │  │                      │ │
│  └──────────────────────────────┘  └──────────────────────┘ │
│                                                              │
│              [▶  Start Game!  ]  ← Owner only, active ≥2   │
│                                                              │
│  ─────────── Chat ─────────────────────────────────────────  │
│  [Alice]: ready!                                            │
│  [Bob]: let's go                                            │
│  [System]: Dan has joined the room.                         │
│  ─────────────────────────────────────────────────────────  │
│  [Type a message...                              ] [Send]   │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Player List States

Each player row shows:
- Avatar circle (colored by their chosen color)
- Display name
- ⭐ if owner
- [✕] kick button — visible to owner only, on hover of each player row
- Animated typing indicator if they're typing in lobby chat
- "Waiting..." text in muted gray for players who haven't confirmed ready (optional feature)

### 6.3 Invite Code Display

```
Invite Code Chip
─────────────────
Background: var(--color-accent-soft)
Border: 2px solid var(--color-accent)
Padding: 8px 16px
Font: Nunito 800, monospace-style letter spacing 0.15em

"XK9PLM  [📋 Copy]"

On copy → brief green flash + "Copied!" tooltip
```

### 6.4 Start Button Logic

```
Condition: playerCount >= 2 AND current user is owner
  → Button is active (accent, full opacity)

Condition: playerCount < 2 OR user is not owner
  → Button is dimmed (50% opacity, cursor: not-allowed)
  → Tooltip on hover: "Need at least 2 players" | "Only the host can start"

Owner clicks Start:
  → Button: loading state (spinner)
  → Socket emits: startGame
  → On gameStarted event: transition to game screen
  → On error: toast + button resets
```

### 6.5 Settings Panel (Owner vs Non-Owner)

- **Owner view**: Interactive sliders + dropdowns, saves on change (emits `updateSettings`).
- **Non-owner view**: Read-only display. Same layout, but all controls are replaced with static text values. A subtle "(Host controls)" label below the panel.
- When settings change: smooth animated number transitions (counter rolls from old → new value).

---

## 7. SCREEN 3: GAME SCREEN (CORE)

This is the main screen. Every element must be visible at a glance. Zero clutter.

### 7.1 Layout (Desktop, 1280px+)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Round 1/3  │  🎨 Drawing: ALICE  │  [_ _ _ _ _ _ _]  │   ⏱ 0:52     │  ← Topbar (56px)
├─────────────────────────────────────────────────────────────────────────┤
│                        │                                   │            │
│   PLAYER LIST          │        CANVAS AREA                │  CHAT /    │
│   (200px wide)         │        (flex: grows to fill)      │  GUESS     │
│                        │                                   │  PANEL     │
│  [👤] Alice ⭐🖊️       │  ┌─────────────────────────────┐ │  (280px)   │
│       1200 pts         │  │                             │ │            │
│  [👤] Bob ✅           │  │       HTML5 CANVAS          │ │  [Alice]:  │
│       880 pts          │  │                             │ │  is it an  │
│  [👤] Carol            │  │                             │ │  animal?   │
│       743 pts          │  │                             │ │            │
│  [👤] Dan ✅           │  │                             │ │  [Bob]:    │
│       630 pts          │  │                             │ │  elephant! │
│                        │  │                             │ │  ✅ CORRECT│
│  ────────────          │  └─────────────────────────────┘ │            │
│  SPECTATORS (2)        │                                   │  [Carol]:  │
│  [👁] Eve              │  ┌─── DRAWING TOOLBAR ──────────┐ │  🤔 is it  │
│  [👁] Frank            │  │ [✏️][🧹][🪣][⬜][⬤][──] [↩][🗑]│ │  a dog?    │
│                        │  └─────────────────────────────┘ │            │
│                        │                                   │ ─────────  │
│                        │  (toolbar visible to drawer only) │ [Guess...] │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Topbar Components

The topbar is a fixed 56px bar at the top of the game screen. It has three logical zones:

**Left Zone: Round Indicator**
```
"Round 1 / 3"
Font: Nunito 700, 14px
Background pill: var(--color-surface-alt), border
```

**Center Zone: Current Turn Info**
```
Drawer mode (non-drawer sees):
  [Avatar] "Alice is drawing..."
  Font: Nunito 700, 18px

Drawer mode (drawer sees):
  "You are drawing:" [WORD]
  Word shown in full, Syne 700, 20px, color-accent

Word hint (non-drawer sees):
  [_ _ _ _ _ _ _]  ← rendered as underscores
  Font: monospace, letter-spacing: 0.5em, 24px, Nunito 800
  Revealed letters animate in: scale(0.8)→scale(1) pop + color-correct color briefly
```

**Right Zone: Timer**
(See §17 for full Timer specification)

### 7.3 Canvas Area

- Canvas takes all remaining horizontal space between the two sidepanels.
- Aspect ratio: **4:3** (fixed). Centered in the available space with letterboxing if needed.
- Canvas border: `3px solid var(--color-ink)`, `border-radius: var(--radius-lg)`.
- Shadow: `--shadow-card-xl`.
- Canvas background: pure white (`#FFFFFF`) — NOT the app background.
- During **non-drawing turns** (user is guesser): canvas is overlaid with a transparent click-blocking div (prevents accidental events). Cursor changes to `default`.
- During **drawing turn**: cursor is a custom cursor (crosshair for pen, circle-outline matching brush size for eraser).

### 7.4 Drawing Toolbar (Drawer Only)

The toolbar appears below the canvas, centered, only visible when the current user IS the drawer. Non-drawers see nothing here (the space collapses via CSS `display: none`).

```
Toolbar Layout (horizontal pill bar)
──────────────────────────────────────────────────────
│ [✏️ Pen] [Eraser] [Fill 🪣] │ [Colors...] │ [Size ──] │ [↩ Undo] [🗑 Clear] │
──────────────────────────────────────────────────────

Tool Pill Container:
  Background: var(--color-surface)
  Border: 2px solid var(--color-ink)
  Shadow: --shadow-card
  Radius: var(--radius-full)
  Padding: 8px 16px
  Gap: 8px between tools

Active Tool Indicator:
  Background: var(--color-accent)
  Color: white
  Radius: var(--radius-full) (fully rounded pill within the bar)
  Transition: background 150ms ease
```

**Color Palette:**
```
24 color swatches in a 6×4 grid popup (appears above toolbar on click)
Swatch size: 28px × 28px
Border: 2px solid var(--color-ink)
Radius: var(--radius-sm)
Selected: 3px white inset ring + scale(1.15)
Popup: var(--color-surface), border, shadow, radius-lg
Animation: scaleUp 200ms on open, scaleDown on close
```

**Brush Size Slider:**
```
Custom range slider, horizontal
Track: 80px wide, 4px tall
Thumb: circle, size reflects current brush size (8px→24px thumb diameter)
Range: 2–40 pixels
Live preview: small dot next to slider showing current size at current color
```

**Undo / Clear:**
```
Undo: [↩] icon button — ghost variant, reverses last stroke
  Tooltip: "Undo (Ctrl+Z)"
  Keyboard shortcut: Ctrl+Z supported

Clear: [🗑] icon button — danger variant
  Confirmation: NOT a modal — single click clears immediately
  Visual feedback: canvas briefly flashes (0.15s white overlay)
```

---

## 8. SCREEN 4: WORD SELECTION OVERLAY

Shown only to the current drawer, for 15 seconds before their turn.

### 8.1 Layout

```
┌──────────────────────────────────────────────────────┐  ← Full canvas dimmed behind
│              ╔════════════════════════╗               │
│              ║  Choose your word!    ║               │
│              ║  ─────────────────── ║               │
│              ║  ⏱ 12 seconds left   ║               │
│              ║                       ║               │
│              ║  ┌───────┐ ┌───────┐ ┌───────┐       ║
│              ║  │  cat  │ │  dog  │ │ house │       ║
│              ║  └───────┘ └───────┘ └───────┘       ║
│              ║                       ║               │
│              ╚════════════════════════╝               │
└──────────────────────────────────────────────────────┘
```

### 8.2 Word Card Design

```
Word Choice Card
─────────────────
Width:        140px
Height:       72px
Background:   var(--color-surface)
Border:       2.5px solid var(--color-ink)
Shadow:       --shadow-card-lg
Radius:       var(--radius-lg)
Font:         Nunito 800, 22px, var(--color-ink)
Text-align:   center

:hover →
  Transform: translateY(-4px)
  Shadow: 5px 8px 0px var(--color-ink)  (shadow grows down = card lifts up)
  Border-color: var(--color-accent)
  Transition: all 150ms cubic-bezier(0.34, 1.56, 0.64, 1)

:active →
  Transform: translateY(0px)
  Shadow: --shadow-card

Selected (after click) →
  Background: var(--color-accent)
  Color: white
  Scale: 1.05
  Transition: all 100ms ease-out
```

### 8.3 Overlay Behavior

- **Backdrop**: the game screen behind is visible but dimmed (60% black overlay) + blur(2px).
- A 15-second **countdown ring** (SVG circle stroke-dashoffset animation) around the timer display.
- At 5 seconds: timer text turns `--color-warning`, countdown ring turns orange.
- At 0 seconds: if no word chosen, the first card is auto-selected — animate it as if clicked.
- **Non-drawer view**: they see the main game canvas with a centered overlay: `[Avatar] is choosing a word...` with a CSS loading dots animation. They do NOT see the word choices.

---

## 9. SCREEN 5: TURN END OVERLAY

Displayed for 5 seconds between turns, over the canvas.

### 9.1 Layout

```
╔══════════════════════════════════════════╗
║          The word was...                ║
║                                         ║
║         ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓               ║  ← Word reveals with animation
║         ▓  ELEPHANT   ▓               ║
║         ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓               ║
║                                         ║
║  Guessers:                              ║
║  🥇 Bob       +800  (12s)              ║
║  🥈 Carol     +743  (17s)              ║
║  ✕  Dan       +0   (didn't guess)      ║
║                                         ║
║  Alice (Drawer): +600                  ║
║                                         ║
║  Next turn in 4...                     ║
╚══════════════════════════════════════════╝
```

### 9.2 Word Reveal Animation

The hidden word `_ _ _ _ _ _ _ _` transforms into the actual word:
1. Each underscore group flips/rotates in sequence (staggered 60ms per letter).
2. Each letter pops in using `rotateX(90deg)→rotateX(0deg)` with scale bounce.
3. The word card itself has a brief yellow highlight flash before settling.

### 9.3 Score Animation

- Each player's score delta appears with a **counting animation** (number counts up from 0 to final value over 800ms).
- `+800` appears in `--color-correct` green.
- `+0` appears in `--color-ink-muted` gray.
- Trophy emoji (🥇🥈🥉) for top 3 guessers.

### 9.4 Countdown to Next Turn

"Next turn in 3..." — simple text, updates every second. When it hits 0, the overlay slides down and the new turn begins.

**If reason is 'drawerLeft'**: show a different header: "⚠️ The drawer left! Word was:" (amber/warning styling).

**If reason is 'allGuessed'**: show "🎉 Everyone guessed it!" header with a brief confetti burst.

---

## 10. SCREEN 6: ROUND END OVERLAY

Shown for 5 seconds between rounds.

### 10.1 Layout

```
╔══════════════════════════════════════════╗
║     🏁  Round 1 Complete!               ║
║                                         ║
║  LEADERBOARD                            ║
║  ─────────────────────────────────      ║
║  🥇  Bob       1,840 pts  (+900)       ║
║  🥈  Carol     1,650 pts  (+770)       ║
║  🥉  Alice     1,420 pts  (+600)       ║
║       Dan      1,100 pts  (+500)       ║
║                                         ║
║  Round 2 starts in 4...               ║
╚══════════════════════════════════════════╝
```

- The leaderboard rows animate in from the bottom, staggered 80ms apart.
- Delta values in green, counts up.
- A subtle horizontal bar chart behind each name shows relative score visually (proportional width, accent color, low opacity).

---

## 11. SCREEN 7: GAME END SCREEN

Full-screen. No overlay — replaces the game screen entirely.

### 11.1 Layout

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│            🎉  GAME OVER!                              │  ← Animated in
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │            🏆  WINNER                            │ │
│  │         ┌────────────────┐                       │ │
│  │         │  [Big Avatar]  │                       │ │
│  │         │    B O B       │                       │ │
│  │         │   3,840 pts    │                       │ │
│  │         └────────────────┘                       │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  FULL RANKINGS                                         │
│  ─────────────────────────────────────────────────    │
│  🥇  Bob       3,840   ████████████████████           │
│  🥈  Carol     3,250   ████████████████               │
│  🥉  Alice     2,900   ██████████████                 │
│       Dan      2,400   ████████████                   │
│                                                        │
│  [🔄  Play Again]      [🚪  Leave Room]               │
│                        (owner sees Play Again only)    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 11.2 Winner Celebration

- **Confetti burst**: On mount, fire ~150 confetti particles (CSS keyframe animation, varied colors from avatar palette, varied shapes: dots, rectangles, thin strips).
- **Winner card**: scales up from 0.5 → 1.0 with a slight overshoot bounce (600ms cubic-bezier).
- **Crown / Trophy**: animates in from above, "drops" onto the winner avatar.
- If the current user is the winner: hero particle effect behind their card, golden border, pulsing glow animation.

### 11.3 Bar Chart Rankings

- Each row has a progress bar proportional to the winner's score.
- Bars animate in from width: 0% → actual width (800ms ease-out, staggered 100ms per row).
- Font: Nunito 700, 16px.
- Bar color: each player's avatar color.

### 11.4 Play Again Logic (UI)

```
Owner clicks "Play Again":
  → Socket emits resetGame
  → Server resets room to LOBBY state
  → All clients receive: roomReset { roomState }
  → All clients navigate back to Lobby screen
  → Non-owners see "Waiting for host to start..." on Play Again screen
  → Toast: "Host is setting up a new game..."
```

---

## 12. SCREEN 8: SPECTATOR VIEW

Spectators see the game screen with these differences:

```
Differences from player view:
──────────────────────────────
1. No chat input → replaced with: "👁 You are spectating" banner
   (They CAN type, but their messages are labeled [Spectator])
2. No drawing toolbar (obviously)
3. Word hint → STILL underscore view (spectators don't get the word)
4. Player list → they are listed separately under "Spectators" section
5. A top banner: "👁 SPECTATING MODE" in info blue, non-dismissable
6. Scoreboard has a faint "spectating" watermark on their name row
```

---

## 13. ANIMATION & MOTION SYSTEM

### 13.1 Core Principles

- Animations serve communication, not decoration.
- Duration scale: micro (60–100ms), standard (200–300ms), emphasis (400–600ms), celebration (800ms+).
- Easing: UI elements use `ease-out` (snappy start, decelerate). Bouncy reveals use `cubic-bezier(0.34, 1.56, 0.64, 1)`. Exits use `ease-in` (accelerate out).
- Respect `prefers-reduced-motion`: all animations collapse to instant when user has this set.

### 13.2 Key Animations

**Correct Guess Pop**
```css
@keyframes correctGuessPop {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.08); }
  60%  { transform: scale(0.97); }
  100% { transform: scale(1); }
}
/* Applies to: player row in scoreboard when they guess correctly */
/* Duration: 400ms, fills both directions */
/* Accompanies: brief green flash background on the row */
```

**Score Count-Up**
```javascript
// Use requestAnimationFrame to animate from oldScore → newScore
// Duration: 600ms, ease-out
// +delta floats up from the score, fades out (like damage numbers in RPGs)
function animateScore(element, from, to, duration=600) {
  const start = performance.now();
  const diff = to - from;
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
    element.textContent = Math.floor(from + diff * ease).toLocaleString();
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
```

**Drawer Avatar Pulse Ring**
```css
@keyframes drawerPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 77, 28, 0.5); }
  50%       { box-shadow: 0 0 0 8px rgba(255, 77, 28, 0); }
}
/* Applies to: current drawer's avatar */
/* Duration: 1.5s, infinite */
```

**Timer Urgency Pulse**
```css
/* When timer < 10 seconds */
@keyframes timerUrgency {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.05); }
}
/* Duration: 0.8s, infinite while condition holds */
/* Timer text color: --color-warning, then --color-wrong at <5s */
```

**Hint Letter Reveal**
```css
@keyframes hintLetterReveal {
  0%   { transform: scale(0.4) rotateY(90deg); opacity: 0; color: var(--color-correct); }
  60%  { transform: scale(1.1) rotateY(-5deg); opacity: 1; }
  100% { transform: scale(1) rotateY(0deg); color: var(--color-ink); }
}
/* Applies to: individual letter span when revealed */
/* Duration: 350ms */
```

**Player Join Slide-In**
```css
@keyframes playerJoinSlideIn {
  from { transform: translateX(-20px); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
/* Duration: 300ms, ease-out */
/* Player row slides in from left when they join */
```

**Confetti (Game End)**
```javascript
// Emit 150 confetti particles with:
// - Random start position along top 20% of screen
// - Random angle: -30° to +30° from downward
// - Random speed: 300–700px over 2–4 seconds
// - Random rotation: 0–720°
// - CSS animation: fall + wobble (sinusoidal x drift)
// - Colors: all 8 avatar colors + accent + correct green
// - Shapes: circle, rect (wide), rect (thin strip)
// - Fade out in final 20% of duration
```

**Canvas Clear Flash**
```css
/* Overlay div on canvas */
@keyframes clearFlash {
  0%   { opacity: 0.8; }
  100% { opacity: 0; }
}
/* Duration: 200ms, ease-out */
/* Color: white */
```

---

## 14. CANVAS ENGINE (DRAWING INTERFACE)

### 14.1 Canvas Setup

```javascript
// Two-canvas approach: base canvas + overlay canvas
// Base canvas: committed strokes (permanent per turn)
// Overlay canvas: current stroke being drawn (real-time, before mouseup)
// On mouseup: flatten overlay onto base canvas, clear overlay

const baseCanvas = document.getElementById('canvas-base');
const overlayCanvas = document.getElementById('canvas-overlay');
// Both positioned absolutely, same size, overlayCanvas on top
// Canvas resolution: match devicePixelRatio for crisp rendering
const dpr = window.devicePixelRatio || 1;
baseCanvas.width = logicalWidth * dpr;
baseCanvas.height = logicalHeight * dpr;
ctx.scale(dpr, dpr);
```

### 14.2 Drawing Event Flow

```
mousedown / touchstart:
  → Set isDrawing = true
  → Record start point (normalize to 0–1 range)
  → Begin new path on overlay canvas

mousemove / touchmove (while isDrawing):
  → Get current point (normalized)
  → Draw smooth bezier curve: use previous point as control point
    (instead of straight lines → dramatically smoother strokes)
  → Emit drawEvent to server (throttled, max 60/s)

mouseup / touchend:
  → Set isDrawing = false
  → Flatten overlay → base canvas
  → Clear overlay canvas
  → Emit strokeEnd (signals server this stroke is complete)
```

### 14.3 Smooth Stroke Rendering

```javascript
// Bezier smoothing for strokes
let lastPoint = null;
let lastMidPoint = null;

function drawSmoothSegment(ctx, p1, p2, size, color) {
  const midPoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  ctx.beginPath();
  ctx.moveTo(lastMidPoint.x, lastMidPoint.y);
  ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  lastMidPoint = midPoint;
}
```

### 14.4 Pressure Simulation (Optional Enhancement)

```javascript
// Simulate pressure: stroke width varies with drawing speed
// Slower movement → thicker stroke (more pressure feel)
function getPressureSize(baseSize, speed) {
  const normalized = Math.min(speed / 20, 1); // 0 = slow, 1 = fast
  return baseSize * (1 - normalized * 0.3); // slow = baseSize, fast = 0.7*baseSize
}
```

### 14.5 Fill (Bucket) Tool

```javascript
// Client-side flood fill using canvas getImageData
// Flood fill algorithm: BFS from click point, replace color within tolerance
// Tolerance: 30 (allows filling near-matching colors without bleeding)
// After fill: emit fillEvent { x, y, color } to server
// Server replicates fill with same algorithm on server-side canvas model
```

### 14.6 Canvas Coordinates

```
ALWAYS normalize coordinates before sending:
  normalizedX = canvasX / canvas.logicalWidth   // 0.0 – 1.0
  normalizedY = canvasY / canvas.logicalHeight  // 0.0 – 1.0

On receiving events:
  pixelX = normalizedX * canvas.logicalWidth
  pixelY = normalizedY * canvas.logicalHeight

WHY: Different screen sizes/resolutions. The server and all clients use
the same normalized coordinate space.
```

### 14.7 Canvas Replay for Latecomers

```javascript
// On receiving canvasReplay { events }:
1. Clear both canvases
2. Create a temporary offscreen canvas (same size)
3. Replay all events synchronously on the offscreen canvas
4. At each snapshot event: drawImage(snapshot) to offscreen
5. When done: drawImage(offscreenCanvas) to baseCanvas in one call
// This prevents the user from seeing each event paint in — they get instant state
```

---

## 15. CHAT & GUESS PANEL

### 15.1 Panel Structure

```
┌──────────────────────────────┐
│  CHAT                        │
├──────────────────────────────┤
│                              │  ← Message area
│  [Alice]: is it an animal?   │     (overflow-y: auto)
│  [Bob]: elephant!  ✅        │     (auto-scroll to bottom)
│  [System]: 1 hint remaining  │
│  [Carol]: 🤔 maybe a dog?   │
│  [👁 Eve]: nice drawing!     │  ← Spectator chat (slightly muted color)
│                              │
├──────────────────────────────┤
│  [Type your guess...   ]     │  ← Input
│  [                    Send]  │
└──────────────────────────────┘
```

### 15.2 Message Visual Variants

| Type | Visual Treatment |
|------|-----------------|
| Regular chat | `[Name]: text` — normal styling |
| Correct guess | Full-width row, `--color-correct` background tint, ✅ icon, text: "[Name] guessed correctly!" — word NOT shown |
| Close guess | Shown ONLY to the guesser (private socket event): italic, `--color-warning` text, "⚡ So close!" |
| System message | Centered, `--color-ink-ghost` text, no avatar, italic |
| Spectator chat | Name has `[👁]` prefix, text is `--color-ink-muted` |
| Rate limit | User sees: input briefly flashes red, "Slow down!" tooltip on input |

### 15.3 Auto-Scroll Behavior

```javascript
// Smart auto-scroll: only scroll if user is ALREADY at the bottom
// If user has scrolled up to read history → don't force scroll (UX respect)
const isAtBottom = container.scrollTop >= container.scrollHeight - container.clientHeight - 50;
if (isAtBottom) {
  container.scrollTop = container.scrollHeight;
}
// Show "↓ New messages" floating button when new messages arrive + user is scrolled up
```

### 15.4 Input Behavior

```
Normal mode (guesser, game in progress):
  Placeholder: "Type your guess..."
  On Enter: submit guess

After correct guess:
  Placeholder: "You guessed it! Chat with other guessers..."
  Input still enabled (they can chat in guessed-players channel)

Drawer mode:
  Input hidden (replaced with): "You're drawing! Focus on the canvas. 🖊️"
  The drawer cannot chat or guess

Lobby mode:
  Placeholder: "Chat with players..."
  No guess processing
```

### 15.5 Profanity Masking

- Masked words display as `***` in the correct character length.
- The masking is applied server-side before broadcast.
- No client-side filtering (server is authoritative).

---

## 16. PLAYER LIST & SCOREBOARD PANEL

### 16.1 Layout Per Player Row

```
┌──────────────────────────────────────────────────┐
│  [👤]  Alice          ⭐ 🖊️           1,200 pts  │
│        ████████████░░░░░░░░░░░░░░                │  ← Score bar
└──────────────────────────────────────────────────┘

Elements:
  [👤]  Avatar circle (36px)
  Name  Nunito 700, 15px, --color-ink
  ⭐    Owner badge (if owner)
  🖊️   Drawing badge (if currently drawer, animated)
  ✅    Checkmark (if guessed correctly this turn)
  🔌   Disconnected icon (if in grace period)
  pts   Nunito 800, 16px, right-aligned

Score bar:
  Height: 3px
  Width:  proportional to leader's score (leader = 100%)
  Color:  player's avatar color
  Border-radius: full
  Transition: width 600ms ease-out on score change
```

### 16.2 Sorting

- During game: sorted by **current score, descending**.
- On score change: rows **animate to their new position** (FLIP animation — record old positions, apply new positions, animate from old to new using CSS transform).
- Duration: 400ms ease-in-out.
- Do NOT re-sort during the "counting" animation — sort only AFTER scores are finalized.

### 16.3 States Per Turn

| Player State | Visual |
|---|---|
| Waiting to guess | Normal row |
| Currently drawing | 🖊️ badge, pulsing avatar ring |
| Guessed correctly | ✅ green checkmark, row gets subtle green tint, name strikethrough (playful) |
| Disconnected | Grayscale filter, 🔌 icon, "Reconnecting..." in muted text |
| Spectator | Listed in separate "Spectators" section with 👁 prefix |

---

## 17. TIMER COMPONENT

### 17.1 Visual Design

```
Timer Display
──────────────
Position: Top-right of topbar
Size:      64px × 64px circular ring

Components:
  Outer ring:  SVG circle, stroke-dasharray animated (countdown ring)
  Inner text:  Nunito 800, 22px, centered
  Background:  var(--color-surface) circle, border 2px solid var(--color-ink)
```

### 17.2 Timer States

```
Full time (>66%):
  Ring color: --color-correct (green)
  Text color: --color-ink

Mid time (33%–66%):
  Ring color: --color-warning (amber)
  Text color: --color-ink

Low time (<33%, <10s):
  Ring color: --color-wrong (red)
  Text color: --color-wrong
  Animation: urgency pulse (scale 1→1.05→1, 0.8s infinite)

Critical (<5s):
  Every second tick: brief flash animation on whole topbar (subtle red tint, 100ms)
  Timer text: bold red, no pulse (just solid red to avoid distraction)

Expired (0):
  Ring: fully depleted
  Text: "0"
  No animation
```

### 17.3 SVG Ring Implementation

```javascript
// SVG circle stroke-dasharray technique
const RADIUS = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~175.9

function updateTimerRing(timeRemaining, totalTime) {
  const fraction = timeRemaining / totalTime;
  const dashOffset = CIRCUMFERENCE * (1 - fraction);
  // strokeDashoffset: 0 = full, CIRCUMFERENCE = empty
  ring.style.strokeDashoffset = dashOffset;
}

// Call this function using requestAnimationFrame for smooth animation
// Based on: fraction = (roundStartTime + totalTime*1000 - Date.now()) / (totalTime*1000)
```

### 17.4 Timer Sync Behavior

```javascript
socket.on('timerSync', ({ roundStartTime, drawTime }) => {
  // Correct any drift: recalculate remaining time from server-authoritative start
  const elapsed = (Date.now() - roundStartTime) / 1000;
  const remaining = Math.max(0, drawTime - elapsed);
  // Smoothly animate timer to correct position (no jump if within 1s of expected)
  // If drift > 1s: snap to correct value + brief shake animation to signal correction
});
```

---

## 18. STATE-DRIVEN UI LOGIC (CONNECTED TO BACKEND)

### 18.1 Global Game State (Frontend Store)

```typescript
interface GameStore {
  // Connection
  socket: Socket | null;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

  // Identity
  myUserId: string;
  mySocketId: string;
  isGuest: boolean;
  reconnectToken: string;

  // Room
  roomId: string | null;
  roomType: 'public' | 'private' | null;
  inviteCode: string | null;
  ownerId: string;
  settings: RoomSettings;

  // Players
  players: Player[];           // ordered list
  spectators: Player[];
  myRole: 'player' | 'spectator';

  // Game State
  phase: 'lobby' | 'in-game';
  state: 'waiting' | 'choosingWord' | 'drawing' | 'turnEnd' | 'roundEnd' | 'gameEnd';
  currentRound: number;
  totalRounds: number;
  currentDrawerIndex: number;
  currentDrawerId: string;
  amIDrawing: boolean;         // derived: currentDrawerId === myUserId

  // Turn
  wordHint: string;            // e.g. "_ _ _ _ _ _ _ _"
  wordLength: number;
  currentWord: string | null;  // only populated if amIDrawing
  wordChoices: string[];       // only populated during choosingWord if amIDrawing
  roundStartTime: number;      // Unix ms
  drawTime: number;            // seconds
  guessedPlayerIds: string[];  // players who guessed correctly this turn
  haveIGuessed: boolean;       // derived

  // Scores
  scores: Record<string, number>;

  // Chat
  messages: ChatMessage[];

  // Canvas
  canvasEvents: DrawEvent[];   // current turn's events
  iAmDrawing: boolean;         // currently making a stroke (mouse down)
  currentTool: Tool;
  currentColor: string;
  currentSize: number;
}
```

### 18.2 Socket Event → UI Mapping

| Socket Event | UI Action |
|---|---|
| `roomState` | Hydrate entire store, render appropriate screen |
| `playerJoined` | Add player to list, slide-in animation, system chat |
| `playerLeft` | Remove player, slide-out animation, system chat |
| `playerDisconnected` | Gray out player, show reconnecting state, toast |
| `playerReconnected` | Restore player appearance, toast |
| `settingsUpdated` | Update settings panel with animation |
| `gameStarted` | Transition lobby → game screen (fade transition) |
| `roundStarted` | Show round announcement overlay (1.5s) |
| `wordSelecting` | Show "Player is choosing..." overlay on canvas |
| `wordChoices` | Show word selection modal (drawer only) |
| `drawingStarted` | Set hint display, start timer, unlock canvas if drawer |
| `drawEvent` | Render stroke on canvas |
| `canvasReplay` | Replay all events on fresh canvas |
| `clearCanvas` | Clear canvas with flash animation |
| `undo` | Replay all canvas events minus last |
| `guess` | Add message to chat |
| `correctGuess` | Green row highlight, ✅ badge, chat notification, check allGuessed |
| `closeGuess` | Show "⚡ So close!" toast to local user only |
| `hintRevealed` | Animate letter reveal in hint display |
| `timerSync` | Correct local timer from server |
| `scoreUpdate` | Animate score change on player row |
| `leaderboard` | Re-sort player list with FLIP animation |
| `turnEnd` | Show turn end overlay (word reveal + scores) |
| `roundEnd` | Show round end overlay |
| `gameEnd` | Navigate to game end screen, confetti |
| `kickVoteStarted` | Show kick vote banner at bottom of player panel |
| `kicked` | Show "You were kicked" modal, redirect to landing |
| `playerKicked` | Remove from player list, system message |
| `ownerTransferred` | Update owner badge, toast if I'm new owner |
| `reconnected` | Restore all state, sync canvas and timer |
| `error` | Toast with error message |

### 18.3 Optimistic Updates

For **draw events**: apply immediately to canvas, don't wait for server echo. Server echo goes to other clients. This prevents the "sticky lag" feel.

For **guesses**: send immediately, show pending state briefly. Server response confirms or rejects. If rejected (duplicate/wrong state), silently discard.

For everything else: **wait for server confirmation** before updating UI (startGame, chooseWord, kick, etc.).

### 18.4 Connection Status UI

```
Connected:      Small green dot, top-right corner (8px)
Reconnecting:   Amber spinning circle, full-width banner: "Reconnecting... (Attempt 2/5)"
Disconnected:   Red, full-width blocking banner: "Connection lost. Please refresh."
```

The reconnecting banner must NOT block gameplay UI elements — it slides in from top but doesn't push content down. Use a fixed overlay with `pointer-events: none` on the game area.

---

## 19. RESPONSIVE & MOBILE LAYOUT

### 19.1 Breakpoints

```css
--bp-mobile:  640px
--bp-tablet:  1024px
--bp-desktop: 1280px
```

### 19.2 Mobile Layout (< 640px)

On mobile, the three-panel layout collapses into tabs:

```
┌─────────────────────────────┐
│  Round 1/3  [ELEPHANT] ⏱52 │  ← Topbar (52px)
├─────────────────────────────┤
│                             │
│      CANVAS                 │  ← Full width, 4:3 ratio
│                             │
├─────────────────────────────┤
│ [🎨 Canvas] [💬 Chat] [👥 Players] │  ← Tab bar
├─────────────────────────────┤
│                             │
│  Tab content:               │  ← Only one visible at a time
│  (Chat panel shown by default)│
│                             │
└─────────────────────────────┘
```

- Canvas is always visible (not tabbed).
- Toolbar appears as a sliding bottom sheet (swipe up to expand).
- Chat is default active tab.
- Word hint moves into topbar (smaller font).
- Timer is an arc above the canvas top-edge (overlaid, doesn't take space).

### 19.3 Tablet Layout (640px – 1024px)

```
┌──────────────────────────────────────────────────────┐
│  Topbar                                              │
├──────────────────────────────────────────────────────┤
│                     │                               │
│   CANVAS            │   CHAT (right side, 260px)    │
│                     │                               │
├─────────────────────┤                               │
│  TOOLBAR            │                               │
└─────────────────────┴───────────────────────────────┘
│  PLAYER LIST (horizontal row, bottom of screen)      │
└──────────────────────────────────────────────────────┘
```

### 19.4 Touch Drawing (Mobile/Tablet)

```javascript
// Support multi-touch: only track the FIRST touch point for drawing
// Prevent scroll while drawing on canvas (e.preventDefault() on touchmove)
// Pinch-to-zoom: disable on canvas element (touch-action: none)
// Palm rejection: if touch radius > threshold (usually set by device), ignore

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault(); // prevent page scroll while drawing
  const touch = e.touches[0];
  startDraw(touch.clientX, touch.clientY);
}, { passive: false });
```

---

## 20. ACCESSIBILITY

### 20.1 WCAG 2.1 AA Compliance

- **Color contrast**: All text meets 4.5:1 minimum ratio. Use color + shape together for status (never color alone).
- **Focus management**: All interactive elements are focusable. Focus ring: `3px solid var(--color-accent)`, `border-radius` matching element.
- **ARIA labels**: Canvas element has `aria-label="Drawing canvas"`. Chat has `role="log"`, `aria-live="polite"` for correct guess events, `aria-live="assertive"` for critical errors.
- **Keyboard nav**: All game actions accessible via keyboard. Esc closes modals. Tab cycles through controls.
- **Screen reader**: Game state changes announced via visually hidden `aria-live` region. Correct guesses read aloud.

### 20.2 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  /* Keep timer update (functional) but remove urgency pulse */
  .timer-ring { transition: stroke-dashoffset 0.01ms !important; }
}
```

### 20.3 Canvas Accessibility

The canvas itself is not screen-reader accessible by nature. Provide:
- A live text description region below the canvas: "[Alice] is drawing. The word is 7 letters long. Hint: _ L _ _ _ _ _"
- Chat region is naturally SR-accessible.
- Word choices modal: `role="dialog"`, `aria-labelledby` the heading, auto-focus first word card.

---

## 21. PERFORMANCE GUIDELINES

### 21.1 Canvas Performance

- Never clear and redraw entire canvas on every frame. Only dirty-rect clear during active strokes.
- Canvas operations on separate thread where possible: use `OffscreenCanvas` + `transferControlToOffscreen()`.
- Limit canvas resolution: max 1600×1200 logical pixels. Scale down on smaller screens.
- Use `ctx.save()` / `ctx.restore()` to avoid state leaks between draw calls.
- Batch drawing operations: don't call `ctx.stroke()` for every point — build path, then stroke once.

### 21.2 Socket Event Handling

- Draw events arrive up to 60/s from server (from drawer). Process on next `requestAnimationFrame` — never block the main thread.
- Queue draw events in a ring buffer: if rAF can't keep up, batch-process multiple events per frame.
- Chat messages: append to a virtual list (windowed rendering) if > 200 messages to avoid DOM bloat.

### 21.3 Bundle & Load Performance

- Code-split by route: Landing page loads no game code. Game screen loads no landing code.
- Canvas rendering code should be in a Web Worker or separated module.
- Preload game assets (fonts, tool icons) during lobby while user waits.
- Target: < 200ms First Contentful Paint, < 1s Time to Interactive.

### 21.4 State Management

- Use Zustand (lightweight) or Jotai for game state. Avoid Redux overhead.
- Derive computed values (amIDrawing, haveIGuessed, timeRemaining) from base state — don't store derived state separately.
- Canvas events are NOT stored in React state — managed directly in a ref + imperative canvas API to avoid re-render cost.

---

## APPENDIX A: COMPLETE SCREEN TRANSITION MAP

```
Landing
  ├── [Start Playing]    → (socket join) → Lobby
  ├── [Create Room]      → (modal) → (create) → Lobby
  ├── [Join via Code]    → (code validate) → Lobby
  └── [Public Room Card] → (click join) → Lobby

Lobby
  ├── [Game Started]     → (socket event) → Game (Word Selection or Watching)
  ├── [Leave]            → Confirm modal → Landing
  └── [Kicked]           → Toast → Landing

Game
  ├── [turnEnd event]    → Turn End Overlay (5s) → resume Game
  ├── [roundEnd event]   → Round End Overlay (5s) → resume Game
  ├── [gameEnd event]    → Game End Screen
  └── [Kicked]           → Kicked Modal → Landing

Game End
  ├── [Play Again]       → (socket reset) → Lobby
  └── [Leave]            → Landing
```

## APPENDIX B: ERROR STATE UX

| Scenario | UI Treatment |
|---|---|
| Room not found | Full page: "Room not found 🙁", [Go Home] button |
| Kicked from room | Modal: "You were removed from the room", cannot dismiss, [Go Home] only |
| Connection lost | Non-blocking amber banner, auto-retry with countdown |
| Failed to reconnect | Blocking modal: "Could not reconnect. Your spot may have been taken." |
| Server error | Toast: "Something went wrong. Please try again." |
| Word pool empty | Seamless (server handles, user never sees this) |
| Room full | Toast: "This room is full. Looking for another..." → auto-join alternate |
| Rate limited | Input shake + "Slow down!" tooltip, no toast |

## APPENDIX C: FONT USAGE QUICK REFERENCE

| Element | Font | Weight | Size |
|---|---|---|---|
| App logo | Syne | 800 | 32px |
| Page headlines | Syne | 700–800 | 48–72px |
| Game state (GAME OVER, etc.) | Syne | 800 | 36–48px |
| Score reveals | Syne | 700 | 28–36px |
| Word (drawer sees) | Syne | 700 | 22px |
| Section headers | Nunito | 800 | 18–22px |
| Player names | Nunito | 700 | 15–16px |
| Chat messages | Nunito | 400–600 | 14px |
| Buttons | Nunito | 700 | 14–16px |
| Labels / badges | Nunito | 700 | 12px |
| Word hint underscores | Nunito (monospace fallback) | 800 | 24px |
| Scores in list | Nunito | 800 | 16px |
| Timer number | Nunito | 800 | 22px |
| Tooltip / captions | Nunito | 400 | 12px |
```
