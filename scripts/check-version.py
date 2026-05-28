#!/usr/bin/env python3
"""Verify VERSION matches pyproject.toml and package.json."""

import json
import sys
import tomllib


def main() -> None:
    args = sys.argv[1:]
    if len(args) < 3:
        print("Usage: check-version.py <version> --pyproject <path> --package <path>")
        sys.exit(1)

    version = args[0]

    pyproject_path = args[2] if args[1] == "--pyproject" else args[4]
    package_path = args[4] if args[1] == "--pyproject" else args[2]

    with open(pyproject_path, "rb") as f:
        pyver = tomllib.load(f)["project"]["version"]

    with open(package_path) as f:
        pkgver = json.load(f)["version"]

    ok = pyver == pkgver == version
    if not ok:
        print(f"Mismatch: VERSION={version} pyproject={pyver} package={pkgver}")
        sys.exit(1)

    print(f"All match: {version}")


if __name__ == "__main__":
    main()
