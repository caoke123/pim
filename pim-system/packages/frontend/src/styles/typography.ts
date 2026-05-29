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
  /** Stats cards — 32px numbers */
  'display-lg': {
    family: 'sans',
    size: '32px',
    weight: 600,
    lineHeight: '1.1',
    letterSpacing: '-0.4px',
  },
  /** Page titles — 24px */
  'display-md': {
    family: 'sans',
    size: '24px',
    weight: 500,
    lineHeight: '1.2',
    letterSpacing: '-0.4px',
  },
  /** Product names (drawer) — 17px */
  'heading': {
    family: 'sans',
    size: '17px',
    weight: 600,
    lineHeight: '1.3',
    letterSpacing: '-0.2px',
  },
  /** Card titles — 15px */
  'title': {
    family: 'sans',
    size: '15px',
    weight: 500,
    lineHeight: '1.4',
    letterSpacing: '-0.1px',
  },
  /** Section labels — 13px */
  'section': {
    family: 'sans',
    size: '13px',
    weight: 500,
    lineHeight: '1.4',
    letterSpacing: '0.3px',
  },
  /** Body — 14px */
  'body': {
    family: 'sans',
    size: '14px',
    weight: 400,
    lineHeight: '1.5',
    letterSpacing: '0',
  },
  /** Secondary body — 13px */
  'body-sm': {
    family: 'sans',
    size: '13px',
    weight: 400,
    lineHeight: '1.5',
    letterSpacing: '0',
  },
  /** Captions / meta — 12px */
  'caption': {
    family: 'sans',
    size: '12px',
    weight: 400,
    lineHeight: '1.4',
    letterSpacing: '0',
  },
  /** Small labels / badges — 11px */
  'label': {
    family: 'sans',
    size: '11px',
    weight: 500,
    lineHeight: '1.3',
    letterSpacing: '0.2px',
  },
  /** Micro text — 10px */
  'micro': {
    family: 'sans',
    size: '10px',
    weight: 400,
    lineHeight: '1.3',
    letterSpacing: '0',
  },
  /** Buttons — 13px medium */
  'button': {
    family: 'sans',
    size: '13px',
    weight: 500,
    lineHeight: '1.2',
    letterSpacing: '0',
  },
  /** SPU/SKU/ItemId — 11px mono */
  'mono-id': {
    family: 'mono',
    size: '11px',
    weight: 400,
    lineHeight: '1.4',
    letterSpacing: '0',
  },
  /** Terminal / code — 10px mono */
  'mono-sm': {
    family: 'mono',
    size: '10px',
    weight: 400,
    lineHeight: '1.5',
    letterSpacing: '0',
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
