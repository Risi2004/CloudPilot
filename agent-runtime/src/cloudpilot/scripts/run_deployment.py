"""Run deployment agent step and print JSON to stdout."""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys

from cloudpilot.agents.deployment.models import DeploymentRequest
from cloudpilot.agents.deployment.service import DeploymentService


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="CloudPilot deployment agent")
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
        request = DeploymentRequest.model_validate(payload)
        result = DeploymentService().run(request)
    except Exception as exc:  # noqa: BLE001
        print(str(exc), file=sys.stderr)
        return 1

    sys.stdout.write(f"__JSON_OUTPUT__:{result.to_json()}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
