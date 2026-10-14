/** Links out of the lab. Every link back to the portfolio carries `from=lab-<station>`, so calls can be counted. */

export const PORTFOLIO_URL = 'https://www.sabajanelidze.com'

// The portfolio session owns the booking page. Confirm this path with it before launch.
export const BOOK_A_CALL_PATH = '/work-with-me'

export const REPO_URL = 'https://github.com/000Janela000/sabajanelidze-lab'

export function bookACall(station: string): string {
  return `${PORTFOLIO_URL}${BOOK_A_CALL_PATH}?from=lab-${station}`
}

export function portfolio(station: string): string {
  return `${PORTFOLIO_URL}/?from=lab-${station}`
}
