/**
 * Theme-to-Pexels-query mapping for background selection.
 */

export const BACKGROUND_THEMES = [
  'Dark Abstract',
  'Neon Gradient',
  'Space/Cosmic',
  'Minimal Texture',
  'Cyberpunk',
] as const;

export type BackgroundTheme = (typeof BACKGROUND_THEMES)[number];

export const THEME_TO_QUERY: Record<BackgroundTheme, string> = {
  'Dark Abstract': 'dark abstract gradient minimal',
  'Neon Gradient': 'neon gradient abstract',
  'Space/Cosmic': 'space nebula stars dark',
  'Minimal Texture': 'dark texture grain minimal',
  Cyberpunk: 'cyberpunk neon dark',
};
