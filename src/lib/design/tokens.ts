/**
 * The product's design tokens.
 *
 * Two sources, kept apart on purpose:
 *
 * - `tokens` — the Figma file's **Foundations** page (design of record):
 *   the palette, the accent tones and the type scale the file declares.
 * - `rendered` — what the shipped product **actually renders**: the stylesheet
 *   is the deployed MVP's, byte-for-byte, so these are the computed values.
 *
 * Where the two differ, the file wins for intent and the stylesheet wins for
 * pixels. The differences are listed in `deltas` at the bottom of this file —
 * read it before changing a type size.
 *
 * Fidelity rule 2: never hardcode a colour that is not in this list.
 */

/* ------------------------------------------------------- Figma foundations */

export const colors = {
  // Brand
  forest: "#1B3D29",
  green: "#2F7D52",
  "green-700": "#256B46",
  gold: "#D9A648",
  "gold-ink": "#855B0C",
  "gold-50": "#FDF8EA",
  "gold-100": "#FAEDC9",
  mint: "#8FD4A8",
  "mint-300": "#BDE5CB",
  "mint-200": "#D9F0E1",
  "mint-100": "#E9F6EE",
  "mint-50": "#F4FBF6",
  // Text
  ink: "#14201A",
  "ink-2": "#3B4842",
  muted: "#65726B",
  faint: "#9AA59F",
  // Line
  line: "#E7ECE9",
  "line-2": "#D5DDD8",
  // Surface
  surface: "#FFFFFF",
  "surface-2": "#F5F8F6",
  "surface-3": "#EDF2EF",
  // Status
  red: "#C2392D",
  "red-bg": "#FCECE9",
  blue: "#2A5DB0",
  "blue-bg": "#EAF1FB",
  // Accent
  purple: "#6B4FB8",
  indigo: "#4453C4",
  "gold-dark": "#B7832A",
} as const;

export type ColorToken = keyof typeof colors;

/**
 * The icon-tile tones. Same five colours, named the way the stylesheet names
 * its classes (`.st-ico.gold` is the gold-dark tile).
 */
export const iconTones = {
  blue: colors.blue,
  purple: colors.purple,
  green: colors["green-700"],
  indigo: colors.indigo,
  gold: colors["gold-dark"],
} as const;

export type IconTone = keyof typeof iconTones;

/**
 * The type scale, as the Figma Foundations page declares it. Sizes and weights
 * are the file's; the line-heights and tracking are what the product renders.
 */
export const type = {
  display: { size: 44, weight: 700, name: "Display" },
  "heading-h1": { size: 22, weight: 700, name: "Heading/H1" },
  "heading-h2": { size: 20, weight: 700, name: "Heading/H2" },
  "heading-h3": { size: 17, weight: 700, name: "Heading/H3" },
  title: { size: 15, weight: 600, name: "Title" },
  body: { size: 14, weight: 400, name: "Body" },
  "body-medium": { size: 14, weight: 500, name: "Body/Medium" },
  "body-bold": { size: 14, weight: 700, name: "Body/Bold" },
  caption: { size: 12, weight: 500, name: "Caption" },
  eyebrow: { size: 11, weight: 700, name: "Eyebrow" },
  button: { size: 14, weight: 700, name: "Button" },
  stat: { size: 28, weight: 800, name: "Stat" },
} as const;

export type TypeRole = keyof typeof type;

/* ---------------------------------------------------- what the app renders */

/**
 * The values the shipped stylesheet produces. These are the ones a screen must
 * match pixel-for-pixel; the Figma scale above is the design intent behind
 * them.
 */
export const rendered = {
  ".t-h1": { size: 22, weight: 700, tracking: "-0.02em", lineHeight: "1.2" },
  ".t-h2": { size: 20, weight: 700, tracking: "-0.02em" },
  ".t-h3": { size: 17, weight: 700, tracking: "-0.01em" },
  body: { size: 14, weight: 400 },
  ".st-card b": { size: 16, weight: 700 },
  ".st-card p": { size: 12.5, weight: 400, lineHeight: 1.45 },
  ".st-tag": { size: 10, weight: 800, tracking: "0.12em" },
  ".nav-h": { size: 10.5, weight: 800, tracking: "0.12em" },
  ".nav a": { size: 14, weight: 600 },
  ".badge": { size: 10.5, weight: 800 },
  ".chip": { size: 12.5, weight: 600 },
  ".btn": { size: 14, weight: 700 },
  ".btn.sm": { size: 13, weight: 700 },
  ".kpi .v": { size: 30, weight: 800, tracking: "-0.03em" },
  ".qstat b": { size: 22, weight: 800, tracking: "-0.02em" },
  ".tk": { size: 13.5, weight: 800 },
  ".wordmark": { size: 28, weight: 700, tracking: "-0.035em" },
  ".slogan": { size: 7.3, weight: 600, tracking: "0.42em" },
} as const;

/**
 * Where the Figma scale and the rendered stylesheet disagree. The stylesheet
 * wins for pixels; the file is what a future design change would update.
 */
export const deltas: Array<{ what: string; figma: string; rendered: string }> = [
  { what: "Display", figma: "44px Bold", rendered: "32–44px (sign-in 32, landing 52)" },
  { what: "Eyebrow", figma: "11px Bold", rendered: "10px/800 (.st-tag), 10.5px/800 (.nav-h)" },
  { what: "Stat", figma: "28px ExtraBold", rendered: "30px/800 (.kpi .v), 22px/800 (.qstat b)" },
  { what: "Heading/H1", figma: "22px Bold", rendered: "22px/700 (.t-h1) — same size" },
  { what: "Weight 500", figma: "Body/Medium, Caption", rendered: "used by .btn:hover and .kpi .l" },
];

/* ------------------------------------------------------------- the geometry */

/** Radii used across the product. */
export const radii = {
  card: 16,
  station: 18,
  tile: 14,
  control: 12,
  small: 9,
  pill: 999,
} as const;

/** Fixed geometry. Changing these is a new component type, not a tweak. */
export const geometry = {
  sidebar: 248,
  sidebarCollapsed: 84,
  topbarPadding: "18px 28px",
  pagePadding: "4px 28px 0",
  stationCard: { width: 316, height: 162, radius: 18, padding: 18, gap: 6, minHeight: 150 },
  iconTile: { width: 48, height: 48, radius: 14, glyph: 24 },
  navRow: { height: 40 },
  button: { height: 44, radius: 12, padding: "0 18px" },
  buttonSmall: { height: 34, radius: 9, padding: "0 12px" },
  iconButton: { width: 44, height: 44, radius: 12 },
  chip: { height: 32, radius: 999, padding: "0 12px" },
  avatar: { width: 38, height: 38, radius: 12 },
} as const;

/** Breakpoints, max-width, matching the stylesheet's media queries. */
export const breakpoints = {
  sm: 420,
  xs: 560,
  md: 640,
  lg: 720,
  xl: 760,
  xxl: 820,
  station: 900,
  wide: 1000,
  wider: 1100,
  rail: 1180,
} as const;

/** The reference viewport every geometry measurement was taken at. */
export const referenceViewport = { width: 1280, height: 720 } as const;
