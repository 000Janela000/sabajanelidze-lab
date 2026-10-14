/** Links out of the lab. Every link back to the portfolio carries `from=lab-<station>`, so calls can be counted. */

export const PORTFOLIO_URL = 'https://www.sabajanelidze.com'

// The portfolio's single booking page: it records `from` and forwards to the calendar (portfolio NOTICE, 2026-10-15).
export const BOOK_A_CALL_PATH = '/book'

export const REPO_URL = 'https://github.com/000Janela000/sabajanelidze-lab'

export function bookACall(station: string): string {
  return `${PORTFOLIO_URL}${BOOK_A_CALL_PATH}?from=lab-${station}`
}

export function portfolio(station: string): string {
  return `${PORTFOLIO_URL}/?from=lab-${station}`
}
