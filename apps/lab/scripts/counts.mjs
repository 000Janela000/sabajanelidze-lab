// Prints the lab's counts (decisions/0002-cookie-free-counter.md): per incident, how many visits started, finished,
// and clicked through to the code, by where they came from.
// Needs CLOUDFLARE_API_TOKEN with "Account Analytics: Read". Usage, from the repo root:
//   node apps/lab/scripts/counts.mjs [days]        (default: since the lab went live, 2026-10-18)
// Counts tagged from=deploy-check are our own checks after a deploy, and are left out.

const LAUNCH = new Date('2026-10-18T00:00:00Z')

const token = process.env.CLOUDFLARE_API_TOKEN
if (!token) throw new Error('Set CLOUDFLARE_API_TOKEN (it needs "Account Analytics: Read").')
const days = Number(process.argv[2] ?? Math.ceil((Date.now() - LAUNCH.getTime()) / 86_400_000))

async function cloudflare(path, init = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  })
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`)
  return response.json()
}

const accounts = await cloudflare('/accounts')
const account = accounts.result[0]?.id
if (!account) throw new Error('The token sees no account.')

// Analytics Engine keeps a sample when there is a lot to keep; _sample_interval weighs each row back up.
const sql = `
  SELECT index1 AS station, blob1 AS event, blob2 AS source, SUM(_sample_interval * double1) AS n
  FROM lab_counts
  WHERE timestamp > NOW() - INTERVAL '${days}' DAY AND blob2 != 'deploy-check'
  GROUP BY station, event, source
  ORDER BY station, event, n DESC
  FORMAT JSON`
const result = await cloudflare(`/accounts/${account}/analytics_engine/sql`, { method: 'POST', body: sql })
const rows = result.data ?? []

const total = (filter) => rows.filter(filter).reduce((sum, row) => sum + Number(row.n), 0)
console.log(`The lab's counts, last ${days} days (no cookies, nothing about anyone)\n`)
for (const station of [...new Set(rows.map((row) => row.station))]) {
  const of = (event) => total((row) => row.station === station && row.event === event)
  console.log(
    `${station}: started ${of('STARTED')}, finished ${of('FINISHED')}, code clicks ${of('CODE_CLICK')}`,
  )
  for (const row of rows.filter((each) => each.station === station)) {
    console.log(
      `  ${row.event.padEnd(10)} ${String(Number(row.n)).padStart(5)}  from ${row.source || '(no tag)'}`,
    )
  }
}
const finished = total((row) => row.event === 'FINISHED')
const clicks = total((row) => row.event === 'CODE_CLICK')
console.log(`\nAll incidents: finished ${finished}, code clicks ${clicks}.`)
console.log("Calls tagged from=lab are counted by the portfolio's /book page.")
