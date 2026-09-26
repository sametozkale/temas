# 01 — Design System: Granola-Inspired shadcn/ui Customization

> This file is the single source of the design language. Always add it to context when asking Cursor to do UI work.
> Benchmark: Granola — warm neutral canvas, hairline borders, serif display headings, minimal chrome, "quiet" typography, content first / chrome second.

## 1. Design Principles

1. **Quiet UI**: No shadows or very subtle ones; separation comes from hairline borders and background contrast. Scrollbars are thin, token-tinted chrome (`foreground/18`), not a dark gutter.
2. **Content-first chrome**: Slim sidebar, thin top bar; the visual hierarchy lives in the content.
3. **Warm neutrality**: Not pure grey; a slightly warm (beige-ish) canvas. Paper feel.
4. **One action, one emphasis**: A single primary CTA per screen; everything else ghost/outline.
5. **AI everywhere, never flashy**: Home is a centred “ask anything” column (greeting + prompt, coming up, suggestion chips). The prompt sticks to the bottom only while a thread is open. Inline “Draft with AI” pills elsewhere.
6. **Generous whitespace**: section padding 24–32px, card inner padding 16–20px.

## 2. Token Set (shadcn CSS variables)

In `app/globals.css` — light, dark, and contrast. Hex values below; bind them with Tailwind v4 `@theme inline`.

**Contrast** is a third appearance (Profile → Appearance). The page panel stays on the light tokens. The app frame (`--frame`, `bg-frame`) and sidebar (`.theme-chrome`) use the dark canvas (`#191816`) and dark sidebar tokens. Content, popovers, and toasts stay light.

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
  - `h1/page-title`: Newsreader, `text-xl` (20px), `font-weight: 500`, `letter-spacing: -0.01em`, line-height 1.15. Quiet — not a hero.
  - Body/UI: Inter 13–15px; sidebar item 13px; table 13px; time/labels 12px muted; form field names 13px medium.
- Tailwind v4: bind `--font-sans` and `--font-serif` theme variables; the `font-serif` class is for display text.

## 4. shadcn Setup & Component Customizations

```bash
npx create-next-app@latest temas --ts --tailwind --app --src-dir=false
npx shadcn@latest init   # style: new-york, base color: neutral, CSS variables: yes
npx shadcn@latest add button input textarea badge card dialog dropdown-menu \
  popover calendar command avatar separator tooltip sheet tabs table \
  select switch skeleton sonner form label checkbox radio-group \
  alert-dialog breadcrumb scroll-area
```

> Note (implementation): the current shadcn CLI uses the `radix-nova` preset; the `form` component has been replaced by `field`. See `components.json`.

Post-install **component patch list** (applied by hand under components/ui, once):

- **button.tsx**:
  - `default` variant: bg-primary.
  - New variant `soft`: `bg-secondary text-secondary-foreground hover:bg-accent` (quiet pills — "Invite", "New note").
  - New size `xs`: `h-7 px-2.5 text-xs`. Size `lg` is `h-10` so form primaries match input height (onboarding, sign-in).
  - All buttons `font-medium` and `rounded-full` (every variant/size except `link`).
