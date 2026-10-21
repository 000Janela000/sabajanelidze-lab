# 0002: A cookie-free counter

- **Date:** 2026-10-22
- **Decided by:** Saba, after a short plan that checked Cloudflare's free plan, the lab's Worker and the saved key

## The problem
1. A checkpoint 60 days after launch (2026-12-17) decides whether the next incidents get built. It looks at finished incidents and clicks on the code, not only visits.
2. Cloudflare Web Analytics counts page views only. Nothing counted what visitors do inside an incident.
3. The lab promises plain honesty and no tracking. A counter must not store anything about a visitor, and must not need a cookie banner.

## The decision
- **Three events per incident**, each sent at most once per page visit: `STARTED` (the first move), `FINISHED` (the fix holds), `CODE_CLICK` (a click on a link to the code on GitHub). Each carries the incident and the visit's `from` tag (for example `portfolio-home`), so it also shows which channel brings players. Calls are counted by the portfolio's `/book` page, as before.
- **Nothing about the visitor:** no cookie, nothing stored on the device, no IP address, no browser details. The page sends a few words; the Worker checks them and adds one.
- **One piece of server code** (`apps/lab/worker/index.ts`), only for `/api/count`. Every other address stays a plain file, served without running code (`run_worker_first` only for `/api/*`). It accepts a message only from the live site's own pages (`Origin`), only with a known event in a built incident, and only a short plain `from` tag.
- **Workers Analytics Engine** keeps the counts (free plan: 100,000 a day; kept 3 months, which covers the checkpoint). Read them with `node apps/lab/scripts/counts.mjs`, which needs the key's "Account Analytics: Read" permission.
- **Never counted:** the test address on workers.dev, local copies, and automated browsers (our own browser tests and most bots). The browser tests turn counting on with a test flag and catch the messages before they leave.
- **The footer says so** on every page: "Privacy: no cookies. The site counts page views, finished puzzles and clicks on the code, and nothing about you." (Saba's yes, 2026-10-22.)

## Why not the others
- **D1 (Cloudflare's database):** exact counts kept forever, but a database to create and migrate for a few numbers a day.
- **A third-party analytics tool:** another account and another company seeing the visits, for a job Cloudflare already does.
- **Counting unique visitors:** needs an ID per visitor, which means storing something about them. Counting events is enough for the checkpoint.

## Later
- Analytics Engine keeps 3 months. To keep the numbers longer, save a monthly summary from `counts.mjs` into `private/`.
