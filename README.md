# CloudGate: editable copy

An exact copy of **www.cloudgate-app.com** (all 16 pages, the 404 page and
every stylesheet, script, font and image), taken 10 Nov 2026, so it can be
edited and previewed.

- **The site:** `site/`. Plain HTML, CSS and JavaScript, exactly as the live
  site serves it (the live site is built elsewhere; this is its output).
  Pages are `site/<name>.html` and are served at `/<name>`.
- **Preview:** every push to `main` publishes `site/` to
  **cloud.fixmypcperth.com** (`.github/workflows/pages.yml`).
- **The preview is not the real site:** `tools/preview.py` adds noindex to
  every page and blocks crawlers, and switches off the Google Ads tag
  (AW-18499228710), so the copy never shows up in Google or counts as
  CloudGate traffic. The files in `site/` keep everything, so they stay a
  true copy.

## Changes made in the copy (10 Nov 2026)

- **Header (every page):** Features, Pricing, Cloud Tips; **Log in** and
  **Get started** on the right.
- **Homepage:** a "100GB free" offer above the headline, Get started free
  and See pricing, the app badges below; a 100GB free band, then the three
  paid plans.
- **Pricing page (`/pricing`):** Plus, Pro and Family only (no free card),
  monthly / yearly switch, Plus **Continue**, Pro and Family **Try free for
  3 days** (or buy now), and under each price the trial length, price,
  billing frequency, automatic renewal and the amount after the trial.
- **Sign-in popup:** every Log in, Get started and plan button opens
  Continue with Google / Apple / email, then hands over to the web app with
  the chosen plan.
- **Pricing page layout:** the owner's Premium design (13 Nov 2026): title
  with a Monthly / Yearly and "Pay in" currency panel, storage-first cards,
  Family as the featured dark card with a 1TB / 5TB choice (5TB monthly
  only), "Billed in" the visitor's currency, and the web app's feature
  list.
- **Prices and currency:** the web app's Stripe prices, shown in each
  visitor's own currency by the web app's own rule (country → currency,
  US dollars otherwise), with a currency picker on the pricing page. Set
  in `site/assets/js/auth.js` (`PRICES`); see `WEBAPP-HANDOFF.md`,
  section 7.
- **Special offer:** pages with plan cards offer "Try Pro free for 3 days"
  once per visitor (after 40 seconds, or when a desktop pointer heads for
  the tabs), with the full trial terms. Add `?offer=show` to a page's
  address to see it straight away.
- **Web app:** sign-in, billing, trials, dashboard, upgrade popups and
  purchase tracking happen in my.cloudgate-app.com: see
  `WEBAPP-HANDOFF.md`, and the drawings of those screens at `/prototype/`
  on the preview (from `prototype/`; never part of the real site).

## One-time setup (owner)

1. GitHub > `ali-rajaa/cloudgate-copy` > Settings > Pages > Source:
   **GitHub Actions**.
2. Same screen > Custom domain: `cloud.fixmypcperth.com` > Save.
3. Cloudflare (fixmypcperth.com) > DNS > Add record: `CNAME`, Name `cloud`,
   Target `ali-rajaa.github.io`, **DNS only** (grey cloud).
4. When the DNS check passes, tick **Enforce HTTPS**.
5. Actions > "Publish preview" > re-run the latest run.

## Going live on www.cloudgate-app.com

The live site is served by GitHub Pages from another account's repository
(`imranshafique/cloudgate-app`). To publish this copy there instead, the
domain has to move: remove the custom domain from that repository, point
the cloudgate-app.com DNS at this one, set the custom domain here, and
publish without `tools/preview.py` (so noindex and the Google tag stay as
they are on the live site). Or the edited files go back into that
repository. Either needs access to that account or the domain's DNS.
