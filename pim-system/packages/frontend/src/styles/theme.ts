/** src/styles/theme.ts — PIM Design System Theme Tokens */

/* ================================================================
   Typed Theme — single source of truth for all visual values
   ================================================================ */

export interface ThemeTokens {
  bg: string
  surface: string
  surfaceElevated: string
  surfaceHover: string
  glass: string
  glassBorder: string
  glassShadow: string
  glassBlur: string
  border: string
  borderSoft: string
  text: string
  textSecondary: string
  textMuted: string
  textInverse: string
  accent: string
  accentHover: string
  accentSoft: string
  accentGlow: string
  input: string
  inputFocus: string
  overlay: string
  shadow: string
  shadowLg: string
  success: string
  successBg: string
  warning: string
  warningBg: string
  error: string
  errorBg: string
  info: string
  infoBg: string
  sidebarBg: string
  sidebarText: string
  sidebarTextActive: string
  sidebarBorder: string
  sidebarActiveBg: string
}

/* ================================================================
   Light — Stripe Dashboard / Linear Light / Strapi-inspired
   ================================================================ */
export const lightTokens: ThemeTokens = {
  bg: '#FFFFFF',
  surface: '#F6F9FC',
  surfaceElevated: '#FFFFFF',
  surfaceHover: 'rgba(0,0,0,0.02)',
  glass: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(255,255,255,0.65)',
  glassShadow: '-8px 0 40px rgba(15,23,42,0.12)',
  glassBlur: 'blur(24px) saturate(180%)',
  border: 'rgba(0,0,0,0.08)',
  borderSoft: 'rgba(0,0,0,0.04)',
  text: '#0A2540',
  textSecondary: '#425466',
  textMuted: '#8898AA',
  textInverse: '#FFFFFF',
  accent: '#635BFF',
  accentHover: '#4F46E5',
  accentSoft: 'rgba(99,91,255,0.08)',
  accentGlow: '0 0 0 3px rgba(99,91,255,0.12)',
  input: 'rgba(255,255,255,0.48)',
  inputFocus: 'rgba(255,255,255,0.72)',
  overlay: 'rgba(15,23,42,0.12)',
  shadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  shadowLg: '0 8px 24px rgba(0,0,0,0.10)',
  success: '#09825D',
  successBg: '#D3F8EE',
  warning: '#B54708',
  warningBg: '#FEF0C7',
  error: '#C01048',
  errorBg: '#FFE4E8',
  info: '#0369A1',
  infoBg: '#E0F2FE',
  sidebarBg: '#0B1120',
  sidebarText: '#9899A6',
  sidebarTextActive: '#FFFFFF',
  sidebarBorder: 'rgba(255,255,255,0.07)',
  sidebarActiveBg: 'rgba(99,91,255,0.12)',
}

/* ================================================================
   Dark — Linear / Raycast / Vercel / Arc Browser
   ================================================================ */
export const darkTokens: ThemeTokens = {
  bg: '#010102',
  surface: '#0f1011',
  surfaceElevated: '#141516',
  surfaceHover: 'rgba(255,255,255,0.05)',
  glass: 'rgba(13,15,20,0.82)',
  glassBorder: 'rgba(255,255,255,0.06)',
  glassShadow: '-8px 0 40px rgba(0,0,0,0.5)',
  glassBlur: 'blur(24px) saturate(180%)',
  border: 'rgba(255,255,255,0.06)',
  borderSoft: 'rgba(255,255,255,0.03)',
  text: '#F0F0F5',
  textSecondary: '#9899A6',
  textMuted: '#5C5D6E',
  textInverse: '#010102',
  accent: '#5e6ad2',
  accentHover: '#828fff',
  accentSoft: 'rgba(94,106,210,0.12)',
  accentGlow: '0 0 0 3px rgba(94,106,210,0.15)',
  input: 'rgba(255,255,255,0.04)',
  inputFocus: 'rgba(255,255,255,0.08)',
  overlay: 'rgba(15,23,42,0.12)',
  shadow: 'none',
  shadowLg: 'none',
  success: '#34C78A',
  successBg: 'rgba(52,199,138,0.1)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.1)',
  error: '#F87171',
  errorBg: 'rgba(248,113,113,0.1)',
  info: '#60A5FA',
  infoBg: 'rgba(96,165,250,0.1)',
  sidebarBg: '#010102',
  sidebarText: '#5C5D6E',
  sidebarTextActive: '#F0F0F5',
  sidebarBorder: 'rgba(255,255,255,0.04)',
  sidebarActiveBg: 'rgba(94,106,210,0.12)',
}

export function getThemeTokens(theme: 'light' | 'dark'): ThemeTokens {
  return theme === 'dark' ? darkTokens : lightTokens
}
