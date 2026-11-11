// Typefaces from GDD 15.1. All three are self-hosted through Fontsource.

export const FONTS = {
  /** Headings: an old-style printed face. */
  heading: 'IM Fell English',
  /** Body text, tooltips and numbers. */
  body: 'Alegreya Sans',
  /** Handwritten notes, used sparingly. */
  hand: 'Caveat',
} as const;

/** CSS font shorthands the browser loads before the first scene draws text. */
export const FONT_PRELOAD: readonly string[] = [
  `400 32px "${FONTS.heading}"`,
  `400 16px "${FONTS.body}"`,
  `500 16px "${FONTS.body}"`,
  `700 16px "${FONTS.body}"`,
  `400 16px "${FONTS.hand}"`,
];
