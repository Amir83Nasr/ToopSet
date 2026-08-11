#!/usr/bin/env python3
"""Verify version consistency across the project.

Usage:
  python scripts/check_version.py             # Quick check: VERSION vs __init__ + package.json
  python scripts/check_version.py --all       # Full check: + pyproject.toml (dynamic attr)
  python scripts/check_version.py --version   # Print version from VERSION
"""

import json
import re
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

FILES = {
    "VERSION": ROOT / "VERSION",
    "__init__": ROOT / "backend" / "app" / "__init__.py",
    "pyproject.toml": ROOT / "backend" / "pyproject.toml",
    "package.json": ROOT / "frontend" / "package.json",
}


def read_version(file: str) -> str:
    path = FILES[file]
    if file == "VERSION":
        return path.read_text().strip()
    if file == "__init__":
        m = re.search(r'__version__\s*=\s*"([^"]+)"', path.read_text())
        return m.group(1) if m else ""
    if file == "pyproject.toml":
        # Check for dynamic version with attr reference
        raw = path.read_text()
        data = tomllib.loads(raw)
        project = data.get("project", {})
        if "version" in project:
            return project["version"]
        if "dynamic" in project and "version" in project["dynamic"]:
            # Resolve dynamic attr reference
            m = re.search(
                r'version\s*=\s*\{\s*attr\s*=\s*"([^"]+)"\s*\}',
                raw,
            )
            if m:
                attr_path = m.group(1).split(".")
                # Resolve relative to the directory of pyproject.toml
                return _resolve_attr(path.parent, attr_path)
        return ""
    if file == "package.json":
        return json.loads(path.read_text())["version"]
    return ""


def _resolve_attr(base: Path, attr_path: list[str]) -> str:
    """Resolve a dotted attribute like 'app.__version__' from a base directory."""
    if (
        len(attr_path) == 2
        and attr_path[1].startswith("__")
        and attr_path[1].endswith("__")
    ):
        # Standard pattern: module.__version__
        module_file = base / attr_path[0] / "__init__.py"
        if module_file.exists():
            m = re.search(
                r'__version__\s*=\s*"([^"]+)"',
                module_file.read_text(),
            )
            if m:
                return m.group(1)
    return ""


def main() -> None:
    args = set(sys.argv[1:])

    if "--version" in args:
        print(read_version("VERSION"))
        return

    expected = read_version("VERSION")
    checks = ["__init__", "package.json"]
    if "--all" in args:
        checks.append("pyproject.toml")

    errors: list[str] = []
    for name in checks:
        v = read_version(name)
        if v != expected:
            errors.append(f"  {name}: expected {expected!r}, got {v!r}")

    if errors:
        print("Version mismatch:")
        print("\n".join(errors))
        sys.exit(1)

    print(f"All match: {expected}")


if __name__ == "__main__":
    main()
