#!/usr/bin/env python3
"""
Static migration revision checker.

Offline (no DB).  Validates Alembic version file integrity:

  - Duplicate revision IDs
  - Multiple heads (branches) when not expected
  - Orphan revisions (unreachable from current chain)
  - Missing revision IDs in files
  - Sequence gaps (optional, --strict)

Exit code 0 = clean, 1 = errors, 2 = warnings-only.
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

REV_RE = re.compile(
    r'^revision\s*(?::\s*(?:Union\[str,\s*None\]|str(?:\s*\|\s*None)?))?\s*=\s*"([^"]+)"',
    re.MULTILINE,
)
DOWN_RE = re.compile(
    r'^down_revision\s*(?::\s*(?:Union\[str,\s*None\]|str(?:\s*\|\s*None)?))?\s*=\s*"([^"]*)"',
    re.MULTILINE,
)


def _sort_key(r: str):
    return (0, int(r)) if r.isdigit() else (1, r)


def _check(p: Path, strict: bool = False) -> int:
    """Run all checks.  Return 0 on clean, 1 on errors, 2 on warnings."""
    errors: list[str] = []
    warnings: list[str] = []

    files = sorted(p.glob("*.py"))

    # ── Parse ────────────────────────────────────────────────────────────
    revisions: dict[str, dict] = {}
    for f in files:
        src = f.read_text(encoding="utf-8")
        rev_m = REV_RE.search(src)
        down_m = DOWN_RE.search(src)
        if not rev_m:
            errors.append(f"  {f.name}: no revision identifier found")
            continue
        rev = rev_m.group(1)
        down = down_m.group(1) if down_m else ""
        revisions[rev] = {"down": down, "file": f.name, "path": f}

    if not revisions:
        errors.append("No revision files found.")
        return int(bool(errors))

    # ── Duplicate revision IDs ───────────────────────────────────────────
    seen = defaultdict(list)
    for rev, info in revisions.items():
        seen[rev].append(info["file"])
    for rev, files_list in seen.items():
        if len(files_list) > 1:
            errors.append(f"Duplicate revision ID {rev!r} in: {', '.join(files_list)}")

    # ── Duplicate file-name prefixes ─────────────────────────────────────
    prefix_map = defaultdict(list)
    for rev, info in revisions.items():
        prefix = rev.split("_")[0]
        prefix_map[prefix].append(info["file"])
    for prefix, files_list in prefix_map.items():
        if len(files_list) > 1:
            warnings.append(
                f"Prefix {prefix!r} shared by: {', '.join(files_list)} "
                "(possible merge conflict residue)"
            )

    # ── Build graph ──────────────────────────────────────────────────────
    children: dict[str, list[str]] = {}
    for rev, info in revisions.items():
        d = info["down"]
        if d and d != "":
            children.setdefault(d, []).append(rev)

    bases = sorted(
        [r for r, info in revisions.items() if not info["down"] or info["down"] == ""],
        key=_sort_key,
    )
    heads = sorted(
        [r for r in revisions if r not in children],
        key=_sort_key,
    )

    # ── Determine expected heads from chain ──────────────────────────────
    # Real heads are those that are NOT a down_revision of anything else
    # AND that are reachable from a base.
    reachable: set[str] = set()

    def walk(r: str) -> None:
        if r in reachable:
            return
        reachable.add(r)
        for child in children.get(r, []):
            walk(child)

    for b in bases:
        walk(b)

    # ── Orphan revisions ─────────────────────────────────────────────────
    orphans = sorted(set(revisions) - reachable, key=_sort_key)
    if orphans:
        errors.append(f"Orphan revisions (unreachable): {', '.join(orphans)}")

    # ── Multiple heads ───────────────────────────────────────────────────
    real_heads = sorted([h for h in heads if h in reachable], key=_sort_key)
    if len(real_heads) > 1:
        warnings.append(
            f"Multiple migration heads: {', '.join(real_heads)}. "
            "If intentional, OK — if not, create a merge migration."
        )

    # ── Branches (multiple children per parent) ─────────────────────────
    branches = [(r, kids) for r, kids in children.items() if len(kids) > 1]
    if branches:
        warnings.append("Branch points (multiple children):")
        for r, kids in branches:
            warnings.append(f"  {r} -> {', '.join(kids)}")

    # ── Sequence gaps (strict only) ──────────────────────────────────────
    if strict:
        numeric = sorted(
            [int(r) for r in revisions if r.isdigit()],
        )
        if numeric:
            full = set(range(numeric[0], numeric[-1] + 1))
            missing = sorted(full - set(numeric))
            if missing:
                warnings.append(
                    f"Sequence gaps (numeric revisions only): {', '.join(str(m) for m in missing)}"
                )

    # ── Report ───────────────────────────────────────────────────────────
    print(f"  {len(revisions)} revisions, {len(bases)} base(s), {len(real_heads)} head(s)")
    if errors or warnings:
        print()

    if errors:
        print("  ERRORS:")
        for e in errors:
            print(f"    {e}")
        print()
    if warnings:
        print("  WARNINGS:")
        for w in warnings:
            print(f"    {w}")
        print()

    return 1 if errors else (2 if warnings else 0)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Static migration revision checker (no DB).",
    )
    parser.add_argument(
        "path",
        nargs="?",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "migrations" / "versions",
        help="Path to migrations/versions directory",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Enable strict checks (sequence gaps)",
    )
    args = parser.parse_args()

    if not args.path.is_dir():
        print(f"  ERROR: {args.path} is not a directory", file=sys.stderr)
        return 1

    print(f"  Migration check: {args.path}")
    return _check(args.path, strict=args.strict)


if __name__ == "__main__":
    sys.exit(main())
