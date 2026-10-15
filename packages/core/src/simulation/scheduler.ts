/**
 * Runs several async requests one step at a time, in an order chosen from outside.
 *
 * Each port call (read the balance, pay out, …) becomes a step that waits until the scheduler
 * releases it, and the real work happens only at that moment. So the game, or a test, decides
 * exactly how two copies of the real withdrawal code interleave. JavaScript runs one thing at a
 * time, so without this the race would never show up in a browser.
 */

interface PendingStep {
  readonly step: string
  readonly ready: () => boolean
  readonly run: () => unknown
  readonly resolve: (value: unknown) => void
  readonly reject: (error: unknown) => void
}

type Finished =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: unknown }

export interface TraceLine {
  readonly requestId: string
  readonly step: string
}

export class StepScheduler {
  readonly trace: TraceLine[] = []
  readonly #pending = new Map<string, PendingStep>()
  readonly #finished = new Map<string, Finished>()
  readonly #arrivalWaiters = new Map<string, () => void>()

  /** Called by a port: the request stops here until `advance` releases it. */
  step<T>(
    requestId: string,
    code: string,
    run: () => T | Promise<T>,
    ready: () => boolean = () => true,
  ): Promise<T> {
    const waiting = this.#pending.has(requestId)
    if (waiting) throw new Error(`${requestId} is already waiting at a step`)
    return new Promise<T>((resolve, reject) => {
      this.#pending.set(requestId, {
        step: code,
        ready,
        run,
        resolve: resolve as (value: unknown) => void,
        reject,
      })
      this.#signalArrival(requestId)
    })
  }

  /** Starts a request and returns once it reaches its first step (or finishes). */
  start(requestId: string, task: () => Promise<unknown>): Promise<void> {
    const arrived = this.#waitForArrival(requestId)
    task().then(
      (value) => this.#finish(requestId, { ok: true, value }),
      (error: unknown) => this.#finish(requestId, { ok: false, error }),
    )
    return arrived
  }

  /** Runs the request's waiting step, then waits until it reaches its next step or finishes. */
  async advance(requestId: string): Promise<void> {
    const step = this.#pending.get(requestId)
    if (!step) throw new Error(`${requestId} has no step waiting`)
    const ready = step.ready()
    if (!ready) throw new Error(`${requestId} is blocked at ${step.step}`)
    this.#pending.delete(requestId)
    this.trace.push({ requestId, step: step.step })
    const arrived = this.#waitForArrival(requestId)
    try {
      const result = await step.run()
      step.resolve(result)
    } catch (error) {
      step.reject(error)
    }
    await arrived
  }

  /** The code of the step the request waits at, or null if it is not waiting. */
  waitingAt(requestId: string): string | null {
    return this.#pending.get(requestId)?.step ?? null
  }

  canAdvance(requestId: string): boolean {
    return this.#pending.get(requestId)?.ready() ?? false
  }

  isFinished(requestId: string): boolean {
    return this.#finished.has(requestId)
  }

  result(requestId: string): Finished | undefined {
    return this.#finished.get(requestId)
  }

  #finish(requestId: string, outcome: Finished): void {
    this.#finished.set(requestId, outcome)
    this.#signalArrival(requestId)
  }

  #waitForArrival(requestId: string): Promise<void> {
    return new Promise<void>((resolve) => this.#arrivalWaiters.set(requestId, resolve))
  }

  #signalArrival(requestId: string): void {
    const waiter = this.#arrivalWaiters.get(requestId)
    this.#arrivalWaiters.delete(requestId)
    waiter?.()
  }
}
