// Runs the fast checks before every commit and writes the result to build-log/checks.jsonl.
// A refusal is logged too: the log line stays in the working tree and goes in with the next commit,
// so the build chain on each proof card can show real refusals, not only passes.
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync } from 'node:fs'

const checks = [
  { name: 'typecheck (core)', command: 'pnpm --filter @lab/core run typecheck' },
  { name: 'unit and property tests (core)', command: 'pnpm --filter @lab/core run test' },
  { name: 'lint and format (biome)', command: 'pnpm exec biome check .' },
]

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const staged = git('diff', '--cached', '--name-only').split('\n').filter(Boolean)

const results = checks.map((check) => {
  const run = spawnSync(check.command, { shell: true, stdio: 'inherit' })
  return { name: check.name, ok: run.status === 0 }
})
const ok = results.every((result) => result.ok)

mkdirSync('build-log', { recursive: true })
appendFileSync(
  'build-log/checks.jsonl',
  `${JSON.stringify({
    at: new Date().toISOString(),
    event: 'pre-commit',
    author: git('config', 'user.name'),
    ok,
    checks: results,
    files: staged,
  })}\n`,
)

if (!ok) {
  console.error('\nCommit refused: a check failed. The refusal is recorded in build-log/checks.jsonl.')
  process.exit(1)
}
execFileSync('git', ['add', 'build-log/checks.jsonl'])
