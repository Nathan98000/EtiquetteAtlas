"""Repository locations used by the pipeline."""

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DERIVED_DIR = REPO_ROOT / "data" / "derived"
MANIFEST_PATH = Path(__file__).resolve().with_name("sources.toml")


def raw_dir() -> Path:
    """Directory holding the OSF downloads; never committed (NFR-52).

    `ATLAS_RAW_DIR` overrides the default `data/raw/`, e.g. to point tests at an empty folder.
    """
    override = os.environ.get("ATLAS_RAW_DIR")
    return Path(override) if override else REPO_ROOT / "data" / "raw"
