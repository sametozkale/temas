# 01 — Design System: Granola-Inspired shadcn/ui Customization

> This file is the single source of the design language. Always add it to context when asking Cursor to do UI work.
> Benchmark: Granola — warm neutral canvas, hairline borders, serif display headings, minimal chrome, "quiet" typography, content first / chrome second.

## 1. Design Principles

1. **Quiet UI**: No shadows or very subtle ones; separation comes from hairline borders and background contrast.
2. **Content-first chrome**: Slim sidebar, thin top bar; the visual hierarchy lives in the content.
3. **Warm neutrality**: Not pure grey; a slightly warm (beige-ish) canvas. Paper feel.
4. **One action, one emphasis**: A single primary CTA per screen; everything else ghost/outline.
5. **AI everywhere, never flashy**: Floating prompt bar and inline "Draft with AI" pills — Granola's bottom-centre input pattern.
6. **Generous whitespace**: section padding 24–32px, card inner padding 16–20px.

## 2. Token Set (shadcn CSS variables)

In `app/globals.css` — light + dark. Hex values below; bind them with Tailwind v4 `@theme inline`.

```css
:root {
  --background: #FAFAF7;        /* paper */
  --foreground: #1C1B19;
  --card: #FFFFFF;
  --card-foreground: #1C1B19;
  --popover: #FFFFFF;
  --popover-foreground: #1C1B19;
  --primary: #22211E;           /* warm black — primary buttons are dark, Granola style */
  --primary-foreground: #FAFAF7;
  --secondary: #F3F2EE;
  --secondary-foreground: #3A3936;
  --muted: #F3F2EE;
  --muted-foreground: #6E6C66;
  --accent: #EFEDE8;
  --accent-foreground: #22211E;
  --destructive: #B3402E;
  --destructive-foreground: #FAFAF7;
  --border: #E9E6E0;            /* hairline */
  --input: #E9E6E0;
  --ring: #22211E;
  --radius: 0.625rem;           /* 10px — Granola's soft but not-round corners */

  /* Semantic extras (brand) */
  --brand: #2F5D50;             /* deep green — viewing/slot emphasis, the role of Granola's teal accent bar */
  --brand-soft: #E7EFEA;
  --brand-foreground: #1E3F36;
  --warning: #B0772A;
  --warning-soft: #F6EEDF;
  --success: #3F7A52;
  --success-soft: #E8F0E9;
  --info: #365F8C;
  --info-soft: #E8EEF5;

  /* Chart / calendar colours (low saturation) */
  --chart-1: #2F5D50;
  --chart-2: #B0772A;
  --chart-3: #365F8C;
  --chart-4: #8C4A3C;
  --chart-5: #6B5F8C;
}

.dark {
  --background: #191816;
  --foreground: #EDEDE8;
  --card: #201F1C;
  --card-foreground: #EDEDE8;
  --popover: #201F1C;
  --popover-foreground: #EDEDE8;
  --primary: #EDEDE8;
  --primary-foreground: #191816;
  --secondary: #2A2925;
  --secondary-foreground: #D8D6D0;
  --muted: #2A2925;
  --muted-foreground: #9B988F;
  --accent: #2A2925;
  --accent-foreground: #EDEDE8;
  --destructive: #C05A44;
  --border: #34322D;
  --input: #34322D;
  --ring: #EDEDE8;
  --brand: #7FB3A3;
  --brand-soft: #243530;
  --brand-foreground: #BFE0D5;
  /* adapt warning/success/info soft variants to the dark theme */
}
```

## 3. Typography

- **UI font: Inter** (`next/font/google`, `variable: "--font-sans"`). `font-feature-settings: "cv11", "ss01";` — single-storey a, legible numerals.
- **Display/headings: Newsreader (or Fraunces)** — optional, but the serif display is what gives the Granola feel ("Coming up"). If Inter-only is preferred, headings can be Inter with `tracking-tight font-medium`; decision: use the serif.
  - `h1/h2/page-title`: Newsreader, `font-weight: 400–500`, `letter-spacing: -0.01em`, line-height 1.15.
  - Body/UI: Inter 13–15px; sidebar item 13px; table 13px; time/labels 12px muted.
- Tailwind v4: bind `--font-sans` and `--font-serif` theme variables; the `font-serif` class is for display text.

## 4. shadcn Setup & Component Customizations