- **select.tsx**: trigger matches input (`h-10`, `bg-card`, `shadow-none`, 1px focus ring). Size `sm` is **32px** (`h-8`) for compact toolbars (Calendar property/agent filters, Properties search row). Menu is `shadow-none ring-1 ring-foreground/10` and the same width as the trigger. Native `<select>` is forbidden in product UI — always use this dropdown. Long searchable lists use the same trigger chrome with Command search: IANA timezones (`TimezoneSelect`), ISO 4217 currencies (`CurrencySelect`, TRY / EUR / USD / GBP pinned, then A–Z), and countries / cities (`SearchSelect` via CountriesNow — country first, then cities for that country, then a free-text district).
- **card.tsx**: `shadow-none border` by default; `border-foreground/10` transition on hover, never a large shadow.
- **input.tsx / textarea**: `h-10` (40px touch target), `shadow-none`, focus `ring-1 ring-ring` (not 2px), bg-card. Size `sm` is **32px** (`h-8`, 13px type) for compact toolbars. Select trigger matches input height; the dropdown opens at the trigger’s width. **date-picker.tsx** — popover + `Calendar` for date fields (pipeline public forms, etc.); no native `type="date"`.
- **label.tsx / field.tsx**: field names are `text-[13px]` (Inter, medium). Vertical `Field` gap between the name and the control is **8px** (`gap-2`).
- **checkbox.tsx**: 16px rounded square (`rounded-[4px]`), not a circle. Idle border is `foreground/15` (softer than `--input`); hover `foreground/25`; checked fills `primary` with `Tick02Icon`.
- **switch.tsx** (HeroUI v3 geometry, still Radix): track is a short rounded rect (`rounded-xl`, default 40×20), thumb is a **wider rounded rectangle** (`rounded-lg`, 22×16) that slides with margin — not a circular iOS pill. Off `bg-input`, on `bg-brand`, white thumb (`bg-card`, dark `bg-foreground`) with the HeroUI field shadow. Sizes `sm` / `default` / `lg` match HeroUI `sm` / `md` / `lg`.
- **badge.tsx**: variants `success|warning|info|brand` — soft background + dark text (from tokens), `rounded-full font-medium`.
- **tabs.tsx**: underline is the default (Tasks). Property detail uses the `pill` variant — a `bg-muted` segmented control, active segment `bg-card` (white) with the prompt-bar whisper `shadow-[0_1px_2px_rgb(0_0_0/0.04)]`, `text-sm` medium, counts on Viewings, Applications, and Inventory (not People or Files). Group labels sit in the tab order (Overview through Activity), not as a second row.
- **dialog/sheet**: radius 16px, hairline border, backdrop `bg-background/80 backdrop-blur-sm`.
- **scrollbars** (`globals.css`): product-wide 8px rounded thumbs, idle `foreground/18` on a transparent track, hover `foreground/28`. `scroll-area` thumb matches. Chrome, not content — quieter than `--border` text. **Cursors** (`globals.css` `@layer base`): links, buttons, tabs, menu rows, checkboxes, radios, switches, combobox triggers and other interactive roles use `pointer`; disabled controls use `not-allowed`. Text fields keep the text cursor.
- **sonner (toast)**: `richColors: false`, with soft variants. Compact vertical padding (`10px` / `16px` horizontal) on every toast.
- New components (under components/, not ui/):
  - `prompt-bar.tsx` — Granola ask field: 44px bar with a fixed `rounded-[22px]` (already a pill at that height — do not use `rounded-full`, whose 9999px radius slides the bottom-right corner while the bar grows). A muted `PlusSignIcon` on the left (`strokeWidth` 2, same as send) opens the file picker (drag-drop and paste too). When a second line is needed **or files are attached** it morphs (200ms ease-out, height only) into a ChatGPT-style stack: Perplexity-like chips (64px image thumbs or `bg-secondary` file cards, hairline, `rounded-xl`, quiet X) sit above the textarea; text grows upward; + and send stay absolutely pinned to the bottom row. Collapses back when the text fits and nothing is attached. 0.5px hairline border, `bg-card`, `shadow-[0_1px_2px_rgb(0_0_0/0.04)]`, Enter to send / Shift+Enter newline, circular send with `ArrowUp02Icon` (`strokeWidth` 2). Empty (no text, no files): muted `bg-muted` and `disabled`. With a prompt or attachment: filled `bg-primary`. Idle: arrow points right; on first keystroke or attach it rotates up (200ms). Honour `prefers-reduced-motion`. No focus ring. Placeholder “Ask anything…” in `text-muted-foreground/50` (one step quieter than field placeholders). On Home it sits under the greeting; chips are a separate Suggestions row.
  - `event-chip.tsx` — the thin colour bar in front of a calendar **list** row (`w-0.5 rounded-full bg-brand`) — Granola's "Coming up" row pattern. Month/week cells use `calendar/event-pill.tsx` instead (Notion compact chip).
  - `page-header.tsx` — compact serif title (`text-xl`) on one row with actions; optional quiet `titleSuffix` (tabular count) beside the title; description underneath when needed, max-width 42rem; no extra bottom padding (parent spacing).
  - `empty-state.tsx` — icon + one line of text + one ghost CTA; no illustrations.
  - **Error / not-found** (`AppError`, `app/global-error.tsx`, `app/not-found.tsx`): centred in the viewport (or the remaining canvas). Serif `text-xl` title, one muted line, one `lg` (`h-10`) primary pill. Not a dashed empty-state card. The global boundary is inline-styled with the same tokens so it still matches if CSS fails to load.
  - **Emails**: product mail (`emails/_layout.tsx`) and Auth mail (`supabase/templates/`) share the same chrome — paper `#FAFAF7` canvas, white 10px card, hairline `#E9E6E0`, Newsreader wordmark + heading, Inter body, one warm-black pill CTA (`#22211E`), muted 12px footer. GoTrue cannot read Tailwind, so Auth templates inline those hex values. CTA hrefs are `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=…` (never `{{ .ConfirmationURL }}`, whose `redirect_to` falls back to a leftover localhost Site URL). Hosted Auth Site URL + Redirect URLs must include the public `APP_URL`. Sign-in mail is sent by the app with `emails/auth-link.tsx` (the same chrome), so GoTrue’s default “Your sign-in link” template is not what the user receives. `/api/auth/send-email` still rewrites loopback redirects to `APP_URL` when Auth calls the hook for other messages.

