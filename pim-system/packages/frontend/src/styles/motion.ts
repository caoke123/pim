/** src/styles/motion.ts — PIM Design System Motion Tokens */

/* ================================================================
   Unified easing — all animations use the same spatial curve
   ================================================================ */
export const easing = {
  /** Primary spatial curve — drawer, modal, page transitions */
  spatial: [0.16, 1, 0.3, 1] as const,
  /** Quick interactions — hover, focus, micro-interactions */
  quick: [0.25, 0.1, 0.25, 1] as const,
  /** Smooth deceleration — fade, scale, reveal */
  smooth: [0, 0, 0.2, 1] as const,
  /** Acceleration — exit animations */
  exit: [0.4, 0, 1, 1] as const,
}

/* ================================================================
   Duration scale — consistent across all animations
   ================================================================ */
export const duration = {
  instant: 100,
  fast: 150,
  base: 220,
  normal: 300,
  slow: 420,
  slower: 600,
} as const

/* ================================================================
   Transition presets — ready-to-use for Framer Motion / CSS
   ================================================================ */
export const transitions = {
  /** Drawer slide-in/out, modals, panels */
  drawer: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  },
  /** Hover state changes */
  hover: {
    duration: duration.base,
    ease: easing.quick,
  },
  /** Focus ring appearance */
  focus: {
    duration: duration.base,
    ease: easing.quick,
  },
  /** Fade + slight lift */
  fadeUp: {
    duration: duration.normal,
    ease: easing.smooth,
  },
  /** Scale appearance (e.g. tooltips, popovers) */
  scale: {
    duration: duration.base,
    ease: easing.quick,
  },
  /** Page-level transitions */
  page: {
    duration: duration.slow,
    ease: easing.spatial,
  },
} as const

/* ================================================================
   CSS-ready cubic-bezier strings
   ================================================================ */
export const cssEasing = {
  spatial: `cubic-bezier(${easing.spatial.join(',')})`,
  quick: `cubic-bezier(${easing.quick.join(',')})`,
  smooth: `cubic-bezier(${easing.smooth.join(',')})`,
  exit: `cubic-bezier(${easing.exit.join(',')})`,
} as const
