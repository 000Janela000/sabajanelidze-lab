/*
 * Builds the files another site vendors: dist/race-figure.js (the element, minified ES module),
 * dist/race-figure.css and dist/race-figure.html (the end state, written into the page so it shows without
 * JavaScript). Run: pnpm --filter @lab/race-figure build
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { rolldown } from 'rolldown'
import { endStateHtml, LAB_URL } from '../src/end-state.ts'

const root = new URL('../', import.meta.url)
const dist = new URL('dist/', root)
mkdirSync(dist, { recursive: true })

const bundle = await rolldown({
  input: new URL('src/element.ts', root).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
})
await bundle.write({
  file: new URL('race-figure.js', dist).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
  format: 'es',
  minify: true,
})
await bundle.close()

copyFileSync(new URL('src/race-figure.css', root), new URL('race-figure.css', dist))
writeFileSync(
  new URL('race-figure.html', dist),
  `<race-figure lab-url="${LAB_URL}">${endStateHtml(LAB_URL)}</race-figure>\n`,
)

for (const name of ['race-figure.js', 'race-figure.css', 'race-figure.html']) {
  const bytes = readFileSync(new URL(name, dist))
  console.log(
    `${name.padEnd(18)} ${String(bytes.length).padStart(6)} bytes, ${String(gzipSync(bytes).length).padStart(5)} gzip`,
  )
}
