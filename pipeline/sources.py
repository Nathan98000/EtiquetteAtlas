"""Pinned OSF sources: streaming download and checksum verification (DR-1)."""

import hashlib
import http.client
import re
import time
import tomllib
import urllib.error
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import IO, Literal

from pipeline.paths import MANIFEST_PATH

CHUNK_BYTES = 1 << 20
USER_AGENT = "etiquette-atlas-pipeline (+https://github.com/Nathan98000/EtiquetteAtlas)"
_MD5_RE = re.compile(r"^[0-9a-f]{32}$")
_NAME_RE = re.compile(r"^[A-Za-z0-9._-]+$")


@dataclass(frozen=True)
class Source:
    name: str
    url: str
    bytes: int
    md5: str
    osf_version: int
    role: str


class SourceError(Exception):
    """A raw file is missing, or does not match its pinned size and MD5."""


def load_manifest(path: Path = MANIFEST_PATH) -> list[Source]:
    with path.open("rb") as f:
        entries = tomllib.load(f)["file"]
    sources = [
        Source(
            name=e["name"],
            url=e["url"],
            bytes=e["bytes"],
            md5=e["md5"],
            osf_version=e["osf_version"],
            role=e["role"],
        )
        for e in entries
    ]
    for s in sources:
        if not _NAME_RE.match(s.name):
            raise ValueError(f"manifest: unsafe file name {s.name!r}")
        if not _MD5_RE.match(s.md5):
            raise ValueError(f"manifest: {s.name} has a malformed MD5")
        if s.bytes <= 0:
            raise ValueError(f"manifest: {s.name} has a non-positive size")
    if len({s.name for s in sources}) != len(sources):
        raise ValueError("manifest: duplicate file names")
    return sources


def md5_of(path: Path) -> str:
    digest = hashlib.md5(usedforsecurity=False)
    with path.open("rb") as f:
        while chunk := f.read(CHUNK_BYTES):
            digest.update(chunk)
    return digest.hexdigest()


def verify(source: Source, raw_dir: Path) -> None:
    """Raise SourceError unless the file is present with its pinned size and MD5 (DR-1)."""
    path = raw_dir / source.name
    if not path.is_file():
        raise SourceError(f"{source.name}: not found in {raw_dir}; run `pipeline download`")
    size = path.stat().st_size
    if size != source.bytes:
        raise SourceError(
            f"{source.name}: {size:,} bytes on disk, pinned {source.bytes:,}. Delete the file and "
            "run `pipeline download`; if OSF itself changed, review the manifest by hand."
        )
    actual = md5_of(path)
    if actual != source.md5:
        raise SourceError(
            f"{source.name}: MD5 {actual}, pinned {source.md5}. Delete the file and run "
            "`pipeline download`; if OSF itself changed, review the manifest by hand."
        )


def _open_url(url: str) -> IO[bytes]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    response: IO[bytes] = urllib.request.urlopen(request, timeout=60)
    return response


def _is_transient(err: Exception) -> bool:
    if isinstance(err, urllib.error.HTTPError):
        return err.code >= 500 or err.code == 429
    return isinstance(
        err, urllib.error.URLError | TimeoutError | ConnectionError | http.client.HTTPException
    )


def download(
    source: Source,
    raw_dir: Path,
    *,
    open_url: Callable[[str], IO[bytes]] = _open_url,
    log: Callable[[str], None] = print,
    attempts: int = 4,
    sleep: Callable[[float], None] = time.sleep,
) -> Literal["present", "downloaded"]:
    """Fetch one file unless it is already present and verified.

    Streams to `<name>.part`, hashing as it goes, and renames only after the size and MD5 match.
    A file already on disk is verified, never replaced: a mismatch raises SourceError. Transient
    network errors (HTTP 5xx or 429, timeouts, dropped connections) are retried with backoff.
    """
    path = raw_dir / source.name
    if path.exists():
        verify(source, raw_dir)
        return "present"

    raw_dir.mkdir(parents=True, exist_ok=True)
    for attempt in range(1, attempts + 1):
        try:
            _fetch(source, path, open_url=open_url, log=log)
        except (OSError, http.client.HTTPException) as err:
            if not _is_transient(err) or attempt == attempts:
                raise SourceError(f"{source.name}: download failed: {err}") from err
            delay = 5.0 * 2 ** (attempt - 1)
            log(f"  {source.name}: {err}; retrying in {delay:.0f} s")
            sleep(delay)
        else:
            return "downloaded"
    raise AssertionError("unreachable")


def _fetch(
    source: Source,
    path: Path,
    *,
    open_url: Callable[[str], IO[bytes]],
    log: Callable[[str], None],
) -> None:
    partial = path.with_name(path.name + ".part")
    digest = hashlib.md5(usedforsecurity=False)
    received = 0
    next_report = 0.1
    started = time.monotonic()
    try:
        with open_url(source.url) as response, partial.open("wb") as out:
            while chunk := response.read(CHUNK_BYTES):
                received += len(chunk)
                if received > source.bytes:
                    raise SourceError(f"{source.name}: server sent more than the pinned size")
                out.write(chunk)
                digest.update(chunk)
                if source.bytes >= 50_000_000 and received / source.bytes >= next_report:
                    log(f"  {source.name}: {received / source.bytes:4.0%}")
                    next_report += 0.1
        if received != source.bytes:
            raise SourceError(
                f"{source.name}: received {received:,} bytes, pinned {source.bytes:,}"
            )
        actual = digest.hexdigest()
        if actual != source.md5:
            raise SourceError(
                f"{source.name}: downloaded MD5 {actual}, pinned {source.md5}. OSF may have "
                "published a new version; review the manifest by hand before updating it."
            )
    except BaseException:
        partial.unlink(missing_ok=True)
        raise
    partial.replace(path)
    log(f"  {source.name}: {received / 1e6:.1f} MB in {time.monotonic() - started:.0f} s")
