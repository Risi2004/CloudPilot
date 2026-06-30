"""Read sync manifest from stdin and write SyncReport JSON to stdout."""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys

from cloudpilot.knowledge.models import SyncManifest
from cloudpilot.knowledge.sync_service import KnowledgeSyncService


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="CloudPilot knowledge base synchronization")
    parser.add_argument(
        "--log-level",
        default="WARNING",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
    )
    args = parser.parse_args(argv)

    logging.basicConfig(level=getattr(logging, args.log_level), stream=sys.stderr)
    os.environ.setdefault("NO_COLOR", "1")
    os.environ.setdefault("FORCE_COLOR", "0")

    try:
        payload = json.load(sys.stdin)
        manifest = SyncManifest.model_validate(payload)
        report = KnowledgeSyncService().synchronize(manifest)
    except Exception as exc:  # noqa: BLE001
        print(str(exc), file=sys.stderr)
        return 1

    sys.stdout.write(f"__JSON_OUTPUT__:{report.to_json()}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
