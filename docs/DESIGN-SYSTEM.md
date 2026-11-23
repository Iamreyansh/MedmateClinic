# Design system

The contract for building anything that must look like MedMate.

Two sources, and they are not the same thing:

- **The Figma file's Foundations page** — the design of record. The palette, the accent
  tones and the type scale below are taken from it.
- **The deployed MVP's stylesheet** — `src/styles/medmate.css`, byte-identical to
  production. This is what renders. Where the file and the stylesheet disagree, the
  stylesheet wins for pixels and the file wins for intent.

Both are transcribed into `src/lib/design/tokens.ts` so code can reference a token by
name instead of repeating a hex value.

---

## 1. Colour

### Brand

| Token | Hex | Used by |
|---|---|---|
| `--forest` | `#1B3D29` | sidebar, token chips, active nav, clinic badge |
| `--green` | `#2F7D52` | primary action |
| `--green-700` | `#256B46` | hover, active nav row, icon tile |
| `--gold` | `#D9A648` | count badges, avatars, the gold button |
| `--gold-ink` | `#855B0C` | text on `--gold-50` |
| `--gold-50` | `#FDF8EA` | token chips, badges |
| `--gold-100` | `#FAEDC9` | |
| `--mint` | `#8FD4A8` | nav section heads at 70% |
| `--mint-300` | `#BDE5CB` | card hover border |
| `--mint-200` | `#D9F0E1` | nav labels |
| `--mint-100` | `#E9F6EE` | token chips, badges, focus ring |
| `--mint-50` | `#F4FBF6` | chip active, note background |

### Text · Line · Surface · Status · Accent

| Token | Hex | | Token | Hex |
|---|---|---|---|---|
| `--ink` | `#14201A` | | `--line` | `#E7ECE9` |
| `--ink-2` | `#3B4842` | | `--line-2` | `#D5DDD8` |
| `--muted` | `#65726B` | | `--surface` | `#FFFFFF` |
| `--faint` | `#9AA59F` | | `--surface-2` | `#F5F8F6` |
| `--red` | `#C2392D` | | `--surface-3` | `#EDF2EF` |
| `--red-bg` | `#FCECE9` | | `--purple` | `#6B4FB8` |
| `--blue` | `#2A5DB0` | | `--indigo` | `#4453C4` |
| `--blue-bg` | `#EAF1FB` | | `--gold-dark` | `#B7832A` |

One dark green family, one gold accent, one red for danger, one blue for information.
Mint tints mark success. The three accent tones exist for the icon tiles and nothing else.

### Shadows

```
--sh-2  0 4px 14px #14201a14     hover, selected pill
--sh-3  0 12px 32px #14201a29    overlays
```

A resting shadow on a card is wrong. The base card has none.

---

## 2. Type

**Outfit**, `400 500 600 700 800`, from Google Fonts with `display=swap`.
`font-family: Outfit, system-ui, sans-serif` — the stylesheet names it directly, so no
font variable is introduced.

Outfit has no `₹` glyph, so the rupee sign falls back to Inter, as it does in the app.

### The Figma scale

| Role | Size | Weight |
|---|---|---|
| Display | 44px | Bold |
| Heading/H1 | 22px | Bold |
| Heading/H2 | 20px | Bold |
| Heading/H3 | 17px | Bold |
| Title | 15px | SemiBold |
| Body | 14px | Regular |
| Body/Medium | 14px | Medium |
| Body/Bold | 14px | Bold |
| Caption | 12px | Medium |
| Eyebrow | 11px | Bold |
| Button | 14px | Bold |
| Stat | 28px | ExtraBold |

### What the stylesheet renders

