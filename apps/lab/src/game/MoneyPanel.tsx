import { formatCents, type MoneyPicture } from '@lab/core'

export interface MoneyPanelTexts {
  readonly title: string
  readonly subtitle: string
  readonly stamp: string
  readonly had: string
  readonly balance: string
  readonly held: string
  readonly paidOut: string
  readonly short: string
  readonly lost: string
  readonly none: string
}

/** "The books": our ledger next to the bank's own record. When money is lost, the card turns red and gets stamped. */
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
          <dd>{formatCents(picture.deposited)}</dd>
        </div>
        <div class="r">
          <dt>{texts.balance}</dt>
          <dd>{formatCents(picture.available)}</dd>
        </div>
        <div class="r">
          <dt>{texts.held}</dt>
          <dd>{formatCents(picture.held)}</dd>
        </div>
        <div class="r">
          <dt>{texts.paidOut}</dt>
          <dd>{formatCents(picture.paidOut)}</dd>
        </div>
        {final ? (
          <div class="r verdict">
            <dt>{lost ? texts.short : texts.lost}</dt>
            <dd>
              <span aria-hidden="true">{lost ? '✗ ' : '✓ '}</span>
              {lost ? formatCents(Math.abs(picture.lost)) : texts.none}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  )
}
