import { Bebas_Neue, Cormorant_Garamond, Montserrat, Outfit } from "next/font/google";

/**
 * Self-hosted fonts with metric-adjusted fallbacks.
 *
 * Why not a plain <link> to fonts.googleapis.com?
 *  - The <link> is render-blocking and adds two third-party origins
 *    (DNS + TLS + connection) before any text can paint.
 *  - The plain fallback (Arial/system) has different metrics, so when the
 *    webfont finally arrives every line of text reflows. On a text-heavy
 *    page that is a visible layout shift — and while scrolling it means the
 *    browser has to re-layout mid-scroll, which is exactly the "not smooth"
 *    feeling we're trying to remove.
 *
 * `next/font` fixes both: the fonts are downloaded at build time and served
 * from our own origin, preloaded, and it generates a fallback family with
 * matching `size-adjust` / `ascent-override` so the swap causes zero shift.
 *
 * The `variable` option exposes the (generated) family stack as a CSS custom
 * property, which `globals.css` maps onto the existing `--font-*` variables.
 */

export const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--fd-bebas",
  display: "swap",
});

// Cormorant Garamond is served as a VARIABLE font (single WOFF2 with a
// wght axis) instead of separate static files. Usage audit found only
// weights 400 (default) and 700 in use — the previously shipped 600 was
// never rendered. Requests outside 400–700 (e.g. the 300/800/900 sprinkled
// around the codebase) clamp to the range endpoints, which is exactly what
// the browser's nearest-static-weight fallback did before, so the rendered
// result is unchanged.
export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: "variable",
  variable: "--fd-cormorant",
  display: "swap",
});

// Montserrat: all five previously-shipped weights (400/500/600/700/800) are
// genuinely used, so they collapse into one variable file rather than five
// preloaded static ones.
export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: "variable",
  variable: "--fd-montserrat",
  display: "swap",
});

// Outfit: kept as an explicit static weight list on purpose. All four
// weights are used (400 default, 600 admin labels, 700 body/buttons, 800
// CTA buttons). A variable range here would change rendering: the contact
// page requests weight 500, which today falls back to the 400 file (500
// isn't shipped) but would render as a true 500 from a variable axis.
export const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--fd-outfit",
  display: "swap",
});

export const fontVariables = [
  bebasNeue.variable,
  cormorant.variable,
  montserrat.variable,
  outfit.variable,
].join(" ");