| Class | Size | Weight | Tracking |
|---|---|---|---|
| `.t-h1` | 22px | 700 | −0.02em |
| `.t-h2` | 20px | 700 | −0.02em |
| `.t-h3` | 17px | 700 | −0.01em |
| body | 14px | 400 | |
| `.st-card b` | 16px | 700 | |
| `.st-card p` | 12.5px | 400 | line-height 1.45 |
| `.st-tag` | 10px | 800 | 0.12em, uppercase |
| `.nav-h` | 10.5px | 800 | 0.12em, uppercase |
| `.nav a` | 14px | 600 | |
| `.badge` | 10.5px | 800 | |
| `.chip` | 12.5px | 600 | |
| `.btn` | 14px | 700 | |
| `.btn.sm` | 13px | 700 | |
| `.kpi .v` | 30px | 800 | −0.03em |
| `.qstat b` | 22px | 800 | −0.02em |
| `.tk` | 13.5px | 800 | |
| `.wordmark` | 28px | 700 | −0.035em |
| `.slogan` | 7.3px | 600 | 0.42em, uppercase |

### Known deltas

- **Eyebrow** — the file says 11px Bold; the app renders 10px/800 (`.st-tag`) and
  10.5px/800 (`.nav-h`). Follow the app.
- **Stat** — the file says 28px ExtraBold; the app renders 30px/800 (`.kpi .v`) and
  22px/800 (`.qstat b`). Follow the app.
- **Display** — the file says 44px; the app renders 32px on sign-in and 52px on the
  marketing page.

---

## 3. Geometry

| Radii | Used by |
|---|---|
| 18px | station cards |
| 16px | generic cards, KPI tiles |
| 14px | stat tiles, icon tiles, notes |
| 12px | buttons, nav rows, pills, inputs |
| 9px | small buttons, pill buttons |
| 999px | count badges, chips, avatars |

Card borders are always `1px solid var(--line)`. Chips use `1.5px solid var(--line-2)`.

### Card dimensions

| Component | Width | Height | Radius | Padding | Gap | Min-height |
|---|---|---|---|---|---|---|
| Station card `.st-card` | 316px | 162px | 18px | 18px | 6px | 150px |
| Icon tile `.st-ico` | 48px | 48px | 14px | — | — | — |
| Stat tile `.qstat` | auto | content | 14px | 12px | — | — |
| KPI tile `.kpi` | auto | content | 16px | 16px | 6px | — |
| Nav row `.nav a` | 220px | 40px | 12px | 0 12px | 12px | — |
| Button `.btn` | auto | 44px | 12px | 0 18px | 8px | — |
| Small button `.btn.sm` | auto | 34px | 9px | 0 12px | 8px | — |
| Icon button `.iconbtn` | 44px | 44px | 12px | — | — | — |
| Chip `.chip` | auto | 32px | 999px | 0 12px | 6px | — |
| Token `.tk` | 56px | 44px | 12px | — | — | — |
| Avatar `.avatar` | 38px | 38px | 12px | — | — | — |

### The shell

| Element | Measurement |
|---|---|
| Sidebar | 248px (`--side`), collapses to an 84px rail under 1180px |
| Sidebar background | `--forest` |
| Sidebar padding | 22px 14px |
| Shell layout | grid — `#app { grid-template-columns: var(--side) 1fr }` |
| Topbar | `--surface-2`, `padding: 18px 28px`, sticky |
| Page | `.page { padding: 4px 28px 0 }` |
| Station grid | 3 columns, 14px gap → 316px each at 1280px |

### Breakpoints

`420 · 560 · 640 · 720 · 760 · 820 · 900 · 1000 · 1100 · 1180` (max-width),
`1181px` (min-width). Below 1180px the sidebar becomes an icon rail; below 900px the
station grid drops to one column.

---

## 4. Icons

38 glyphs, all 24×24, `viewBox="0 0 24 24"`, `class="i"`, `aria-hidden="true"`,
`stroke="currentColor"`, `fill="none"`, `stroke-width="1.9"`, round caps and joins.

`queue` · `rx` · `folder` · `pill` · `rupee` · `users` · `out` · `check` · `inbox` ·
`send` · `lab` · `cal` · `x` · `plus` · `alert` · `shield` · `spark` · `pen` · `search` ·
`up` · `phone` · `mic` · `video` · `chart` · `copy` · `cert` · `kiosk` · `more` ·
`print` · `hand` · `home` · `nurse` · `stetho` · `pin` · `gear` · `back` · `chev` · `lock`

