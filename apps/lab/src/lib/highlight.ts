/*
 * Build time only: colours code like a code editor (VS Code's "Light+" and "Dark+" themes, with green
 * comments). Each token gets both colours in one CSS value, `light-dark(...)`, and the browser picks by the
 * page's colour scheme, so no JavaScript is needed and any theme switch keeps working.
 * Every colour is checked against the backgrounds code sits on and made darker (light theme) or lighter
 * (dark theme) until it reads at 4.5:1 or better, the WCAG AA level for normal text.
 */
import { createHighlighter } from 'shiki'
import type { CodeToken } from './code-line.ts'

export const LANG = { TYPESCRIPT: 'typescript', GO: 'go' } as const
export type Lang = (typeof LANG)[keyof typeof LANG]

const THEMES = { light: 'light-plus', dark: 'dark-plus' } as const
/** The themes' own text colours: tokens in these colours take the page's text colour instead. */
const PLAIN = { light: '#000000', dark: '#d4d4d4' }

/*
 * Every background code sits on, per theme, from styles/tokens.css: the page (--bg), cards (--surface),
 * insets and hovered lines (--surface-2), and the game's highlighted line and red "money lost" line
 * (--accent-soft and --danger-soft over --surface). Keep in step with tokens.css; the browser tests check
 * the result.
 */
const BACKGROUNDS = {
  light: ['#f5f3ec', '#fbfaf6', '#efece3', '#eaebf1', '#f5eae4'],
  dark: ['#0a0b0e', '#101217', '#161922', '#192032', '#281d20'],
}
const MIN_CONTRAST = 4.5

const highlighter = await createHighlighter({
  themes: [THEMES.light, THEMES.dark],
  langs: [LANG.TYPESCRIPT, LANG.GO],
})

/** The language of a source file, from its extension. */
export function langOf(file: string): Lang {
  if (file.endsWith('.go')) return LANG.GO
  if (file.endsWith('.ts') || file.endsWith('.tsx')) return LANG.TYPESCRIPT
  throw new Error(`No highlighting set up for ${file}`)
}

/** The code as coloured lines. Neighbouring tokens of the same colour are merged. */
export function highlight(code: string, lang: Lang): CodeToken[][] {
  return highlighter.codeToTokensWithThemes(code, { lang, themes: THEMES }).map((line) => {
    const merged: CodeToken[] = []
    for (const token of line) {
      const light = token.variants.light?.color?.toLowerCase() ?? PLAIN.light
      const dark = token.variants.dark?.color?.toLowerCase() ?? PLAIN.dark
      const color =
        light === PLAIN.light && dark === PLAIN.dark
          ? undefined
          : `light-dark(${light === PLAIN.light ? 'currentColor' : readable(light, 'light')}, ${
              dark === PLAIN.dark ? 'currentColor' : readable(dark, 'dark')
            })`
      const last = merged.at(-1)
      if (last && last.color === color)
        merged[merged.length - 1] = { ...last, text: last.text + token.content }
      else merged.push(color ? { text: token.content, color } : { text: token.content })
    }
    return merged
  })
}

/** Coloured lines as HTML, for build-time pages (the islands render tokens themselves). */
export function toHtml(lines: readonly (readonly CodeToken[])[]): string {
  return lines
    .map((line) =>
      line
        .map((token) =>
          token.color
            ? `<span style="color:${token.color}">${escapeHtml(token.text)}</span>`
            : escapeHtml(token.text),
        )
        .join(''),
    )
    .join('\n')
}

function escapeHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

const cache = new Map<string, string>()

/** The colour, darkened (light theme) or lightened (dark theme) in small steps until it passes on every background. */
function readable(hex: string, theme: 'light' | 'dark'): string {
  const key = `${theme}:${hex}`
  const known = cache.get(key)
  if (known) return known
  const toward = theme === 'light' ? [0, 0, 0] : [255, 255, 255]
  let rgb = parse(hex)
  for (let step = 0; step < 40 && !passes(rgb, theme); step++) {
    rgb = rgb.map((channel, i) => Math.round(channel + ((toward[i] ?? 0) - channel) * 0.05))
  }
  if (!passes(rgb, theme)) throw new Error(`Cannot make ${hex} readable on the ${theme} backgrounds`)
  const result = `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
  cache.set(key, result)
  return result
}

function passes(rgb: number[], theme: 'light' | 'dark'): boolean {
  return BACKGROUNDS[theme].every((background) => contrast(rgb, parse(background)) >= MIN_CONTRAST)
}

function parse(hex: string): number[] {
  const value = hex.replace('#', '').slice(0, 6)
  return [0, 2, 4].map((start) => Number.parseInt(value.slice(start, start + 2), 16))
}

/** WCAG 2 contrast ratio between two colours. */
function contrast(a: number[], b: number[]): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05)
}

function luminance(rgb: number[]): number {
  const [r = 0, g = 0, b = 0] = rgb.map((channel) => {
    const c = channel / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
