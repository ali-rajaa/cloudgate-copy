"""Turn the site into the preview that is published at cloud.fixmypcperth.com.

The files in site/ are an exact copy of www.cloudgate-app.com and stay that
way. Only the published preview is changed, so it can never be mistaken
for the real site:

- every page gets <meta name="robots" content="noindex, nofollow">, and
  robots.txt blocks crawling, so Google never indexes the copy (each page's
  canonical link already points at www.cloudgate-app.com);
- the Google Ads tag (AW-18499228710) is swapped for an empty gtag(), so
  visits to the preview are never counted as CloudGate traffic or
  conversions, and nothing on a page breaks for want of gtag().

It also adds /prototype/ (from prototype/), drawings of the web app's new
screens for whoever builds them; it is never part of the real site.

Usage: python3 tools/preview.py site _deploy
"""
import pathlib
import re
import shutil
import sys

src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
if out.exists():
    shutil.rmtree(out)
shutil.copytree(src, out)

# Drawings of the web app's new screens for its developer (preview only,
# never part of the real site): /prototype/.
proto = pathlib.Path(__file__).resolve().parent.parent / "prototype"
if proto.is_dir():
    shutil.copytree(proto, out / "prototype")

TAG = re.compile(r"<!-- Google tag \(gtag\.js\)[^>]*-->\s*<script>.*?</script>", re.S)
STUB = ("<!-- Preview: Google tag switched off -->\n"
        "<script>window.dataLayer = window.dataLayer || []; function gtag(){}</script>")
NOINDEX = '<meta name="robots" content="noindex, nofollow">'

pages = 0
for page in out.rglob("*.html"):
    html = page.read_text(encoding="utf-8")
    html = TAG.sub(STUB, html)
    html = re.sub(r'<meta name="robots"[^>]*>\s*', "", html)
    html = html.replace("<head>", "<head>\n" + NOINDEX, 1)
    if "googletagmanager.com" in html:
        sys.exit(f"{page}: a Google tag is still there; update the pattern in tools/preview.py")
    if NOINDEX not in html:
        sys.exit(f"{page}: no <head> to add noindex to")
    page.write_text(html, encoding="utf-8")
    pages += 1

(out / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
print(f"Preview ready: {pages} pages, noindex, Google tag off.")
