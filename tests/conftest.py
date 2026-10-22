"""Shared fixtures. Tests marked `needs_raw` run only when the pinned OSF files are present.

Raw-data tests must assert on counts, never on collections of IDs or rows: pytest prints the
operands of a failing assertion, and respondent-level values must never reach a log (DR-16).
"""

from pathlib import Path

import pytest

from pipeline import paths, sources


def _raw_files_present() -> bool:
    raw = paths.raw_dir()
    return all((raw / s.name).is_file() for s in sources.load_manifest())


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    if _raw_files_present():
        return
    skip = pytest.mark.skip(reason="OSF files not in data/raw/; run `uv run pipeline download`")
    for item in items:
        if "needs_raw" in item.keywords:
            item.add_marker(skip)


@pytest.fixture(scope="session")
def raw_dir() -> Path:
    """The raw-data folder, verified against the manifest once per session (DR-1)."""
    raw = paths.raw_dir()
    for source in sources.load_manifest():
        sources.verify(source, raw)
    return raw
