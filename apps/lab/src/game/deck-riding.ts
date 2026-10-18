import type { RefObject } from 'preact'
import { useEffect } from 'preact/hooks'

/**
 * On a phone the console's deck rides at the screen's foot while the console is being played, and settles back into
 * its place at the console's foot (game.css). It may ride once the console's top is in the upper half of the screen:
 * before that, a sticky deck would sit at the top of the console's body, over its heading, as the console scrolls in.
 * While it rides it is marked, so it shows an edge that says it floats. Riding moves nothing in the layout.
 */
export function useDeckRiding(deck: RefObject<HTMLElement>, machine: RefObject<HTMLElement>) {
  useEffect(() => {
    const element = deck.current
    const box = machine.current
    if (!element || !box) return
    let frame = 0
    const update = () => {
      frame = 0
      const consoleTop = box.getBoundingClientRect().top
      element.classList.toggle('can-ride', consoleTop < innerHeight / 2)
      const sticky = getComputedStyle(element).position === 'sticky'
      const riding = sticky && element.getBoundingClientRect().bottom >= innerHeight - 1
      element.classList.toggle('is-riding', riding)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', schedule)
    update()
    return () => {
      removeEventListener('scroll', schedule)
      removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
    }
  }, [])
}
