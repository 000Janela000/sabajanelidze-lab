/*
 * <race-figure>: the payments race as one element. Two withdrawals of 80 from a balance of 100 replay a recorded
 * trace of the lab's real code, step by step. It plays once when it is at least half visible (about 4 s), then
 * stops on the result with "Run another order" (one of the 54 real orders) and a link to the lab.
 * - Without JavaScript the end state written in the page shows the result.
 * - With reduced motion nothing moves: "Run another order" shows another result at once.
 * - While it plays there is a pause control, and it pauses in a hidden tab.
 * Attributes: lab-url (where "Reproduce it yourself" goes).
 */

import { endStateHtml, first, LAB_URL, runs } from './end-state.ts'
import { caption, frameAt, type Run } from './frames.ts'
import { applyFrame } from './render.ts'
import { TEXTS } from './texts.ts'

const PLAY_MS = 4000

class RaceFigure extends HTMLElement {
  #index = first
  #count = 0
  #timer: ReturnType<typeof setTimeout> | undefined
  #playing = false
  #paused = false
  #hiddenPause = false
  #observer: IntersectionObserver | undefined

  connectedCallback() {
    if (!this.querySelector('.rf')) this.innerHTML = endStateHtml(this.getAttribute('lab-url') ?? LAB_URL)
    this.#button('another')?.addEventListener('click', () => this.#another())
    this.#button('pause')?.addEventListener('click', () => this.#togglePause())
    document.addEventListener('visibilitychange', this.#onVisibility)
    if (
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof IntersectionObserver === 'undefined'
    ) {
      this.#showButtons()
      return
    }
    this.#observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        this.#observer?.disconnect()
        this.#play(first)
      },
      { threshold: 0.5 },
    )
    this.#observer.observe(this)
  }

  disconnectedCallback() {
    this.#observer?.disconnect()
    clearTimeout(this.#timer)
    document.removeEventListener('visibilitychange', this.#onVisibility)
  }

  #button(name: string) {
    return this.querySelector<HTMLButtonElement>(`[data-rf="${name}"]`)
  }

  #run(): Run {
    return runs[this.#index] as Run
  }

  #play(index: number) {
    this.#index = index
    this.#count = 0
    this.#playing = true
    this.#paused = false
    this.#setCaption('')
    applyFrame(this, frameAt(this.#run(), 0))
    this.#showButtons()
    this.#schedule()
  }

  #schedule() {
    clearTimeout(this.#timer)
    if (this.#paused) return
    this.#timer = setTimeout(() => this.#tick(), PLAY_MS / this.#run().steps.length)
  }

  #tick() {
    const run = this.#run()
    this.#count += 1
    applyFrame(this, frameAt(run, this.#count))
    if (this.#count < run.steps.length) {
      this.#schedule()
      return
    }
    this.#playing = false
    this.#setCaption(caption(run, this.#index + 1, runs.length))
    this.#showButtons()
  }

  #another() {
    let next = this.#index
    while (next === this.#index) next = Math.floor(Math.random() * runs.length)
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.#play(next)
      return
    }
    this.#index = next
    const run = this.#run()
    applyFrame(this, frameAt(run, run.steps.length))
    this.#setCaption(caption(run, next + 1, runs.length))
  }

  #togglePause() {
    this.#paused = !this.#paused
    this.#showButtons()
    this.#schedule()
  }

  #onVisibility = () => {
    if (!this.#playing) return
    if (document.hidden && !this.#paused) {
      this.#hiddenPause = true
      this.#togglePause()
    } else if (!document.hidden && this.#hiddenPause) {
      this.#hiddenPause = false
      this.#togglePause()
    }
  }

  #showButtons() {
    const another = this.#button('another')
    const pause = this.#button('pause')
    if (another) another.hidden = this.#playing
    if (pause) {
      pause.hidden = !this.#playing
      pause.textContent = this.#paused ? TEXTS.play : TEXTS.pause
      pause.setAttribute('aria-pressed', String(this.#paused))
    }
  }

  #setCaption(text: string) {
    const element = this.querySelector('.rf-caption')
    if (element) element.textContent = text
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('race-figure')) {
  customElements.define('race-figure', RaceFigure)
}
