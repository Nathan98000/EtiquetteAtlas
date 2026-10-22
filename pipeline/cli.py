"""Command-line entry point: `uv run pipeline <command>`."""

import argparse
import sys
from collections.abc import Callable, Sequence
from pathlib import Path

from pipeline import paths, privacy, sources

Handler = Callable[[argparse.Namespace], int]


def _download(args: argparse.Namespace) -> int:
    raw_dir: Path = args.raw_dir
    print(f"Downloading pinned OSF files into {raw_dir}")
    failures = 0
    for source in sources.load_manifest():
        try:
            status = sources.download(source, raw_dir)
        except sources.SourceError as err:
            print(f"FAIL {err}", file=sys.stderr)
            failures += 1
            continue
        if status == "present":
            print(f"ok   {source.name} (already present, verified)")
        else:
            print(f"ok   {source.name} (downloaded, verified)")
    return 1 if failures else 0


def _verify(args: argparse.Namespace) -> int:
    failures = 0
    for source in sources.load_manifest():
        try:
            sources.verify(source, args.raw_dir)
        except sources.SourceError as err:
            print(f"FAIL {err}", file=sys.stderr)
            failures += 1
        else:
            print(f"ok   {source.name}")
    return 1 if failures else 0


def _samples(args: argparse.Namespace) -> int:
    from pipeline import samples  # pulls in pandas and DuckDB; keeps the other commands fast

    return samples.main(args.raw_dir)


def _build(args: argparse.Namespace) -> int:
    from pipeline import build  # pulls in pandas, NumPy and DuckDB

    return build.main(args.raw_dir, args.out)


def _privacy_scan(args: argparse.Namespace) -> int:
    return privacy.main(args.paths or [paths.DERIVED_DIR])


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="pipeline", description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)

    def add(
        name: str, help_text: str, handler: Handler, *, raw: bool = True
    ) -> argparse.ArgumentParser:
        command = commands.add_parser(name, help=help_text, description=help_text)
        command.set_defaults(handler=handler)
        if raw:
            command.add_argument(
                "--raw-dir",
                type=Path,
                default=paths.raw_dir(),
                help="folder with the OSF downloads (default: data/raw/ or $ATLAS_RAW_DIR)",
            )
        return command

    add("download", "Fetch the pinned OSF files, skipping any already verified (DR-1).", _download)
    add("verify", "Check every raw file against its pinned size and MD5 (DR-1).", _verify)
    add("samples", "Rebuild the three samples and the cross-checks (DR-2, DR-3).", _samples)
    build = add(
        "build",
        "Verify, rebuild the samples, estimate, validate and write data/derived/ (§4.6).",
        _build,
    )
    build.add_argument(
        "--out",
        type=Path,
        default=paths.DERIVED_DIR,
        help="output folder (default: data/derived/); e.g. a scratch folder to compare runs",
    )
    scan = add(
        "privacy-scan",
        "Scan derived outputs for forbidden fields and counts below 10 (DR-9, DR-16).",
        _privacy_scan,
        raw=False,
    )
    scan.add_argument(
        "paths", nargs="*", type=Path, help="files or folders (default: data/derived/)"
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    handler: Handler = args.handler
    return handler(args)
