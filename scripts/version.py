#!/usr/bin/env python3
"""Bump and sync the project version.

Single source of truth: the VERSION file. `sync` pushes that value into
backend/app/__init__.py and frontend/package.json. `bump` writes a new
VERSION then syncs. Portable across macOS and Linux (stdlib only).

Usage:
  python3 scripts/version.py show            # print current version
  python3 scripts/version.py sync            # write VERSION into the other files
  python3 scripts/version.py bump patch      # bump patch|minor|major, then sync
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION_FILE = ROOT / "VERSION"
BACKEND_INIT = ROOT / "backend" / "app" / "__init__.py"
FRONTEND_JSON = ROOT / "frontend" / "package.json"


def current() -> str:
    return VERSION_FILE.read_text().strip()


def bump(v: str, part: str) -> str:
    major, minor, patch = (int(x) for x in v.split("."))
    if part == "major":
        major, minor, patch = major + 1, 0, 0
    elif part == "minor":
        minor, patch = minor + 1, 0
    elif part == "patch":
        patch += 1
    else:
        sys.exit(f"Invalid bump: {part!r}. Use patch, minor, or major.")
    return f"{major}.{minor}.{patch}"


def sync(v: str) -> None:
    init = BACKEND_INIT.read_text()
    updated = re.sub(r'__version__ = ".*"', f'__version__ = "{v}"', init, count=1)
    if updated != init:
        BACKEND_INIT.write_text(updated)

    data = json.loads(FRONTEND_JSON.read_text())
    if data.get("version") != v:
        data["version"] = v
        FRONTEND_JSON.write_text(json.dumps(data, indent=2) + "\n")


def main() -> None:
    args = sys.argv[1:]
    cmd = args[0] if args else "show"

    if cmd == "show":
        print(current())
    elif cmd == "sync":
        sync(current())
        print(f"Synced to {current()}")
    elif cmd == "bump":
        if len(args) < 2:
            sys.exit("Usage: scripts/version.py bump patch|minor|major")
        old = current()
        v = bump(old, args[1])
        VERSION_FILE.write_text(v)
        sync(v)
        print(f"Bumped {old} -> {v}")
    else:
        sys.exit(f"Unknown command: {cmd}. Use show, sync, or bump.")


if __name__ == "__main__":
    main()
