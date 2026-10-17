import type { CodeToken } from '../lib/code-line.ts'

/** One line of code, coloured like a code editor (the colours are worked out at build time). */
export function CodeText(props: { readonly tokens: readonly CodeToken[] }) {
  return (
    <>
      {props.tokens.map((token, index) =>
        token.color ? (
          <span key={index} style={{ color: token.color }}>
            {token.text}
          </span>
        ) : (
          token.text
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
