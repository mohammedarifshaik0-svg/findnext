# FindNext scaling roadmap

FindNext does not need an infrastructure rewrite to grow from prototype to a real product. The current Next.js + Vercel + Supabase + Resend architecture is a strong fit while product usage is still being validated.

User counts below are planning ranges, not hard technical limits. Public portfolio traffic, résumé-file sizes, parsing workload, and email volume matter more than registered-user count.

## Stage 0 — validation

**Typical range:** first users through roughly 100 active portfolios.

- Keep the current architecture.
- Use the private activation-code workflow while payment volume is manageable.
- Track database size, storage, egress, function invocations, email delivery, and support load weekly.
- Keep all public portfolio reads covered by RLS.
- Do not add microservices.

## Stage 1 — commercial launch

**Trigger:** accepting recurring payments or approaching free-tier limits.

- Move Vercel to Pro and Supabase to Pro.
- Enable spend alerts and conservative caps.
- Add production backups and restore testing.
- Add a custom FindNext domain.
- Add rate limits to résumé upload/parsing, plan requests, redemption, and authentication-sensitive routes.
- Move from personal UPI collection to a compliant payment gateway once transaction volume becomes operationally meaningful.
- Record payment-provider event IDs and make webhook handling idempotent.

## Stage 2 — repeatable growth

**Typical range:** hundreds to low thousands of active portfolios.

- Keep Vercel and Supabase; optimize before migrating.
- Cache public portfolio pages and static assets at the edge.
- Process résumé parsing and outbound email through background jobs/queues.
- Add database indexes from observed slow queries, not guesses.
- Add structured application events for publish, request, payment, redemption, renewal, expiry, and referral reward.
- Add automated renewal/expiry reminders and failed-delivery retries.
- Establish staging and production database separation.

## Stage 3 — scale the bottlenecks

**Typical range:** several thousand to tens of thousands of active portfolios.

- Upgrade Supabase compute based on CPU, memory, I/O, and connection-pool metrics.
- Keep serverless database access pooled.
- Store résumés and profile media behind controlled object-storage access and CDN delivery.
- Add abuse controls, quotas, bot protection, and per-user work limits.
- Pre-render or cache high-traffic public portfolios.
- Separate heavy résumé/AI processing from user-facing request latency.

## Stage 4 — platform scale

**Trigger:** a measured bottleneck, not user-count anxiety.

- Introduce read replicas, multi-region delivery, dedicated workers, or service separation only where metrics justify them.
- Consider self-hosted or alternative infrastructure when a stable, high-volume workload makes the cost advantage clear.
- Preserve Postgres as the system of record and keep provider boundaries clean so Vercel, email, storage, or AI vendors can be changed independently.

## Metrics that decide each move

Review these every week once growth begins:

- monthly active users and active published portfolios
- public page views, cache-hit ratio, and bandwidth
- database size, CPU, memory, I/O, slow queries, and connection usage
- résumé storage and average file size
- parser duration, failures, and queue depth
- function invocations and compute time
- email sends, bounces, complaints, and delivery failures
- plan requests, verified payments, redemptions, renewals, and churn
- support requests per 100 active customers
- infrastructure cost per active paid portfolio

The rule is simple: upgrade a plan when reliability or an included quota demands it; change architecture only when measurements reveal a persistent bottleneck.
