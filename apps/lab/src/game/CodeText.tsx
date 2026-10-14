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
