import { formatCents, type MoneyPicture } from '@lab/core'

export interface MoneyPanelTexts {
  readonly title: string
  readonly subtitle: string
  readonly stamp: string
  readonly had: string
  readonly balance: string
  readonly held: string
  readonly paidOut: string
  readonly lost: string
  /** Shown under "Money lost" while a run is still going. */
  readonly pending: string
  readonly none: string
}

/**
 * "The books": our ledger next to the bank's own record. A number that changes fades in (it is keyed by its value).
 * When money is lost, the panel turns red and gets stamped. Nothing here changes its size between states.
 */
export function MoneyPanel(props: { picture: MoneyPicture; final: boolean; texts: MoneyPanelTexts }) {
  const { picture, final, texts } = props
  const lost = picture.lost !== 0
  const classes = ['books', final && lost ? 'lost' : '', final && !lost ? 'safe' : '']
  return (
    <section class={classes.filter(Boolean).join(' ')} aria-label={texts.title}>
      {final && lost ? (
        <span class="stamp-lost" aria-hidden="true">
          {texts.stamp}
        </span>
      ) : null}
      <h3>
        {texts.title} <span>{texts.subtitle}</span>
      </h3>
      <dl>
        <div class="r">
          <dt>{texts.had}</dt>
          <dd class="tnum">{formatCents(picture.deposited)}</dd>
        </div>
        <div class="r">
          <dt>{texts.balance}</dt>
          <dd class="tnum" key={`a${picture.available}`}>
            {formatCents(picture.available)}
          </dd>
        </div>
        <div class="r">
          <dt>{texts.held}</dt>
          <dd class="tnum" key={`h${picture.held}`}>
            {formatCents(picture.held)}
          </dd>
        </div>
        <div class="r">
          <dt>{texts.paidOut}</dt>
          <dd class="tnum" key={`p${picture.paidOut}`}>
            {formatCents(picture.paidOut)}
          </dd>
        </div>
        {/* Always there, so the columns never rewrap when the verdict arrives. */}
        <div class="r verdict">
          <dt>{texts.lost}</dt>
          {final ? (
            <dd class="tnum" key={lost ? 'lost' : 'none'}>
              <span aria-hidden="true">{lost ? '✗ ' : '✓ '}</span>
              {lost ? formatCents(Math.abs(picture.lost)) : texts.none}
            </dd>
          ) : (
            <dd class="pending">{texts.pending}</dd>
          )}
        </div>
      </dl>
    </section>
  )
}
