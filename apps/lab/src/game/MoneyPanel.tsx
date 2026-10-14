import { formatCents, type MoneyPicture } from '@lab/core'

export interface MoneyPanelTexts {
  readonly had: string
  readonly balance: string
  readonly held: string
  readonly paidOut: string
  readonly short: string
  readonly lost: string
  readonly none: string
}

/** Where the customer's money is: our books next to the bank's own record. */
export function MoneyPanel(props: { picture: MoneyPicture; final: boolean; texts: MoneyPanelTexts }) {
  const { picture, final, texts } = props
  const lost = picture.lost !== 0
  const classes = ['money', final && lost ? 'money-lost' : '', final && !lost ? 'money-safe' : '']
  return (
    <dl class={classes.filter(Boolean).join(' ')}>
      <div>
        <dt>{texts.had}</dt>
        <dd>{formatCents(picture.deposited)}</dd>
      </div>
      <div>
        <dt>{texts.balance}</dt>
        <dd>{formatCents(picture.available)}</dd>
      </div>
      <div>
        <dt>{texts.held}</dt>
        <dd>{formatCents(picture.held)}</dd>
      </div>
      <div>
        <dt>{texts.paidOut}</dt>
        <dd>{formatCents(picture.paidOut)}</dd>
      </div>
      {final ? (
        <div class="money-verdict">
          <dt>{lost ? texts.short : texts.lost}</dt>
          <dd>
            <span aria-hidden="true">{lost ? '✗ ' : '✓ '}</span>
            {lost ? formatCents(Math.abs(picture.lost)) : texts.none}
          </dd>
        </div>
      ) : null}
    </dl>
  )
}
