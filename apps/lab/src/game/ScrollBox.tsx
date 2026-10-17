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
    const top = target.offsetTop
    const bottom = top + target.offsetHeight
    const inView = top >= element.scrollTop && bottom <= element.scrollTop + element.clientHeight
    if (!inView) element.scrollTop = Math.max(0, top - element.clientHeight / 3)
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
