# 01 — Design System: Granola-Inspired shadcn/ui Customization

> Bu dosya tasarım dilinin tek kaynağıdır. Cursor'a UI işi yaptırırken her zaman context'e ekle.
> Benchmark: Granola — sıcak nötr zemin, kırılgan çizgi (hairline) çerçeveler, serif display başlıklar, minimal chrome, "sessiz" tipografi, içerik önde krom geride.

## 1. Tasarım Prensipleri

1. **Quiet UI**: Gölge yok ya da çok hafif; ayrım hairline border ve zemin kontrastıyla.
2. **Content-first krom**: Sidebar slim, üst bar ince; görsel hiyerarşi içerikte.
3. **Sıcak nötrlük**: Saf gri değil; hafif sıcak (bej'imsi) zemin. Kâğıt hissi.
4. **Bir aksiyon, bir vurgu**: Ekranda tek primary CTA; gerisi ghost/outline.
5. **AI her yerde ama süslü değil**: Floating prompt bar ve inline "Draft with AI" pill'leri — Granola'nın alt-orta input pattern'i.
6. **Boşluk cömert**: section padding 24–32px, kart iç padding 16–20px.

## 2. Token Seti (shadcn CSS variables)

`app/globals.css` içine — light + dark. Hex veriyorum; Tailwind v4 ile `@theme inline` kullan.

```css
:root {
  --background: #FAFAF7;        /* kağıt */
  --foreground: #1C1B19;
  --card: #FFFFFF;
  --card-foreground: #1C1B19;
  --popover: #FFFFFF;
  --popover-foreground: #1C1B19;
  --primary: #22211E;           /* sıcak siyah — primary butonlar koyu, Granola tarzı */
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
  --radius: 0.625rem;           /* 10px — Granola'nın yumuşak ama yuvarlak-olmayan köşeleri */

  /* Semantic extras (brand) */
  --brand: #2F5D50;             /* derin yeşil — viewing/slot vurgusu, Granola'daki teal accent bar rolü */
  --brand-soft: #E7EFEA;
  --brand-foreground: #1E3F36;
  --warning: #B0772A;
  --warning-soft: #F6EEDF;
  --success: #3F7A52;
  --success-soft: #E8F0E9;
  --info: #365F8C;
  --info-soft: #E8EEF5;

  /* Charts / calendar renkleri (az doygun) */
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
  /* warning/success/info soft varyantlarını koyu temaya uyarla */
}
```

## 3. Tipografi

- **UI fontu: Inter** (`next/font/google`, `variable: "--font-sans"`). `font-feature-settings: "cv11", "ss01";` — tek katlı a, okunaklı rakamlar.
- **Display/başlıklar: Newsreader (veya Fraunces)** — opsiyonel ama Granola hissini veren şey serif display'dir ("Coming up"). Inter-only istenirse başlıklar `tracking-tight font-medium` Inter ile de gider; karar: serif kullan.
  - `h1/h2/page-title`: Newsreader, `font-weight: 400–500`, `letter-spacing: -0.01em`, satır yüksekliği 1.15.
  - Body/UI: Inter 13–15px; sidebar item 13px; tablo 13px; zaman/etiket 12px muted.
- Tailwind v4: `--font-sans` ve `--font-serif` theme değişkenlerine bağla; `font-serif` sınıfı display için.

## 4. shadcn Kurulumu & Bileşen Özelleştirmeleri

```bash
npx create-next-app@latest havn --ts --tailwind --app --src-dir=false
npx shadcn@latest init   # style: new-york, base color: neutral, CSS variables: yes
npx shadcn@latest add button input textarea badge card dialog dropdown-menu \
  popover calendar command avatar separator tooltip sheet tabs table \
  select switch skeleton sonner form label checkbox radio-group \
  alert-dialog breadcrumb scroll-area
```

Kurulum sonrası **bileşen patch listesi** (components/ui altında elle uygulanır, bir kez):

- **button.tsx**: 
  - `default` variant: bg-primary; radius zaten token'dan.
  - Yeni variant `soft`: `bg-secondary text-secondary-foreground hover:bg-accent` (Granola'nın pill butonları — "Invite", "New note").
  - Yeni size `xs`: `h-7 px-2.5 text-xs rounded-md`.
  - Tüm butonlar `font-medium`, `rounded-full` sadece `pill` variant'ında (üst sağ aksiyonlar).
- **card.tsx**: `shadow-none border` default; hover'da `border-foreground/10` geçişi, asla büyük gölge yok.
- **input.tsx / textarea**: `shadow-none`, focus `ring-1 ring-ring` (2px değil), bg-card.
- **badge.tsx**: variantlar `success|warning|info|brand` — soft zemin + koyu metin (token'lardan), `rounded-full font-medium`.
- **tabs.tsx** (property detay sekmeleri): underline stili — `border-b` container, aktif tab `border-foreground` 1.5px; pill tablo değil.
- **dialog/sheet**: radius 16px, hairline border, arka plan `bg-background/80 backdrop-blur-sm`.
- **sonner (toast)**: `richColors: false`, soft variant'larla.
- Yeni bileşenler (components/ altında, ui/ değil):
  - `prompt-bar.tsx` — Granola'nın alt-orta floating input'u: `rounded-full border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]`, sağda öneri chip'i ("List recent viewings"), odakta genişler.
  - `event-chip.tsx` — takvim satırında event önündeki ince renk barı (`w-0.5 rounded-full bg-brand`) — Granola'nın "Coming up" satır pattern'i.
  - `page-header.tsx` — serif başlık + sağda pill aksiyonlar, altında hairline divider yok (boşlukla ayrıl).
  - `empty-state.tsx` — ikon + 1 satır metin + 1 ghost CTA; illüstrasyon yok.

## 5. İkonlar — Hugeicons

```bash
npm install @hugeicons/react @hugeicons/core-free-icons
```

- Sadece **free** set, stroke stili, `strokeWidth: 1.5`, boyutlar 16/18/20.
- Sidebar ikon haritası: Home → `Home01Icon`, Inbox → `InboxIcon`, Calendar → `Calendar03Icon`, Properties → `Building03Icon`, Settings → `Settings02Icon`.
- Property type ikonları: ev `Home01Icon`, ofis `Building03Icon`, mağaza `Store01Icon`, depo `WarehouseIcon`, arsa `MapsIcon`.
- AI aksiyonları: `AiMagicIcon` / `SparklesIcon` — asla emoji kullanma.
- Merkezi `components/icons.ts` ile re-export et; kodda doğrudan paket importu yasak (Cursor kuralı olarak yaz).

## 6. Layout

- **AppShell**: sol sidebar 232px (collapsed 56px), sağ içerik max-width 1080px ortalı, üstte 48px ince header sadece sayfa-özel durumlarda.
- **Sidebar** (Granola pattern): üstte workspace adı + switcher, primary nav, "Spaces" benzeri bölüm → **Properties** kısayolları (en çok kullanılan 5), alt blokta Compose/Prompt kısayolları, en altta kullanıcı.
- **Arka plan dokusu**: içerik zemini `--background`, kartlar beyaz — liste satırları hairline `divide-y` ile.
- Responsive: <1024px sidebar sheet'e dönüşür; pipeline kanban yatay scroll.

## 7. Motion

- `transition-colors` 150ms default; sayfa geçişlerinde animasyon yok (Granola statiktir).
- Micro: prompt bar submit'te 200ms yükseklik animasyonu; skeleton shimmer yerine düz pulse.

## 8. Token → Bileşen Eşlemesi (örnekler)

| UI öğesi | Token |
|---|---|
| Viewing slot (available) | brand-soft zemin, brand-foreground metin |
| Booking onayı | success-soft |
| Pipeline "Shortlisted" rozeti | info-soft |
| Geciken hatırlatıcı | warning-soft |
| Mevcut kiracı penceresi (takvim) | chart-2 aksan |
| Agent penceresi (takvim) | chart-1 aksan |
| Kesişim slotları | brand |

## 9. Cursor'a Verilecek UI Altın Kuralları (bu dosyanın sonuna ekle, rules'a da kopyala)

1. Asla `shadow-lg/md` kullanma; ayrım border ile.
2. Asla emoji; Hugeicons kullan.
3. Başlıklar serif (`font-serif`); UI Inter.
4. Primary buton ekranda bir tane; gerisi `soft`/`ghost`/`outline`.
5. Renkler sadece token'lardan; hex literal yasak.
6. Boş durumlar `empty-state` bileşeniyle.
7. Radius token dışına çıkma (kart 10px, dialog 16px, pill full).
