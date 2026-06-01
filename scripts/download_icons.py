

import os
import re
import sys


import time
import requests
from pathlib import Path


from urllib.parse import urlparse

PAGE_URL = "https://docs.eraser.io/docs/icons"
OUTPUT_DIR = Path(__file__).parent.parent / "icons"
SVG_PATTERN = re.compile(r'https?://[^\s"\'<>]+\.svg')


def fetch_page_html(url: str) -> str:
    print(f"Fetching page: {url}")
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.text


def extract_svg_urls(html: str) -> list[str]:
    urls = sorted(set(SVG_PATTERN.findall(html)))
    print(f"Found {len(urls)} unique SVG URLs")
    return urls


def download_svg(url: str, dest_dir: Path, session: requests.Session) -> bool:
    filename = Path(urlparse(url).path).name
    dest = dest_dir / filename

    if dest.exists():
        print(f"  [skip] {filename} already exists")
        return True

    try:
        resp = session.get(url, timeout=15)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
        print(f"  [ok]   {filename}")
        return True
    except requests.RequestException as e:
        print(f"  [fail] {filename}: {e}", file=sys.stderr)
        return False


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    html = fetch_page_html(PAGE_URL)
    svg_urls = extract_svg_urls(html)

    if not svg_urls:
        print("No SVG URLs found — the page structure may have changed.")
        sys.exit(1)

    session = requests.Session()
    session.headers["User-Agent"] = "Mozilla/5.0 (compatible; icon-downloader/1.0)"

    ok = fail = 0
    for url in svg_urls:
        success = download_svg(url, OUTPUT_DIR, session)
        if success:
            ok += 1
        else:
            fail += 1
        time.sleep(0.05)  

    print(f"\nDone: {ok} downloaded, {fail} failed → {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
