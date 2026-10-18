import { type ComponentChildren, Fragment } from 'preact'
import type { CodeToken } from '../lib/code-line.ts'

const BREAK_AFTER = /[.(,]$/

/**
 * A narrow screen may break a line after a dot, a bracket or a comma, never inside a name (as the proof card does).
 * The mark goes after every one, also at the end of a token: a "(" is often a token of its own.
 */
function breakable(text: string): ComponentChildren {
  const parts = text.split(/(?<=[.(,])/)
  const marked = parts.some((part) => BREAK_AFTER.test(part))
  if (!marked) return text
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {BREAK_AFTER.test(part) ? <wbr /> : null}
    </Fragment>
  ))
}

/** One line of code, coloured like a code editor (the colours are worked out at build time). */
export function CodeText(props: { readonly tokens: readonly CodeToken[] }) {
  return (
    <>
      {props.tokens.map((token, index) =>
        token.color ? (
          <span key={index} style={{ color: token.color }}>
            {breakable(token.text)}
          </span>
        ) : (
          breakable(token.text)
        ),
      )}
    </>
  )
}

/**
 * One line of code that wraps under its own indent: the leading spaces become a padding, and a wrapped part starts
 * two characters further in, so a long line that wraps on a phone still reads as one line.
 */
export function IndentedCode(props: { readonly tokens: readonly CodeToken[] }) {
  const indent = leadingSpaces(props.tokens)
  return (
    <code class="wrap-code" style={{ '--i': indent }}>
      <CodeText tokens={withoutIndent(props.tokens, indent)} />
    </code>
  )
}

function leadingSpaces(tokens: readonly CodeToken[]): number {
  const text = tokens.map((token) => token.text).join('')
  return text.length - text.trimStart().length
}

function withoutIndent(tokens: readonly CodeToken[], indent: number): CodeToken[] {
  let left = indent
  const out: CodeToken[] = []
  for (const token of tokens) {
    if (left > 0) {
      const cut = Math.min(left, token.text.length)
      left -= cut
      const rest = token.text.slice(cut)
      if (rest) out.push({ ...token, text: rest })
      continue
    }
    out.push(token)
  }
  return out
}
