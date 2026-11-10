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
