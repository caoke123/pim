/** src/styles/typography.ts — PIM Design System Typography Tokens */

/* ================================================================
   Font stacks — system-first, mono for data/IDs
   ================================================================ */
export const fonts = {
  /** Primary UI font — headings, body, buttons */
  sans: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif",
  /** Technical identifiers — SPU codes, SKU codes, timestamps, terminal */
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace",
} as const

/* ================================================================
   Typographic scale — Linear-inspired hierarchy
   ================================================================ */
export interface TypeToken {
  family: string
  size: string
  weight: 400 | 500 | 600 | 700
  lineHeight: string
  letterSpacing: string
}

export const scale: Record<string, TypeToken> = {
  /** Page titles — 24px / 600 */
  'display-lg': {
    family: 'sans',
    size: '24px',
    weight: 600,
    lineHeight: '1.3',
    letterSpacing: '-0.4px',
  },
  /** Drawer titles, sidebar brand — 17px / 600 */
  'heading': {
    family: 'sans',
    size: '17px',
    weight: 600,
    lineHeight: '1.4',
    letterSpacing: '-0.2px',
  },
  /** Body — 15px / 400 */
  'body': {
    family: 'sans',
    size: '15px',
    weight: 400,
    lineHeight: '1.6',
    letterSpacing: '0',
  },
  /** UI — buttons, inputs, nav — 14px / 400 */
  'ui': {
    family: 'sans',
    size: '14px',
    weight: 400,
    lineHeight: '1.5',
    letterSpacing: '0',
  },
  /** Captions, th headers — 12px / 500 */
  'caption': {
    family: 'sans',
    size: '12px',
    weight: 500,
    lineHeight: '1.4',
    letterSpacing: '0',
  },
  /** Mono — SKU codes, times, IDs — 12px / 400 */
  'mono': {
    family: 'mono',
    size: '12px',
    weight: 400,
    lineHeight: '1.5',
    letterSpacing: '0.3px',
  },
}

/* ================================================================
   Utility — generate CSS class string
   ================================================================ */
export function typography(key: keyof typeof scale): string {
  const t = scale[key]
  const family = t.family === 'mono' ? fonts.mono : fonts.sans
  return `font-family:${family}; font-size:${t.size}; font-weight:${t.weight}; line-height:${t.lineHeight}; letter-spacing:${t.letterSpacing}`
}

/* ================================================================
   Tabular figures — for numbers that need alignment (prices, counts)
   ================================================================ */
export const tabularNums = 'font-variant-numeric: tabular-nums'
