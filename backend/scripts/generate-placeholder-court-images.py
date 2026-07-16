"""Generate placeholder court images for seed data.

The seed script references 22 image files in backend/uploads/courts/ that
don't exist on disk yet. This creates simple SVG placeholders with sport-
themed colors so the vendor gallery isn't empty after `make db-seed`.
"""

import argparse
import hashlib
import os

COURTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "courts")

VENDOR_IMAGE_FILES = [
    "082eff1f329f46a4bbc5261b1e907927.jpeg",
    "46fa6af19d634b0f8484200d5cde0e4f.jpeg",
    "5a38bfc3ab00439e885ae428d9c72982.jpeg",
    "5b518ca817834edf8e2f45c2df3b1c0d.jpeg",
    "5c8d45c9471e470b92337795bb0e1281.jpeg",
    "677429b5caed476e8a3b867e3892c1c1.jpg",
    "922131acb6b64cf581607c67e88f857f.jpeg",
    "9bab887eebcd463586bca8c65a2c64ca.jpeg",
    "a64da5ecac024a9eb37209f3121b9fe9.jpeg",
    "ba545dda754c4652aa81d2956fc506d9.jpg",
    "c386c718f8ba49248dbb0f727b6afe75.jpeg",
    "c578c51b2e594535a49ab9801af85a55.jpg",
    "d86126fe7f4b4e12821b4d6f5ff21429.png",
    "d920e46c57204c58a3290e60f7f0f84b.png",
    "da1693f5a8ec46e1b38cea8283a25264.jpeg",
    "db7ccabec4904dd488fdc184b6e2aa0b.jpeg",
    "de00f2113ed543b29b2caf9f8c735263.jpeg",
    "debbbb0229124cb4ab3a20c236c763e7.png",
    "2575658a4a7045508881fcbc16319a3c.jpg",
    "70f1cda56a7f4cc38aea1cbb14cb5cd5.jpeg",
    "9e4d856082604c0686aa70f32792be0b.jpeg",
    "e7bd300ab69d4fca88d823d0b3d8aa68.jpeg",
]

SPORT_ICONS = ["⚽", "🏀", "🏐", "🏓", "🥅"]


def generate_svg(filename: str, index: int) -> str:
    """Deterministic SVG placeholder with sport-court feel."""
    h = hashlib.md5(filename.encode()).hexdigest()
    r, g, b = int(h[:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    bg = f"#{r:02x}{g:02x}{b:02x}"
    icon = SPORT_ICONS[index % len(SPORT_ICONS)]

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#000;stop-opacity:0.3" />
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#g)" />
  <rect x="100" y="100" width="600" height="400" rx="12" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
  <line x1="400" y1="100" x2="400" y2="500" stroke="rgba(255,255,255,0.1)" stroke-width="2" />
  <circle cx="400" cy="280" r="60" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2" />
  <text x="400" y="270" text-anchor="middle" font-size="50">{icon}</text>
  <text x="400" y="360" text-anchor="middle" font-size="16" fill="rgba(255,255,255,0.4)" font-family="sans-serif">ورزشگاه</text>
</svg>"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("-q", "--quiet", action="store_true", help="Suppress output")
    args = parser.parse_args()

    log = lambda s: None if args.quiet else print(s)  # noqa: E731

    os.makedirs(COURTS_DIR, exist_ok=True)
    generated = 0
    for idx, filename in enumerate(VENDOR_IMAGE_FILES):
        path = os.path.join(COURTS_DIR, filename)
        if os.path.exists(path):
            log(f"  SKIP  {filename}")
            continue
        with open(path, "w") as f:
            f.write(generate_svg(filename, idx))
        log(f"  OK    {filename}")
        generated += 1
    log(f"\nDone — {generated} placeholders in {COURTS_DIR}")


if __name__ == "__main__":
    main()