```bash
npx create-next-app@latest havn --ts --tailwind --app --src-dir=false
npx shadcn@latest init   # style: new-york, base color: neutral, CSS variables: yes
npx shadcn@latest add button input textarea badge card dialog dropdown-menu \
  popover calendar command avatar separator tooltip sheet tabs table \
  select switch skeleton sonner form label checkbox radio-group \
  alert-dialog breadcrumb scroll-area
```

> Note (implementation): the current shadcn CLI uses the `radix-nova` preset; the `form` component has been replaced by `field`. See `components.json`.

Post-install **component patch list** (applied by hand under components/ui, once):

- **button.tsx**:
  - `default` variant: bg-primary; radius already from the token.
  - New variant `soft`: `bg-secondary text-secondary-foreground hover:bg-accent` (Granola's pill buttons — "Invite", "New note").
  - New size `xs`: `h-7 px-2.5 text-xs rounded-md`.
  - All buttons `font-medium`; `rounded-full` only on the `pill` variant (top-right actions).
- **card.tsx**: `shadow-none border` by default; `border-foreground/10` transition on hover, never a large shadow.
- **input.tsx / textarea**: `shadow-none`, focus `ring-1 ring-ring` (not 2px), bg-card.
- **badge.tsx**: variants `success|warning|info|brand` — soft background + dark text (from tokens), `rounded-full font-medium`.
- **tabs.tsx** (property detail tabs): underline style — `border-b` container, active tab `border-foreground` 1.5px; not pill tabs.
- **dialog/sheet**: radius 16px, hairline border, backdrop `bg-background/80 backdrop-blur-sm`.
- **sonner (toast)**: `richColors: false`, with soft variants.
- New components (under components/, not ui/):
  - `prompt-bar.tsx` — Granola's bottom-centre floating input: `rounded-full border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]`, suggestion chip on the right ("List recent viewings"), expands on focus.
  - `event-chip.tsx` — the thin colour bar in front of a calendar row event (`w-0.5 rounded-full bg-brand`) — Granola's "Coming up" row pattern.
  - `page-header.tsx` — serif title + pill actions on the right, no hairline divider underneath (separate with whitespace).
  - `empty-state.tsx` — icon + one line of text + one ghost CTA; no illustrations.

## 5. Icons — Hugeicons

```bash
npm install @hugeicons/react @hugeicons/core-free-icons
```

- Only the **free** set, stroke style, `strokeWidth: 1.5`, sizes 16/18/20.
- Sidebar icon map: Home → `Home01Icon`, Inbox → `InboxIcon`, Calendar → `Calendar03Icon`, Properties → `Building03Icon`, Settings → `Settings02Icon`.
- Property type icons: apartment/house `Home01Icon`, office `Building03Icon`, shop `Store01Icon`, warehouse `WarehouseIcon`, land `MapsIcon`.
- AI actions: `AiMagicIcon` / `SparklesIcon` — never use emoji.
- Re-export centrally from `components/icons.tsx`; direct package imports are forbidden elsewhere (enforced as a Cursor rule and an ESLint rule).

## 6. Layout

- **AppShell**: left sidebar 232px (collapsed 56px), right content max-width 1080px centred, a thin 48px header on top only for page-specific cases.
- **Sidebar** (Granola pattern): workspace name + switcher on top, primary nav, a "Spaces"-like section → **Properties** shortcuts (5 most used), a Compose/Prompt shortcuts block below, the user at the bottom.
- **Background texture**: content canvas `--background`, cards white — list rows separated with hairline `divide-y`.
- Responsive: <1024px the sidebar becomes a sheet; the pipeline kanban scrolls horizontally.

## 7. Motion

- `transition-colors` 150ms by default; no page transition animation (Granola is static).
- Micro: 200ms height animation on prompt bar submit; plain pulse instead of skeleton shimmer.

## 8. Token → Component Mapping (examples)

| UI element | Token |
|---|---|
| Viewing slot (available) | brand-soft background, brand-foreground text |
| Booking confirmation | success-soft |
| Pipeline "Shortlisted" badge | info-soft |
| Overdue reminder | warning-soft |
| Current tenant window (calendar) | chart-2 accent |
| Agent window (calendar) | chart-1 accent |
| Intersection slots | brand |

## 9. UI Golden Rules for Cursor (also copied into rules)

1. Never use `shadow-lg/md`; separate with borders.
2. Never use emoji; use Hugeicons.
3. Headings serif (`font-serif`); UI Inter.
4. One primary button per screen; the rest `soft`/`ghost`/`outline`.
5. Colours only from tokens; hex literals are forbidden.
6. Empty states use the `empty-state` component.
7. Stay within the radius tokens (card 10px, dialog 16px, pill full).
