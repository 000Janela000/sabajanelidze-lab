import type { APIRoute } from 'astro'

/** Every page of the lab, for search engines. A new page is added here; the 404 page is not a page. */
const PAGES = ['/', '/day/payments', '/day/kyc']

/** The sitemap, written at build time from the site's address (astro.config.mjs). No dates: Google trusts only exact ones. */
export const GET: APIRoute = ({ site }) => {
  const urls = PAGES.map((path) => `  <url><loc>${new URL(path, site).href}</loc></url>`).join('\n')
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } })
}
