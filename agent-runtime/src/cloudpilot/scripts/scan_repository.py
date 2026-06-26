"""CLI for scanning a local repository."""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from cloudpilot.scanner import RepositoryScanner


def main(argv: list[str] | None = None) -> int:
    """Scan a repository path and print structured JSON to stdout."""
    parser = argparse.ArgumentParser(description="CloudPilot repository scanner")
    parser.add_argument("path", help="Path to a local repository")
    parser.add_argument(
        "--output",
        "-o",
        help="Optional output JSON file path",
    )
    parser.add_argument(
        "--log-level",
        default="WARNING",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
    )
    args = parser.parse_args(argv)

    logging.basicConfig(level=getattr(logging, args.log_level))

    try:
        result = RepositoryScanner().scan(args.path)
    except (FileNotFoundError, NotADirectoryError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    payload = json.loads(result.to_json())
    rendered = json.dumps(payload, indent=2)

    if args.output:
        Path(args.output).write_text(rendered + "\n", encoding="utf-8")
    else:
        print(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
