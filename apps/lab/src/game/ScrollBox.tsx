import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'

/**
 * A box for code that may be longer than the space it has: it scrolls inside itself (it takes keyboard focus, so
 * the keyboard can scroll it too), and says so at its foot while more lines are below. `reveal` is a selector:
 * whenever `revealKey` changes, the first match is scrolled into the box's view, without moving the page.
 */
export function ScrollBox(props: {
  label: string
  moreText: string
  reveal?: string
  revealKey?: unknown
  children: ComponentChildren
}) {
  const box = useRef<HTMLElement>(null)
  const [more, setMore] = useState(false)

  function check() {
    const element = box.current
    if (!element) return
    setMore(element.scrollTop + element.clientHeight < element.scrollHeight - 2)
  }

  useEffect(() => {
    const element = box.current
    if (!element) return
    check()
    const observer = new ResizeObserver(check)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const element = box.current
    if (!element || !props.reveal) return
    const target = element.querySelector<HTMLElement>(props.reveal)
    if (!target) return
    // Positions in the box's scrolled content.
    const contentTop = element.getBoundingClientRect().top - element.scrollTop
    const at = (node: HTMLElement) => node.getBoundingClientRect().top - contentTop
    // A sticky head covers the top of the box, and the "more below" fade its foot: a line there is not in view.
    const covered = element.querySelector<HTMLElement>('.req-head')?.offsetHeight ?? 0
    const fade = Math.min(48, element.clientHeight / 4)
    const top = at(target)
    const bottom = top + target.offsetHeight
    const inView =
      top >= element.scrollTop + covered && bottom <= element.scrollTop + element.clientHeight - fade
    if (!inView) {
      // The whole target above the fade, with as many whole lines above it as fit: scroll to the first line start
      // that is far enough down, so no line is cut in half at the top. A target taller than the box starts at its top.
      const lowest = bottom - (element.clientHeight - fade)
      const highest = top - covered
      const starts = [...element.querySelectorAll<HTMLElement>('li')].map((line) => at(line) - covered)
      const start = starts.find((offset) => offset >= lowest && offset <= highest) ?? highest
      element.scrollTop = Math.max(0, start)
    }
    check()
  }, [props.revealKey])

  return (
    <div class={`scrollbox${more ? ' has-more' : ''}`}>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a box that scrolls must be reachable by keyboard to scroll */}
      <section ref={box} class="scrollbox-inner" tabIndex={0} aria-label={props.label} onScroll={check}>
        {props.children}
      </section>
      <span class="scrollbox-more" aria-hidden="true">
        {props.moreText}
      </span>
    </div>
  )
}
