/** The page's "Find the bug" button asks the game to put focus on the first step the visitor can tap. */
export const FIND_THE_BUG = 'lab:find-the-bug'

/**
 * Set on <html> by the page when "Find the bug" is pressed, and cleared by the game when it acts on it. It covers a
 * press that comes before the game has loaded: on a slow phone the event would otherwise reach no one.
 */
export const FIND_THE_BUG_PENDING = 'data-find-the-bug'
