/** Lets the visitor pause a run between two steps. A run calls `wait()` before each step. */
export class PauseGate {
  #paused = false
  readonly #waiting: Array<() => void> = []

  get paused(): boolean {
    return this.#paused
  }

  pause(): void {
    this.#paused = true
  }

  resume(): void {
    this.#paused = false
    for (const go of this.#waiting.splice(0)) go()
  }

  wait(): Promise<void> {
    if (!this.#paused) return Promise.resolve()
    return new Promise((go) => this.#waiting.push(go))
  }
}
