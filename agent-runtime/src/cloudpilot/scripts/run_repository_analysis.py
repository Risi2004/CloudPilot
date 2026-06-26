"""CLI for running repository analysis."""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys

from cloudpilot.agents.repository_analysis.service import RepositoryAnalysisService


def main(argv: list[str] | None = None) -> int:
    """Analyze a repository and print structured JSON output."""
    parser = argparse.ArgumentParser(description="CloudPilot repository analysis")
    parser.add_argument("source", help="GitHub URL or local repository path")
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

    logging.basicConfig(level=getattr(logging, args.log_level), stream=sys.stderr)

    # LiteLLM prints colored banners to stdout by default; keep stdout JSON-only.
    os.environ.setdefault("NO_COLOR", "1")
    os.environ.setdefault("FORCE_COLOR", "0")

    try:
        result = RepositoryAnalysisService().analyze(args.source)
    except Exception as exc:  # noqa: BLE001 - CLI reports user-facing errors
        print(str(exc), file=sys.stderr)
        return 1

    rendered = result.to_json()
    if args.output:
        from pathlib import Path

        Path(args.output).write_text(rendered + "\n", encoding="utf-8")
    else:
        sys.stdout.write(rendered)
        sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
