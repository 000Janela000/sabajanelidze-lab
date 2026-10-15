/*
 * The figure as HTML: the four steps of the real code are rows (full labels on the left), withdrawals A and B are
 * columns, and each request's ring moves down its column. figureHtml() draws any frame as a string: the build uses
 * it for the no-JavaScript fallback (the end of the losing run), and the element uses it once on start.
 * applyFrame() then changes only text, classes and one CSS variable per request, so the rings can transition.
 */
import { type Frame, type Lane, NAMES, type Name } from './frames.ts'
import { TEXTS } from './texts.ts'

const escapeHtml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')

function laneHtml(name: Name, lane: Lane): string {
  const nodes = TEXTS.steps
    .map(
      (_, index) =>
        `<span class="rf-node${index < lane.done ? ' rf-ran' : ''}"><span class="rf-dot"></span><span class="rf-val">${escapeHtml(lane.values[index] ?? '')}</span></span>`,
    )
    .join('')
  const classes = `rf-lane${lane.result ? ' rf-done' : ''}${lane.result === TEXTS.paid ? ' rf-paid' : ''}`
  return `<div class="${classes}" data-lane="${name}"><span class="rf-name">${name}</span><span class="rf-track"><span class="rf-rail"></span><span class="rf-runner" style="--rf-pos:${lane.done}"></span>${nodes}</span><span class="rf-res">${lane.result ?? ''}</span></div>`
}

export function figureHtml(frame: Frame, captionText: string, labUrl: string): string {
  const steps = TEXTS.steps
    .map((step, index) => {
      const narrow = TEXTS.stepsNarrow[index] ?? step
      const label =
        narrow === step
          ? escapeHtml(step)
          : `<span class="rf-wide">${escapeHtml(step)}</span><span class="rf-narrow">${escapeHtml(narrow)}</span>`
      return `<span class="rf-step"><b>${index + 1}</b> ${label}</span>`
    })
    .join('')
  return `<figure class="rf${frame.short ? ' rf-lost' : ''}" aria-label="${escapeHtml(TEXTS.label)}"><div class="rf-lanes" aria-hidden="true"><div class="rf-steps"><span class="rf-name"></span>${steps}<span class="rf-res"></span></div>${NAMES.map((name) => laneHtml(name, frame.lanes[name])).join('')}</div><dl class="rf-books"><div><dt>${TEXTS.balance}</dt><dd data-rf="balance">${frame.balance}</dd></div><div><dt>${TEXTS.paidOut}</dt><dd data-rf="paid">${frame.paidOut}</dd></div><div class="rf-short-row"${frame.short ? '' : ' hidden'}><dt>${TEXTS.short80}</dt><dd data-rf="short">${frame.short ?? ''}</dd></div></dl><figcaption class="rf-caption" aria-live="polite">${escapeHtml(captionText)}</figcaption><div class="rf-actions"><button type="button" class="rf-btn" data-rf="another" hidden>${TEXTS.another}</button><button type="button" class="rf-btn rf-btn-2" data-rf="pause" aria-pressed="false" hidden>${TEXTS.pause}</button><a class="rf-link" href="${escapeHtml(labUrl)}">${TEXTS.find}</a></div><p class="rf-note">${escapeHtml(TEXTS.note)}</p></figure>`
}

/** Shows a frame on the figure already in the page. */
export function applyFrame(root: Element, frame: Frame): void {
  root.querySelector('.rf')?.classList.toggle('rf-lost', frame.short !== null)
  for (const name of NAMES) {
    const lane = frame.lanes[name]
    const element = root.querySelector(`[data-lane="${name}"]`)
    if (!element) continue
    element.classList.toggle('rf-done', lane.result !== null)
    element.classList.toggle('rf-paid', lane.result === TEXTS.paid)
    element.querySelector<HTMLElement>('.rf-runner')?.style.setProperty('--rf-pos', String(lane.done))
    element.querySelectorAll('.rf-node').forEach((node, index) => {
      node.classList.toggle('rf-ran', index < lane.done)
      const value = node.querySelector('.rf-val')
      if (value) value.textContent = lane.values[index] ?? ''
    })
    const result = element.querySelector('.rf-res')
    if (result) result.textContent = lane.result ?? ''
  }
  const set = (key: string, text: string) => {
    const element = root.querySelector(`[data-rf="${key}"]`)
    if (element) element.textContent = text
  }
  set('balance', frame.balance)
  set('paid', frame.paidOut)
  set('short', frame.short ?? '')
  const shortRow = root.querySelector<HTMLElement>('.rf-short-row')
  if (shortRow) shortRow.hidden = frame.short === null
}
