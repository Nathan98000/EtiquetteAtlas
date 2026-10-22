"""DR-1: pinned sources, idempotent streaming download, loud failure on any mismatch."""

import hashlib
import io
import urllib.error
from collections.abc import Callable
from email.message import Message
from pathlib import Path
from typing import IO

import pytest

from pipeline import cli, sources
from pipeline.sources import Source, SourceError

PAYLOAD = b"behavior,situation,rating\nargue,funeral,1\n" * 1000


def make_source(tmp_path: Path, **overrides: object) -> Source:
    """A Source for PAYLOAD at a local file:// URL, so the real urllib path runs offline."""
    origin = tmp_path / "osf" / "upstream.csv"
    origin.parent.mkdir(parents=True, exist_ok=True)
    origin.write_bytes(PAYLOAD)
    fields: dict[str, object] = {
        "name": "upstream.csv",
        "url": origin.as_uri(),
        "bytes": len(PAYLOAD),
        "md5": hashlib.md5(PAYLOAD, usedforsecurity=False).hexdigest(),
        "osf_version": 1,
        "role": "test fixture",
    }
    fields.update(overrides)
    return Source(**fields)  # type: ignore[arg-type]


def refuse_network(url: str) -> IO[bytes]:
    raise AssertionError("download() must not fetch a file that is already verified")


def test_dr1_manifest_pins_the_five_srs_files() -> None:
    pinned = {s.name: s for s in sources.load_manifest()}
    assert set(pinned) == {
        "gsn-situations-clean-long.csv",
        "gsn-contexts-clean-long.csv",
        "everyday-norms-2011-clean.csv",
        "imputed-ind-data-attention-check.csv",
        "individual-data-prereg.csv",
    }
    # The three MD5s printed in SRS §4.1.
    assert pinned["gsn-situations-clean-long.csv"].md5 == "8996033995a219a5cfb3c4a51699bcf4"
    assert pinned["gsn-contexts-clean-long.csv"].md5 == "9d4608680300453ecc4fe25191896f0f"
    assert pinned["everyday-norms-2011-clean.csv"].md5 == "9f8df6d61154102e49e99e09885bb202"


def test_dr1_download_streams_verifies_and_renames(tmp_path: Path) -> None:
    source = make_source(tmp_path)
    raw = tmp_path / "raw"
    assert sources.download(source, raw, log=lambda _: None) == "downloaded"
    assert (raw / source.name).read_bytes() == PAYLOAD
    assert not (raw / f"{source.name}.part").exists()


def test_dr1_download_skips_a_verified_file(tmp_path: Path) -> None:
    source = make_source(tmp_path)
    raw = tmp_path / "raw"
    sources.download(source, raw, log=lambda _: None)
    assert sources.download(source, raw, open_url=refuse_network) == "present"


@pytest.mark.parametrize(
    ("override", "message"),
    [
        ({"md5": "0" * 32}, "MD5"),
        ({"bytes": len(PAYLOAD) + 1}, "received"),
        ({"bytes": len(PAYLOAD) - 1}, "more than the pinned size"),
    ],
)
def test_dr1_download_mismatch_fails_and_leaves_nothing(
    tmp_path: Path, override: dict[str, object], message: str
) -> None:
    source = make_source(tmp_path, **override)
    raw = tmp_path / "raw"
    with pytest.raises(SourceError, match=message):
        sources.download(source, raw, log=lambda _: None)
    assert list(raw.iterdir()) == []


def flaky(failures: list[Exception]) -> Callable[[str], IO[bytes]]:
    """An opener that raises the given errors in turn, then serves PAYLOAD."""

    def open_url(url: str) -> IO[bytes]:
        if failures:
            raise failures.pop(0)
        return io.BytesIO(PAYLOAD)

    return open_url


def http_error(code: int) -> urllib.error.HTTPError:
    return urllib.error.HTTPError("https://osf.io/download/x/", code, "error", Message(), None)


def test_dr1_transient_errors_are_retried(tmp_path: Path) -> None:
    source = make_source(tmp_path)
    delays: list[float] = []
    opener = flaky([http_error(502), TimeoutError("read timed out")])
    status = sources.download(
        source, tmp_path / "raw", open_url=opener, log=lambda _: None, sleep=delays.append
    )
    assert status == "downloaded"
    assert delays == [5.0, 10.0]


def test_dr1_permanent_errors_fail_without_retrying(tmp_path: Path) -> None:
    source = make_source(tmp_path)
    delays: list[float] = []
    with pytest.raises(SourceError, match="HTTP Error 404"):
        sources.download(
            source,
            tmp_path / "raw",
            open_url=flaky([http_error(404)]),
            log=lambda _: None,
            sleep=delays.append,
        )
    assert delays == []


def test_dr1_retries_give_up_after_the_last_attempt(tmp_path: Path) -> None:
    source = make_source(tmp_path)
    with pytest.raises(SourceError, match="HTTP Error 503"):
        sources.download(
            source,
            tmp_path / "raw",
            open_url=flaky([http_error(503)] * 4),
            log=lambda _: None,
            sleep=lambda _: None,
        )


def test_dr1_present_but_corrupt_file_fails_loudly_and_is_kept(tmp_path: Path) -> None:
    source = make_source(tmp_path)
    raw = tmp_path / "raw"
    raw.mkdir()
    corrupt = PAYLOAD[:-1] + b"X"
    (raw / source.name).write_bytes(corrupt)
    with pytest.raises(SourceError, match="MD5"):
        sources.download(source, raw, open_url=refuse_network)
    assert (raw / source.name).read_bytes() == corrupt


def test_dr1_verify_reports_missing_and_wrong_size(tmp_path: Path) -> None:
    source = make_source(tmp_path)
    with pytest.raises(SourceError, match="not found"):
        sources.verify(source, tmp_path)
    (tmp_path / source.name).write_bytes(PAYLOAD + b"extra")
    with pytest.raises(SourceError, match="bytes on disk"):
        sources.verify(source, tmp_path)


@pytest.mark.parametrize(
    ("entry", "message"),
    [
        ('name = "../escape.csv"\nmd5 = "' + "0" * 32 + '"', "unsafe file name"),
        ('name = "ok.csv"\nmd5 = "not-an-md5"', "malformed MD5"),
    ],
)
def test_dr1_manifest_rejects_bad_entries(tmp_path: Path, entry: str, message: str) -> None:
    manifest = tmp_path / "sources.toml"
    manifest.write_text(
        f'[[file]]\n{entry}\nurl = "https://example.org/x"\nbytes = 1\nosf_version = 1\n'
        'role = "x"\n'
    )
    with pytest.raises(ValueError, match=message):
        sources.load_manifest(manifest)


def test_dr1_cli_verify_fails_when_files_are_missing(tmp_path: Path) -> None:
    assert cli.main(["verify", "--raw-dir", str(tmp_path)]) == 1
