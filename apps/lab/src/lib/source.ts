/*
 * Build-time only: reads the real source files, so the code on the page is cut from the code that runs.
 * The build fails if a marker is missing, so an excerpt can never quietly drift from its file.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { STEP_FOR_METHOD } from '@lab/core'
import type { CodeLine, CodeToken } from './code-line.ts'
import { highlight, langOf, toHtml } from './highlight.ts'
import { REPO_URL } from './links.ts'

export type { CodeLine }

const repoRoot = resolve(process.cwd(), '../..')

export interface Excerpt {
  readonly file: string
  readonly startLine: number
  readonly endLine: number
  readonly code: string
  /** The code coloured like a code editor, one entry per line. */
  readonly lines: readonly (readonly CodeToken[])[]
  /** The same, as HTML for build-time pages. */
  readonly html: string
  readonly url: string
}

let headCommit: string | undefined

/** The commit the site is built from. Code links point at it, so they never change under the reader. */
export function commit(): string {
  headCommit ??= execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim()
  return headCommit
}

const warned = new Set<string>()

/** True when `file` is part of the commit the links point at (not only in the working tree). */
function inCommit(file: string): boolean {
  try {
    execFileSync('git', ['cat-file', '-e', `${commit()}:${file}`], { cwd: repoRoot, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function fileUrl(file: string, startLine?: number, endLine?: number): string {
  if (!existsSync(resolve(repoRoot, file))) throw new Error(`Linked file does not exist: ${file}`)
  if (!inCommit(file)) {
    const message = `${file} is not in commit ${commit().slice(0, 7)}, so its link would be broken`
    if (process.env.CI) throw new Error(message)
    if (!warned.has(file)) console.warn(`[links] ${message} (commit it before publishing)`)
    warned.add(file)
  }
  const lines = startLine ? `#L${startLine}${endLine ? `-L${endLine}` : ''}` : ''
  return `${REPO_URL}/blob/${commit()}/${file}${lines}`
}

export function excerpt(file: string, region: string): Excerpt {
  const lines = readFileSync(resolve(repoRoot, file), 'utf8').split('\n')
  const start = lines.findIndex((line) => line.trim() === `// #region ${region}`)
  const end = lines.findIndex((line) => line.trim() === `// #endregion ${region}`)
  if (start < 0 || end <= start) throw new Error(`Excerpt marker "${region}" is missing in ${file}`)
  // Blank lines next to the markers are not part of the excerpt (Go needs one after the start marker).
  let first = start + 1
  let last = end - 1
  while (first < last && lines[first]?.trim() === '') first++
  while (last > first && lines[last]?.trim() === '') last--
  const code = lines.slice(first, last + 1).join('\n')
  const coloured = highlight(code, langOf(file))
  return {
    file,
    startLine: first + 1,
    endLine: last + 1,
    code,
    lines: coloured,
    html: toHtml(coloured),
    url: fileUrl(file, first + 1, last + 1),
  }
}

const PORT_CALL = /await (?:store|bank)\.(\w+)\(/

/** The excerpt as game lines: comments dropped, each port call tagged with its step code. */
export function codeLines(source: Excerpt): CodeLine[] {
  return source.code
    .split('\n')
    .map((text, index) => ({ text, tokens: source.lines[index] ?? [] }))
    .filter(({ text }) => {
      const trimmed = text.trim()
      return (
        trimmed !== '' && !trimmed.startsWith('/**') && !trimmed.startsWith('*') && !trimmed.startsWith('//')
      )
    })
    .map(({ text, tokens }) => {
      const method = PORT_CALL.exec(text)?.[1]
      const step = method ? (STEP_FOR_METHOD[method] ?? null) : null
      return { text, tokens, step }
    })
}

export interface BuildChain {
  readonly commits: number
  readonly agentCommits: number
  readonly checksRun: number
  readonly refusals: number
  readonly lastCommit: string
  readonly lastCommitUrl: string
  /** The CI checks of the commit the site is built from. */
  readonly ciUrl: string
}

/**
 * How this code was built, from git and the check log. Nothing here is typed by hand.
 * `paths` are files or folders, old names included, so the history survives a folder move.
 */
export function buildChain(paths: readonly string[]): BuildChain {
  const covers = (file: string) => paths.some((path) => file === path || file.startsWith(`${path}/`))
  const log = execFileSync('git', ['log', '--format=%H%x09%an', '--', ...paths], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash = '', author = ''] = line.split('\t')
      return { hash, author }
    })

  const checkLog = resolve(repoRoot, 'build-log/checks.jsonl')
  const runs = existsSync(checkLog)
    ? readFileSync(checkLog, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as { ok: boolean; files: string[] })
        .filter((run) => run.files.some(covers))
    : []

  const last = log[0]?.hash ?? commit()
  return {
    commits: log.length,
    agentCommits: log.filter((entry) => entry.author === 'Claude Agent').length,
    checksRun: runs.length,
    refusals: runs.filter((run) => !run.ok).length,
    lastCommit: last.slice(0, 7),
    lastCommitUrl: `${REPO_URL}/commit/${last}`,
    ciUrl: `${REPO_URL}/commit/${commit()}/checks`,
  }
}

/** A link to the first line of `file` that contains `needle`. Fails the build if it is not there. */
export function lineUrl(file: string, needle: string): string {
  const lines = readFileSync(resolve(repoRoot, file), 'utf8').split('\n')
  const index = lines.findIndex((line) => line.includes(needle))
  if (index === -1) throw new Error(`"${needle}" not found in ${file}`)
  return fileUrl(file, index + 1)
}