## 5. Icons — Hugeicons

```bash
npm install @hugeicons/react @hugeicons/core-free-icons
```

- Only the **free** set, stroke style, `strokeWidth: 1.5`, sizes 16/18/20.
- Sidebar icon map: Home → `Home01Icon` (active page → `Home04Icon`, the same house with an interior line), Inbox → `InboxIcon`, Calendar → `Calendar03Icon`, Tasks → `CheckmarkSquare02Icon`, Properties → `Building03Icon`. Settings → `Settings02Icon` and Give feedback → `ChatFeedbackIcon` as a pair of icon buttons above the user, separated by a hairline. Give feedback opens a quiet dialog (textarea + Send); the note is emailed via Resend (Mailpit in development) to `FEEDBACK_TO`. Collapse/expand (top row) → `SidebarLeftIcon`.
- Property type icons: apartment/house `Home01Icon`, office `Building03Icon`, shop `Store01Icon`, warehouse `WarehouseIcon`, land `MapsIcon`.
- AI actions: `AiMagicIcon` / `SparklesIcon` — never use emoji.
- Re-export centrally from `components/icons.tsx`; direct package imports are forbidden elsewhere (enforced as a Cursor rule and an ESLint rule).

## 6. Layout

- **AppShell**: paper canvas (`bg-frame`, which matches `--background` in light and dark). In **contrast**, the frame and sidebar are the dark canvas and the page panel stays the light `bg-card`. Left sidebar 232px (collapsed **42px** — nav `px-2` plus the 34px icon chip, no empty gutter after the chip), no rail border — the body edge is the separator. The body is a white `bg-card` panel (`rounded-xl`, whisper `border-foreground/6` hairline — not the input `--border` token) inset **8px** from the frame. Collapsed, that 8px sits after the 42px rail so the card width matches the icon clip. Expanded, the card sits flush to the rail (`pl-0`) so the white panel stays a step wider. Same chrome on `/settings/*`. Page content inside the panel is centred at max-width 1080px with `px-6 pt-6 pb-8` — the side inset matches the top inset (24px). Settings (`/settings/*`) adds another `pt-4` so the serif title sits lower in the canvas. Home keeps that side padding and only tightens the bottom (`pb-2`) so the thread composer can sit **8px** from the panel edge. **Inbox** and the **property record** are full-bleed inside the panel (no 1080px column, no page padding) so their splits meet the rounded edge. A thin 48px header on top only for the mobile menu, above the panel. Destination pages stream behind a quiet pulse skeleton (`CanvasPending`) that follows that screen’s chrome — Home’s centred prompt, Inbox split, calendar month grid, property cards, record header + tabs, Tasks groups, Settings cards — muted bars, no spinner. Property tab switches only pulse the tab body; the listing header stays.
- **Inbox**: Linear-style split inside the white panel. A hairline down the middle; no nested card. Left pane: compact UI-font **Inbox** title on the left; new email (pencil), search, filter (Gmail / WhatsApp / unanswered, then assigned agent), then more menu (connect an integration) on the right of that row. Search is a 16px icon; while it is open the title gives way to a 32px field that filters the loaded threads by subject, sender name, or sender email, and the query stays when a thread opens. Then the thread list (hover rows, no dividers). The relative time on a row stays hidden until that row is hovered. Reaching the bottom of that list loads the next older page of Gmail. Opening a thread does not move the list; it stays at the same scroll position. The funnel sits in `muted-foreground` and goes `foreground` while any filter is on. Channel is a 12px Gmail or WhatsApp mark beside the timestamp only when the list holds more than one channel, so a single mailbox stays unmarked — not an “Email ·” / “WhatsApp” prefix; email subject stays as the second line, 4px under the name, and the message body is not repeated under it. Right pane: the open thread, a new email (To, subject, message, sent through the agent’s Gmail), or a quiet empty canvas. The empty canvas offers the same new-email action. **No threads yet** is not a dashed card: 32px outline `InboxIcon` in `muted-foreground/40` (quieter than the title and body), a short title, one muted line about connecting Gmail/WhatsApp, and two equal outline pills with the official brand marks (links to the setup pages). Hide a pill that is already connected; assistants see the copy without buttons. If both channels are connected but empty, drop the pills and say the inbox is waiting. On <md the list pane hides so that connect empty fills the panel. When the list has threads but none is selected, the right pane stays icon + one muted line. An email thread header is the contact name on the same 44px row as **Inbox** (`text-sm` medium, same color and weight). The subject sits flush under that name (`-mt-3`, `text-xs` `text-muted-foreground`) and is not repeated in the message list. Each message is a row: sender and time, plus a one-line preview while collapsed. The agent’s own mail is a row labeled You, in the same list as the other person. The latest message starts open and the view rests on it; earlier messages open on click. Quoted history stays behind Show trimmed content. Open HTML renders in a sandboxed frame at the message’s own layout, scaled to the pane, with scripts removed. Plain replies stay text. WhatsApp stays chat bubbles. An open email’s header keeps the sender on the left and a Gmail-style icon row on the right (star, mark unread, archive, spam, delete) — 16px outline icons, ghost, `muted-foreground`, tooltips. Star stays filled in `foreground` while on. Those actions are email-only. The reply composer is capped (`max-h-40`, `field-sizing-fixed`) so long text wraps and scrolls inside the textarea instead of widening the split. Empty list on desktop is centred muted copy. On <md the list and thread swap (one pane at a time) with a back control.
- **Sidebar** (Granola pattern): **workspace switcher** + collapse control on the top row (first control). The switcher is the workspace mark (24px rounded square inside the 28px control: logo when set, otherwise the same `bg-muted` fill and optically centred `text-muted-foreground` initials as person avatars) plus truncated name and a chevron. Collapse, Settings and Give feedback idle at `text-muted-foreground/50` (one step quieter than nav) and rise to `foreground` on hover. Primary-nav icons stay in their natural 18px slot after row padding; the mark is inset so its centre lines up with those icons. Collapsed, only the mark is shown — the collapse control is hidden until the mark is hovered, then the expand icon appears over it (click to reopen the rail). The inner rail stays 232px and is clipped (labels do not reflow). Nav icons keep the same `px-2` slot expanded and collapsed so they do not shift. Selected and hover states on the collapsed rail hug the 18px icon with **equal 8px inner padding** left and right (`w-fit`, `rounded-md`) — all four corners visible, never a wide bar. The 42px clip ends at the chip’s right edge; the canvas sits **8px** after that. Menu: memberships (logo or initials, name, role, active tick), New workspace, separator, Workspace settings (`/settings/workspace`). Then primary nav (Home / Inbox / Calendar / Tasks / Properties). The Inbox unread count is a soft brand pill (`bg-brand-soft`, `text-brand-foreground`), capped at 99+. A ChatGPT-style **Chats** list (recent `ai_threads`) with a same-row `+` (`PlusSignIcon`) that opens `/home` as a new chat. The **Chats** label, chevron and `+` use `text-secondary-foreground` so they read as a heading against muted nav and thread titles, without going full black. The list itself is collapsible (persisted in `localStorage`). Collapsed, the heading and thread titles clip away; the new-chat `+` stays in the 42px rail as a nav-sized chip (`h-8 w-fit px-2`) with a right tooltip. At the bottom: Settings + Give feedback icons, a slightly inset softer hairline (`bg-sidebar-border/40`), then the user (photo when set, otherwise `bg-muted` initials optically centred in the circle). The user menu is **Profile settings** (`/settings`) and Sign out — no workspace list. Collapsed, settings/feedback stay `size-7`; the user chip keeps `px-1.5` and hugs the avatar. Menus open to the right.
- **Settings**: while on `/settings/*` the same 232px rail switches to a Granola preferences sidebar — Back to app, then **Account** (Profile, Notifications, AI) and **Workspace** (General, Members, Integrations, Templates, Billing) groups 24px apart, each row with the same 18px Hugeicon as primary nav. Category labels use a lighter `text-muted-foreground/50`. Sign out at the bottom. Workspace switching stays on the main app sidebar. Integrations on that rail are the signed-in user’s Google account and WhatsApp. **Google is one connection for mail and calendar** (Gmail mark on the list). Its detail page is a setup until connected, then two rows: Mail and Calendar. If calendar access is missing, Calendar offers Reconnect. WhatsApp stays its own row. **Support** sits in Account, for every role: three plan cards (included email, founder WhatsApp, Priority). Email is a `mailto` on every plan. The founder number and WhatsApp link render only when Founder or Priority is the saved plan. Founder shows them on that card. Priority shows email and WhatsApp with the note box under the cards (subject + description), emailed with the sender’s name, address, and that they have Priority. A plan that is not current offers Buy for one month and Subscribe; both save that plan on the account without charging. The current plan keeps the Current badge and a brand hairline (`border-brand/25`), the same family as that badge. **Billing** is owner-only (hidden for agents/assistants): a Monthly / Yearly pill, then plan tiles with a Current badge. Yearly shows the lower monthly price and the amount billed once a year. The current tile is one hairline (`border-brand/25`), the same soft brand stroke as the current Support card — not a border stacked on a ring. Current is only the interval saved on the workspace. The other interval of that plan offers Switch to yearly or Switch to monthly. The other plan’s switch control is that screen’s primary button, this-cycle seats/listings/AI credits, payment method, and an invoices table. Content is a `max-w-2xl` column centred in the main canvas (`SettingsPage` / `SettingsGroup` / `SettingsItem`), with extra top padding (`pt-4` on the settings layout) so the large serif title sits lower than other app pages: large serif title with no subtitle, muted group labels (optional right action), then icon+title+description rows in `rounded-2xl` cards with equal `p-4` padding and the control on the right. Preference rows **auto-save** (text on pause/blur, selects and switches on change) — Profile, Workspace general, Notifications, and AI have no group Save. **Templates** is a list of contract starters; each row opens its own page (back to the list) with explicit Save / Restore. New template is its own page. **Notifications** is a matrix of Email / WhatsApp switches per alert (daily digest, viewing bookings, 2-hour reminders, new applications, owner decisions). WhatsApp is disabled until a phone is set on Profile. **Gmail and WhatsApp connection rows use the official brand marks** (not Hugeicons). The Google row covers mail and calendar from one sign-in and opens a detail page. While disconnected, that page is a setup canvas: numbered steps and the connect control in the body (not a header Save). Once connected it lists Mail and Calendar; Calendar can ask to reconnect when that access is missing. **WhatsApp** also shows a generated pairing QR (scan with the phone camera, or confirm “I’ve scanned”). Connect/disconnect and the inbound simulator live on that page, not on the list. General includes a **workspace logo** (owner), a **profile photo**, and an **official company name** (legal name on contracts; the workspace name stays what the team sees). Both images upload to the public `avatars` bucket. No underline tabs.
- **Property detail**: a full-bleed split in the white panel. A 48px top row holds the **Properties** back link on the left and Map / Move to / more on the right. Move to uses the `outline` button (white `bg-card`, hairline border). Listing fields are edited inline on the rail, so there is no Edit button. The row's bottom rule and the rail's right rule are the whisper `border-foreground/6`, quieter than `--border`. Below it, a hairline column (~340px, own scroll) stays put on every tab: small cover with the status badge at the top right of the rail, serif title, address, then quiet label/value rows (rent, deposit, dues, area, rooms, condition, and the rest of the listing facts) and the lifecycle under a hairline. The right pane holds a pill segmented control (Overview, Viewings, Applications, People, Files, Inventory, Activity — counts on Viewings, Applications, and Inventory; not People or Files) and the scrolling tab body. The tab body is its own container so Viewings and the pipeline size to that pane. Left-rail values are inline-editable when the member can write: click a value, edit, blur or Enter saves that field through `patchProperty`. Rent per m² stays computed. Lifecycle stays a read-only funnel; status still moves with Move to. Below `lg` the rail stacks above the tabs and the page scrolls as one. Overview is photos and description only (facts live on the rail). Photos upload in place to the private Supabase `property-media` bucket (signed URL). **Map** opens a dotted full-panel canvas (`/properties/[id]/map`) with dashed wireframe cards: property in the centre, agent / owner / tenant around it, and a read-only **pipeline** under the listing (one column per open stage). Each pipeline card is a household — stacked avatars and names for everyone who will live there, not a single applicant. Cards link through to Overview, People or Applications. Empty roles and empty stages stay as placeholders so the diagram shape holds. **People** cards use equal 16px padding (no extra `pt` on `CardContent`), initials avatars, a muted contact line, and quiet ghost actions.
- **Tasks**: Linear-style issue list. Serif title + primary New task; underline tabs **All / Assigned / Suggested**. Each category is its own block (not one wrapping card): a rounded group bar (property name, count, `+`) with compact rows underneath, and a separate **Completed** bar at the bottom. Rows: 16px signal priority, 16px rounded checkbox status (`Checkbox`, `rounded-[4px]`, idle border `foreground/15`), truncated title, 18px assignee, short date. Icons sit in a 16px slot (not a round checkbox or cramped bars). Row hover is a `rounded-md` wash. Title, priority and assignee edit inline (click title to type; menus on priority and avatar). The New task dialog is for create only.
- **Property list**: search, type/status/agent filters and the grid/list toggle share **one compact 32px row** (`Input`/`Select` `sm`) — they do not wrap. Search is a **200px** field that shrinks if needed so the selects stay on the line. The view switch is a 32px pill with `ml-auto`, always on the **far right** of that row; inner icon buttons fill the remaining height after `p-0.5`. Grid cards: cover `aspect-[4/3]`, status badge over the photo (top-right) so the title keeps the full width. Body is title (two lines), address, one muted facts line (type · rooms · area), then rent and the assigned agent on one baseline. Cards in a row share height; rent sits at the bottom.
- **New property**: a centred stepped wizard, not stacked cards. A thin `h-1` progress bar (`bg-brand` fill on `bg-muted`) and a muted **New property** / **n of N** row stay at the top. The serif question, quiet hint, step fields and Back / Continue sit together **vertically centred** in the remaining space (24px between those blocks; scroll from the top when a step is taller than the viewport). The form has a 4px inset so the 1px focus ring is not clipped on the field sides. Back (and Cancel on step 1) is ghost with `text-secondary-foreground` — one step quieter than body black. One step at a time: type tiles, name (+ assigned agent), address, rent (plus deposit and building dues), extras (layout, building, condition, amenities). Optional steps accept empty fields. Edit stays the sectioned form in the same `max-w-xl` column as the wizard. Listing facts follow rental portals: bedrooms, bathrooms, floor / total floors, year built, condition, available-from, dues.
- **Public booking** (`/b/[token]`): Cal.com-style split card on the paper canvas — event meta (title, host, duration, address, timezone) on the left; a month calendar of days with open slots and a time column for the selected day on the right. Below `lg` the card stacks (compact meta, then calendar, then a 2–3 column time grid) and goes edge-to-edge on the smallest screens. After a time is picked, the calendar is replaced by details + OTP. Times render once, in the timezone the visitor selects (defaults to the browser).
- **Calendar**: Notion-style month fills the remaining canvas. The Month / Week / List control remembers the last choice (`calendar_view` cookie), so opening Calendar after another page or a reload returns to that view. An explicit `view` in the URL still wins. Until Google Calendar is connected, and the range has no viewings, that area is an empty state — connect, or reconnect when calendar access is missing — instead of a blank grid. Viewings still use the grid when Google is not connected. A 7-column hairline grid (no nested card), weekday labels on a quiet header row, equal-height week rows. Day numbers sit top-left; today is a filled `foreground` circle. Events are **single-line pills** (`h-5`, `rounded-[3px]`, `text-[11px]`): time + truncated property title (prospect/agent on the native title). The pill has no left colour bar; colour is only the wash. On a day before today the clock time stays off the pill until hover. Week is a time grid: each hour is 48px, so a block is as tall as it lasts (thirty minutes is half an hour, two hours is four times a half hour), with 2px trimmed from the bottom so back-to-back events stay separate. Overlapping blocks share the column. All-day events sit in a band above the hours. An email address is not printed on the block. Google events use the same pill: a light wash takes that event’s Google label colour, then its legacy colour, then the calendar colour. Without a colour, the same event title always uses the same chart tone. A right-click opens that calendar’s colours as the same light wash as the pills, in Google’s 6-column order. Hovering a swatch shows Google’s name for it. The choice is saved on the event; a repeating event keeps one colour across its instances. They open a quiet dialog: UI-font title, then the day and time. Join is an outline button. Guests are a hairline section — initials, name, email under it, response on the right (Organizer under the response). A declined guest is struck through. Description sits in its own muted section. The footer is the calendar name beside a quiet Open in Google Calendar link. Right-click still sets the colour. They are not links. A Google control on the toolbar lists that user’s calendars — only they see those events, and a property or another agent’s filter hides them. Saturday and Sunday columns (the week starts Monday) carry a whisper `bg-muted/30` wash through the weekday label and the day cells. Outside-month weekdays stay the quieter `bg-muted/15`. Week keeps the seven columns, with an hour gutter and a scrollable day. List groups events by day: a weekday and date rail (today is the filled circle; Saturday and Sunday use the whisper wash; the month name shows when it changes) beside full-width rows. A row hover is a rounded `bg-muted` wash with padding around the title. Toolbar: month (or week range) hugging compact chevrons + Today on the left (no reserved month width). Today is omitted while the current day is already on the painted grid (including leading/trailing month cells). Property and agent `sm` selects sit on the title row, to the right of Calendar. Google and Month/Week/List stay on the range row. The view switch is the same pill as Profile → Appearance, at `h-7` so it lines up with the Google control. Appearance itself stays `h-8`. Active segment is `bg-card`.
- **Home landing**: greeting, composer, coming up and suggestions sit as one block. The Suggestions label is `text-xs`. Under it, today’s calendar events show only when today has any, as the same size and radius as the suggestion pills (`h-7`, `rounded-full`, `text-xs`), with a soft wash and quieter tabular time. A Google event opens its detail dialog. A viewing opens that week on the calendar. **vertically centred** in the main canvas (not pinned with `pt-[12vh]`). Recent chats live in the sidebar. The empty composer placeholder types and erases example questions.
- **Home thread**: an open Ask conversation is a chat column (not full-width stacked cards). The title row overlays the white panel (`lg:absolute lg:top-3 lg:right-3 lg:left-[18px]`): the title’s left inset matches its top inset (the 16px type sits 18px from the padded canvas). The message list starts **8px** below that row (in flow on small screens via `mb-2`; `lg:pt-6` on the column clears the overlay). The AI-named title is `text-xs text-muted-foreground` on the left (empty until haiku names the thread); a more icon on the right opens **Rename** and **Delete**. The user prompt is a right-aligned `bg-brand-soft` bubble (`text-brand-foreground`); the answer is a left-aligned `bg-secondary` bubble. Both hug content (`max-w-[85%]`, `rounded-2xl`). Role is implied by alignment — no “You” / “Temas” labels inside the bubble. Workspace records in either bubble (property, person, conversation, applicant, task) are **inline chips** — `Badge outline`, inherit the bubble type, `align-middle` with equal `py-[3px]` so they sit on the text line without looking squashed, type icon + truncated name, `bg-card`, hairline, click-through — never a raw URL or markdown link. Source chips sit under the answer only when that citation was not already inlined. The prompt bar is pinned **8px** from the page bottom.
- **Marketing site** (`/`, signed-out only): a public landing outside the app shell, in the section rhythm of aside.com (hero with a product view, a short manifesto, a feature trio, deep feature blocks, a trust grid, plans, a closing call to action, footer). Its look is a paper collage: torn-paper edges, engraved object illustrations, polaroid agent photos with handwritten names, crop-mark corners on beige panels, and a `--brand` frame around the hero. Colours still come from tokens only (`--background` paper, `--secondary`/`--muted` panels, `--brand` frame, soft icon circles from the `*-soft` tokens). Only here may the serif run at hero size (`text-5xl`–`text-7xl`, `font-normal`, `tracking-tight`); the app keeps the quiet `text-xl` title. The hero product frame is a coded replica of the app chrome, never a screenshot. Its sidebar tabs switch the canvas between Home, Inbox, Calendar, Tasks and Properties without leaving the page. Plans are two quiet cards (Solo, Team) with a Monthly / Yearly pill; yearly shows the lower monthly price and a “billed annually” line. Prices come from `lib/plans.ts`, never hard-coded. Conversion is soft: one primary pill **Get started** (nav, hero, plans, closing) to `/login?intent=signup`, a ghost Sign in, and quiet anchors. No popups, countdowns or sticky banners. Sections fade up once on scroll; reduced motion shows them in place.
- **Auth pages** (`/login`, `/login?intent=signup`, `/invite/[token]`): the first screens after the marketing site, so they share its look. Always the paper theme. Split layout from `lg`: the form column on the left (the `Temas` wordmark links back to `/`, the form sits in a `max-w-sm` column, a muted `©` line at the bottom) and a `--brand` collage panel on the right (a photo with crop marks, a polaroid with a handwritten name, a torn-paper scrap and the hero line in serif on the brand colour). Below `lg`, only the form column shows. The form title runs at `text-4xl font-normal`; inputs and the full-width primary pill stay the app components. Sign in and sign up link to each other under the form. Still one magic-link flow.
- Responsive: <1024px the sidebar becomes a sheet; the pipeline kanban scrolls horizontally.

## 7. Motion

- `transition-colors` 150ms by default; no route-level page transitions (Granola is static).
- Sidebar collapse/expand: width 280ms `cubic-bezier(0.4, 0, 0.2, 1)` (standard ease). The inner rail stays 232px and is clipped — labels do not reflow. The Chats header fades with the same timing. When the rail or the Chats disclosure opens, thread rows stagger into place (220ms ease, 32ms delay per row, cap 12) instead of fading as a block. Honour `prefers-reduced-motion`. Do not animate the first paint after restoring collapse from `localStorage`.
- Home Ask: on the first submit the composer **FLIP-slides** to the bottom (400ms ease-out), then the user bubble **rises** from it (300ms). Later user turns only rise. Honour `prefers-reduced-motion`.
- Empty composer: the placeholder **types and erases** 5 example questions in a loop (quiet typewriter). Pause while focused or filled. Reduced motion shows the first example statically.
- Micro: 200ms ease-out morph on prompt bar grow (pill → stacked composer, text up / buttons down); plain pulse instead of skeleton shimmer. Honour `prefers-reduced-motion`.

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