One set, one geometry. Icons sit at 20px in navigation, 24px in a 48px tile, 14–16px
inline. An icon that is the only content of a control needs the accessible name on the
control, not on the SVG.

---

## 5. The kit

`src/components/ui/` — the primitives. Each emits the stylesheet's own class names.

| Component | Class | Notes |
|---|---|---|
| `Icon` | `i` | the 38-glyph set |
| `Button` | `btn` + `sec`/`ghost`/`forest`/`gold`/`danger`, `sm`, `block` | 44px, 34px small |
| `IconButton` | `iconbtn` | 44×44, `label` is required |
| `Chip` / `Chips` | `chip` / `chips` | `on` for active |
| `Pills` | `pills` | segmented control, `fill`, `yn` |
| `Input` / `TextArea` / `SearchInput` | `input` / `search-in` | 46px, focus ring mint-200 |
| `Avatar` | `avatar av-<tone>` | 38px gold tile; tones: doctor, reception, nurse, admin, lab, accounts |
| `UserChip` | `userchip` | the signed-in person |
| `ClinicChip` | `clinic-chip` | the clinic switcher |
| `Badge` | `badge` + tone | 10.5px/800 |
| `Token` | `tk` | the queue token, `M`/`W` variants |
| `Card` | `card` | generic |
| `StationCard` | `st-card` + `st-ico` + `st-tag` | 316×162, fixed |
| `StatTile` / `StatTiles` | `qstat` / `qstats` | `hot` variant |
| `Kpi` / `Kpis` | `kpi` / `kpis` | `dark` variant |
| `Note` | `note` + tone | mint, gold, red, blue |
| `Title` | `t-h1` / `t-h2` / `t-h3` | `emphasis` renders `<em>` in green |
| `ManageRow` | `mg-row` | a tile, a title, a line of detail, a chevron |
| `FeatureCard` | `lp-feat` | the marketing card: tile, title, paragraph |
| `PlanCard` | `pz-card` (+ `hi`, `cur`) | pricing; `pz-badge` is the "Most popular" shoulder |
| `MobileHeader` | `mob-head` | forest gradient, 32px bottom radius, lock button, avatar |
| `MobileTabBar` | `bnav` | fixed white pill; the active tab is a forest tile with a gold icon |

`ManageRow`, `FeatureCard` and `PlanCard` live in `src/components/marketing/`:
they carry product knowledge, so they are not primitives.

`src/components/layout/` — `AppShell`, `Sidebar`, `Topbar`, `NavLink`, `MobileHeader`,
`MobileTabBar`.
`src/lib/nav.ts` — the nav model; each entry carries a `resource` so the server's
capability set can filter it. `builtRoutes` lists the routes that exist, so a link to a
screen that has not been built yet is not prefetched (and does not 404).

### The Figma's fifteen components

Icons · Button · Badge · Avatar · Input · Nav item · Sidebar · Topbar · Station card ·
Manage row · Feature card · Plan card · Mobile header · Mobile tab item · Mobile tab bar.
All fifteen are covered by the kit above.

Two of them differ from what the Figma file draws, because the deployed product does it
differently and the stylesheet wins for pixels:

- **Plan card** — the file shows a forest-filled card with a gold price; the product
  renders the highlighted card white with a green border (`.pz-card.hi`), a soft shadow
  and the forest "Most popular" badge.
- **Topbar** — the file shows the clinic badge, the location chip and the user chip; the
  deployed product adds the lock and sign-out buttons (`.iconbtn`).

---

## 6. Rules

1. Reuse the class vocabulary. A new one-off class is how a product drifts.
2. Never hardcode a colour. Use the token.
3. Never add a resting shadow.
4. Card geometry is fixed.
5. Every micro-label is 10–11px, weight 800, uppercase, tracked out.
6. Test at 1280×720.
7. Verify by measurement, not by eye.

When an animation is added, extend the `prefers-reduced-motion` block in
`src/styles/app.css` in the same change. The kiosk is a public-facing surface and it
animates continuously.
